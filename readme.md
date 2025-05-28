# General Wager Bet - Decentralized Betting Platform on Solana

General Wager Bet is a fully decentralized betting platform built on the Solana blockchain that allows the community to launch proposition wagers and trade YES/NO tokens through a pooled orderbook system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Usage Guide](#usage-guide)
- [Development Roadmap](#development-roadmap)
- [Technical Considerations](#technical-considerations)

## Overview

General Wager Bet enables users to create and participate in proposition wagers without relying on centralized betting platforms. When a user deposits SOL, they receive an equal number of YES and NO tokens. Trading these tokens on the built-in orderbook creates dynamic odds based on market demand. When a wager is resolved, token holders of the winning proposition can redeem their tokens for SOL.

## Architecture

The platform consists of the following components:

### Smart Contracts (Solana Programs)

1. **Platform**
   - Manages global settings and fees
   - Tracks all created wagers

2. **Wager**
   - Individual betting propositions
   - Manages token minting, deposits, and resolution
   - Handles SOL vault for payouts

3. **OrderBook**
   - Decentralized pooled order matching
   - Supports partial filling of orders
   - Tracks active orders and history

4. **Tokens**
   - SPL tokens for YES and NO propositions
   - Redeemable for SOL after resolution

### Frontend

- React-based web interface
- Integrates with Solana wallets (Phantom, Solflare, etc.)
- Real-time order book and price charts

## Project Structure