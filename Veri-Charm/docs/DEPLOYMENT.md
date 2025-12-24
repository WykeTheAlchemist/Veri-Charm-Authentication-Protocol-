# Veri-Charm Protocol Deployment Guide

This guide walks through deploying the Veri-Charm Protocol to live testnet.

## Prerequisites

### Required Software
- **Rust** (1.70+): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Charms CLI**: `cargo install charms-cli`
- **Node.js** (18+): `nvm install 18 && nvm use 18`
- **Git**: `sudo apt install git` (Linux) or `brew install git` (Mac)

### Required Accounts
1. **BitcoinOS Testnet Wallet** (Hiro or compatible)
2. **Blockfrost API Key** (for Cardano support)
3. **Charms Developer Account** (register at dev.charms.dev)

## Step 1: Clone and Setup

```bash
# Clone repository
git clone https://github.com/WykeTheAlchemist/veri-charm-protocol.git
cd veri-charm-protocol

# Install dependencies
cd contracts && cargo build
cd ../webapp && npm install

# Copy environment template
cp .env.example .env
