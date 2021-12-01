async function main() {


    const MEMOabi = require("../external_abi/avalanche/MEMO.json");
    const MEMO = "0x136acd46c134e8269052c62a67042d6bdedde3c9";

    const provider = new ethers.providers.JsonRpcProvider();

    memo = new ethers.Contract(MEMO, MEMOabi, provider);


    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x6e0a0DF2d76B97c610e5B96c32CE53b8Ab4c856C"],
    });
    whaleMEMO = await ethers.getSigner("0x6e0a0DF2d76B97c610e5B96c32CE53b8Ab4c856C");

    [user, _] = await ethers.getSigners();

    const memoDecimals = await memo.decimals();
    const amount = 100;
    const weiAmount = ethers.utils.parseUnits(amount.toString(), memoDecimals);
    await memo.connect(whaleMEMO).transfer(user.address, weiAmount);

    console.log("--------------------------------------------------------------------")
    console.log("%d MEMO sent to %s.", amount, user.address);
    console.log("--------------------------------------------------------------------")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });