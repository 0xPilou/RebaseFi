async function main() {

    /* Addresses */
    const CURVEPOOL = "0x7f90122BF0700F9E7e1F688fe926940E8839F353"; 
    const BEEFYVAULT = "0x79A44dc13e5863Cf4AB36ab13e038A5F16861Abc";

    /* MooCurveZap Deployment */
    MooCurveZap = await ethers.getContractFactory("MooCurveZap");
    mooCurveZap = await MooCurveZap.deploy(
        CURVEPOOL,
        BEEFYVAULT
    );
    console.log("MooCurveZap deployed to:", mooCurveZap.address);

    /* TimeOptimizerFactory Deployment */
    TimeOptimizerFactory = await ethers.getContractFactory("TimeOptimizerFactory");
    timeOptimizerFactory = await TimeOptimizerFactory.deploy();

    console.log("TimeOptimizerFactory deployed to:", timeOptimizerFactory.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });