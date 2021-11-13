/**
*  Dependencies
*/
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require('truffle-assertions');

// npx hardhat test test\5_test_MooCurveZap.js --network localhost

describe("MooCurveZap Unit Tests", function () {  
    this.timeout(40000);
    
    /* ABIs */
    const DAIabi = require("../external_abi/avalanche/DAI.json");
    const USDCabi = require("../external_abi/avalanche/USDC.json");
    const USDTabi = require("../external_abi/avalanche/USDT.json");
    const WAVAXabi = require("../external_abi/avalanche/WAVAX.json");
    const CRVLPabi = require("../external_abi/avalanche/CRVLP.json");

    /* Addresses */
    const CURVEPOOL = "0x7f90122BF0700F9E7e1F688fe926940E8839F353"; 
    const BEEFYVAULT = "0x79A44dc13e5863Cf4AB36ab13e038A5F16861Abc";
    const DAI = "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70";
    const USDC = "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664";
    const USDT = "0xc7198437980c041c805A1EDcbA50c1Ce5db95118";
    const WAVAX = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
    const CRVLP = "0x1337BedC9D22ecbe766dF105c9623922A27963EC";

    /* Provider */
    const provider = new ethers.providers.JsonRpcProvider();   

    // Instantiating the existing mainnet fork contracts
    dai = new ethers.Contract(DAI, DAIabi, provider);
    usdc = new ethers.Contract(USDC, USDCabi, provider);
    usdt = new ethers.Contract(USDT, USDTabi, provider);
    wavax = new ethers.Contract(WAVAX, WAVAXabi, provider);
    crvlp = new ethers.Contract(CRVLP, CRVLPabi, provider);

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
              blockNumber:6902000
            },
          },
        ],
    });

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x339Dab47bdD20b4c05950c4306821896CFB1Ff1A"],
      });
    whaleStable = await ethers.getSigner("0x339Dab47bdD20b4c05950c4306821896CFB1Ff1A");
   
    // Define the signers required for the tests
    [user, nonOwner, _] = await ethers.getSigners();   

    // Deploy UniV2OptimizerFactory
    MooCurveZap = await ethers.getContractFactory("MooCurveZap");
    mooCurveZap = await MooCurveZap.connect(user).deploy(
        CURVEPOOL,
        BEEFYVAULT
    );
    });


    it("should zap DAI into 3CRV LP Token", async () => {
        const daiDecimals = await dai.decimals();
        const amount = 100;
        const weiAmount = ethers.utils.parseUnits(amount.toString(), daiDecimals);
        await dai.connect(whaleStable).transfer(user.address, weiAmount);

        const crvLpBalBefore = await crvlp.balanceOf(user.address);

        await dai.connect(user).approve(mooCurveZap.address, weiAmount);
        await mooCurveZap.connect(user).zap(dai.address, weiAmount);

        const crvLpBalAfter = await crvlp.balanceOf(user.address);
        const stableBalAfter = await dai.balanceOf(user.address);
        
        console.log("3CRV LP Balance : ", ethers.utils.formatEther(crvLpBalAfter));
        console.log("Stablecoin Balance : ", ethers.utils.formatUnits(stableBalAfter, daiDecimals));

        expect(crvLpBalAfter > crvLpBalBefore).to.equal(true);
    });

    it("should zap USDC into 3CRV LP Token", async () => {
        const usdcDecimals = await usdc.decimals();
        const amount = 100;
        const weiAmount = ethers.utils.parseUnits(amount.toString(), usdcDecimals);
        await usdc.connect(whaleStable).transfer(user.address, weiAmount);

        const crvLpBalBefore = await crvlp.balanceOf(user.address);

        await usdc.connect(user).approve(mooCurveZap.address, weiAmount);
        await mooCurveZap.connect(user).zap(usdc.address, weiAmount);

        const crvLpBalAfter = await crvlp.balanceOf(user.address);
        const stableBalAfter = await usdc.balanceOf(user.address);

        console.log("3CRV LP Balance : ", ethers.utils.formatEther(crvLpBalAfter));
        console.log("Stablecoin Balance : ", ethers.utils.formatUnits(stableBalAfter, usdcDecimals));

        expect(crvLpBalAfter > crvLpBalBefore).to.equal(true);
    });

    it("should zap USDT into 3CRV LP Token", async () => {
        const usdtDecimals = await usdt.decimals();
        const amount = 100;
        const weiAmount = ethers.utils.parseUnits(amount.toString(), usdtDecimals);
        await usdt.connect(whaleStable).transfer(user.address, weiAmount);

        const crvLpBalBefore = await crvlp.balanceOf(user.address);

        await usdt.connect(user).approve(mooCurveZap.address, weiAmount);
        await mooCurveZap.connect(user).zap(usdt.address, weiAmount);

        const crvLpBalAfter = await crvlp.balanceOf(user.address);
        const stableBalAfter = await usdt.balanceOf(user.address);

        console.log("3CRV LP Balance : ", ethers.utils.formatEther(crvLpBalAfter));
        console.log("Stablecoin Balance : ", ethers.utils.formatUnits(stableBalAfter, usdtDecimals));

        expect(crvLpBalAfter > crvLpBalBefore).to.equal(true);

    });

    it("should not be able to zap WAVAX into 3CRV LP Token", async () => {
        
    });

    it("should not be able to zap more token than the balance allow", async () => {
    });
});

