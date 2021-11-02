pragma solidity ^0.8.0;

import 'openzeppelin-solidity/contracts/utils/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/utils/Context.sol';
import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol';
import './interfaces/ITimeStaking.sol';
import './interfaces/IUniswapV2Router.sol';

contract TimeOptimizer is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    
    uint256 constant MAX_INT = 2**256 - 1;

    // Memo Under Management (MUM)
    uint256 public mum = 0;
   
    /**
     * @dev Tokens addresses
     */    
    address public MEMO;
    address public TIME;

    /**
     * @dev Interfacing contracts addresses
     */
    address public timeStakingAddr;
    address public uniV2RouterAddr;
    //address public parentFactory;

    /**
     * @dev Initializes the strategy for the given protocol
     */
    constructor(
        address _timeStakingAddr,
        address _uniV2RouterAddr
    ) { 
        timeStakingAddr = _timeStakingAddr;
        uniV2RouterAddr = _uniV2RouterAddr;
        //parentFactory = msg.sender;

        MEMO = ITimeStaking(_timeStakingAddr).Memories();
        TIME = ITimeStaking(_timeStakingAddr).Time();

        IERC20(MEMO).safeApprove(_timeStakingAddr, 0);
        IERC20(MEMO).safeApprove(_timeStakingAddr, MAX_INT);
        IERC20(TIME).safeApprove(_uniV2RouterAddr, 0);
        IERC20(TIME).safeApprove(_uniV2RouterAddr, MAX_INT);        
    }

    function deposit(uint256 _amount) external onlyOwner {
        require(IERC20(MEMO).balanceOf(address(msg.sender)) >= _amount, "Insufficient balance");
        IERC20(MEMO).safeTransferFrom(msg.sender, address(this), _amount);
        mum = mum.add(_amount);
    }

    function withdraw(uint256 _amount) external onlyOwner {
        require(IERC20(MEMO).balanceOf(address(this)) >= _amount, "Insufficient balance");
        IERC20(MEMO).safeTransfer(msg.sender, _amount);
        mum = IERC20(MEMO).balanceOf(address(this));
    }

    function reinvest(address _desiredToken, uint256 _basisPoint) external onlyOwner {
        require(_desiredToken != MEMO, "Cannot reinvest into MEMO");
        require(_basisPoint <= 10000, "Incorrect Basis Point parameter");

        uint256 profit = (IERC20(MEMO).balanceOf(address(this))).sub(mum);
        uint256 amountToReinvest = profit.mul(_basisPoint).div(10000);

        ITimeStaking(_timeStakingAddr).unstake(amountToReinvest, true);
        mum = IERC20(MEMO).balanceOf(address(this));

        if(IERC20(TIME).balanceOf(address(this)) > 0){
            address[] memory timeToDesiredToken = new address[](2);
            timeToDesiredToken[0] = TIME;
            timeToDesiredToken[1] = _desiredToken;
            IUniswapV2Router(uniV2RouterAddr).swapExactTokensForTokens(
                IERC20(TIME).balanceOf(address(this)),
                0,
                timeToDesiredToken,
                address(this),
                block.timestamp.add(600)
            );
            IERC20(_desiredToken).safeTransfer(msg.sender, IERC20(_desiredToken).balanceOf(address(this)));
        }     
    }
    
    function recoverERC20(address _ERC20) external onlyOwner {
        if(IERC20(_ERC20).balanceOf(address(this)) > 0){
            IERC20(_ERC20).safeTransfer(msg.sender, IERC20(_ERC20).balanceOf(address(this)));
        }        
    }
}    