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
        underlyingTokens = ICurvePool(curve3Pool).underlying_coins();     
        curveLP = IBeefyVault(_beefyVault).want();   
    }
 
    function zap(address _tokenToZap, uint256 _amountToZap) external {
        (bool supported, uint id) = _isUnderlying(_tokenToZap);
        require(supported, "Unsupported asset");
        require(IERC20(_tokenToZap).balanceOf(address(msg.sender)) >= _amountToZap);

        if(msg.sender != address(this)){
            IERC20(_tokenToZap).safeTransferFrom(msg.sender, address(this), _amountToZap);
        }

        IERC20(_tokenToZap).safeApprove(_curve3Pool, _amountToZap); 

        uint256[3] amounts;
        amounts[id] = _amountToZap

        uint256 minMintAmount = ICurvePool(curve3Pool).calc_token_amount(amounts, true)

        ICurvePool(curve3Pool).add_liquidity(amounts, minMintAmount);

        IERC20(curveLP).safeTransfer(msg.sender, IERC20(curveLP).balanceOf(address(this)));
    }

    function _isUnderlying(address _token) internal returns (bool, uint) {
        for(uint i=0, i<underlyingTokens.length, i++) {
            if(_token == underlyingTokens[i]) {
                return true, i;
            } 
        }
        return false, 404;
    }
}