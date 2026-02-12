import { NextRequest, NextResponse } from 'next/server';

interface Transaction {
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

// Allium API configuration
const ALLIUM_API_URL = 'https://api.allium.so';
const ALLIUM_API_KEY = process.env.ALLIUM_API_KEY || '';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const RATE_LIMIT_DELAY = 1100; // ms

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get('wallet');
  const chain = searchParams.get('chain') || 'solana';
  const useMock = searchParams.get('mock') === 'true';

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  try {
    let transactions: Transaction[];

    if (useMock || (!ALLIUM_API_KEY && !ALCHEMY_API_KEY)) {
      transactions = generateMockTransactions(wallet, chain);
    } else if (chain.toLowerCase() === 'ethereum' && ALCHEMY_API_KEY) {
      transactions = await fetchAlchemyTransactions(wallet, ALCHEMY_API_KEY);
    } else {
      transactions = await fetchAlliumTransactions(wallet, chain);
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

async function fetchAlliumTransactions(wallet: string, chain: string): Promise<Transaction[]> {
  if (!ALLIUM_API_KEY) {
    throw new Error('Allium API key not configured');
  }

  await sleep(RATE_LIMIT_DELAY);

  const response = await fetch(
    `${ALLIUM_API_URL}/api/v1/developer/wallet/transactions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': ALLIUM_API_KEY,
      },
      body: JSON.stringify([{ address: wallet, chain: chain.toLowerCase() }]),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Allium API error:', response.status, errorText);
    if (response.status === 429 || response.status >= 500) {
      return generateMockTransactions(wallet, chain);
    }
    throw new Error(`Allium API error: ${response.status}`);
  }

  const data = await response.json();
  return transformAlliumData(data, chain);
}

async function fetchAlchemyTransactions(wallet: string, apiKey: string): Promise<Transaction[]> {
  const response = await fetch(
    `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          fromAddress: wallet,
          category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
          maxCount: '0x64', // 100 transactions
        }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.status}`);
  }

  const data = await response.json();
  return transformAlchemyData(data, wallet);
}

function transformAlliumData(data: any, chain: string): Transaction[] {
  if (!data || !Array.isArray(data)) return [];
  
  const results = data[0]?.result || [];
  if (!Array.isArray(results)) return [];

  return results.map((tx: any) => ({
    timestamp: new Date(tx.block_timestamp || tx.timestamp).toISOString(),
    asset: tx.token_symbol || chainToNativeAsset(chain),
    side: determineSide(tx),
    quantity: Math.abs(tx.token_change_amount || tx.quantity || 0),
    price: calculatePrice(tx),
    total: Math.abs(tx.native_transfer_amount || 0),
    fees: (tx.fee || 0) / 1e9,
    hash: tx.tx_hash || tx.signature || '',
    chain,
  })).filter(tx => tx.asset !== 'UNKNOWN' && tx.hash !== '');
}

function transformAlchemyData(data: any, wallet: string): Transaction[] {
  const transfers = data.result?.transfers || [];
  
  return transfers.map((tx: any) => ({
    timestamp: new Date(parseInt(tx.metadata.blockTimestamp) * 1000).toISOString(),
    asset: tx.asset || 'ETH',
    side: tx.from.toLowerCase() === wallet.toLowerCase() ? 'SELL' : 'BUY',
    quantity: parseFloat(tx.value || 0),
    price: 0,
    total: parseFloat(tx.value || 0),
    fees: parseFloat(tx.gas || 0),
    hash: tx.hash || tx.txHash || '',
    chain: 'ethereum',
  }));
}

function chainToNativeAsset(chain: string): string {
  const assets: Record<string, string> = {
    solana: 'SOL',
    ethereum: 'ETH',
    base: 'ETH',
    arbitrum: 'ETH',
    polygon: 'MATIC',
    optimism: 'ETH',
    bittensor: 'TAO',
    polkadot: 'DOT',
    osmosis: 'OSMO',
    ronin: 'RON',
  };
  return assets[chain.toLowerCase()] || 'UNKNOWN';
}

function determineSide(tx: any): string {
  const nativeChange = tx.native_change || 0;
  const tokenChange = tx.token_change_amount || 0;
  
  if (nativeChange > 0 && tokenChange < 0) return 'BUY';
  if (nativeChange < 0 && tokenChange > 0) return 'SELL';
  return tokenChange > 0 ? 'BUY' : 'SELL';
}

function calculatePrice(tx: any): number {
  const nativeTotal = Math.abs(tx.native_transfer_amount || 0);
  const tokenAmount = Math.abs(tx.token_change_amount || 0);
  if (tokenAmount > 0) {
    const nativeDecimals = tx.native_decimals || 9;
    return (nativeTotal / Math.pow(10, nativeDecimals)) / tokenAmount;
  }
  return 0;
}

function generateMockTransactions(wallet: string, chain: string): Transaction[] {
  const assets: Record<string, string[]> = {
    solana: ['SOL', 'USDC', 'BONK', 'JTO', 'HNT'],
    ethereum: ['ETH', 'USDC', 'USDT', 'LINK', 'UNI'],
    base: ['ETH', 'USDC', 'cbBTC', 'AERO'],
    arbitrum: ['ETH', 'USDC', 'ARB', 'GMX'],
    polygon: ['MATIC', 'USDC', 'LINK', 'AAVE'],
    bittensor: ['TAO', 'WTAO', 'sTAO'],
    polkadot: ['DOT', 'USDC', 'GLMR'],
    osmosis: ['OSMO', 'ATOM', 'USDC'],
    ronin: ['RON', 'AXS', 'SLP'],
  };

  const chainAssets = assets[chain.toLowerCase()] || assets.solana;
  const transactions: Transaction[] = [];

  for (let i = 0; i < 20; i++) {
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
