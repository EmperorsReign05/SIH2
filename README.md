# Blue Carbon MRV Platform

A Blockchain-powered Monitoring, Reporting, and Verification platform for Blue Carbon ecosystems in India.

## 🌊 Overview

This platform enables transparent tracking of mangrove, seagrass, and salt marsh restoration projects through blockchain technology, generating verifiable carbon credits for the voluntary carbon market.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React.js      │    │  React Native   │    │   Node.js       │
│   Dashboard     │    │   Mobile App    │    │   Backend       │
│                 │    │                 │    │                 │
│ • Mapbox Maps   │    │ • Field Data    │    │ • Express API   │
│ • Admin Panel   │    │ • Photo Upload  │    │ • PostgreSQL    │
│ • Credit Mgmt   │    │ • Offline Sync  │    │ • IPFS Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Blockchain    │
                    │                 │
                    │ • Polygon Chain │
                    │ • Smart Contracts│
                    │ • Carbon Tokens │
                    └─────────────────┘
```

## 🚀 Features

### Core Components
- **Smart Contracts**: Carbon credit tokenization and revenue sharing
- **Mobile App**: Field data collection with offline capabilities
- **Admin Dashboard**: Project management and visualization
- **Backend API**: Data processing and blockchain integration
- **IPFS Storage**: Decentralized file storage for images and drone data

### Key Capabilities
- Immutable restoration data storage
- Tokenized carbon credits (ERC-20/ERC-721)
- Drone/IoT integration for biomass verification
- Role-based access control
- Real-time geo-visualization
- Offline-first mobile data collection

## 📁 Project Structure

```
blue-carbon-mrv/
├── contracts/           # Solidity smart contracts
├── dashboard/           # React.js admin dashboard
├── mobile-app/          # React Native mobile app
├── backend/             # Node.js/Express API
├── data-analysis/       # Python biomass models
├── docs/               # Documentation
└── deployment/         # Deployment scripts
```

## 🛠️ Tech Stack

- **Frontend**: React.js, React Native, Mapbox
- **Backend**: Node.js, Express, PostgreSQL
- **Blockchain**: Solidity, Polygon, Web3.js
- **Storage**: IPFS, Filecoin
- **Data Analysis**: Python, TensorFlow
- **DevOps**: Docker, GitHub Actions

## 🚀 Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd blue-carbon-mrv
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Start Development**
   ```bash
   # Start backend
   cd backend && npm run dev
   
   # Start dashboard
   cd dashboard && npm start
   
   # Start mobile app
   cd mobile-app && npx react-native run-android
   ```

## 📋 Prerequisites

- Node.js 18+
- Python 3.8+
- PostgreSQL 13+
- MetaMask or Web3 wallet
- Android Studio (for mobile development)

## 🔗 Smart Contracts

Deployed on Polygon Mumbai Testnet:
- CarbonCreditToken: `0x...`
- ProjectRegistry: `0x...`
- RevenueSharing: `0x...`

## 📱 Mobile App Features

- Offline data collection
- GPS tagging
- Photo uploads
- Survival rate tracking
- Blockchain sync

## 🖥️ Dashboard Features

- Real-time project mapping
- Carbon credit issuance
- Role-based access control
- Analytics and reporting

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🌍 Impact

This platform aims to:
- Restore 10,000+ hectares of blue carbon ecosystems
- Generate 100,000+ verified carbon credits
- Empower 50+ coastal communities
- Create transparent carbon markets

---

**Built with ❤️ for India's Blue Carbon Future**
