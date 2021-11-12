/**
*  Dependencies
*/
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require('truffle-assertions');

// npx hardhat test test\1_test_TimeOptimizer.js

describe("TimeOptimizer Unit Tests", function () {  
    this.timeout(40000);
    
    /* ABIs */
    const MEMOabi = require("../external_abi/MEMO.json");   
    const WETHabi = require("../external_abi/WAVAX.json");

    /* Addresses */
    const MEMO = "0x136acd46c134e8269052c62a67042d6bdedde3c9"; 
    const WETH = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
    const JOEROUTER = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4"; 
    const TIMESTAKING = "0x4456B87Af11e87E329AB7d7C7A246ed1aC2168B9";

    /* Provider */
    const provider = new ethers.providers.JsonRpcProvider();   

    // Instantiating the existing mainnet fork contracts
    weth = new ethers.Contract(WETH, WETHabi, provider);
    memo = new ethers.Contract(MEMO, MEMOabi, provider);

    let timeOptimizer;
    let TimeOptimizer;  

    before(async function () {

    // Resetting the Avalanche Hardhat Mainnet Fork Network to block 6729600
    await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: `https://api.avax.network/ext/bc/C/rpc`,
              blockNumber:6844000
            },
          },
        ],
    });

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x6e0a0DF2d76B97c610e5B96c32CE53b8Ab4c856C"],
      });
    whaleMEMO = await ethers.getSigner("0x6e0a0DF2d76B97c610e5B96c32CE53b8Ab4c856C");

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x91F83E3d6C37908454687517E748555E7ad0fe53"],
    });
    whaleWETH = await ethers.getSigner("0x91F83E3d6C37908454687517E748555E7ad0fe53");
   
    // Define the signers required for the tests
    [user, nonOwner, _] = await ethers.getSigners();   

    // Deploy UniV2OptimizerFactory
    TimeOptimizer = await ethers.getContractFactory("TimeOptimizer");
    timeOptimizer = await TimeOptimizer.connect(user).deploy(
        TIMESTAKING,
        JOEROUTER
    );

    const memoDecimals = await memo.decimals();
    const amount = 100;
    const weiAmount = ethers.utils.parseUnits(amount.toString(), memoDecimals);

    await memo.connect(whaleMEMO).transfer(user.address, weiAmount);
    });

    // Impersonate a MEMO Whale to transfer MEMO to the TimeOptimizer contract to simulate the rebase
    async function rebase() {
        const memoDecimals = await memo.decimals();
        const amount = ethers.utils.parseUnits("10", memoDecimals);
        await memo.connect(whaleMEMO).transfer(timeOptimizer.address, amount)
    };

    it("should deposit MEMO Token into the TimeOptimizer Contract", async () => {
    
      const amount = await memo.balanceOf(user.address);    

      await memo.connect(user).approve(timeOptimizer.address, amount);
      await timeOptimizer.connect(user).deposit(amount);    

      const timeOptBalance = await memo.balanceOf(timeOptimizer.address);
      const mum = await timeOptimizer.mum();    

      expect(amount).to.equal(timeOptBalance);
      expect(amount).to.equal(mum);
      expect(timeOptBalance).to.equal(mum);
        
      await rebase();
    });

    it("should reinvest 50% of the rebase in WETH", async () => {
      const basisPoint = 5000;

      const wethBalBefore = await weth.balanceOf(user.address);
      const timeOptiBalBefore = await memo.balanceOf(timeOptimizer.address);
      const mumBefore = await timeOptimizer.mum();

      await timeOptimizer.connect(user).reinvest(weth.address, basisPoint);

      const wethBalAfter = await weth.balanceOf(user.address);
      const timeOptiBalAfter = await memo.balanceOf(timeOptimizer.address);

      expect(wethBalBefore < wethBalAfter).to.equal(true)
      expect(timeOptiBalAfter).to.equal(timeOptiBalBefore.sub(mumBefore).mul(basisPoint).div(10000).add(mumBefore))

    });

    it("should recover the lost / airdropped WETH from the TimeOptimizer contract", async () => {

      const amountToTransfer = 10;
      const weiAmountToTransfer = ethers.utils.parseEther(amountToTransfer.toString());
      await weth.connect(whaleWETH).transfer(timeOptimizer.address, weiAmountToTransfer);
  
      // Checking the balances before the recovery operation
      const optiWethBalBefore = await weth.balanceOf(timeOptimizer.address);
      const userWethBalBefore = await weth.balanceOf(user.address);
  
      // ERC20 Recovery Operation
      await timeOptimizer.connect(user).recoverERC20(weth.address);
  
      // Checking the balances after the recovery operation
      const optiWethBalAfter = await weth.balanceOf(timeOptimizer.address);
      const userWethBalAfter = await weth.balanceOf(user.address);
  
      // Assertion #1 : Optimizer Token C Balance Before > Optimizer Token C Balance After
      expect(optiWethBalBefore > optiWethBalAfter).to.equal(true, "Optimizer Balance of WETH is incorrect");
      expect(optiWethBalAfter).to.equal(0, "Optimizer Balance of WETH after recovery should be 0");
        
      // Assertion #2 : User Token C Balance Before < User Token C Balance After
      expect(userWethBalAfter).to.equal(userWethBalBefore.add(weiAmountToTransfer), "User Balance of WETH is incorrect");
    });

});

