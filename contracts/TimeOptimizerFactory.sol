// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.8.0;

import "./TimeOptimizer.sol";

contract TimeOptimizerFactory {

    /* Array of addresses of all existing TimeOptimizer created by the Factory */
    address[] public timeOptimizers;
   
    /* Mapping storing the optimizer address of a given user */
    mapping(address => address) public timeOptimizerByOwner; 

    /* Create an Optimizer for the user */
    function createTimeOptimizer(
        address _mooCurveZapAddr
    ) external returns(address) {
        require(timeOptimizerByOwner[msg.sender] == address(0), "User already has an Optimizer");
        
        TimeOptimizer timeOptimizer = new TimeOptimizer(
            _mooCurveZapAddr
        );
        /* Register the newly created optimizer address to the contract storage */
        timeOptimizers.push(address(timeOptimizer));

        /* Register the newly created optimizer address for the given user */
        timeOptimizerByOwner[msg.sender] = address(timeOptimizer);

        /* Transfer the Optimizer ownership to the user */
        timeOptimizer.transferOwnership(msg.sender);

        return address(timeOptimizer);
    }

    function getOptimizerCount() external view returns(uint) {
        return timeOptimizers.length;
    } 
    
    function getOwnerOptimizer(address _owner) external view returns(address) {
        return timeOptimizerByOwner[_owner];
    }
}



