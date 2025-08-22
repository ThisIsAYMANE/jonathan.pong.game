# Polygon Mainnet Deployment Guide

## 🚀 Deploying CashPongBet to Polygon Mainnet

### Prerequisites

1. **MATIC Tokens**: You need MATIC tokens in your wallet for gas fees
2. **Private Key**: Your wallet's private key in the `.env` file
3. **PolygonScan API Key** (optional): For contract verification

### Step 1: Get MATIC Tokens

You need MATIC tokens to pay for gas fees on Polygon mainnet. Here are several ways to get MATIC:

#### Option A: Bridge from Ethereum
1. Visit [Polygon Bridge](https://polygon.technology/bridge)
2. Connect your wallet
3. Bridge ETH or other tokens to Polygon
4. You'll receive MATIC tokens on Polygon

#### Option B: Buy MATIC directly
1. Use exchanges like Binance, Coinbase, or Kraken
2. Buy MATIC tokens
3. Withdraw to your wallet address on Polygon network

#### Option C: Use Polygon Faucet (Testnet only)
- For testing, use [Polygon Faucet](https://faucet.polygon.technology/)
- This only works for testnets (Amoy), not mainnet

### Step 2: Configure Your Wallet

1. **Add Polygon Network to MetaMask**:
   - Network Name: Polygon Mainnet
   - RPC URL: https://polygon-rpc.com
   - Chain ID: 137
   - Currency Symbol: MATIC
   - Block Explorer: https://polygonscan.com

2. **Ensure your `.env` file has your private key**:
   ```
   PRIVATE_KEY=your_private_key_here
   ```

### Step 3: Deploy the Contract

Once you have MATIC tokens in your wallet:

```bash
# Compile the contract
npm run compile

# Deploy to Polygon mainnet
npm run deploy:polygon
```

### Step 4: Verify the Contract (Optional)

After deployment, verify your contract on PolygonScan:

1. Go to [PolygonScan](https://polygonscan.com)
2. Search for your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Enter your contract details and source code

### Step 5: Update Frontend

After successful deployment, update your frontend with the new contract address:

1. Open `frontend/index.html`
2. Find the contract address configuration
3. Replace with your new deployed contract address

### Gas Fees

- **Estimated deployment cost**: ~0.01-0.05 MATIC
- **Transaction fees**: ~0.001-0.01 MATIC per transaction
- **Current gas price**: 30 gwei (configurable in hardhat.config.js)

### Network Information

- **Network**: Polygon Mainnet
- **Chain ID**: 137
- **RPC URL**: https://polygon-rpc.com
- **Block Explorer**: https://polygonscan.com
- **Currency**: MATIC

### Troubleshooting

#### Insufficient Balance
```
❌ Insufficient balance for deployment. You need at least 0.01 MATIC
```
**Solution**: Get MATIC tokens using one of the methods above.

#### Network Connection Issues
```
❌ Network connection failed
```
**Solution**: Check your internet connection and RPC URL in hardhat.config.js.

#### Private Key Issues
```
❌ Invalid private key
```
**Solution**: Ensure your private key is correct and doesn't include the "0x" prefix.

### Security Notes

⚠️ **Important Security Considerations**:

1. **Never share your private key**
2. **Use a dedicated wallet for deployment**
3. **Test on testnet first** (Amoy)
4. **Verify your contract after deployment**
5. **Keep your deployment wallet secure**

### Testnet Deployment

Before deploying to mainnet, test on Amoy testnet:

```bash
# Deploy to Amoy testnet
npm run deploy:amoy
```

This allows you to test the contract without spending real MATIC.

### Support

If you encounter issues:
1. Check the [Polygon documentation](https://docs.polygon.technology/)
2. Visit [Polygon Discord](https://discord.gg/polygon)
3. Check [PolygonScan](https://polygonscan.com) for network status 