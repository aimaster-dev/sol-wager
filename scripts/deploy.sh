#!/bin/bash

# Deploy script for iPredict XYZ

set -e

echo "🚀 Starting iPredict XYZ deployment..."

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install Anchor first."
    echo "Visit: https://www.anchor-lang.com/docs/installation"
    exit 1
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install Solana CLI first."
    echo "Visit: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Parse command line arguments
NETWORK=${1:-localnet}

echo "📡 Deploying to network: $NETWORK"

# Build the program
echo "🔨 Building Anchor program..."
cd programs/ipredict-xyz
anchor build

# Deploy based on network
if [ "$NETWORK" = "localnet" ]; then
    echo "🏠 Starting local validator..."
    solana-test-validator &
    VALIDATOR_PID=$!
    sleep 5
    
    echo "💰 Airdropping SOL to deployer..."
    solana airdrop 10 --url localhost
    
    echo "📦 Deploying program to localnet..."
    anchor deploy --provider.cluster localnet
    
    # Clean up
    trap "kill $VALIDATOR_PID" EXIT
    
elif [ "$NETWORK" = "devnet" ]; then
    echo "🌐 Deploying to Devnet..."
    solana config set --url devnet
    
    echo "💰 Requesting Devnet airdrop..."
    solana airdrop 2 --url devnet
    
    echo "📦 Deploying program to Devnet..."
    anchor deploy --provider.cluster devnet
    
elif [ "$NETWORK" = "mainnet" ]; then
    echo "⚠️  Mainnet deployment requires manual confirmation"
    read -p "Are you sure you want to deploy to Mainnet? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo "🌍 Deploying to Mainnet..."
        solana config set --url mainnet-beta
        anchor deploy --provider.cluster mainnet
    else
        echo "❌ Mainnet deployment cancelled"
        exit 1
    fi
else
    echo "❌ Unknown network: $NETWORK"
    echo "Usage: ./scripts/deploy.sh [localnet|devnet|mainnet]"
    exit 1
fi

echo "✅ Deployment complete!"

# Initialize platform if on localnet or devnet
if [ "$NETWORK" != "mainnet" ]; then
    echo "🎬 Initializing platform..."
    cd ../../
    npm run init:platform -- --network $NETWORK
fi

echo "🎉 iPredict XYZ is ready to use!"