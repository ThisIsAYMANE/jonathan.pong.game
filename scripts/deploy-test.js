const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying CashPongBet contract to test network...");
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying with account:", await deployer.getAddress());
  
  // Get balance
  const balance = await ethers.provider.getBalance(await deployer.getAddress());
  console.log("💎 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Deploy the contract
  const CashPongBet = await ethers.getContractFactory("CashPongBet");
  const cashPongBet = await CashPongBet.deploy();
  await cashPongBet.waitForDeployment();
  
  const contractAddress = await cashPongBet.getAddress();
  console.log("✅ CashPongBet deployed to:", contractAddress);
  console.log("📋 Contract owner:", await cashPongBet.owner());
  
  // Test a simple function
  const roomCounter = await cashPongBet.roomCounter();
  console.log("🎮 Initial room counter:", roomCounter.toString());
  
  console.log("\n🎉 Deployment successful! You can now:");
  console.log("1. Test the contract functions");
  console.log("2. Get more MATIC from the faucet for Amoy deployment");
  console.log("3. Deploy to Amoy testnet when ready");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }); 