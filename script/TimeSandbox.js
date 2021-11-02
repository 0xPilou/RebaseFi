const { ethers } = require("hardhat");
const fs = require('fs');


async function main() {

    [deployer, user, _] = await ethers.getSigners();   


    await network.provider.request({
      method: "hardhat_reset",
      params: [
      {
        forking: 
        {
          jsonRpcUrl: "https://api.avax.network/ext/bc/C/rpc",
          blockNumber: 6430230
        },
      },
      ],
    }); 
    /* ABIs */
    const MEMOabi = require("../external_abi/MEMO.json");   
    /* Addresses */
    // MEMO
    const MEMO = "0x136acd46c134e8269052c62a67042d6bdedde3c9";      

    const JOEROUTER = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";

    const TIMESTAKING = "0x4456B87Af11e87E329AB7d7C7A246ed1aC2168B9";

    /* Provider */
    const provider = new ethers.providers.JsonRpcProvider();    
    // Instantiating the existing mainnet fork contracts
    memo = new ethers.Contract(MEMO, MEMOabi, provider);


    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0xBE5a2376A293306ca5043a8895b0c52039E8Ba57"],
    });
    me = await ethers.getSigner("0xBE5a2376A293306ca5043a8895b0c52039E8Ba57");   


    // Deploy UniV2OptimizerFactory
    TimeOptimizer = await ethers.getContractFactory("TimeOptimizer");
    timeOptimizer = await TimeOptimizer.connect(me).deploy(
        TIMESTAKING,
        JOEROUTER
    );  
    myBalance = await memo.balanceOf(me.address);

    await memo.connect(me).approve(timeOptimizer.address, myBalance);
    await timeOptimizer.connect(me).deposit(myBalance);

    const memoDecimals = await memo.decimals();


    timeOptiBalanceBefore = await memo.balanceOf(timeOptimizer.address);
    myBalanceBefore = await memo.balanceOf(me.address);

    console.log("--------------------------------------------------------------------------------");
    console.log("--------------------------------------------------------------------------------");
    console.log("TimeOptimizer MEMO balance at block 6430230 is : %d MEMO", ethers.utils.formatUnits(timeOptiBalanceBefore.toString(), memoDecimals));
    console.log("My MEMO balance at block 6430230 is : %d MEMO", ethers.utils.formatUnits(myBalanceBefore.toString(), memoDecimals));
    console.log("--------------------------------------------------------------------------------");

    await network.provider.request({
      method: "hardhat_reset",
      params: [
      {
        forking: 
        {
          jsonRpcUrl: "https://api.avax.network/ext/bc/C/rpc",
          blockNumber: 6434067
        },
      },
      ],
    });

    timeOptiBalanceAfter = await memo.balanceOf(timeOptimizer.address);
    myBalanceAfter = await memo.balanceOf(me.address);

    console.log("TimeOptimizer MEMO balance at block 6434067 is : %d MEMO", ethers.utils.formatUnits(timeOptiBalanceAfter.toString(), memoDecimals));
    console.log("My MEMO balance at block 6434067 is : %d MEMO", ethers.utils.formatUnits(myBalanceAfter.toString(), memoDecimals));
    console.log("--------------------------------------------------------------------------------");
    console.log("--------------------------------------------------------------------------------");

  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });