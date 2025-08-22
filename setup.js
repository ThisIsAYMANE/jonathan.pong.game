#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up CashPongBet project...\n');

// Check if Node.js is installed
try {
    const nodeVersion = process.version;
    console.log(`✅ Node.js version: ${nodeVersion}`);
} catch (error) {
    console.error('❌ Node.js is not installed. Please install Node.js first.');
    process.exit(1);
}

// Check if npm is available
try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm version: ${npmVersion}`);
} catch (error) {
    console.error('❌ npm is not available. Please install npm.');
    process.exit(1);
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully!');
} catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
}

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('\n🔧 Creating .env file...');
    const envContent = `# Your wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Optional: Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Optional: Enable gas reporting
REPORT_GAS=true
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created!');
    console.log('⚠️  Please edit .env and add your wallet private key');
} else {
    console.log('✅ .env file already exists');
}

// Compile contract
console.log('\n🔨 Compiling smart contract...');
try {
    execSync('npm run compile', { stdio: 'inherit' });
    console.log('✅ Contract compiled successfully!');
} catch (error) {
    console.error('❌ Contract compilation failed:', error.message);
    process.exit(1);
}

// Run tests
console.log('\n🧪 Running tests...');
try {
    execSync('npm test', { stdio: 'inherit' });
    console.log('✅ All tests passed!');
} catch (error) {
    console.error('❌ Tests failed:', error.message);
    process.exit(1);
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Edit .env file and add your wallet private key');
console.log('2. Get test MATIC from https://faucet.polygon.technology/');
console.log('3. Deploy to Amoy testnet: npm run deploy:amoy');
console.log('4. Test transactions: npm run test-transactions');
console.log('5. Open frontend/index.html in your browser to use the UI');
console.log('\n📚 For more information, see README.md'); 