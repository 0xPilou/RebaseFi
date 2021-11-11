// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

interface IKlimaStaking {

    function unstake( uint _amount, bool _trigger ) external;

    function KLIMA() external view returns (address);
    function sKLIMA() external view returns (address);
}