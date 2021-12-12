pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/utils/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/Context.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IBeefyVault.sol";
import "./interfaces/ICurvePoolTriCrypto.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/IMooCurveZap.sol";

contract MooCurveTriCryptoZap is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 constant MAX_INT = 2**256 - 1;

    address public curve3Crypto = 0xB755B949C126C04e0348DD881a5cF55d424742B2;
    address public beefyVault = 0xB755B949C126C04e0348DD881a5cF55d424742B2;
    address public uniV2Router = 0x60aE616a2155Ee3d9A68541Ba4544862310933d4;

    address public mooCurveTriPoolZap;

    address public curveLP = 0x1daB6560494B04473A0BE3E7D83CF3Fdf3a51828;

    address[3] public underlyingTokens;

    bool public pauseStatus;

    /**
     * @dev Initializes the zapper contract
     */
    constructor(address _mooCurveTriPoolZap) {

        mooCurveTriPoolZap = _mooCurveTriPoolZap;
        underlyingTokens[0] = ICurvePoolTriCrypto(curve3Crypto).coins(0);
        underlyingTokens[1] = ICurvePoolTriCrypto(curve3Crypto).coins(1);
        underlyingTokens[2] = ICurvePoolTriCrypto(curve3Crypto).coins(2);

        IERC20(curveLP).safeApprove(beefyVault, 0);
        IERC20(curveLP).safeApprove(beefyVault, MAX_INT);
        IERC20(curveLP).safeApprove(curve3Crypto, 0);
        IERC20(curveLP).safeApprove(curve3Crypto, MAX_INT);

        IERC20(underlyingTokens[0]).safeApprove(curve3Crypto, 0);
        IERC20(underlyingTokens[0]).safeApprove(curve3Crypto, MAX_INT);
        IERC20(underlyingTokens[1]).safeApprove(curve3Crypto, 0);
        IERC20(underlyingTokens[1]).safeApprove(curve3Crypto, MAX_INT);
        IERC20(underlyingTokens[2]).safeApprove(curve3Crypto, 0);
        IERC20(underlyingTokens[2]).safeApprove(curve3Crypto, MAX_INT);

        pauseStatus = false;
    }

    /**
     * @dev Convert an _amountToZap of _tokenToZap to Curve TriCrypto LP Token,
     *      add it to the associated Beefy Vault,
     *      transfer back the LP Ownership Token (MooToken) to the user.
     */
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

            // Calculate the best route
            uint256 bestRoute = _calculateBestRoute(_tokenToZap, _amountToZap);

            // If the best route is 0 (Curve3Pool LP Token) then zap using the MooCurveZap 3Pool
            if(bestRoute == 0){
                IERC20(_tokenToZap).safeApprove(mooCurveTriPoolZap, _amountToZap);
                IMooCurveZap(mooCurveTriPoolZap).zapToCurveLP(_tokenToZap, _amountToZap);
            
            // Else, swap the token to zap to the underlying token associated to the best route
            } else {
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
            }
            // Add the underlying token to Curve Pool
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

    /**
     * @dev Withdraw an _amountToUnzap of Curve TriCrypto LP token from Beefy Vault,
     *      convert it into a _tokenToReceive,
     *      transfer back the _tokenToReceive to the user.
     */
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

        uint256 minMintAmount = ICurvePoolTriCrypto(curve3Crypto)
            .calc_token_amount(amounts, true)
            .mul(9900)
            .div(10000);

        ICurvePoolTriCrypto(curve3Crypto).add_liquidity(amounts, minMintAmount, true);
    }

    function _removeLiquidityFromCurve(address _tokenToReceive) internal {
        (bool supported, uint128 id) = _isUnderlying(_tokenToReceive);
        require(supported, "Unsupported asset");

        uint256 amount = IERC20(curveLP).balanceOf(address(this));
        uint256 minAmount = ICurvePoolTriCrypto(curve3Crypto)
            .calc_withdraw_one_coin(amount, int128(id))
            .mul(9900)
            .div(10000);

        ICurvePoolTriCrypto(curve3Crypto).remove_liquidity_one_coin(
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

            results[i] = ICurvePoolTriCrypto(curve3Crypto).calc_token_amount(
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
        IERC20(curveLP).safeApprove(curve3Crypto, 0);
        IERC20(underlyingTokens[0]).safeApprove(curve3Crypto, 0);
        IERC20(underlyingTokens[1]).safeApprove(curve3Crypto, 0);
        IERC20(underlyingTokens[2]).safeApprove(curve3Crypto, 0);

        pauseStatus = true;
    }

    function unpauseZapper() external onlyOwner {
        IERC20(curveLP).safeApprove(beefyVault, MAX_INT);
        IERC20(curveLP).safeApprove(curve3Crypto, MAX_INT);
        IERC20(underlyingTokens[0]).safeApprove(curve3Crypto, MAX_INT);
        IERC20(underlyingTokens[1]).safeApprove(curve3Crypto, MAX_INT);
        IERC20(underlyingTokens[2]).safeApprove(curve3Crypto, MAX_INT);

        pauseStatus = false;
    }
}
