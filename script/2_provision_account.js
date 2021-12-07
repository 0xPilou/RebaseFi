async function main() {


    const MEMOabi = require("../external_abi/avalanche/MEMO.json");
    const MEMO = "0x136acd46c134e8269052c62a67042d6bdedde3c9";

    const TRICRYPTOabi = require("../external_abi/avalanche/TRICRYPTOLP.json"); 
    const TRICRYPTO = "0xe1a8EeA58D63Ea64d00365531D266C2AD1f62FC4";

    const provider = new ethers.providers.JsonRpcProvider();

    memo = new ethers.Contract(MEMO, MEMOabi, provider);
    triCrypto = new ethers.Contract(TRICRYPTO, TRICRYPTOabi, provider);


    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0x6e0a0DF2d76B97c610e5B96c32CE53b8Ab4c856C"],
    });
    whaleMEMO = await ethers.getSigner("0x6e0a0DF2d76B97c610e5B96c32CE53b8Ab4c856C");

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: ["0xCe36c06D5601f835B2956433DB0CaB5FeeF59b32"],
    });
    whale3Crypto = await ethers.getSigner("0xCe36c06D5601f835B2956433DB0CaB5FeeF59b32");

    
    [user, _] = await ethers.getSigners();

   const memoDecimals = await memo.decimals();
   const amount = 100;
   const weiAmount = ethers.utils.parseUnits(amount.toString(), memoDecimals);
   await memo.connect(whaleMEMO).transfer(user.address, weiAmount);

    const amount3Crypto = 10;
    const weiAmount3Crypto = ethers.utils.parseEther(amount3Crypto.toString());
    await triCrypto.connect(whale3Crypto).transfer(user.address, weiAmount3Crypto);

    console.log("--------------------------------------------------------------------")
    console.log("%d MEMO sent to %s.", amount, user.address);
    console.log("--------------------------------------------------------------------")

    console.log("--------------------------------------------------------------------")
    console.log("%d TRICRYPTO LP sent to %s.", amount3Crypto, user.address);
    console.log("--------------------------------------------------------------------")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });