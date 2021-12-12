pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/utils/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/Context.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IBeefyVault.sol";
import "./interfaces/ICurvePool.sol";
import "./interfaces/IUniswapV2Router.sol";

contract MooCurveZap is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 constant MAX_INT = 2**256 - 1;

    address public curve3Pool;
    address public beefyVault;
    address public uniV2Router = 0x60aE616a2155Ee3d9A68541Ba4544862310933d4;

    address public curveLP;

    address[3] public underlyingTokens;

    bool public pauseStatus;

    /**
     * @dev Initializes the zapper contract for a given CurvePool and associated BeefyVault
     */
    constructor(address _curve3Pool, address _beefyVault) {
        require(
            ICurvePool(_curve3Pool).lp_token() ==
                IBeefyVault(_beefyVault).want(),
            "Incorrect Parameters"
        );
        curve3Pool = _curve3Pool;
        beefyVault = _beefyVault;
        underlyingTokens[0] = ICurvePool(curve3Pool).underlying_coins(0);
        underlyingTokens[1] = ICurvePool(curve3Pool).underlying_coins(1);
        underlyingTokens[2] = ICurvePool(curve3Pool).underlying_coins(2);
        curveLP = IBeefyVault(_beefyVault).want();

        IERC20(curveLP).safeApprove(_beefyVault, 0);
        IERC20(curveLP).safeApprove(_beefyVault, MAX_INT);
        IERC20(curveLP).safeApprove(_curve3Pool, 0);
        IERC20(curveLP).safeApprove(_curve3Pool, MAX_INT);

        IERC20(underlyingTokens[0]).safeApprove(_curve3Pool, 0);
        IERC20(underlyingTokens[0]).safeApprove(_curve3Pool, MAX_INT);
        IERC20(underlyingTokens[1]).safeApprove(_curve3Pool, 0);
        IERC20(underlyingTokens[1]).safeApprove(_curve3Pool, MAX_INT);
        IERC20(underlyingTokens[2]).safeApprove(_curve3Pool, 0);
        IERC20(underlyingTokens[2]).safeApprove(_curve3Pool, MAX_INT);

        pauseStatus = false;
    }

    function zap(address _tokenToZap, uint256 _amountToZap) external {
        // Ensure the contract is not paused
        require(pauseStatus == false, "Contract paused");
        // Ensure the user has sufficient balance
        require(
            IERC20(_tokenToZap).balanceOf(address(msg.sender)) >= _amountToZap,
            "Insufficient balance"
        );
        // Transfer the token to zap from the user to the contract
        IERC20(_tokenToZap).safeTransferFrom(
            msg.sender,
            address(this),
            _amountToZap
        );

        (bool supported, ) = _isUnderlying(_tokenToZap);

        // If the token to zap is an underlying token of the Curve Pool, add it directly to the Curve Pool
        if (supported) {
            _addLiquidityToCurve(_tokenToZap, _amountToZap);

            // Else if the token is not an underlying, swap it for the most efficient underlying
            // then add it to the Curve Pool
        } else {
            uint256 bestRoute = _calculateBestRoute(_tokenToZap, _amountToZap);
            address[] memory path = new address[](2);
            path[0] = _tokenToZap;
            path[1] = underlyingTokens[bestRoute];
            IERC20(_tokenToZap).safeApprove(uniV2Router, _amountToZap);

            IUniswapV2Router(uniV2Router).swapExactTokensForTokens(
                IERC20(_tokenToZap).balanceOf(address(this)),
                0,
                path,
                address(this),
                block.timestamp.add(600)
            );
            _addLiquidityToCurve(
                underlyingTokens[bestRoute],
                IERC20(underlyingTokens[bestRoute]).balanceOf(address(this))
            );
        }
        // Deposit the Curve LP token to the Beefy Vault
        _depositToBeefy();
        // Transfer the liquidity ownership token (MooToken) to the user
        IERC20(beefyVault).safeTransfer(
            msg.sender,
            IERC20(beefyVault).balanceOf(address(this))
        );
    }

    function unzap(address _tokenToReceive, uint256 _amountToUnzap) external {
        require(pauseStatus == false, "Contract paused");
        require(
            IERC20(beefyVault).balanceOf(address(msg.sender)) >= _amountToUnzap,
            "Insufficient balance"
        );
        IERC20(beefyVault).safeTransferFrom(
            msg.sender,
            address(this),
            _amountToUnzap
        );
        _withdrawFromBeefy(_amountToUnzap);
        _removeLiquidityFromCurve(_tokenToReceive);
        IERC20(_tokenToReceive).safeTransfer(
            msg.sender,
            IERC20(_tokenToReceive).balanceOf(address(this))
        );
    }

    function _addLiquidityToCurve(address _token, uint256 _amount) internal {
        (bool supported, uint128 id) = _isUnderlying(_token);
        require(supported, "Unsupported asset");

        uint256[3] memory amounts;
        amounts[id] = _amount;

        uint256 minMintAmount = ICurvePool(curve3Pool)
            .calc_token_amount(amounts, true)
            .mul(9900)
            .div(10000);

        ICurvePool(curve3Pool).add_liquidity(amounts, minMintAmount, true);
    }

    function _removeLiquidityFromCurve(address _tokenToReceive) internal {
        (bool supported, uint128 id) = _isUnderlying(_tokenToReceive);
        require(supported, "Unsupported asset");

        uint256 amount = IERC20(curveLP).balanceOf(address(this));
        uint256 minAmount = ICurvePool(curve3Pool)
            .calc_withdraw_one_coin(amount, int128(id))
            .mul(9900)
            .div(10000);

        ICurvePool(curve3Pool).remove_liquidity_one_coin(
            amount,
            int128(id),
            minAmount,
            true
        );
    }

    function _withdrawFromBeefy(uint256 _amountToWithdraw) internal {
        IBeefyVault(beefyVault).withdraw(_amountToWithdraw);
    }

    function _depositToBeefy() internal {
        IBeefyVault(beefyVault).depositAll();
    }

    function _isUnderlying(address _token)
        internal
        view
        returns (bool, uint128)
    {
        for (uint128 i = 0; i < 3; i++) {
            if (_token == underlyingTokens[i]) {
                return (true, i);
            }
        }
        return (false, 404);
    }

    function _calculateBestRoute(address _tokenToZap, uint256 _amountToZap)
        internal
        view
        returns (uint256)
    {
        address[] memory path = new address[](2);
        path[0] = _tokenToZap;
        uint256[3] memory results;
        uint256[3] memory amounts;

        uint256 result = 0;
        for (uint256 i = 0; i < 3; i++) {
            path[1] = underlyingTokens[i];
            amounts = [uint256(0), uint256(0), uint256(0)];
            amounts[i] = IUniswapV2Router(uniV2Router).getAmountsOut(
                _amountToZap,
                path
            )[1];

            results[i] = ICurvePool(curve3Pool).calc_token_amount(
                amounts,
                true
            );

            if (results[i] > results[result]) {
                result = i;
            }
        }
        return result;
    }

    function pauseZapper() external onlyOwner {
        IERC20(curveLP).safeApprove(beefyVault, 0);
        IERC20(curveLP).safeApprove(curve3Pool, 0);
        IERC20(underlyingTokens[0]).safeApprove(curve3Pool, 0);
        IERC20(underlyingTokens[1]).safeApprove(curve3Pool, 0);
        IERC20(underlyingTokens[2]).safeApprove(curve3Pool, 0);

        pauseStatus = true;
    }

    function unpauseZapper() external onlyOwner {
        IERC20(curveLP).safeApprove(beefyVault, MAX_INT);
        IERC20(curveLP).safeApprove(curve3Pool, MAX_INT);
        IERC20(underlyingTokens[0]).safeApprove(curve3Pool, MAX_INT);
        IERC20(underlyingTokens[1]).safeApprove(curve3Pool, MAX_INT);
        IERC20(underlyingTokens[2]).safeApprove(curve3Pool, MAX_INT);

        pauseStatus = false;
    }
}
