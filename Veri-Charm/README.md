# Veri-Charm Protocol

A decentralized anti-counterfeiting protocol built on BitcoinOS using Charms SDK. This system creates unforgeable digital twins of physical products that can be verified across multiple UTXO chains.

## 🎯 Core Features

- **Charms-Based Digital Twins**: Each physical product has a corresponding Charm token
- **Cross-Chain Compatibility**: Works across Bitcoin, Litecoin, Cardano UTXO chains
- **ZK-SNARK Privacy**: Private verification while maintaining proof authenticity
- **Smart Contract Logic**: Embedded business rules in Charm tokens
- **Web3 Wallet Integration**: Connect with popular wallets for seamless UX

## 🚀 Quick Start

### Prerequisites
- Rust & Cargo (latest stable)
- Node.js 18+ & npm
- Charms CLI (`cargo install charms-cli`)
- Wallet (Hiro, Nami, or compatible UTXO wallet)

### Project Structure 🏗

veri-charm-protocol/
├── README.md                    # Project overview & setup
├── contracts/                   # Rust/WASM smart contracts
│   ├── Cargo.toml
│   ├── src/
│        ├── lib.rs              # Main contract logic
│        └── charm.rs            # Charm token implementation
├── spells/                      # Transaction templates
│   ├── mint-charm.yaml
├── circuits/                    # ZK-SNARK circuits
│   │ 
│   └── product-verification.circom
├── webapp/                      # Frontend application
│   ├── src/
│       ├── services/
│       │   ├── wallet.js       # Wallet connection
│       │   └── scrolls-api.js  # Scrolls API integration
│       ├── components/
│           └── ProductCard.jsx
│  
├── scripts/                     # Deployment & utility scripts
│   │
│   └── deploy-contract.sh
├── tests/                       # Test suite
│   │
│   └── test-integration.js
└── docs/                        # Documentation
    │
    └── DEPLOYMENT.md
