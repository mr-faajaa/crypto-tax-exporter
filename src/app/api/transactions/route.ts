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
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get('wallet');
  const chain = searchParams.get('chain') || 'solana';
  const useMock = searchParams.get('mock') === 'true' || !process.env.HELIUS_API_KEY;

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  try {
    let transactions: Transaction[];

    if (useMock) {
      // Use mock data for development
      transactions = generateMockTransactions(wallet);
    } else {
      // Use Helius API for production
      transactions = await fetchHeliusTransactions(wallet, chain);
    }

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

async function fetchHeliusTransactions(wallet: string, chain: string): Promise<Transaction[]> {
  if (chain !== 'solana') {
    throw new Error(`Chain ${chain} not supported yet`);
  }

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY not configured');
  }

  try {
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${apiKey}&type=ANY&limit=100`
    );

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`);
    }

    const data = await response.json();
    return transformHeliusData(data);
  } catch (error) {
    console.error('Helius fetch error:', error);
    // Fallback to mock data on error
    return generateMockTransactions(wallet);
  }
}

function transformHeliusData(data: any[]): Transaction[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((tx: any) => ({
    timestamp: new Date(tx.timestamp * 1000).toISOString(),
    asset: getAsset(tx),
    side: getSide(tx),
    quantity: Math.abs(getQuantity(tx)),
    price: getPrice(tx),
    total: Math.abs(getNativeTotal(tx)),
    fees: (tx.fee || 0) / 1e9,
    hash: tx.signature || ''
  })).filter(tx => tx.asset !== 'UNKNOWN');
}

function getAsset(tx: any): string {
  const changes = tx.tokenChanges || [];
  if (changes.length === 0) return 'SOL';
  const mint = changes[0]?.mint;
  return mint ? mint.slice(0, 8).toUpperCase() : 'UNKNOWN';
}

function getSide(tx: any): string {
  const nativeChanges = tx.nativeChanges || [];
  if (nativeChanges.length === 0) return 'TRANSFER';
  
  const hasBuy = nativeChanges.some((c: any) => c.amount > 0);
  const hasSell = nativeChanges.some((c: any) => c.amount < 0);
  
  if (hasBuy && !hasSell) return 'BUY';
  if (!hasBuy && hasSell) return 'SELL';
  return 'TRANSFER';
}

function getQuantity(tx: any): number {
  const changes = tx.tokenChanges || [];
  return changes.reduce((sum: number, c: any) => sum + (c.tokenAmount || 0), 0);
}

function getPrice(tx: any): number {
  const nativeChanges = tx.nativeChanges || [];
  const nativeTotal = Math.abs(nativeChanges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)) / 1e9;
  const tokenTotal = getQuantity(tx);
  return tokenTotal > 0 ? nativeTotal / tokenTotal : 0;
}

function getNativeTotal(tx: any): number {
  const nativeChanges = tx.nativeChanges || [];
  return nativeChanges.reduce((sum: number, c: any) => sum + Math.abs(c.amount || 0), 0) / 1e9;
}

function generateMockTransactions(wallet: string): Transaction[] {
  const assets = ['SOL', 'BTC', 'ETH', 'USDC'];
  const sides = ['BUY', 'SELL'];
  const transactions: Transaction[] = [];

  for (let i = 0; i < 25; i++) {
    const side = sides[Math.floor(Math.random() * sides.length)];
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const quantity = Math.random() * 10;
    const price = Math.random() * 2000 + 50;
    const fees = Math.random() * 10;

    transactions.push({
      timestamp: new Date(Date.now() - i * 86400000 * Math.random() * 30).toISOString(),
      asset,
      side,
      quantity,
      price,
      total: quantity * price,
      fees,
      hash: wallet.slice(0, 8) + Math.random().toString(36).substring(2, 10)
    });
  }

  return transactions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
