/**
*  Dependencies
*/
const { expect } = require("chai");
const { ethers } = require("hardhat");
const truffleAssert = require('truffle-assertions');

// npx hardhat test test\5_test_MooCurveZap.js --network localhost

describe("MooCurveZap Unit Tests", function () {  

    /* ABIs */
    const DAIabi = require("../external_abi/avalanche/DAI.json");
    const USDCabi = require("../external_abi/avalanche/USDC.json");
    const USDTabi = require("../external_abi/avalanche/USDT.json");
    const WAVAXabi = require("../external_abi/avalanche/WAVAX.json");
    const CRVLPabi = require("../external_abi/avalanche/CRVLP.json");
    const MOOabi = require("../external_abi/avalanche/MOO.json");

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
    moo = new ethers.Contract(BEEFYVAULT, MOOabi, provider);
    
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
    [deployer, user, nonOwner, _] = await ethers.getSigners();   

    // Deploy MooCurveZap
    MooCurveZap = await ethers.getContractFactory("MooCurveZap");
    mooCurveZap = await MooCurveZap.connect(deployer).deploy(
        CURVEPOOL,
        BEEFYVAULT
    );
    });

    beforeEach(async function () {
        const mooBal = await moo.balanceOf(user.address);
        if(ethers.utils.formatEther(mooBal) > 0) {
            await moo.connect(user).transfer(whaleStable.address, mooBal);
        }
    });

    it("should zap DAI into 3CRV LP Token", async () => {
        const daiDecimals = await dai.decimals();
        const amount = 500;
        const weiAmount = ethers.utils.parseUnits(amount.toString(), daiDecimals);
        await dai.connect(whaleStable).transfer(user.address, weiAmount);

        const mooBalBefore = await moo.balanceOf(user.address);

        await dai.connect(user).approve(mooCurveZap.address, weiAmount);
        await mooCurveZap.connect(user).zap(dai.address, weiAmount);

        const mooBalAfter = await moo.balanceOf(user.address);
    
        expect(mooBalAfter > mooBalBefore).to.equal(true);
    });

    it("should zap USDC into 3CRV LP Token", async () => {
        const usdcDecimals = await usdc.decimals();
        const amount = 100;
        const weiAmount = ethers.utils.parseUnits(amount.toString(), usdcDecimals);
        await usdc.connect(whaleStable).transfer(user.address, weiAmount);

        const mooBalBefore = await moo.balanceOf(user.address);

        await usdc.connect(user).approve(mooCurveZap.address, weiAmount);
        await mooCurveZap.connect(user).zap(usdc.address, weiAmount);

        const mooBalAfter = await moo.balanceOf(user.address);

        expect(mooBalAfter > mooBalBefore).to.equal(true);
    });

    it("should zap USDT into 3CRV LP Token", async () => {
        const usdtDecimals = await usdt.decimals();
        const amount = 100;
        const weiAmount = ethers.utils.parseUnits(amount.toString(), usdtDecimals);
        await usdt.connect(whaleStable).transfer(user.address, weiAmount);

        const mooBalBefore = await moo.balanceOf(user.address);

        await usdt.connect(user).approve(mooCurveZap.address, weiAmount);
        await mooCurveZap.connect(user).zap(usdt.address, weiAmount);

        const mooBalAfter = await moo.balanceOf(user.address);

        expect(mooBalAfter > mooBalBefore).to.equal(true);
    });

    it("should unzap 100 3CRV LP Token in DAI", async () => {
        const amount = 100;
        const weiAmount = ethers.utils.parseEther(amount.toString());
        await moo.connect(whaleStable).transfer(user.address, weiAmount);


        const mooBalBefore = await moo.balanceOf(user.address);
        const daiBalBefore = await dai.balanceOf(user.address);

        await moo.connect(user).approve(mooCurveZap.address, weiAmount);
        await mooCurveZap.connect(user).unzap(dai.address, weiAmount);

        const mooBalAfter = await moo.balanceOf(user.address);
        const daiBalAfter = await dai.balanceOf(user.address);

        expect(mooBalAfter < mooBalBefore).to.equal(true);
        expect(daiBalAfter > daiBalBefore).to.equal(true);
    });

    it("should unzap 100 3CRV LP Token in USDC", async () => {
        const amount = 100;
        const weiAmount = ethers.utils.parseEther(amount.toString());
        await moo.connect(whaleStable).transfer(user.address, weiAmount);


        const mooBalBefore = await moo.balanceOf(user.address);
        const usdcBalBefore = await usdc.balanceOf(user.address);

        await moo.connect(user).approve(mooCurveZap.address, weiAmount);
        await mooCurveZap.connect(user).unzap(usdc.address, weiAmount);

        const mooBalAfter = await moo.balanceOf(user.address);
        const usdcBalAfter = await usdc.balanceOf(user.address);

        expect(mooBalAfter < mooBalBefore).to.equal(true);
        expect(usdcBalAfter > usdcBalBefore).to.equal(true);
    });

    it("should unzap 100 3CRV LP Token in USDT", async () => {
        const amount = 100;
        const weiAmount = ethers.utils.parseEther(amount.toString());
        await moo.connect(whaleStable).transfer(user.address, weiAmount);


        const mooBalBefore = await moo.balanceOf(user.address);
        const usdtBalBefore = await usdt.balanceOf(user.address);

        await moo.connect(user).approve(mooCurveZap.address, weiAmount);
        await mooCurveZap.connect(user).unzap(usdt.address, weiAmount);

        const mooBalAfter = await moo.balanceOf(user.address);
        const usdtBalAfter = await usdt.balanceOf(user.address);

        expect(mooBalAfter < mooBalBefore).to.equal(true);
        expect(usdtBalAfter > usdtBalBefore).to.equal(true);
    });

//    it("should not be able to zap WAVAX into 3CRV LP Token", async () => {
//        const amount = 300;
//        const weiAmount = ethers.utils.parseUnits(amount.toString(), daiDecimals);
//        await dai.connect(whaleStable).transfer(user.address, weiAmount);
//
//        const mooBalBefore = await moo.balanceOf(user.address);
//
//        await dai.connect(user).approve(mooCurveZap.address, weiAmount);
//        await mooCurveZap.connect(user).zap(dai.address, weiAmount);
//
//        const mooBalAfter = await moo.balanceOf(user.address);
//    
//        expect(mooBalAfter > mooBalBefore).to.equal(true);
//        
//    });

    it("should not be able to zap more token than the balance allow", async () => {
    });

    it("should pause the zapper contract", async () => {
        await truffleAssert.reverts(mooCurveZap.connect(user).pauseZapper());

        const pauseStatusBefore = await mooCurveZap.pauseStatus();

        await mooCurveZap.connect(deployer).pauseZapper();

        const pauseStatusAfter = await mooCurveZap.pauseStatus();

        expect(pauseStatusBefore).to.equal(false);
        expect(pauseStatusAfter).to.equal(true);

        const amount = 100;
        const weiAmount = ethers.utils.parseEther(amount.toString());
        await moo.connect(whaleStable).transfer(user.address, weiAmount);
        await dai.connect(whaleStable).transfer(user.address, weiAmount);

        await dai.connect(user).approve(mooCurveZap.address, weiAmount);
        await moo.connect(user).approve(mooCurveZap.address, weiAmount);

        await truffleAssert.reverts(mooCurveZap.connect(user).zap(dai.address, weiAmount), "Contract paused");
        await truffleAssert.reverts(mooCurveZap.connect(user).unzap(dai.address, weiAmount), "Contract paused");
    });

    it("should unpause the zapper contract", async () => {
        await truffleAssert.reverts(mooCurveZap.connect(user).unpauseZapper());

        const pauseStatusBefore = await mooCurveZap.pauseStatus();

        await mooCurveZap.connect(deployer).unpauseZapper();

        const pauseStatusAfter = await mooCurveZap.pauseStatus();

        expect(pauseStatusBefore).to.equal(true);
        expect(pauseStatusAfter).to.equal(false);

        const amount = 100;
        const weiAmount = ethers.utils.parseEther(amount.toString());
        await moo.connect(whaleStable).transfer(user.address, weiAmount);
        await dai.connect(whaleStable).transfer(user.address, weiAmount);

        await dai.connect(user).approve(mooCurveZap.address, weiAmount);
        await moo.connect(user).approve(mooCurveZap.address, weiAmount);

        const mooBalBefore = await moo.balanceOf(user.address);
        await mooCurveZap.connect(user).zap(dai.address, weiAmount);
        const mooBalAfter = await moo.balanceOf(user.address);
        expect(mooBalAfter > mooBalBefore).to.equal(true, "DAI zap failed");

        daiBalBefore = await dai.balanceOf(user.address);
        await mooCurveZap.connect(user).unzap(dai.address, weiAmount);
        daiBalAfter = await dai.balanceOf(user.address);
        expect(daiBalAfter > daiBalBefore).to.equal(true, "Unzap failed");


    });
});

