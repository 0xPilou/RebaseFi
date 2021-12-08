
// npx hardhat run --network localhost script/3_simulate_rebase.js

async function main() {


    const MEMOabi = require("../external_abi/avalanche/MEMO.json");
    const MEMO = "0x136acd46c134e8269052c62a67042d6bdedde3c9";

    const FACTORYabi = require("../artifacts/contracts/TimeOptimizerFactory.sol/TimeOptimizerFactory.json").abi;

    const TIMEOPTIMIZERFACTORY = "0x9A676e781A523b5d0C0e43731313A708CB607508";

    const provider = new ethers.providers.JsonRpcProvider();


    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x6e0a0DF2d76B97c610e5B96c32CE53b8Ab4c856C"],
    });
    whaleMEMO = await ethers.getSigner("0x6e0a0DF2d76B97c610e5B96c32CE53b8Ab4c856C");

    [user, _] = await ethers.getSigners();


    memo = new ethers.Contract(MEMO, MEMOabi, provider);
    timeOptimizerFactory = new ethers.Contract(TIMEOPTIMIZERFACTORY, FACTORYabi, provider);


    const userVaultAddr = await timeOptimizerFactory.getOwnerOptimizer(user.address);

    const memoDecimals = await memo.decimals();
    const amount = 20;
    const weiAmount = ethers.utils.parseUnits(amount.toString(), memoDecimals);
    await memo.connect(whaleMEMO).transfer(userVaultAddr, weiAmount);

    console.log("");
    console.log("------------------------- INITIATING REBASE --------------------------")
    console.log("");
    console.log("%d MEMO sent to %s.", amount, userVaultAddr);
    console.log("");
    console.log("------------------------- REBASE COMPLETED ---------------------------")
    console.log("");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });