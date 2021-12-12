pragma solidity ^0.8.0;

interface IMooCurveZap {
 
    function curve3Pool() external view returns (address);
    function beefyVault() external view returns (address);
    function curveLP() external view returns (address);
    function underlyingTokens() external view returns (address[3] memory);

    function zap(address _tokenToZap, uint256 _amountToZap) external;

    function unzap(address _tokenToReceive, uint256 _amountToUnzap) external;

    function calculateBestOption(uint256[3] calldata _amounts) external view returns (uint);
}