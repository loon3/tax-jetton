# 🧪 TAXSTR Token & DEX Project

## Overview

This project contains:
- **TAXSTR Token**: A jetton with 10% transfer tax and treasury exemption
- **SmartTAXSDEX**: A custom bonding curve DEX with dual fee collection
- **Sandbox Testing**: Complete local testing environment

## 🚀 Quick Start

### Local Testing (Recommended)
```bash
# Test TAXSTR token functionality
npm run test:sandbox

# Test DEX integration  
npm run test:dex-sandbox

# Test everything
npm run test:all-sandbox
```

### Build Contracts
```bash
npm run build
```

### Generate New Wallet
```bash
npm run generate-wallet
```

## 📁 Project Structure

```
tax-jetton/
├── 📋 Core Config
│   ├── package.json              # Clean scripts (build, test, generate-wallet)
│   ├── tact.config.json          # Only essential projects (TAXSTR + DEX)
│   ├── jest.config.ts            # Test configuration
│   ├── tsconfig.json             # TypeScript config
│   └── env.example               # Environment template
│
├── 🧪 Testing (No testnet TON needed!)
│   ├── taxstr-sandbox.test.ts    # Complete TAXSTR token tests
│   └── dex-v8-sandbox.test.ts    # Complete DEX integration tests  
│
├── 📄 Source Code
│   ├── src/main.tact             # TAXSTR token contract
│   ├── src/dex-v8-simple-fees.tact # DEX contract (final version)
│   ├── src/main.spec.ts          # TAXSTR unit tests
│   └── src/dex.spec.ts           # DEX unit tests
│
├── 🛠️ Utilities
│   ├── generate-wallet.ts        # Create new TON wallets
│   ├── metadata.json             # Token metadata
│   └── README.md                 # Project documentation
│
└── 📦 Build Output (Clean!)
    └── output/                   # Only essential compiled contracts
        ├── tax-jetton_TaxJettonMaster.*   # TAXSTR Master contract
        ├── tax-jetton_TaxJettonWallet.*   # TAXSTR Wallet contract  
        └── dex-v8-simple-fees_SmartTAXSDEX.* # Final DEX contract
```

## ✅ What's Tested

### TAXSTR Token
- ✅ **Deployment**: Contract initialization with metadata
- ✅ **Minting**: Token creation to treasury
- ✅ **Treasury Exemption**: 100% efficiency (no tax) for treasury transfers
- ✅ **Tax Mechanism**: 10% tax on regular user transfers
- ✅ **Complex Scenarios**: Multi-user transfers with validation

### DEX V8 Contract  
- ✅ **Full Integration**: TAXSTR + DEX deployed together
- ✅ **Liquidity Seeding**: Pool initialization
- ✅ **Treasury Buy**: 100% efficiency (gets tokens + tax back)
- ✅ **Regular User Buy**: 90% efficiency (10% goes to treasury as tax)
- ✅ **Fee Collection**: TON fees collected properly
- ✅ **Pricing Calculation**: Bonding curve working correctly

## 🛠️ Development

### Key Features
- **⚡ Instant Testing**: Sandbox environment with no network delays
- **💰 Free Development**: No testnet TON required
- **🔄 Repeatable**: Fresh environment every test
- **🧪 Comprehensive**: Edge cases easily tested

### Contract Features
- **TAXSTR**: 10% transfer tax, treasury exemption, metadata support
- **DEX**: Bonding curve pricing, dual fees, treasury integration, slippage protection

### Commands
```bash
# 🔨 Development
npm run build             # Compile contracts
npm run generate-wallet   # Create new TON wallet

# 🧪 Testing & Reporting
npm run test             # Run all tests (unit + sandbox)
npm run test:sandbox     # TAXSTR sandbox tests only
npm run test:dex-sandbox # DEX sandbox tests only
npm run test:all-sandbox # All sandbox tests

# 🎯 Quick Testing Workflow
npm run test:all-sandbox  # Run all tests with automatic reporting
```

---

**Ready for rapid development with comprehensive local testing!** 🚀
