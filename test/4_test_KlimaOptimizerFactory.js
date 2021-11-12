/**
 *  Dependencies
 */
 const { expect } = require("chai");
 const { ethers } = require("hardhat");
 const truffleAssert = require('truffle-assertions');
 const fs = require('fs');

const polygonAlchemyKey = fs.readFileSync("secretPolygon").toString().trim();

// npx hardhat test test\4_test_KlimaOptimizerFactory.js --network localhost

describe("KlimaOptimizerFactory Unit Tests", function () {

    /* ABIs */
    const KlimaOptimizerAbi = require("../external_abi/KlimaOptimizer.json");

    /* Adresses */
    // Sushi Router
    const SUSHIROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; 

    // KLIMADAO Klima Staking
    const KLIMASTAKING = "0x25d28a24Ceb6F81015bB0b2007D795ACAc411b4d";

    /* Provider */
    const provider = new ethers.providers.JsonRpcProvider();

    let KlimaOptimizerFactory;
    let klimaOptimizerFactory;

    before(async () => {

    /* Resetting the Polygon Hardhat Mainnet Fork Network to block 6263382 */
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

        [owner, user, user2, _] = await ethers.getSigners(); 

        // Deploying the contract under test
        KlimaOptimizerFactory = await ethers.getContractFactory("KlimaOptimizerFactory");
        klimaOptimizerFactory = await KlimaOptimizerFactory.connect(owner).deploy();
    });

    it("should create a new KlimaOptimizer", async () => {
        await klimaOptimizerFactory.connect(user).createKlimaOptimizer(KLIMASTAKING, SUSHIROUTER);

        const nbOptimizer = await klimaOptimizerFactory.getOptimizerCount();
        const klimaOptimizerAddr = await klimaOptimizerFactory.klimaOptimizers(0);
        newKlimaOptimizer = new ethers.Contract(klimaOptimizerAddr, KlimaOptimizerAbi, provider);      
        const optimizerOwner = await newKlimaOptimizer.owner();

        expect(nbOptimizer).to.equal(1, "incorrect number of optimizers")
        expect(optimizerOwner).to.equal(user.address, "incorrect optimizer owner");
    }); 


    it("should get the correct number of Optimizer(s) created", async () => {
        const numOfOptimizer = (await klimaOptimizerFactory.getOptimizerCount()).toNumber();
        expect(numOfOptimizer).to.equal(1);

        await klimaOptimizerFactory.connect(user2).createKlimaOptimizer(KLIMASTAKING, SUSHIROUTER);

        const newNumOfOptimizer = (await klimaOptimizerFactory.getOptimizerCount()).toNumber();
        expect(newNumOfOptimizer).to.equal(2);
    });
});
