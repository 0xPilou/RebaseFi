pragma solidity ^0.8.0;

import 'openzeppelin-solidity/contracts/utils/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/utils/Context.sol';
import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol';

import './interfaces/IBeefyVault.sol';
import './interfaces/ICurvePool.sol';

contract MooCurveZap {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 constant MAX_INT = 2**256 - 1;

    address public curve3Pool;
    address public beefyVault;

    address public curveLP;

    address[3] public underlyingTokens;

    /**
     * @dev Initializes the zapper contract for a given CurvePool and associated BeefyVault
     */
    constructor(address _curve3Pool, address _beefyVault) {
        require(ICurvePool(_curve3Pool).lp_token() == IBeefyVault(_beefyVault).want(), "Incorrect Parameters");
        curve3Pool = _curve3Pool;        
        beefyVault = _beefyVault;
        underlyingTokens[0] = ICurvePool(curve3Pool).underlying_coins(0);     
        underlyingTokens[1] = ICurvePool(curve3Pool).underlying_coins(1);     
        underlyingTokens[2] = ICurvePool(curve3Pool).underlying_coins(2);     
        curveLP = IBeefyVault(_beefyVault).want();   
    }
 
    function zap(address _tokenToZap, uint256 _amountToZap) external {
        require(IERC20(_tokenToZap).balanceOf(address(msg.sender)) >= _amountToZap);

        if(msg.sender != address(this)){
            IERC20(_tokenToZap).safeTransferFrom(msg.sender, address(this), _amountToZap);
        }
        _addLiquidityToCurve(_tokenToZap, _amountToZap);
    }

    function _addLiquidityToCurve(address _token, uint256 _amount) internal {
        (bool supported, uint id) = _isUnderlying(_token);
        require(supported, "Unsupported asset");
        IERC20(_token).safeApprove(curve3Pool, _amount); 
        
        uint256[3] memory amounts;
        amounts[id] = _amount;

        uint256 minMintAmount = ICurvePool(curve3Pool).calc_token_amount(amounts, true);

        ICurvePool(curve3Pool).add_liquidity(amounts, minMintAmount);

        IERC20(curveLP).safeTransfer(msg.sender, IERC20(curveLP).balanceOf(address(this)));
    }

    function _isUnderlying(address _token) internal view returns (bool, uint) {
        for(uint i=0; i<3; i++) {
            if(_token == underlyingTokens[i]) {
                return (true, i);
            } 
        }
        return (false, 404);
    }
}