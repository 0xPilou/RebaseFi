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

  /* Adresses */
  // TradeJoe Router
  const JOEROUTER = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";

  // Wonderland Time Staking
  const TIMESTAKING = "0x4456B87Af11e87E329AB7d7C7A246ed1aC2168B9";

  const CURVEPOOL = "0x7f90122BF0700F9E7e1F688fe926940E8839F353";
  const BEEFYVAULT = "0x79A44dc13e5863Cf4AB36ab13e038A5F16861Abc";

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

    // Deploy MooCurveZap contract
    MooCurveZap = await ethers.getContractFactory("MooCurveZap");
    mooCurveZap = await MooCurveZap.connect(mooDeployer).deploy(
      CURVEPOOL,
      BEEFYVAULT
    );
  });

  it("should create a new TimeOptimizer", async () => {
    await timeOptimizerFactory.connect(user).createTimeOptimizer(TIMESTAKING, JOEROUTER, mooCurveZap.address);

    const nbOptimizer = await timeOptimizerFactory.getOptimizerCount();
    const timeOptimizerAddr = await timeOptimizerFactory.timeOptimizers(0);
    newTimeOptimizer = new ethers.Contract(timeOptimizerAddr, TimeOptimizerAbi, provider);
    const optimizerOwner = await newTimeOptimizer.owner();

    expect(nbOptimizer).to.equal(1, "incorrect number of optimizers")
    expect(optimizerOwner).to.equal(user.address, "incorrect optimizer owner");
  });


  it("should not be able to create a second TimeOptimizer", async () => {
    await truffleAssert.reverts(
      timeOptimizerFactory.connect(user).createTimeOptimizer(TIMESTAKING, JOEROUTER, mooCurveZap.address),
      "User already has an Optimizer"
    );
  });


  it("should get the correct number of Optimizer(s) created", async () => {
    const numOfOptimizer = (await timeOptimizerFactory.getOptimizerCount()).toNumber();
    expect(numOfOptimizer).to.equal(1);

    await timeOptimizerFactory.connect(user2).createTimeOptimizer(TIMESTAKING, JOEROUTER, mooCurveZap.address);

    const newNumOfOptimizer = (await timeOptimizerFactory.getOptimizerCount()).toNumber();
    expect(newNumOfOptimizer).to.equal(2);
  });
});
