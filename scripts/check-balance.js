const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Checking wallet balance...");
  
  // Get the signer (your wallet)
  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();
  
  console.log("📋 Wallet address:", address);
  
  // Get balance
  const balance = await ethers.provider.getBalance(address);
  const balanceInMatic = ethers.formatEther(balance);
  
  console.log("💎 Balance:", balanceInMatic, "MATIC");
  
  if (balanceInMatic === "0.0") {
    console.log("\n❌ No MATIC found! You need to get test MATIC:");
    console.log("1. Visit: https://faucet.polygon.technology/");
    console.log("2. Enter your wallet address:", address);
    console.log("3. Request test MATIC");
    console.log("4. Wait a few minutes and try again");
  } else {
    console.log("\n✅ You have sufficient MATIC to deploy!");
    console.log("🚀 You can now run: npm run deploy:amoy");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 