pragma solidity ^0.8.0;

import 'openzeppelin-solidity/contracts/utils/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/utils/Context.sol';
import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol';
import './interfaces/IKlimaStaking.sol';
import './interfaces/IUniswapV2Router.sol';

contract KlimaOptimizer is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    
    uint256 constant MAX_INT = 2**256 - 1;

    // SKLIMA Under Management (MUM)
    uint256 public skum = 0;
   
    /**
     * @dev Tokens addresses
     */    
    address public sKLIMA;
    address public KLIMA;

    /**
     * @dev Interfacing contracts addresses
     */
    address public klimaStakingAddr;
    address public uniV2RouterAddr;
    //address public parentFactory;

    /**
     * @dev Initializes the strategy for the given protocol
     */
    constructor(
        address _klimaStakingAddr,
        address _uniV2RouterAddr
    ) { 
        klimaStakingAddr = _klimaStakingAddr;
        uniV2RouterAddr = _uniV2RouterAddr;
        //parentFactory = msg.sender;

        SKLIMA = IKlimaStaking(_klimaStakingAddr).sKLIMA();
        KLIMA = IKlimaStaking(_klimaStakingAddr).KLIMA();

        IERC20(SKLIMA).safeApprove(_klimaStakingAddr, 0);
        IERC20(SKLIMA).safeApprove(_klimaStakingAddr, MAX_INT);
        IERC20(KLIMA).safeApprove(_uniV2RouterAddr, 0);
        IERC20(KLIMA).safeApprove(_uniV2RouterAddr, MAX_INT);        
    }

    function deposit(uint256 _amount) external onlyOwner {
        require(IERC20(SKLIMA).balanceOf(address(msg.sender)) >= _amount, "Insufficient balance");
        IERC20(SKLIMA).safeTransferFrom(msg.sender, address(this), _amount);
        skum = skum.add(_amount);
    }

    function withdraw(uint256 _amount) external onlyOwner {
        require(IERC20(SKLIMA).balanceOf(address(this)) >= _amount, "Insufficient balance");
        IERC20(SKLIMA).safeTransfer(msg.sender, _amount);
        skum = IERC20(SKLIMA).balanceOf(address(this));
    }

    function reinvest(address _desiredToken, uint256 _basisPoint) external onlyOwner {
        require(_desiredToken != SKLIMA, "Cannot reinvest into SKLIMA");
        require(_basisPoint <= 10000, "Incorrect Basis Point parameter");

        uint256 profit = (IERC20(SKLIMA).balanceOf(address(this))).sub(skum);
        uint256 amountToReinvest = profit.mul(_basisPoint).div(10000);

        IKlimaStaking(klimaStakingAddr).unstake(amountToReinvest, true);
        skum = IERC20(SKLIMA).balanceOf(address(this));

        if(IERC20(KLIMA).balanceOf(address(this)) > 0){
            address[] memory timeToDesiredToken = new address[](2);
            timeToDesiredToken[0] = KLIMA;
            timeToDesiredToken[1] = _desiredToken;
            IUniswapV2Router(uniV2RouterAddr).swapExactTokensForTokens(
                IERC20(KLIMA).balanceOf(address(this)),
                0,
                timeToDesiredToken,
                msg.sender,
                block.timestamp.add(600)
            );
            //IERC20(_desiredToken).safeTransfer(msg.sender, IERC20(_desiredToken).balanceOf(address(this)));
        }     
    }
    
    function recoverERC20(address _ERC20) external onlyOwner {
        if(IERC20(_ERC20).balanceOf(address(this)) > 0){
            IERC20(_ERC20).safeTransfer(msg.sender, IERC20(_ERC20).balanceOf(address(this)));
        }        
    }
}    