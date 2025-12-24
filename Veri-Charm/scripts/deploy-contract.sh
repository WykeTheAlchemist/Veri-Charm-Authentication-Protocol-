#!/bin/bash

# Veri-Charm Protocol Deployment Script
# Deploys contracts to Bitcoin testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Veri-Charm Protocol Deployment${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "\n${YELLOW}Checking prerequisites...${NC}"
    
    # Check Rust
    if ! command -v rustc &> /dev/null; then
        echo -e "${RED}Error: Rust not found. Please install Rust first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Rust installed${NC}"
    
    # Check Cargo
    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}Error: Cargo not found.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Cargo installed${NC}"
    
    # Check Charms CLI
    if ! command -v charms &> /dev/null; then
        echo -e "${YELLOW}Charms CLI not found. Installing...${NC}"
        cargo install charms-cli
    fi
    echo -e "${GREEN}✓ Charms CLI installed${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js not found.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js installed${NC}"
    
    # Check environment variables
    if [[ -z "$CHARMS_NETWORK" ]]; then
        echo -e "${YELLOW}Warning: CHARMS_NETWORK not set, defaulting to testnet${NC}"
        export CHARMS_NETWORK="testnet"
    fi
    
    if [[ -z "$MANUFACTURER_ADDRESS" ]]; then
        echo -e "${YELLOW}Warning: MANUFACTURER_ADDRESS not set${NC}"
        echo -e "${YELLOW}Some functions may require a manufacturer address${NC}"
    fi
}

# Build contract
build_contract() {
    echo -e "\n${YELLOW}Building Veri-Charm contract...${NC}"
    
    cd contracts
    
    # Clean previous builds
    echo "Cleaning previous builds..."
    cargo clean
    
    # Build with optimizations
    echo "Building contract (release mode)..."
    cargo build --release --target wasm32-unknown-unknown
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Error: Contract build failed${NC}"
        exit 1
    fi
    
    # Check WASM file size
    WASM_FILE="target/wasm32-unknown-unknown/release/veri_charm_contract.wasm"
    if [[ ! -f "$WASM_FILE" ]]; then
        echo -e "${RED}Error: WASM file not found${NC}"
        exit 1
    fi
    
    WASM_SIZE=$(stat -f%z "$WASM_FILE" 2>/dev/null || stat -c%s "$WASM_FILE")
    echo -e "${GREEN}✓ Contract built successfully (${WASM_SIZE} bytes)${NC}"
    
    cd ..
}

# Generate contract metadata
generate_metadata() {
    echo -e "\n${YELLOW}Generating contract metadata...${NC}"
    
    cd contracts
    
    # Generate ABI
    echo "Generating ABI..."
    cargo charms abi > ../metadata/vericharm-abi.json
    
    # Generate deployment manifest
    cat > ../metadata/deployment-manifest.json << EOF
{
    "contractName": "VeriCharmProtocol",
    "version": "1.0.0",
    "description": "Anti-counterfeiting protocol using Charm tokens",
    "author": "Bit-Earth Labs",
    "license": "MIT",
    "compiler": {
        "rustc": "$(rustc --version)",
        "charms": "$(charms --version)"
    },
    "networks": {
        "testnet": {
            "chainId": "bitcoin-testnet",
            "deploymentAddress": "{{DEPLOYMENT_ADDRESS}}",
            "blockExplorer": "https://explorer.bitcoinos.org"
        },
        "mainnet": {
            "chainId": "bitcoin",
            "deploymentAddress": "TBD",
            "blockExplorer": "https://explorer.bitcoinos.org"
        }
    },
    "functions": [
        {
            "name": "mint_charm",
            "description": "Mint new Charm token",
            "inputs": ["ProductData", "TokenMetadata"],
            "payable": true
        },
        {
            "name": "transfer_charm",
            "description": "Transfer Charm token",
            "inputs": ["ProductId", "Address", "ZkProof"],
            "payable": false
        },
        {
            "name": "burn_charm",
            "description": "Burn Charm token for rewards",
            "inputs": ["ProductId", "BurnReason"],
            "payable": false
        },
        {
            "name": "verify_product",
            "description": "Verify product authenticity",
            "inputs": ["ProductId", "VerificationData"],
            "payable": false
        }
    ],
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    echo -e "${GREEN}✓ Metadata generated${NC}"
    
    cd ..
}

# Deploy to testnet
deploy_to_testnet() {
    echo -e "\n${YELLOW}Deploying to BitcoinOS testnet...${NC}"
    
    # Check if we have deployment key
    if [[ -z "$DEPLOYMENT_KEY" ]]; then
        echo -e "${YELLOW}Deployment key not set, using test key${NC}"
        
        # Generate test key if not exists
        if [[ ! -f "test-key.pem" ]]; then
            charms key generate --output test-key.pem --name "test-deployer"
            echo -e "${YELLOW}Generated test key: test-key.pem${NC}"
        fi
        
        export DEPLOYMENT_KEY="test-key.pem"
    fi
    
    # Deploy contract
    echo "Deploying contract..."
    DEPLOY_RESULT=$(charms contract deploy \
        --wasm contracts/target/wasm32-unknown-unknown/release/veri_charm_contract.wasm \
        --key "$DEPLOYMENT_KEY" \
        --network "$CHARMS_NETWORK" \
        --gas 1000000 \
        --storage 10000 \
        --output json)
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Error: Deployment failed${NC}"
        echo "$DEPLOY_RESULT"
        exit 1
    fi
    
    # Parse deployment address
    CONTRACT_ADDRESS=$(echo "$DEPLOY_RESULT" | jq -r '.contractAddress')
    TX_HASH=$(echo "$DEPLOY_RESULT" | jq -r '.transactionHash')
    
    if [[ -z "$CONTRACT_ADDRESS" || "$CONTRACT_ADDRESS" == "null" ]]; then
        echo -e "${RED}Error: Could not parse contract address${NC}"
        echo "$DEPLOY_RESULT"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Contract deployed successfully!${NC}"
    echo -e "  Contract Address: ${BLUE}$CONTRACT_ADDRESS${NC}"
    echo -e "  Transaction: ${BLUE}$TX_HASH${NC}"
    
    # Update environment file
    update_env_file "$CONTRACT_ADDRESS" "$TX_HASH"
    
    # Initialize contract with manufacturer
    if [[ -n "$MANUFACTURER_ADDRESS" ]]; then
        initialize_contract "$CONTRACT_ADDRESS"
    fi
}

# Initialize contract
initialize_contract() {
    local contract_address=$1
    
    echo -e "\n${YELLOW}Initializing contract with manufacturer...${NC}"
    
    INIT_RESULT=$(charms contract call \
        --address "$contract_address" \
        --function "init" \
        --args "{}" \
        --key "$DEPLOYMENT_KEY" \
        --network "$CHARMS_NETWORK" \
        --value 0)
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Error: Contract initialization failed${NC}"
        echo "$INIT_RESULT"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Contract initialized${NC}"
}

# Update environment file
update_env_file() {
    local contract_address=$1
    local tx_hash=$2
    
    echo -e "\n${YELLOW}Updating environment configuration...${NC}"
    
    # Create or update .env file
    cat > .env << EOF
# Veri-Charm Protocol Environment Configuration
# Generated: $(date)

# Network Configuration
CHARMS_NETWORK="$CHARMS_NETWORK"
CONTRACT_ADDRESS="$contract_address"
DEPLOYMENT_TX_HASH="$tx_hash"

# Manufacturer Configuration
MANUFACTURER_ADDRESS="${MANUFACTURER_ADDRESS:-}"

# API Configuration
SCROLLS_API_URL="https://api.scrolls.charms.dev"
BLOCKFROST_API_KEY="${BLOCKFROST_API_KEY:-}"
BITCOIN_NODE_URL="https://blockstream.info/testnet/api"

# Wallet Configuration
DEFAULT_WALLET="hiro"
SUPPORTED_CHAINS="bitcoin,cardano,litecoin"

# ZK Circuit Configuration
ZK_CIRCUITS_DIR="./circuits"
ZK_PROVER_KEY="./circuits/prover_key.bin"
ZK_VERIFIER_KEY="./circuits/verifier_key.bin"

# Frontend Configuration
VITE_CONTRACT_ADDRESS="$contract_address"
VITE_NETWORK="$CHARMS_NETWORK"
VITE_SCROLLS_API_URL="https://api.scrolls.charms.dev"
EOF
    
    echo -e "${GREEN}✓ Environment file updated${NC}"
    echo -e "  File: ${BLUE}.env${NC}"
}

# Run tests
run_tests() {
    echo -e "\n${YELLOW}Running deployment tests...${NC}"
    
    # Check contract is callable
    if [[ -n "$CONTRACT_ADDRESS" ]]; then
        echo "Testing contract call..."
        
        TEST_RESULT=$(charms contract query \
            --address "$CONTRACT_ADDRESS" \
            --function "get_total_minted" \
            --network "$CHARMS_NETWORK" \
            --output json 2>/dev/null || true)
        
        if [[ -n "$TEST_RESULT" ]]; then
            echo -e "${GREEN}✓ Contract is responding${NC}"
        else
            echo -e "${YELLOW}⚠ Contract query failed (may need initialization)${NC}"
        fi
    fi
    
    # Test webapp build
    echo "Testing webapp build..."
    cd webapp
    if npm run build &> /dev/null; then
        echo -e "${GREEN}✓ Webapp builds successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Webapp build warning${NC}"
    fi
    cd ..
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting Veri-Charm Protocol deployment...${NC}"
    
    # Check prerequisites
    check_prerequisites
    
    # Build contract
    build_contract
    
    # Generate metadata
    generate_metadata
    
    # Deploy to testnet
    deploy_to_testnet
    
    # Run tests
    run_tests
    
    echo -e "\n${BLUE}=========================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo -e "1. Update frontend with contract address: ${BLUE}$CONTRACT_ADDRESS${NC}"
    echo -e "2. Configure manufacturers in the admin panel"
    echo -e "3. Test minting with: ${BLUE}charms cast spells/mint-charm.yaml${NC}"
    echo -e "4. Start webapp: ${BLUE}cd webapp && npm run dev${NC}"
    echo -e "\n${GREEN}Live testnet explorer:${NC}"
    echo -e "  https://explorer.bitcoinos.org/address/$CONTRACT_ADDRESS"
    echo -e "\n${BLUE}=========================================${NC}"
}

# Run main function
main
