const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking wallet balance on Polygon mainnet...");
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  console.log("📋 Wallet address:", address);
  
  try {
    // Get balance
    const balance = await ethers.provider.getBalance(address);
    const balanceInMatic = ethers.formatEther(balance);
    
    console.log("💎 Balance:", balanceInMatic, "MATIC");
    
    if (balance < ethers.parseEther("0.01")) {
      console.log("\n❌ Insufficient balance for deployment!");
      console.log("💰 You need at least 0.01 MATIC for deployment");
      console.log("\n💡 How to get MATIC:");
      console.log("1. Bridge from Ethereum: https://polygon.technology/bridge");
      console.log("2. Buy on exchanges: Binance, Coinbase, Kraken");
      console.log("3. Use Polygon Faucet (testnet only): https://faucet.polygon.technology/");
    } else {
      console.log("\n✅ Sufficient balance for deployment!");
      console.log("🚀 You can now run: npm run deploy:polygon");
    }
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("\n🌐 Network Info:");
    console.log("- Chain ID:", network.chainId);
    console.log("- Network Name:", network.name);
    
    // Get gas price
    const gasPrice = await ethers.provider.getFeeData();
    console.log("- Current Gas Price:", ethers.formatUnits(gasPrice.gasPrice, "gwei"), "gwei");
    
  } catch (error) {
    console.error("❌ Error checking balance:", error.message);
    console.log("\n💡 Possible solutions:");
    console.log("1. Check your internet connection");
    console.log("2. Verify the RPC URL in hardhat.config.js");
    console.log("3. Ensure your private key is correct");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  }); 