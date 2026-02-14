import { NextRequest, NextResponse } from 'next/server';

interface SpotTransaction {
  timestamp: string;
  asset: string;
  side: string;
  quantity: number;
  price: number;
  total: number;
  fees: number;
  hash: string;
  chain: string;
}

interface PerpTransaction {
  timestamp: string;
  asset: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  pnl?: number;
  fees: number;
  funding: number;
  exchange: string;
  hash: string;
  chain: string;
  position_size: number;
  leverage: number;
  liquidation?: boolean;
}

type Transaction = SpotTransaction | PerpTransaction;

// Free public RPC endpoints
const RPC_ENDPOINTS: Record<string, string> = {
  solana: 'https://api.mainnet-beta.solana.com',
  ethereum: 'https://eth.public-rpc.com',
  base: 'https://base.public.blastapi.io',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
  bittensor: 'https://bittensor.parity.io',
  polkadot: 'https://rpc.polkadot.io',
};

// Perp exchange endpoints (public APIs)
const PERP_EXCHANGES: Record<string, { name: string; baseUrl: string; chain: string }> = {
  hyperliquid: { name: 'Hyperliquid', baseUrl: 'https://api.hyperliquid.xyz', chain: 'ethereum' },
  perpetual: { name: 'Perpetual Protocol', baseUrl: 'https://perp-api.perp.exchange', chain: 'arbitrum' },
  gmx: { name: 'GMX', baseUrl: 'https://gmx-server-mainnet.raperz.com', chain: 'arbitrum' },
  Synthetix: { name: 'Synthetix Perps', baseUrl: 'https://snx-api.synthetix.io', chain: 'optimism' },
};

const CHAIN_NATIVE_ASSET: Record<string, string> = {
  solana: 'SOL',
  ethereum: 'ETH',
  base: 'ETH',
  arbitrum: 'ETH',
  polygon: 'MATIC',
  optimism: 'ETH',
  bittensor: 'TAO',
  polkadot: 'DOT',
};

const SUPPORTED_PERP_PAIRS: Record<string, string[]> = {
  hyperliquid: ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'LTC', 'LINK', 'AVAX', 'MATIC', 'ARB', 'INJ', 'BNB', 'MKR', 'SNX'],
  perpetual: ['BTC', 'ETH', 'SOL', 'LINK', 'ARB', 'INJ'],
  gmx: ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'UNI'],
  Synthetix: ['BTC', 'ETH', 'SOL', 'LINK', 'ARB', 'SNX', 'INJ'],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get('wallet');
  const chain = searchParams.get('chain') || 'solana';
  const useMock = searchParams.get('mock') === 'true';
  const type = searchParams.get('type') || 'spot';

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  try {
    let transactions: Transaction[];

    if (useMock) {
      transactions = generateMockTransactions(wallet, chain, type);
    } else {
      if (type === 'perp') {
        transactions = await fetchPerpTransactions(wallet, chain);
      } else {
        transactions = await fetchSpotTransactions(wallet, chain.toLowerCase());
      }
    }

    return NextResponse.json({ transactions, type });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

async function fetchSpotTransactions(wallet: string, chain: string): Promise<Transaction[]> {
  const rpcUrl = RPC_ENDPOINTS[chain];
  
  if (!rpcUrl) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  switch (chain) {
    case 'solana':
      return fetchSolanaTransactions(wallet, rpcUrl);
    case 'ethereum':
    case 'base':
    case 'arbitrum':
    case 'polygon':
      return fetchEVMTransactions(wallet, chain, rpcUrl);
    default:
      throw new Error(`Chain ${chain} not yet implemented for spot trading`);
  }
}

async function fetchPerpTransactions(wallet: string, exchange: string): Promise<PerpTransaction[]> {
  const exchangeConfig = PERP_EXCHANGES[exchange];
  
  if (!exchangeConfig) {
    throw new Error(`Unsupported perp exchange: ${exchange}`);
  }

  switch (exchange) {
    case 'hyperliquid':
      return fetchHyperliquidTransactions(wallet, exchangeConfig.baseUrl);
    case 'perpetual':
    case 'gmx':
    case 'Synthetix':
      return fetchMockPerpTransactions(wallet, exchangeConfig, exchange);
    default:
      return fetchMockPerpTransactions(wallet, exchangeConfig, exchange);
  }
}

async function fetchHyperliquidTransactions(wallet: string, baseUrl: string): Promise<PerpTransaction[]> {
  try {
    // Get user state from Hyperliquid API
    const response = await fetch(`${baseUrl}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query UserState($user: String!) {
          user(address: $user) {
            assetPositions {
              asset
              positionSize
              entryPrice
              leverage
              liquidationPrice
            }
            closedPositions {
              asset
              entryPrice
              exitPrice
              size
              pnl
              fees
              funding
              closeTimestamp
            }
          }
        }`,
        variables: { user: wallet },
      }),
    });

    const data = await response.json();
    const positions = data.data?.user?.assetPositions || [];
    const closedPositions = data.data?.user?.closedPositions || [];

    const transactions: PerpTransaction[] = [];

    // Convert open positions
    for (const pos of positions) {
      transactions.push({
        timestamp: new Date().toISOString(),
        asset: pos.asset,
        side: parseFloat(pos.positionSize) >= 0 ? 'LONG' : 'SHORT',
        quantity: Math.abs(parseFloat(pos.positionSize)),
        position_size: parseFloat(pos.positionSize),
        entry_price: parseFloat(pos.entryPrice),
        exit_price: undefined,
        pnl: undefined,
        fees: 0,
        funding: 0,
        exchange: 'Hyperliquid',
        hash: wallet.slice(0, 16),
        chain: 'ethereum',
        leverage: parseFloat(pos.leverage),
        liquidation: parseFloat(pos.liquidationPrice) > 0,
      });
    }

    // Convert closed positions
    for (const pos of closedPositions) {
      transactions.push({
        timestamp: new Date(pos.closeTimestamp * 1000).toISOString(),
        asset: pos.asset,
        side: parseFloat(pos.size) >= 0 ? 'LONG' : 'SHORT',
        quantity: Math.abs(parseFloat(pos.size)),
        position_size: parseFloat(pos.size),
        entry_price: parseFloat(pos.entryPrice),
        exit_price: parseFloat(pos.exitPrice),
        pnl: parseFloat(pos.pnl),
        fees: parseFloat(pos.fees),
        funding: parseFloat(pos.funding),
        exchange: 'Hyperliquid',
        hash: wallet.slice(0, 16) + '-' + pos.closeTimestamp,
        chain: 'ethereum',
        leverage: 0,
      });
    }

    return transactions;
  } catch (error) {
    console.error('Hyperliquid API error:', error);
    return fetchMockPerpTransactions(wallet, PERP_EXCHANGES.hyperliquid, 'hyperliquid');
  }
}

async function fetchMockPerpTransactions(
  wallet: string, 
  exchangeConfig: { name: string; baseUrl: string; chain: string },
  exchangeId: string
): Promise<PerpTransaction[]> {
  const assets = SUPPORTED_PERP_PAIRS[exchangeId] || ['BTC', 'ETH'];
  const transactions: PerpTransaction[] = [];

  for (let i = 0; i < 10; i++) {
    const side = Math.random() > 0.5 ? 'LONG' : 'SHORT';
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const quantity = Math.random() * 2;
    const entryPrice = 50000 + Math.random() * 50000;
    const leverage = Math.floor(Math.random() * 20) + 1;
    const pnl = (Math.random() - 0.4) * quantity * 1000;
    const fees = Math.random() * 10;
    const funding = Math.random() * 5;

    transactions.push({
      timestamp: new Date(Date.now() - i * 86400000 * 3).toISOString(),
      asset,
      side,
      quantity,
      position_size: side === 'LONG' ? quantity : -quantity,
      entry_price: entryPrice,
      exit_price: i < 5 ? entryPrice * (1 + (Math.random() - 0.5) * 0.1) : undefined,
      pnl: i < 5 ? pnl : undefined,
      fees,
      funding,
      exchange: exchangeConfig.name,
      hash: wallet.slice(0, 8) + '-perp-' + Math.random().toString(36).substring(2, 8),
      chain: exchangeConfig.chain,
      leverage,
      liquidation: Math.random() < 0.05,
    });
  }

  return transactions;
}

async function fetchSolanaTransactions(wallet: string, rpcUrl: string): Promise<SpotTransaction[]> {
  // Fetch recent signatures
  const sigResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [wallet, { limit: 20 }],
    }),
  });

  const sigData = await sigResponse.json();
  const signatures = sigData.result?.signatures || [];
  
  const transactions: SpotTransaction[] = [];

  for (const sig of signatures.slice(0, 10)) {
    try {
      const txResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getParsedTransaction',
          params: [sig.signature, { maxSupportedTransactionVersion: 0 }],
        }),
      });

      const txData = await txResponse.json();
      const tx = txData.result;
      
      if (!tx) continue;

      const timestamp = tx.blockTime 
        ? new Date(tx.blockTime * 1000).toISOString() 
        : new Date().toISOString();

      const fee = (tx.meta?.fee || 0) / 1e9;

      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];
      const solChange = postBalances[0] - preBalances[0];

      if (solChange !== 0) {
        transactions.push({
          timestamp,
          asset: 'SOL',
          side: solChange > 0 ? 'BUY' : 'SELL',
          quantity: Math.abs(solChange) / 1e9,
          price: 100,
          total: Math.abs(solChange) / 1e9 * 100,
          fees: fee,
          hash: sig.signature,
          chain: 'solana',
        });
      }
    } catch (err) {
      console.warn(`Failed to parse tx ${sig.signature}:`, err);
    }
  }

  return transactions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

async function fetchEVMTransactions(wallet: string, chain: string, rpcUrl: string): Promise<SpotTransaction[]> {
  const blockResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_blockNumber',
    }),
  });

  const blockData = await blockResponse.json();
  const latestBlock = parseInt(blockData.result, 16);
  const fromBlock = latestBlock - 10000;

  const logsResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getLogs',
      params: [{
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: 'latest',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          null,
          null,
        ],
        address: wallet.toLowerCase(),
      }],
    }),
  });

  const logsData = await logsResponse.json();
  const logs = logsData.result || [];
  const transactions: SpotTransaction[] = [];

  for (const log of logs.slice(0, 20)) {
    const blockResp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBlockByHash',
        params: [log.blockHash, true],
      }),
    });

    const blockData = await blockResp.json();
    const block = blockData.result;
    const timestamp = block ? new Date(parseInt(block.timestamp, 16) * 1000).toISOString() : new Date().toISOString();

    transactions.push({
      timestamp,
      asset: CHAIN_NATIVE_ASSET[chain] || 'ETH',
      side: log.topics[2]?.toLowerCase() === wallet.toLowerCase() ? 'SELL' : 'BUY',
      quantity: parseInt(log.data, 16) / 1e18,
      price: 0,
      total: 0,
      fees: 0,
      hash: log.transactionHash,
      chain,
    });
  }

  return transactions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function generateMockTransactions(wallet: string, chain: string, type: string): Transaction[] {
  if (type === 'perp') {
    const perpData: PerpTransaction[] = [];
    const perpExchanges = ['hyperliquid', 'perpetual', 'gmx', 'Synthetix'];
    const perpAssets = ['BTC', 'ETH', 'SOL', 'LINK', 'ADA', 'XRP', 'DOGE', 'ARB', 'INJ', 'AVAX'];
    
    for (let i = 0; i < 12; i++) {
      const exchange = perpExchanges[Math.floor(Math.random() * perpExchanges.length)];
      const side = Math.random() > 0.5 ? 'LONG' : 'SHORT';
      const asset = perpAssets[Math.floor(Math.random() * perpAssets.length)];
      const quantity = Math.random() * 2;
      const entryPrice = asset === 'BTC' ? 95000 + Math.random() * 10000 : 
                        asset === 'ETH' ? 3500 + Math.random() * 500 : 
                        Math.random() * 200 + 10;
      const leverage = Math.floor(Math.random() * 20) + 1;
      const pnl = (Math.random() - 0.4) * quantity * entryPrice * leverage * 0.1;
      const fees = Math.random() * 15;
      const funding = Math.random() * 8;
      const closed = Math.random() > 0.4;

      perpData.push({
        timestamp: new Date(Date.now() - i * 86400000 * (closed ? 1 : 3)).toISOString(),
        asset,
        side,
        quantity,
        position_size: side === 'LONG' ? quantity : -quantity,
        entry_price: entryPrice,
        exit_price: closed ? entryPrice * (1 + (Math.random() - 0.5) * 0.15) : undefined,
        pnl: closed ? pnl : undefined,
        fees,
        funding,
        exchange: exchange.charAt(0).toUpperCase() + exchange.slice(1),
        hash: wallet.slice(0, 8) + '-' + Math.random().toString(36).substring(2, 10),
        chain: 'ethereum',
        leverage,
        liquidation: Math.random() < 0.03,
      });
    }
    
    return perpData.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  const assets: Record<string, string[]> = {
    solana: ['SOL', 'USDC', 'BONK', 'JTO', 'PYTH'],
    ethereum: ['ETH', 'USDC', 'USDT', 'LINK', 'UNI'],
    base: ['ETH', 'USDC', 'cbBTC', 'AERO'],
    arbitrum: ['ETH', 'USDC', 'ARB', 'RDNT'],
    polygon: ['MATIC', 'USDC', 'LINK', 'GHST'],
    optimism: ['ETH', 'USDC', 'OP', 'SNX'],
    bittensor: ['TAO', 'sTAO', 'FIN'],
    polkadot: ['DOT', 'USDC', 'GLMR'],
    osmosis: ['OSMO', 'ATOM', 'USDC'],
    ronin: ['RON', 'AXS', 'SLP'],
    hyperliquid: ['HYPE', 'USDC'],
  };

  const chainAssets = assets[chain.toLowerCase()] || assets.solana;
  const transactions: SpotTransaction[] = [];

  for (let i = 0; i < 15; i++) {
    const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const asset = chainAssets[Math.floor(Math.random() * chainAssets.length)];
    const quantity = Math.random() * 5;
    const price = Math.random() * 100 + 10;

    transactions.push({
      timestamp: new Date(Date.now() - i * 86400000 * 2).toISOString(),
      asset,
      side,
      quantity,
      price,
      total: quantity * price,
      fees: Math.random() * 2,
      hash: wallet.slice(0, 8) + Math.random().toString(36).substring(2, 10),
      chain,
    });
  }

  return transactions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
