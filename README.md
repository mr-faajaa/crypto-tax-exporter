# Crypto Tax Exporter

A simple site to export crypto transactions to tax CSV format.

## Features

- Takes a wallet address
- Fetches all transactions using Helius API
- Displays in a nice table
- Downloads to Awaken-compatible CSV format

## Supported Chains

- Solana (via Helius)
- [Add more chains]

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd crypto-tax-exporter

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your Helius API key

# Start development server
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HELIUS_API_KEY` | Your Helius API key (get from [dashboard.helius.xyz](https://dashboard.helius.xyz/)) |

## Project Structure

```
crypto-tax-exporter/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── transactions/
│   │   │       └── route.ts    # API endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx              # Main UI
│   ├── components/                # React components
│   └── lib/
│       └── helius.ts             # Helius SDK integration
├── public/                       # Static assets
├── package.json
├── tsconfig.json
└── README.md
```

## CSV Format

### Perps/Futures

| Field | Type | Description |
|-------|------|-------------|
| timestamp | datetime | Transaction timestamp |
| asset | string | Asset symbol |
| side | LONG/SHORT | Position side |
| quantity | decimal | Position size |
| entry_price | decimal | Average entry price |
| exit_price | decimal | Average exit price |
| pnl | decimal | Profit/Loss |
| fees | decimal | Trading fees |
| funding | decimal | Funding payments |
| exchange | string | Exchange name |

### Spots

| Field | Type | Description |
|-------|------|-------------|
| timestamp | datetime | Transaction timestamp |
| asset | string | Asset symbol |
| side | BUY/SELL | Trade side |
| quantity | decimal | Amount |
| price | decimal | Price per unit |
| total | decimal | Total value |
| fees | decimal | Trading fees |
| exchange | string | Exchange name |

## API Reference

### GET /api/transactions

Query Parameters:
- `wallet` (required): Wallet address
- `chain` (optional): Chain to query (default: solana)
- `mock` (optional): Use mock data (default: false)

Response:
```json
{
  "transactions": [
    {
      "timestamp": "2026-01-15T10:30:00Z",
      "asset": "SOL",
      "side": "BUY",
      "quantity": 10.5,
      "price": 98.5,
      "total": 1034.25,
      "fees": 0.50,
      "hash": "abc123..."
    }
  ]
}
```

## Deployment

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?template=https://github.com/vercel/next.js)

### Docker

```bash
docker build -t crypto-tax-exporter .
docker run -p 3000:3000 crypto-tax-exporter
```

## References

- [Helius Documentation](https://docs.helius.xyz/)
- [Helius Wallet API](https://www.helius.dev/docs/wallet-api/overview)
- [Awakentax CSV Format](https://help.awaken.tax/)

## License

MIT
