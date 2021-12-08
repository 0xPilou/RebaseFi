/**
 *  Dependencies
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require('truffle-assertions');

// npx hardhat test test\2_test_TimeOptimizerFactory.js --network localhost

describe("TimeOptimizerFactory Unit Tests", function () {

  /* ABIs */
  const TimeOptimizerAbi = require("../external_abi/avalanche/TimeOptimizer.json");

  /* Provider */
  const provider = new ethers.providers.JsonRpcProvider();

  let TimeOptimizerFactory;
  let timeOptimizerFactory;

  before(async () => {
    // Resetting the Avalanche Hardhat Mainnet Fork Network to block 6844000
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://api.avax.network/ext/bc/C/rpc`,
            blockNumber: 6844000
          },
        },
      ],
    });

    [owner, mooDeployer, user, user2, _] = await ethers.getSigners();

    // Deploying the contract under test
    TimeOptimizerFactory = await ethers.getContractFactory("TimeOptimizerFactory");
    timeOptimizerFactory = await TimeOptimizerFactory.connect(owner).deploy();
  });

  it("should create a new TimeOptimizer", async () => {
    await timeOptimizerFactory.connect(user).createTimeOptimizer();

    const nbOptimizer = await timeOptimizerFactory.getOptimizerCount();
    const timeOptimizerAddr = await timeOptimizerFactory.timeOptimizers(0);
    newTimeOptimizer = new ethers.Contract(timeOptimizerAddr, TimeOptimizerAbi, provider);
    const optimizerOwner = await newTimeOptimizer.owner();

    expect(nbOptimizer).to.equal(1, "incorrect number of optimizers")
    expect(optimizerOwner).to.equal(user.address, "incorrect optimizer owner");
  });


  it("should not be able to create a second TimeOptimizer", async () => {
    await truffleAssert.reverts(
      timeOptimizerFactory.connect(user).createTimeOptimizer(),
      "User already has an Optimizer"
    );
  });


  it("should get the correct number of Optimizer(s) created", async () => {
    const numOfOptimizer = (await timeOptimizerFactory.getOptimizerCount()).toNumber();
    expect(numOfOptimizer).to.equal(1);

    await timeOptimizerFactory.connect(user2).createTimeOptimizer();

    const newNumOfOptimizer = (await timeOptimizerFactory.getOptimizerCount()).toNumber();
    expect(newNumOfOptimizer).to.equal(2);
  });
});
