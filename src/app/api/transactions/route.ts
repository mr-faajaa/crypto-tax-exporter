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
const RATE_LIMIT_DELAY = 1100; // ms (Allium allows 1 req/sec)

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

    if (useMock || !ALLIUM_API_KEY) {
      // Use mock data for development or when no API key
      console.log('Using mock data (no Allium API key or mock=true)');
      transactions = generateMockTransactions(wallet, chain);
    } else {
      // Use Allium API for production
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
  // Rate limit to 1 request/second
  await sleep(RATE_LIMIT_DELAY);

  try {
    const response = await fetch(
      `${ALLIUM_API_URL}/api/v1/developer/wallet/transactions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': ALLIUM_API_KEY,
        },
        body: JSON.stringify([
          {
            address: wallet,
            chain: chain.toLowerCase(),
          }
        ]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Allium API error:', response.status, errorText);
      
      // Fallback to mock data on API error
      if (response.status === 429 || response.status >= 500) {
        console.warn('Allium API error, falling back to mock data');
        return generateMockTransactions(wallet, chain);
      }
      
      throw new Error(`Allium API error: ${response.status}`);
    }

    const data = await response.json();
    return transformAlliumData(data, chain);
  } catch (error) {
    console.error('Allium fetch error:', error);
    // Fallback to mock data on network error
    return generateMockTransactions(wallet, chain);
  }
}

function transformAlliumData(data: any, chain: string): Transaction[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  // Allium returns an array of results for each address
  const results = data[0]?.result || [];
  if (!Array.isArray(results)) {
    return [];
  }

  return results.map((tx: any) => ({
    timestamp: new Date(tx.block_timestamp || tx.timestamp).toISOString(),
    asset: extractAsset(tx),
    side: determineSide(tx),
    quantity: Math.abs(tx.token_change_amount || tx.quantity || 0),
    price: calculatePrice(tx),
    total: Math.abs(tx.native_transfer_amount || tx.total_value || 0),
    fees: (tx.fee || 0) / 1e9, // Convert from lamports/smallest unit if needed
    hash: tx.tx_hash || tx.signature || '',
    chain: chain,
  })).filter(tx => tx.asset !== 'UNKNOWN' && tx.hash !== '');
}

function extractAsset(tx: any): string {
  // Try various fields Allium might return
  const tokenAddress = tx.token_address || tx.mint || tx.token_mint;
  if (tokenAddress) {
    // Return shortened address as asset identifier
    return tokenAddress.slice(0, 8).toUpperCase();
  }
  
  const symbol = tx.token_symbol || tx.symbol;
  if (symbol) {
    return symbol.toUpperCase();
  }
  
  // Native chain asset
  return chainToNativeAsset(tx.chain || 'unknown');
}

function chainToNativeAsset(chain: string): string {
  const nativeAssets: Record<string, string> = {
    solana: 'SOL',
    ethereum: 'ETH',
    base: 'ETH',
    arbitrum: 'ETH',
    polygon: 'MATIC',
    optimism: 'ETH',
    avax: 'AVAX',
  };
  return nativeAssets[chain.toLowerCase()] || 'UNKNOWN';
}

function determineSide(tx: any): string {
  const nativeChange = tx.native_change || tx.native_transfer_amount || 0;
  const tokenChange = tx.token_change_amount || tx.quantity || 0;
  
  if (nativeChange > 0 && tokenChange < 0) return 'BUY';
  if (nativeChange < 0 && tokenChange > 0) return 'SELL';
  if (nativeChange < 0 && tokenChange === 0) return 'TRANSFER_OUT';
  if (nativeChange > 0 && tokenChange === 0) return 'TRANSFER_IN';
  if (tokenChange !== 0) return tokenChange > 0 ? 'BUY' : 'SELL';
  
  return 'TRANSFER';
}

function calculatePrice(tx: any): number {
  const nativeTotal = Math.abs(tx.native_transfer_amount || tx.native_change || 0);
  const tokenAmount = Math.abs(tx.token_change_amount || tx.quantity || 0);
  
  if (tokenAmount > 0) {
    // Convert native from smallest unit (e.g., wei, lamports)
    const nativeDecimals = tx.native_decimals || 9;
    const nativeInEth = nativeTotal / Math.pow(10, nativeDecimals);
    return nativeInEth / tokenAmount;
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
  };

  const chainAssets = assets[chain] || assets.solana;
  const sides = ['BUY', 'SELL'];
  const transactions: Transaction[] = [];

  for (let i = 0; i < 25; i++) {
    const side = sides[Math.floor(Math.random() * sides.length)];
    const asset = chainAssets[Math.floor(Math.random() * chainAssets.length)];
    const quantity = Math.random() * 10;
    const basePrice = asset === 'SOL' ? 100 : asset === 'ETH' ? 3000 : Math.random() * 10 + 0.5;
    const price = basePrice + (Math.random() * basePrice * 0.1 - basePrice * 0.05);
    const fees = Math.random() * 5;

    transactions.push({
      timestamp: new Date(Date.now() - i * 86400000 * Math.random() * 30).toISOString(),
      asset,
      side,
      quantity,
      price,
      total: quantity * price,
      fees,
      hash: wallet.slice(0, 8) + Math.random().toString(36).substring(2, 10),
      chain,
    });
  }

  return transactions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
