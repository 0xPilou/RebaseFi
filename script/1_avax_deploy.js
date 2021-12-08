// npx hardhat run --network localhost script/1_avax_deploy.js

async function main() {

    /* Addresses */
    const CURVEPOOL = "0x7f90122BF0700F9E7e1F688fe926940E8839F353"; 
    const BEEFYVAULT = "0x79A44dc13e5863Cf4AB36ab13e038A5F16861Abc";


    console.log("");
    console.log("-------------------------- INITIATING DEPLOYMENT ------------------------------");
    console.log("");

    /* MooCurveZap Deployment */
    MooCurveZap = await ethers.getContractFactory("MooCurveZap");
    mooCurveZap = await MooCurveZap.deploy(
        CURVEPOOL,
        BEEFYVAULT
    );

    console.log("MooCurveZap deployed to:", mooCurveZap.address);
    console.log("");
    console.log("-------------------------------------------------------------------------------");

    /* TimeOptimizerFactory Deployment */
    TimeOptimizerFactory = await ethers.getContractFactory("TimeOptimizerFactory");
    timeOptimizerFactory = await TimeOptimizerFactory.deploy();

    console.log("");
    console.log("TimeOptimizerFactory deployed to:", timeOptimizerFactory.address);
    console.log("");
    console.log("--------------------------- DEPLOYMENT COMPLETED ------------------------------");
    console.log("");

  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });