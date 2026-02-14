# Crypto Tax Exporter

A hyperspeed crypto tax exporter with support for **spot** and **perpetuals/futures** trading. Export transactions to Awaken Tax-compatible CSV formats.

![Crypto Tax Exporter](https://via.placeholder.com/1200x600/1a1a2e/8b5cf6?text=CRYPTO+TAX+EXPORTER)

## ✨ Features

- **🔗 Multi-Chain Support**: Solana, Ethereum, Base, Arbitrum, Polygon, Optimism, Bittensor, Polkadot, Osmosis, Ronin
- **📊 Perpetuals/Futures**: Hyperliquid, GMX, Perpetual Protocol, Synthetix Perps
- **🎨 React-Bits UI**: Hyperspeed starfield, aurora effects, spotlight cards, animated counters
- **📥 CSV Export**: Awaken Tax-compatible formats for both spot and perp
- **🔍 Filtering**: Date range, asset, side, search
- **🚀 Vercel Ready**: One-click deployment

## 🚀 Quick Start

```bash
cd crypto-tax-exporter
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📦 Supported Networks

### Spot Trading
| Chain | Native Asset | Type |
|-------|-------------|------|
| Solana | SOL | spot |
| Ethereum | ETH | both |
| Base | ETH | both |
| Arbitrum | ETH | both |
| Polygon | MATIC | spot |
| Optimism | ETH | both |
| Bittensor | TAO | spot |
| Polkadot | DOT | spot |
| Osmosis | OSMO | spot |
| Ronin | RON | spot |

### Perpetuals/Futures
| Exchange | Chain | Assets |
|----------|-------|--------|
| Hyperliquid | Ethereum | BTC, ETH, SOL, ADA, XRP... |
| Perpetual Protocol | Arbitrum | BTC, ETH, SOL, LINK... |
| GMX | Arbitrum | BTC, ETH, SOL, LINK... |
| Synthetix Perps | Optimism | BTC, ETH, SOL, SNX... |

## 📊 CSV Formats

### Perpetuals/Futures
```csv
timestamp,asset,side,quantity,entry_price,exit_price,pnl,fees,funding,exchange,leverage,liquidation,chain,hash
2026-02-15T10:30:00Z,BTC,LONG,1.5,95000.00,98500.00,5250.00,15.00,45.00,Hyperliquid,10,NO,ethereum,0x123...
```

### Spot Trading
```csv
timestamp,chain,asset,side,quantity,price,total,fees,hash
2026-02-15T10:30:00Z,solana,SOL,BUY,10.5,98.50,1034.25,0.50,0x123...
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **UI**: React-Bits, Framer Motion, shadcn/ui
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## 📁 Project Structure

```
crypto-tax-exporter/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── transactions/
│   │   │       └── route.ts    # API endpoint (supports spot & perp)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Main UI with React-Bits
│   ├── components/
│   │   └── ui/                 # shadcn components
│   └── lib/
│       └── utils.ts
├── public/
├── package.json
├── tailwind.config.js
└── README.md
```

## 🔧 API Usage

```bash
# Spot transactions
curl "http://localhost:3000/api/transactions?wallet=...&chain=solana&type=spot"

# Perpetuals positions
curl "http://localhost:3000/api/transactions?wallet=...&chain=hyperliquid&type=perp"

# Mock data
curl "http://localhost:3000/api/transactions?wallet=...&chain=solana&type=spot&mock=true"
```

## 🚀 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/yourusername/crypto-tax-exporter)

Or via CLI:

```bash
vercel --token YOUR_TOKEN
```

## 📚 References

- [Awaken Tax CSV Format](https://help.awaken.tax/en/articles/10453931-formatting-perpetuals-futures-csvs)
- [Helius Documentation](https://docs.helius.xyz/)
- [Hyperliquid API](https://api.hyperliquid.xyz)

## 🎨 Design

- **Display**: Messapia (Collletttivo) - Sharp, angular, financial authority
- **Mono/Data**: Necto Mono - Perfect tabular-nums
- **Body**: Jost (UseModify) - Geometric, Futura-inspired

## 📄 License

MIT

---

Built with 🔥 by Mr. Faajaa 🥷
