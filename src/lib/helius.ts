// Helius SDK integration for fetching wallet transactions

export interface HeliusConfig {
  apiKey: string;
}

export interface Transaction {
  timestamp: string;
  asset: string;
  side: string;
  quantity: number;
  price: number;
  total: number;
  fees: number;
  hash: string;
}

// Note: Full Helius SDK integration requires @helius/sdk package
// For now, this is a placeholder for the actual SDK integration

export async function fetchHeliusTransactions(
  wallet: string,
  config: HeliusConfig
): Promise<Transaction[]> {
  const apiKey = config.apiKey || process.env.HELIUS_API_KEY;
  
  if (!apiKey) {
    throw new Error('Helius API key required');
  }

  try {
    // Fetch balance and transactions from Helius
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${apiKey}&type=ANY&limit=100`
    );

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Transform Helius data to our Transaction format
    return transformHeliusData(data);
  } catch (error) {
    console.error('Helius fetch error:', error);
    throw error;
  }
}

function transformHeliusData(data: any[]): Transaction[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((tx: any) => ({
    timestamp: new Date(tx.timestamp * 1000).toISOString(),
    asset: tx.tokenChanges?.[0]?.mint?.slice(0, 8) || 'UNKNOWN',
    side: getSide(tx),
    quantity: Math.abs(getQuantity(tx)),
    price: getPrice(tx),
    total: Math.abs(getTotal(tx)),
    fees: tx.fee || 0,
    hash: tx.signature || ''
  })).filter(tx => tx.asset !== 'UNKNOWN');
}

function getSide(tx: any): string {
  const changes = tx.tokenChanges || [];
  const nativeChange = tx.nativeChanges?.[0];
  
  if (nativeChange) {
    return nativeChange.amount > 0 ? 'BUY' : 'SELL';
  }
  
  const hasPositive = changes.some((c: any) => c.tokenAmount > 0);
  const hasNegative = changes.some((c: any) => c.tokenAmount < 0);
  
  if (hasPositive && !hasNegative) return 'BUY';
  if (!hasPositive && hasNegative) return 'SELL';
  return 'TRANSFER';
}

function getQuantity(tx: any): number {
  const changes = tx.tokenChanges || [];
  return changes.reduce((sum: number, c: any) => sum + (c.tokenAmount || 0), 0);
}

function getPrice(tx: any): number {
  const nativeChanges = tx.nativeChanges || [];
  if (nativeChanges.length === 0) return 0;
  
  const nativeTotal = nativeChanges.reduce((sum: number, c: any) => sum + Math.abs(c.amount || 0), 0) / 1e9;
  const tokenTotal = getQuantity(tx);
  
  return tokenTotal > 0 ? nativeTotal / tokenTotal : 0;
}

function getTotal(tx: any): number {
  const nativeChanges = tx.nativeChanges || [];
  return nativeChanges.reduce((sum: number, c: any) => sum + Math.abs(c.amount || 0), 0) / 1e9;
}

// Export configuration helper
export function createHeliusConfig(apiKey?: string): HeliusConfig {
  return {
    apiKey: apiKey || process.env.HELIUS_API_KEY || ''
  };
}
