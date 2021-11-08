/**
*  Dependencies
*/
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require('truffle-assertions');

describe("TimeOptimizer Unit Tests", function () {  
    this.timeout(40000);
    
    /* ABIs */
    const MEMOabi = require("../external_abi/MEMO.json");   
    const WETHabi = require("../external_abi/WETH.json");

    /* Addresses */
    const MEMO = "0x136acd46c134e8269052c62a67042d6bdedde3c9"; 
    const WETH = "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB";
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

    // Resetting the Avalanche Hardhat Mainnet Fork Network to block 6263382
    await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: `https://api.avax.network/ext/bc/C/rpc`,
              blockNumber: 6685000
            },
          },
        ],
    });

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0xdF42181cdE9eCB156a5FdeF7561ADaB14937AA26"],
      });
    whaleMEMO = await ethers.getSigner("0xdF42181cdE9eCB156a5FdeF7561ADaB14937AA26");
    
    // Define the signers required for the tests
    [user, nonOwner, _] = await ethers.getSigners();   

    // Deploy UniV2OptimizerFactory
    TimeOptimizer = await ethers.getContractFactory("TimeOptimizer");
    timeOptimizer = await TimeOptimizer.connect(user).deploy(
        TIMESTAKING,
        JOEROUTER
    );
    const memoDecimals = await memo.decimals();
    const amount = ethers.utils.parseUnits("100", memoDecimals);
    await memo.connect(whaleMEMO).transfer(user.address, amount)

    });

    // Impersonate a MEMO Whale to transfer MEMO to the TimeOptimizer contract to simulate the rebase
    async function rebase() {
        const memoDecimals = await memo.decimals();
        const amount = ethers.utils.parseUnits("10", memoDecimals);
        await memo.connect(whaleMEMO).transfer(timeOptimizer.address, amount)
    };

    it("should deposit MEMO Token into the TimeOptimizer Contract", async () => {
    
        const amount = await memo.balanceOf(user.address);    

        await timeOptimizer.connect(user).deposit(amount);    

        const timeOptBalance = await memo.balanceOf(timeOptimizer.address);
        const mum = await timeOptimizer.mum();    

        expect(amount).to.equal(timeOptBalance)
        expect(amount).to.equal(mum)
        expect(timeOptBalance).to.equal(mum)  
        await rebase();
    });

    it("should reinvest 50% of the rebase in WETH", async () => {
        const basisPoint = 5000;
        const memoDecimals = await memo.decimals();

        wethBalBefore = await weth.balanceOf(user.address);
        timeOptiBalBefore = await memo.balanceOf(timeOptimizer.address);
        mumBefore = await timeOptimizer.mum();

        timeOptimizer.connect(user).reinvest(weth.address, basisPoint);

        wethBalAfter = await weth.balanceOf(user.address);
        timeOptiBalAfter = await memo.balanceOf(timeOptimizer.address);
        mumAfter = await timeOptimizer.mum();

        console.log("WETH Balance Before : ", ethers.utils.formatEther(wethBalBefore));
        console.log("WETH Balance After: ", ethers.utils.formatEther(wethBalAfter));

        console.log("TimeOpti MEMO Balance Before: ", ethers.utils.formatUnits(timeOptiBalBefore, memoDecimals));
        console.log("TimeOpti MEMO Balance After: ", ethers.utils.formatUnits(timeOptiBalAfter, memoDecimals));

        console.log("MUM Before : ", ethers.utils.formatUnits(mumBefore));
        console.log("MUM After : ", ethers.utils.formatUnits(mumAfter));
        expect(wethBalBefore < wethBalAfter).to.equal(true)
        expect(timeOptiBalAfter).to.equal(timeOptiBalBefore.sub(timeOptiBalBefore.mul(basisPoint).div(10000)))
    });

});

