const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying CashPongBet deployment...");
  
  const contractAddress = "0xCc50ce04FF06446E0Af663655A4F2B4dFEDb9140";
  console.log("📋 Contract address:", contractAddress);
  
  // Get the signer
  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  console.log("📋 Deployer address:", deployerAddress);
  
  try {
    // Get contract instance
    const CashPongBet = await ethers.getContractFactory("CashPongBet");
    const cashPongBet = CashPongBet.attach(contractAddress);
    
    // Wait a moment for the contract to be fully deployed
    console.log("⏳ Waiting for contract to be fully deployed...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check contract owner
    console.log("🔍 Checking contract owner...");
    const owner = await cashPongBet.owner();
    console.log("✅ Contract owner:", owner);
    
    // Check room counter
    console.log("🔍 Checking room counter...");
    const roomCounter = await cashPongBet.roomCounter();
    console.log("✅ Room counter:", roomCounter.toString());
    
    // Check contract balance
    console.log("🔍 Checking contract balance...");
    const balance = await ethers.provider.getBalance(contractAddress);
    console.log("✅ Contract balance:", ethers.formatEther(balance), "MATIC");
    
    console.log("\n🎉 Contract verification successful!");
    console.log("📋 Contract is ready for use on Amoy testnet");
    console.log("🌐 View on Polygonscan: https://amoy.polygonscan.com/address/" + contractAddress);
    
  } catch (error) {
    console.error("❌ Error verifying contract:", error.message);
    console.log("\n💡 The contract might still be processing. Try again in a few minutes.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 