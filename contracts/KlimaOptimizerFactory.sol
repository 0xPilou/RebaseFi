// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.8.0;

import "./KlimaOptimizer.sol";

contract KlimaOptimizerFactory {

    /* Array of addresses of all existing KlimaOptimizer created by the Factory */
    address[] public klimaOptimizers;
   
    /* Mapping storing the optimizers addresses of a given user */
    mapping(address => address[]) public klimaOptimizerByOwner; 

    /* Create an Optimizer for the user */
    function createKlimaOptimizer(
        address _klimaStakingAddr,
        address _uniV2RouterAddr
    ) external returns(address newUniV2Optimizer) {
        
        KlimaOptimizer klimaOptimizer = new KlimaOptimizer(
            _klimaStakingAddr,
            _uniV2RouterAddr
        );
        /* Register the newly created optimizer address to the contract storage */
        klimaOptimizers.push(address(klimaOptimizer));

        /* Register the newly created optimizer address for the given user */
        klimaOptimizerByOwner[msg.sender].push(address(klimaOptimizer));

        /* Transfer the Optimizer ownership to the user */
        klimaOptimizer.transferOwnership(msg.sender);

        return address(klimaOptimizer);
    }

    function getOptimizerCount() external view returns(uint) {
        return klimaOptimizers.length;
    } 
    
    function getOwnerOptimizers(address _owner) external view returns(address[] memory) {
        return klimaOptimizerByOwner[_owner];
    }
}



