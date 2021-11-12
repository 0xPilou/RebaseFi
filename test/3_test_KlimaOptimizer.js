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
});
