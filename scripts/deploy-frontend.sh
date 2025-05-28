#!/bin/bash

# Frontend deployment script
# Supports deployment to various hosting services

set -e

echo "🚀 Wagers.bet Frontend Deployment Script"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "app/package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Get deployment target
if [ -z "$1" ]; then
    echo "Usage: ./scripts/deploy-frontend.sh [vercel|netlify|ipfs|surge]"
    exit 1
fi

DEPLOY_TARGET=$1

# Build the frontend
echo "📦 Building frontend application..."
cd app
npm run build

case $DEPLOY_TARGET in
    "vercel")
        echo "📤 Deploying to Vercel..."
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm i -g vercel
        fi
        vercel --prod
        ;;
        
    "netlify")
        echo "📤 Deploying to Netlify..."
        if ! command -v netlify &> /dev/null; then
            echo "Installing Netlify CLI..."
            npm i -g netlify-cli
        fi
        netlify deploy --prod --dir=build
        ;;
        
    "ipfs")
        echo "📤 Deploying to IPFS..."
        if ! command -v ipfs &> /dev/null; then
            echo "❌ Error: IPFS CLI not found. Please install: https://docs.ipfs.io/install/"
            exit 1
        fi
        
        # Add build directory to IPFS
        IPFS_HASH=$(ipfs add -r build | tail -n 1 | awk '{print $2}')
        echo "✅ Deployed to IPFS: https://ipfs.io/ipfs/$IPFS_HASH"
        echo "🌐 Alternative gateways:"
        echo "   - https://gateway.pinata.cloud/ipfs/$IPFS_HASH"
        echo "   - https://cloudflare-ipfs.com/ipfs/$IPFS_HASH"
        ;;
        
    "surge")
        echo "📤 Deploying to Surge.sh..."
        if ! command -v surge &> /dev/null; then
            echo "Installing Surge CLI..."
            npm i -g surge
        fi
        surge ./build
        ;;
        
    *)
        echo "❌ Error: Unknown deployment target: $DEPLOY_TARGET"
        echo "Supported targets: vercel, netlify, ipfs, surge"
        exit 1
        ;;
esac

echo "✅ Deployment complete!"