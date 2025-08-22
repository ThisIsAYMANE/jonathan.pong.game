# CashPongBet Smart Contract

A decentralized Pong game betting system built on Polygon Amoy testnet. Players can create rooms, join matches, and bet MATIC tokens on Pong games.

## 🎮 Features

- **Room Creation**: Players can create betting rooms with specified opponents
- **Match Joining**: Invited players can join rooms by matching the bet amount
- **Point Scoring**: Players can score points during the game
- **Automatic Payouts**: Winners receive 90% of the total pot (10% fee to owner)
- **Forfeit System**: Players can claim victory if opponent is inactive for 10+ minutes
- **Owner Controls**: Contract owner can force-end games in emergencies

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **MetaMask** wallet with Amoy testnet configured
4. **Test MATIC** from [Polygon Faucet](https://faucet.polygon.technology/)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your wallet private key:
   ```
   PRIVATE_KEY=your_private_key_here
   ```

3. **Compile the contract:**
   ```bash
   npm run compile
   ```

### Deployment

#### Deploy to Amoy Testnet
```bash
npm run deploy:amoy
```

#### Deploy to Local Network
```bash
# Start local node
npm run node

# In another terminal, deploy
npm run deploy:local
```

### Testing

#### Run Unit Tests
```bash
npm test
```

#### Test Transactions Between Players
```bash
npm run test-transactions
```

## 📋 Contract Functions

### For Players

- `createRoom(address opponent)` - Create a new betting room
- `joinRoom(uint256 roomId)` - Join an existing room
- `scorePoint(uint256 roomId, address scorer)` - Score a point
- `claimVictoryByForfeit(uint256 roomId)` - Claim victory if opponent inactive

### For Owner

- `ownerForceEnd(uint256 roomId)` - Force end a game (emergency only)

### View Functions

- `getRoom(uint256 roomId)` - Get room details
- `getBalance()` - Get contract balance

## 🎯 Game Rules

1. **Room Creation**: Player A creates room with bet amount and opponent
2. **Joining**: Player B must join with matching bet amount
3. **Scoring**: First player to reach 10 points wins
4. **Payouts**: Winner gets 90% of total pot, owner gets 10% fee
5. **Forfeit**: Players can claim victory after 10 minutes of opponent inactivity

## 🔧 Development

### Project Structure
```
├── CashPongBet.sol          # Main smart contract
├── scripts/
│   ├── deploy.js            # Deployment script
│   └── test-transactions.js # Transaction testing
├── test/
│   └── CashPongBet.test.js # Unit tests
├── hardhat.config.js        # Hardhat configuration
└── package.json            # Dependencies
```

### Local Development

1. **Start local node:**
   ```bash
   npm run node
   ```

2. **Deploy to local network:**
   ```bash
   npm run deploy:local
   ```

3. **Test with console:**
   ```bash
   npm run console
   ```

### Network Configuration

The project is configured for:
- **Local Development**: `localhost:8545`
- **Polygon Amoy Testnet**: `https://rpc-amoy.polygon.technology/`

## 💰 Getting Test MATIC

1. Visit [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Amoy" testnet
3. Enter your wallet address
4. Receive free test MATIC

## 🔍 Contract Verification

After deployment, verify your contract on Polygonscan:

```bash
npx hardhat verify --network amoy DEPLOYED_CONTRACT_ADDRESS
```

## 📊 Gas Optimization

The contract includes:
- Optimized Solidity compiler settings
- Efficient storage patterns
- Minimal external calls

## 🛡️ Security Features

- **Access Control**: Only room participants can score points
- **Reentrancy Protection**: Safe external calls
- **Input Validation**: Comprehensive parameter checks
- **Emergency Controls**: Owner can force-end games

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the test files for usage examples
- Review the contract comments
- Open an issue on GitHub

---

**Happy Gaming! 🏓** 