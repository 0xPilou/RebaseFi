/**
*  Dependencies
*/
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require('truffle-assertions');
const fs = require('fs');

const polygonAlchemyKey = fs.readFileSync("secretPolygon").toString().trim();

// npx hardhat test test\3_test_KlimaOptimizer.js --network localhost

describe("KlimaOptimizer Unit Tests", function () {  
 
  /* ABIs */
  const SKLIMAabi = require("../external_abi/SKLIMA.json");   
  const WETHabi = require("../external_abi/WETH.json");

  /* Addresses */
  const SKLIMA = "0xb0C22d8D350C67420f06F48936654f567C73E8C8"; 
  const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
  const SUSHIROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; 
  const KLIMASTAKING = "0x25d28a24Ceb6F81015bB0b2007D795ACAc411b4d";

  /* Provider */
  const provider = new ethers.providers.JsonRpcProvider();   

  /* Instantiating the existing mainnet fork contracts */
  weth = new ethers.Contract(WETH, WETHabi, provider);
  sklima = new ethers.Contract(SKLIMA, SKLIMAabi, provider);

  let klimaOptimizer;
  let KlimaOptimizer;  


  before(async function () {

    /* Resetting the Avalanche Hardhat Mainnet Fork Network to block 6263382 */
    await network.provider.request({
      method: "hardhat_reset",
      params: [
      {
        forking: 
        {
          jsonRpcUrl: `${polygonAlchemyKey}`,
          blockNumber: 21243000
        },
      },
      ],
    });

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x327924cb8fb1daf959bbb8441f9b522e716f7794"],
    });
    whaleSKLIMA = await ethers.getSigner("0x327924cb8fb1daf959bbb8441f9b522e716f7794");

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x5C5A4AE893c4232A050b01a84E193e107Dd80CA2"],
    });
    whaleWETH = await ethers.getSigner("0x5C5A4AE893c4232A050b01a84E193e107Dd80CA2");

    /* Define the signers required for the tests */
    [user, nonOwner, _] = await ethers.getSigners();   

    /* Deploy KlimaOptimizer (contract under test) */
    KlimaOptimizer = await ethers.getContractFactory("KlimaOptimizer");
    klimaOptimizer = await KlimaOptimizer.connect(user).deploy(
        KLIMASTAKING,
        SUSHIROUTER
  );

  const sklimaDecimals = await sklima.decimals();
  const amount = 100;
  const weiAmount = ethers.utils.parseUnits(amount.toString(), sklimaDecimals);
  await sklima.connect(whaleSKLIMA).transfer(user.address, weiAmount);
  });

  // Impersonate a SKLIMA Whale to transfer SKLIMA to the KlimaOptimizer contract to simulate the rebase
  async function rebase() {
    const sklimaDecimals = await sklima.decimals();
    const amount = ethers.utils.parseUnits("10", sklimaDecimals);
    await sklima.connect(whaleSKLIMA).transfer(klimaOptimizer.address, amount)
  };

  it("should deposit SKLIMA Token into the KlimaOptimizer Contract", async () => {
    const amount = await sklima.balanceOf(user.address);    

    await sklima.connect(user).approve(klimaOptimizer.address, amount);
    await klimaOptimizer.connect(user).deposit(amount);    

    const klimaOptBalance = await sklima.balanceOf(klimaOptimizer.address);
    const skum = await klimaOptimizer.skum();    

    expect(amount).to.equal(klimaOptBalance)
    expect(amount).to.equal(skum)
    expect(klimaOptBalance).to.equal(skum)  
    
    await rebase();
  });
  it("should reinvest 50% of the rebase in WETH", async () => {
    const basisPoint = 5000;

    wethBalBefore = await weth.balanceOf(user.address);
    klimaOptiBalBefore = await sklima.balanceOf(klimaOptimizer.address);
    mumBefore = await klimaOptimizer.skum();

    await klimaOptimizer.connect(user).reinvest(weth.address, basisPoint);

    wethBalAfter = await weth.balanceOf(user.address);
    klimaOptiBalAfter = await sklima.balanceOf(klimaOptimizer.address);
    mumAfter = await klimaOptimizer.skum();

    expect(wethBalBefore < wethBalAfter).to.equal(true)
    expect(klimaOptiBalAfter).to.equal(klimaOptiBalBefore.sub(mumBefore).mul(basisPoint).div(10000).add(mumBefore))
  });

  it("should recover the lost / airdropped WETH from the TimeOptimizer contract", async () => {

    const amountToTransfer = 10;
    const weiAmountToTransfer = ethers.utils.parseEther(amountToTransfer.toString());
    await weth.connect(whaleWETH).transfer(klimaOptimizer.address, weiAmountToTransfer);

    // Checking the balances before the recovery operation
    const optiWethBalBefore = await weth.balanceOf(klimaOptimizer.address);
    const userWethBalBefore = await weth.balanceOf(user.address);

    // ERC20 Recovery Operation
    await klimaOptimizer.connect(user).recoverERC20(weth.address);

    // Checking the balances after the recovery operation
    const optiWethBalAfter = await weth.balanceOf(klimaOptimizer.address);
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
    await truffleAssert.reverts(klimaOptimizer.connect(nonOwner).deposit(weiAmount));

    // Assertion : Transaction should revert as the caller is not the owner of the contract
    await truffleAssert.reverts(klimaOptimizer.connect(nonOwner).withdraw(weiAmount));
    
    // Assertion : Transaction should revert as the caller is not the owner of the contract
    await truffleAssert.reverts(klimaOptimizer.connect(nonOwner).reinvest(weth.address, 5000));

    // Assertion : Transaction should revert as the caller is not the owner of the contract
    await truffleAssert.reverts(klimaOptimizer.connect(nonOwner).recoverERC20(weth.address));
});
});
