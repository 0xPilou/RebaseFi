pragma solidity ^0.8.0;

interface ICurvePool { 
    function add_liquidity(uint256[3] calldata uamounts, uint256 min_mint_amount, bool use_underlying) external;
    function remove_liquidity(uint256 _amount, uint256[3] calldata min_uamounts, bool use_underlying ) external;
    function remove_liquidity_one_coin(uint256 _amount, int128 _i, uint256 _min_amount, bool _use_underlying) external returns (uint256);

    function calc_token_amount(uint256[3] calldata _amounts, bool is_deposit) external view returns (uint256);
    function calc_withdraw_one_coin(uint256 _token_amount, int128 i) external view returns (uint256);

    function underlying_coins(uint256 _id) external view returns (address);
    function lp_token() external view returns (address);
}