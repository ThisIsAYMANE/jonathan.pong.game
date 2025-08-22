const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying CashPongBet contract to Polygon mainnet...");
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying with account:", await deployer.getAddress());
  
  // Get balance
  const balance = await ethers.provider.getBalance(await deployer.getAddress());
  console.log("💎 Account balance:", ethers.formatEther(balance), "MATIC");
  
  // Check if balance is sufficient
  if (balance < ethers.parseEther("0.01")) {
    console.log("❌ Insufficient balance for deployment. You need at least 0.01 MATIC");
    console.log("💡 Get MATIC from: https://polygon.technology/bridge");
    return;
  }
  
  console.log("🔧 Compiling contract...");
  
  // Deploy the contract
  const CashPongBet = await ethers.getContractFactory("CashPongBet");
  console.log("📦 Deploying CashPongBet...");
  
  const cashPongBet = await CashPongBet.deploy();
  await cashPongBet.waitForDeployment();
  
  const contractAddress = await cashPongBet.getAddress();
  console.log("✅ CashPongBet deployed to:", contractAddress);
  console.log("📋 Contract owner:", await cashPongBet.owner());
  
  // Test a simple function
  const roomCounter = await cashPongBet.roomCounter();
  console.log("🎮 Initial room counter:", roomCounter.toString());
  
  console.log("\n🎉 Deployment successful!");
  console.log("📋 Contract Address:", contractAddress);
  console.log("🔗 View on PolygonScan: https://polygonscan.com/address/" + contractAddress);
  console.log("\n📝 Next steps:");
  console.log("1. Verify contract on PolygonScan");
  console.log("2. Update frontend with new contract address");
  console.log("3. Test the contract functions");
  
  // Save deployment info
  const deploymentInfo = {
    network: "Polygon Mainnet",
    contractAddress: contractAddress,
    deployer: await deployer.getAddress(),
    owner: await cashPongBet.owner(),
    deploymentTime: new Date().toISOString(),
    chainId: 137
  };
  
  console.log("\n📄 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }); 