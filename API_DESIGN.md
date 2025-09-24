# TAXSTR DEX API Design Document

## Overview

This API provides a comprehensive interface for interacting with the TAXSTR token contract and DEX on the TON blockchain. It abstracts the complexity of smart contract interactions while providing wallet-agnostic transaction creation for external signing.

## Architecture

### Core Components
- **TAXSTR Token Contract**: ERC-20-like token with 10% transfer tax
- **DEX V8 Contract**: Single-sided bonding curve DEX with dual fee structure
- **API Server**: REST API for contract interactions and transaction building
- **Wallet Integration**: External wallet signing support (TON Connect compatible)

### Key Features
- Real-time contract state monitoring
- Transaction building for external wallet signing
- Price and market cap analytics
- Tax and fee tracking
- Comprehensive error handling

---

## API Endpoints

### 1. Token Information

#### `GET /api/token/info`
Get basic TAXSTR token information.

**Response:**
```json
{
  "contract_address": "EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf",
  "name": "TAXSTR",
  "symbol": "TAXSTR", 
  "decimals": 9,
  "total_supply": "1000000000000000000",
  "admin_address": "EQAIXmV5HJf29JpvEVxj8PoodnJX4bQYHWYPhwuHwE116DZW",
  "dev_address": "EQAIXmV5HJf29JpvEVxj8PoodnJX4bQYHWYPhwuHwE116DZW",
  "tax_rate": 10,
  "metadata_url": "https://arweave.net/ciOCW5krvm-LEr86RNjdYzRwhqmc53PViHTWOhu_0DI"
}
```

#### `GET /api/token/supply`
Get detailed token supply information.

**Response:**
```json
{
  "total_supply": "1000000000000000000",
  "total_supply_formatted": "1,000,000,000",
  "circulating_supply": "500016182574000000",
  "circulating_supply_formatted": "500,016,182.574",
  "locked_in_dex": "499983817426000000",
  "locked_in_dex_formatted": "499,983,817.426",
  "dex_liquidity_percentage": 50.0
}
```

### 2. Wallet Operations

#### `GET /api/wallet/:address/balance`
Get wallet's TAXSTR balance.

**Parameters:**
- `address`: TON wallet address

**Response:**
```json
{
  "address": "EQCYlrz-F9Vharb6ct0Y2TuERderobVhqvnycvnQIHUHRm1c",
  "jetton_wallet": "EQDGArQS-wVXkuNcLTAJG7lHId-f_9qky2eADyWRUVB27RkN",
  "balance": "100022664316293120",
  "balance_formatted": "100,022,664.316",
  "ton_balance": "723435614",
  "ton_balance_formatted": "0.723",
  "is_treasury": false,
  "tax_exempt": false
}
```

#### `POST /api/wallet/transaction/transfer`
Build TAXSTR transfer transaction for wallet signing.

**Request Body:**
```json
{
  "from_address": "EQCYlrz-F9Vharb6ct0Y2TuERderobVhqvnycvnQIHUHRm1c",
  "to_address": "EQD3S4LCTF1DNngAehscFzDwiCOZaC-Dy0WkZdSl220XzjIE",
  "amount": "1000000000000",
  "forward_ton_amount": "10000000"
}
```

**Response:**
```json
{
  "transaction": {
    "to": "EQDGArQS-wVXkuNcLTAJG7lHId-f_9qky2eADyWRUVB27RkN",
    "value": "200000000",
    "body": "te6cckEBAQEAOgAAb...",
    "mode": 3
  },
  "estimated_fees": {
    "gas_fee": "0.2",
    "forward_fee": "0.01", 
    "total_fee": "0.21"
  },
  "tax_info": {
    "gross_amount": "1000000000000",
    "net_amount": "900000000000", 
    "tax_amount": "100000000000",
    "tax_rate": 10,
    "is_tax_exempt": false
  }
}
```

#### `POST /api/wallet/transaction/mint`
Build minting transaction (admin only).

**Request Body:**
```json
{
  "admin_address": "EQAIXmV5HJf29JpvEVxj8PoodnJX4bQYHWYPhwuHwE116DZW",
  "recipient": "EQAIXmV5HJf29JpvEVxj8PoodnJX4bQYHWYPhwuHwE116DZW",
  "amount": "1000000000000000000"
}
```

**Response:**
```json
{
  "transaction": {
    "to": "EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf",
    "value": "500000000",
    "body": "te6cckEBAQEAOgAAb...",
    "mode": 3
  },
  "estimated_fees": {
    "gas_fee": "0.5",
    "total_fee": "0.5"
  },
  "mint_info": {
    "amount": "1000000000000000000",
    "amount_formatted": "1,000,000,000",
    "new_total_supply": "2000000000000000000"
  }
}
```

### 3. DEX Operations

#### `GET /api/dex/info`
Get DEX contract information and current state.

**Response:**
```json
{
  "contract_address": "EQDP7MtKWvOgzOUWE0XDAMgKEQoQRE7gqqYN_Nbjh0sFtLAS",
  "owner": "EQCYlrz-F9Vharb6ct0Y2TuERderobVhqvnycvnQIHUHRm1c",
  "treasury": "EQAIXmV5HJf29JpvEVxj8PoodnJX4bQYHWYPhwuHwE116DZW",
  "taxs_master": "EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf",
  "dex_taxs_wallet": "EQBrA9tLB_fGjHRU9t8IUsBzyiFDloiyqrl2Rr2T-tv1Mkdf",
  "current_price": "3571000",
  "current_price_formatted": "0.000003571",
  "base_price": "3471000", 
  "ton_fees_collected": "10000000",
  "ton_fees_collected_formatted": "0.01",
  "ton_balance": "153015579",
  "ton_balance_formatted": "0.153",
  "taxs_liquidity": "499983817426000000",
  "taxs_liquidity_formatted": "499,983,817.426"
}
```

#### `GET /api/dex/price`
Get current token pricing and market data.

**Response:**
```json
{
  "current_price_ton": "0.000003571",
  "current_price_usd": "0.000007142",
  "market_cap_ton": "3571.0",
  "market_cap_usd": "7142.0",
  "price_change_24h": "+2.88",
  "volume_24h_ton": "0.2357",
  "volume_24h_usd": "0.47",
  "liquidity_depth": {
    "buy_impact_1_ton": "117.37",
    "sell_impact_1000_tokens": "52.67"
  },
  "bonding_curve": {
    "base_price": "0.000003471",
    "price_multiplier": "1000000",
    "price_formula": "base_price * (1 + multiplier * ton_amount)"
  }
}
```

#### `POST /api/dex/quote/buy`
Get buy quote and build buy transaction.

**Request Body:**
```json
{
  "buyer_address": "EQCYlrz-F9Vharb6ct0Y2TuERderobVhqvnycvnQIHUHRm1c",
  "ton_amount": "200000000",
  "slippage_tolerance": 5.0
}
```

**Response:**
```json
{
  "quote": {
    "ton_input": "200000000",
    "ton_input_formatted": "0.2",
    "taxs_output_gross": "25183000000000",
    "taxs_output_net": "22664700000000",
    "taxs_output_gross_formatted": "25,183",
    "taxs_output_net_formatted": "22,664.7",
    "effective_price": "0.00000754",
    "price_impact": "117.37",
    "tax_applied": true,
    "tax_amount": "2518300000000",
    "ton_fee": "20000000",
    "ton_fee_formatted": "0.02"
  },
  "transaction": {
    "to": "EQDP7MtKWvOgzOUWE0XDAMgKEQoQRE7gqqYN_Nbjh0sFtLAS",
    "value": "200000000",
    "body": "te6cckEBAQEAOgAAb...",
    "mode": 3
  },
  "estimated_fees": {
    "gas_fee": "0.02",
    "total_cost": "0.22"
  }
}
```

#### `POST /api/dex/quote/sell`
Get sell quote and build sell request transaction.

**Request Body:**
```json
{
  "seller_address": "EQCYlrz-F9Vharb6ct0Y2TuERderobVhqvnycvnQIHUHRm1c",
  "taxs_amount": "10000000000000",
  "slippage_tolerance": 5.0
}
```

**Response:**
```json
{
  "quote": {
    "taxs_input": "10000000000000",
    "taxs_input_formatted": "10,000",
    "taxs_net_to_dex": "9000000000000",
    "taxs_net_to_dex_formatted": "9,000",
    "ton_output": "35710000",
    "ton_output_formatted": "0.03571",
    "effective_price": "0.000003571",
    "price_impact": "-52.67",
    "tax_applied": true,
    "tax_amount": "1000000000000",
    "available_ton": "153015579"
  },
  "transactions": [
    {
      "step": 1,
      "description": "Request sell validation",
      "transaction": {
        "to": "EQDP7MtKWvOgzOUWE0XDAMgKEQoQRE7gqqYN_Nbjh0sFtLAS",
        "value": "100000000",
        "body": "te6cckEBAQEAOgAAb...",
        "mode": 3
      }
    },
    {
      "step": 2,
      "description": "Transfer tokens to DEX",
      "transaction": {
        "to": "EQDGArQS-wVXkuNcLTAJG7lHId-f_9qky2eADyWRUVB27RkN",
        "value": "300000000",
        "body": "te6cckEBAQEAOgAAb...",
        "mode": 3
      }
    }
  ],
  "estimated_fees": {
    "total_gas": "0.4",
    "expected_receive": "0.03571"
  }
}
```

### 4. Analytics & Monitoring

#### `GET /api/analytics/price-history`
Get historical price data and analysis.

**Query Parameters:**
- `period`: `1h`, `24h`, `7d`, `30d` (default: `24h`)
- `interval`: `1m`, `5m`, `1h`, `1d` (default: `1h`)

**Response:**
```json
{
  "period": "24h",
  "data_points": [
    {
      "timestamp": "2025-09-23T10:00:00Z",
      "price_ton": "0.000003471",
      "price_usd": "0.000006942",
      "volume_ton": "0.0",
      "market_cap_ton": "3471.0",
      "market_cap_usd": "6942.0"
    },
    {
      "timestamp": "2025-09-23T11:00:00Z", 
      "price_ton": "0.000007544",
      "price_usd": "0.000015088",
      "volume_ton": "0.2",
      "market_cap_ton": "7544.0",
      "market_cap_usd": "15088.0"
    }
  ],
  "summary": {
    "price_change": "+2.88",
    "high": "0.000007544",
    "low": "0.000003471",
    "volume": "0.2357",
    "trades": 2
  }
}
```

#### `GET /api/analytics/treasury`
Get treasury analytics and tax collection data.

**Response:**
```json
{
  "treasury_address": "EQAIXmV5HJf29JbvEVxj8PoodnJX4bQYHWYPhwuHwE116DZW",
  "balances": {
    "taxs_balance": "400003518257365900",
    "taxs_balance_formatted": "400,003,518.257",
    "ton_balance": "150000000",
    "ton_balance_formatted": "0.15"
  },
  "tax_collection": {
    "total_collected": "3518257365900",
    "total_collected_formatted": "3,518.257",
    "collection_rate": "10",
    "last_24h": "1000000000000",
    "last_24h_formatted": "1,000"
  },
  "fee_collection": {
    "total_ton_fees": "10000000",
    "total_ton_fees_formatted": "0.01",
    "fee_rate": "10",
    "last_24h": "10000000",
    "last_24h_formatted": "0.01"
  }
}
```

#### `GET /api/analytics/trading`
Get trading volume and activity analytics.

**Response:**
```json
{
  "volume_24h": {
    "buy_volume_ton": "0.2",
    "sell_volume_ton": "0.0357",
    "total_volume_ton": "0.2357",
    "total_volume_usd": "0.47",
    "trade_count": 2
  },
  "liquidity": {
    "total_liquidity_ton": "1785.5",
    "dex_share_percentage": "50.0",
    "liquidity_utilization": "0.013"
  },
  "price_impact": {
    "avg_buy_impact": "117.37",
    "avg_sell_impact": "52.67",
    "volatility_index": "84.02"
  }
}
```

### 5. Utilities

#### `GET /api/utils/wallet-address`
Get jetton wallet address for a TON address.

**Query Parameters:**
- `owner`: TON wallet address

**Response:**
```json
{
  "owner_address": "EQCYlrz-F9Vharb6ct0Y2TuERderobVhqvnycvnQIHUHRm1c",
  "jetton_wallet": "EQDGArQS-wVXkuNcLTAJG7lHId-f_9qky2eADyWRUVB27RkN",
  "is_deployed": true
}
```

#### `POST /api/utils/simulate`
Simulate transaction effects without execution.

**Request Body:**
```json
{
  "transaction_type": "buy",
  "parameters": {
    "ton_amount": "500000000"
  }
}
```

**Response:**
```json
{
  "simulation": {
    "success": true,
    "price_before": "0.000003571",
    "price_after": "0.000008234",
    "price_impact": "130.65",
    "tokens_received": "58291",
    "fees_paid": "0.05",
    "gas_used": "0.03"
  }
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient TAXSTR balance for transaction",
    "details": {
      "required": "10000000000000",
      "available": "5000000000000"
    }
  }
}
```

### Error Codes
- `INVALID_ADDRESS`: Invalid TON address format
- `CONTRACT_NOT_FOUND`: Contract not deployed or not found
- `INSUFFICIENT_BALANCE`: Insufficient token or TON balance
- `SLIPPAGE_EXCEEDED`: Price moved beyond slippage tolerance
- `TRANSACTION_FAILED`: Blockchain transaction failed
- `RATE_LIMITED`: Too many requests
- `NETWORK_ERROR`: Blockchain network connectivity issues
- `INVALID_AMOUNT`: Amount too small or too large
- `DEX_NOT_INITIALIZED`: DEX wallet address not set
- `ADMIN_ONLY`: Operation requires admin privileges

---

## Authentication & Security

### API Key Authentication
```http
Authorization: Bearer <api_key>
```

### Rate Limiting
- **Public endpoints**: 100 requests/minute
- **Transaction building**: 50 requests/minute  
- **Analytics**: 200 requests/minute

### CORS Policy
- Origins: Configurable whitelist
- Methods: GET, POST, OPTIONS
- Headers: Authorization, Content-Type

---

## WebSocket API (Real-time Updates)

### Connection
```javascript
const ws = new WebSocket('wss://api.taxstr.com/ws');
```

### Subscriptions
```json
{
  "action": "subscribe",
  "channels": ["price", "trades", "treasury"]
}
```

### Real-time Events
```json
{
  "channel": "price",
  "event": "price_update",
  "data": {
    "price": "0.000004123",
    "change": "+15.46",
    "timestamp": "2025-09-23T12:00:00Z"
  }
}
```

---

## SDK Integration

### JavaScript/TypeScript SDK
```typescript
import { TaxstrAPI } from '@taxstr/sdk';

const api = new TaxstrAPI({
  apiKey: 'your-api-key',
  network: 'testnet'
});

// Get token info
const tokenInfo = await api.token.getInfo();

// Build buy transaction
const buyTx = await api.dex.buildBuyTransaction({
  buyerAddress: 'EQC...',
  tonAmount: '0.5',
  slippage: 5.0
});

// Sign with wallet
const signed = await wallet.signTransaction(buyTx.transaction);
```

### Integration Examples
- **TON Connect**: Wallet connection and signing
- **React Hooks**: Pre-built hooks for common operations
- **Vue.js Plugin**: Vue-specific integration
- **Mobile SDKs**: React Native and Flutter support

---

## Deployment & Infrastructure

### Environment Configuration
```yaml
# testnet
TON_ENDPOINT: "https://testnet.toncenter.com/api/v2/jsonRPC"
API_KEY: "testnet-api-key"
CONTRACTS:
  TAXSTR_MASTER: "EQCnvbgNWGJmKsb_3DPalWzBJ4Uie7mVfo1DQ5ERtSvMtzvf"
  DEX: "EQDP7MtKWvOgzOUWE0XDAMgKEQoQRE7gqqYN_Nbjh0sFtLAS"

# mainnet  
TON_ENDPOINT: "https://toncenter.com/api/v2/jsonRPC"
API_KEY: "mainnet-api-key"
CONTRACTS:
  TAXSTR_MASTER: "EQDyfIu89whwcFRmGT70mi-5fMIDDfuQXniGr9YBJpGZuK8-"
  DEX: "TBD"
```

### Monitoring & Observability
- **Metrics**: Request latency, error rates, transaction success rates
- **Logging**: Structured JSON logs with transaction traces
- **Alerts**: Price volatility, contract failures, high error rates
- **Dashboards**: Real-time API performance and DEX analytics

This API design provides a comprehensive interface for all TAXSTR token and DEX operations while maintaining security, performance, and ease of integration.

