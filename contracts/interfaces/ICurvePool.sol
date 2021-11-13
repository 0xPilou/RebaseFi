pragma solidity ^0.8.0;

interface ICurvePool { 
    function add_liquidity(uint256[3] calldata uamounts, uint256 min_mint_amount) external;
    function remove_liquidity(uint256 _amount, uint256[4] calldata min_uamounts) external;
    
    function calc_token_amount(uint256[3] calldata _amounts, bool is_deposit) external view returns (uint256);

    function underlying_coins(uint256 _id) external view returns (address);
    function lp_token() external view returns (address);
}