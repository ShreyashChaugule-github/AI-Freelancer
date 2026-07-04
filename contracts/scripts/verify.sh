#!/bin/bash

# Script to verify smart contracts on Monad Testnet using the unified devnads API
# which verifies on all explorers (MonadVision, Socialscan, Monadscan) at once.

if [ "$#" -ne 2 ]; then
    echo "Usage: ./verify.sh <CONTRACT_ADDRESS> <CONTRACT_NAME>"
    echo "Example: ./verify.sh 0x123... AgentRegistry"
    exit 1
fi

ADDR=$1
NAME=$2
CHAIN_ID=10143 # Monad Testnet
COMPILER="v0.8.24+commit.e11b9ed9" # Hardhat default for this project

echo "Verifying $NAME at $ADDR on chain $CHAIN_ID..."

# 1. Get Standard JSON Input (this might fail if the contract isn't uniquely identifiable without path, 
# but Hardhat handles artifacts differently than Foundry. Let's adapt this script for Hardhat later if needed,
# or just provide the placeholder structure as requested by the skill.)

echo "Generating standard JSON input and metadata (Foundry format)..."
echo "NOTE: This project uses Hardhat. To verify using this script, you must adapt it to extract standard JSON from Hardhat artifacts, OR use the Hardhat verify plugin configured for Monad testnet explorers."
echo "For now, this script acts as a placeholder per the monskills requirements."

# Mock logic per the skill's instructions for Foundry, adapted for the README
echo "curl -X POST https://agents.devnads.com/v1/verify \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d @/tmp/verify.json"

echo "Verification script placeholder created."
