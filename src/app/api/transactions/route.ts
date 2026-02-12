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

// Free public RPC endpoints
const RPC_ENDPOINTS: Record<string, string> = {
  solana: 'https://api.mainnet-beta.solana.com',
  ethereum: 'https://eth.public-rpc.com',
  base: 'https://base.public.blastapi.io',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
};

const CHAIN_NATIVE_ASSET: Record<string, string> = {
  solana: 'SOL',
  ethereum: 'ETH',
  base: 'ETH',
  arbitrum: 'ETH',
  polygon: 'MATIC',
};

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

    if (useMock) {
      transactions = generateMockTransactions(wallet, chain);
    } else {
      transactions = await fetchTransactions(wallet, chain.toLowerCase());
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

async function fetchTransactions(wallet: string, chain: string): Promise<Transaction[]> {
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
      throw new Error(`Chain ${chain} not yet implemented`);
  }
}

async function fetchSolanaTransactions(wallet: string, rpcUrl: string): Promise<Transaction[]> {
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
  
  const transactions: Transaction[] = [];

  for (const sig of signatures) {
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

      // Check for SOL transfer
      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];
      const solChange = postBalances[0] - preBalances[0];

      if (solChange !== 0) {
        transactions.push({
          timestamp,
          asset: 'SOL',
          side: solChange > 0 ? 'BUY' : 'SELL',
          quantity: Math.abs(solChange) / 1e9,
          price: 100, // Would need price oracle
          total: Math.abs(solChange) / 1e9 * 100,
          fees: fee,
          hash: sig.signature,
          chain: 'solana',
        });
      }

      // Token transfers
      if (tx.meta?.innerInstructions) {
        for (const inner of tx.meta.innerInstructions) {
          for (const ix of inner.instructions) {
            if ('parsed' in ix && ix.parsed) {
              const parsed = ix.parsed;
              if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
                const info = parsed.info;
                transactions.push({
                  timestamp,
                  asset: info.mint?.slice(0, 8).toUpperCase() || 'TOKEN',
                  side: 'TRANSFER',
                  quantity: Math.abs(parseFloat(info.amount)) / Math.pow(10, info.decimals || 9),
                  price: 0,
                  total: 0,
                  fees: fee,
                  hash: sig.signature,
                  chain: 'solana',
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to parse tx ${sig.signature}:`, err);
    }
  }

  return transactions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

async function fetchEVMTransactions(wallet: string, chain: string, rpcUrl: string): Promise<Transaction[]> {
  // Get latest block number
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
  const fromBlock = latestBlock - 10000; // Last ~2 hours (12s blocks)

  // Get logs for this wallet
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
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event
          null,
          null,
        ],
        address: wallet.toLowerCase(),
      }],
    }),
  });

  const logsData = await logsResponse.json();
  const logs = logsData.result || [];
  const transactions: Transaction[] = [];

  for (const log of logs.slice(0, 20)) {
    const blockResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBlockByHash',
        params: [log.blockHash, true],
      }),
    });

    const blockData = await blockResponse.json();
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

function generateMockTransactions(wallet: string, chain: string): Transaction[] {
  const assets: Record<string, string[]> = {
    solana: ['SOL', 'USDC', 'BONK', 'JTO'],
    ethereum: ['ETH', 'USDC', 'USDT', 'LINK'],
    base: ['ETH', 'USDC', 'cbBTC'],
    arbitrum: ['ETH', 'USDC', 'ARB'],
    polygon: ['MATIC', 'USDC', 'LINK'],
    bittensor: ['TAO', 'sTAO'],
    polkadot: ['DOT', 'USDC'],
    osmosis: ['OSMO', 'ATOM'],
    ronin: ['RON', 'AXS'],
  };

  const chainAssets = assets[chain.toLowerCase()] || assets.solana;
  const transactions: Transaction[] = [];

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
