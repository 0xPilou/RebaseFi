/**
*  Dependencies
*/
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require('truffle-assertions');

// npx hardhat test test\1_test_TimeOptimizer.js --network localhost

describe("TimeOptimizer Unit Tests", function () {  
    this.timeout(40000);
    
    /* ABIs */
    const MEMOabi = require("../external_abi/avalanche/MEMO.json");   
    const WETHabi = require("../external_abi/avalanche/WAVAX.json");
    const MOOabi = require("../external_abi/avalanche/MOO.json");
    const DAIabi = require("../external_abi/avalanche/DAI.json");
    const USDCabi = require("../external_abi/avalanche/USDC.json");


    /* Addresses */
    const MEMO = "0x136acd46c134e8269052c62a67042d6bdedde3c9"; 
    const WETH = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
    const DAI = "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70";
    const USDC = "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664";

    const JOEROUTER = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4"; 
    const TIMESTAKING = "0x4456B87Af11e87E329AB7d7C7A246ed1aC2168B9";
    const CURVEPOOL = "0x7f90122BF0700F9E7e1F688fe926940E8839F353"; 
    const BEEFYVAULT = "0x79A44dc13e5863Cf4AB36ab13e038A5F16861Abc";

    /* Provider */
    const provider = new ethers.providers.JsonRpcProvider();   

    // Instantiating the existing mainnet fork contracts
    weth = new ethers.Contract(WETH, WETHabi, provider);
    memo = new ethers.Contract(MEMO, MEMOabi, provider);
    moo = new ethers.Contract(BEEFYVAULT, MOOabi, provider);
    dai = new ethers.Contract(DAI, DAIabi, provider);
    usdc = new ethers.Contract(USDC, USDCabi, provider);


    let timeOptimizer;
    let TimeOptimizer;  
    let mooCurveZap;
    let MooCurveZap;  

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
    [user, mooDeployer, nonOwner, _] = await ethers.getSigners();   

    // Deploy MooCurveZap contract
    MooCurveZap = await ethers.getContractFactory("MooCurveZap");
    mooCurveZap = await MooCurveZap.connect(mooDeployer).deploy(
        CURVEPOOL,
        BEEFYVAULT
    );

    // Deploy TimeOptimizer contract
    TimeOptimizer = await ethers.getContractFactory("TimeOptimizer");
    timeOptimizer = await TimeOptimizer.connect(user).deploy(
        TIMESTAKING,
        JOEROUTER, 
        mooCurveZap.address
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

    it("should reinvest 50% of the rebase in DAI", async () => {
      const basisPoint = 5000;

      const mooBalBefore = await moo.balanceOf(user.address);
      const timeOptiBalBefore = await memo.balanceOf(timeOptimizer.address);
      const mumBefore = await timeOptimizer.mum();

      await timeOptimizer.connect(user).reinvest(dai.address, basisPoint);

      const mooBalAfter = await moo.balanceOf(user.address);
      const timeOptiBalAfter = await memo.balanceOf(timeOptimizer.address);

      expect(mooBalBefore < mooBalAfter).to.equal(true)
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

    it("should prevent non-owner to interact with the contract", async () => { 

      const amount = 10;
      const weiAmount = ethers.utils.parseEther(amount.toString());

      // Assertion : Transaction should revert as the caller is not the owner of the contract
      await truffleAssert.reverts(timeOptimizer.connect(nonOwner).deposit(weiAmount));

      // Assertion : Transaction should revert as the caller is not the owner of the contract
      await truffleAssert.reverts(timeOptimizer.connect(nonOwner).withdraw(weiAmount));
      
      // Assertion : Transaction should revert as the caller is not the owner of the contract
      await truffleAssert.reverts(timeOptimizer.connect(nonOwner).reinvest(weth.address, 5000));

      // Assertion : Transaction should revert as the caller is not the owner of the contract
      await truffleAssert.reverts(timeOptimizer.connect(nonOwner).recoverERC20(weth.address));
  });

  it("should withdraw MEMO Token from the TimeOptimizer Contract", async () => {
    
    const amount = await memo.balanceOf(timeOptimizer.address);    
    const userBalBefore = await memo.balanceOf(user.address);    

    await timeOptimizer.connect(user).withdraw(amount);    

    const timeOptBalance = await memo.balanceOf(timeOptimizer.address);
    const userBalAfter = await memo.balanceOf(user.address);    

    const mum = await timeOptimizer.mum();    

    expect(amount > timeOptBalance).to.equal(true);
    expect(userBalBefore < userBalAfter).to.equal(true);
    expect(mum).to.equal(0);
      
    await rebase();
  });

});

