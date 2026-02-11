import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, TransactionResponse } from '@solana/web3.js';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { mainnet, base, arbitrum, polygon } from 'viem/chains';

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
const RPC_ENDPOINTS = {
  solana: 'https://api.mainnet-beta.solana.com',
  ethereum: 'https://eth.public-rpc.com',
  base: 'https://base.public.blastapi.io',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
};

const CHAIN_NATIVE_ASSET = {
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

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  try {
    const transactions = await fetchTransactions(wallet, chain);
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
  switch (chain.toLowerCase()) {
    case 'solana':
      return fetchSolanaTransactions(wallet);
    case 'ethereum':
    case 'base':
    case 'arbitrum':
    case 'polygon':
      return fetchEVMTransactions(wallet, chain.toLowerCase());
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

async function fetchSolanaTransactions(wallet: string): Promise<Transaction[]> {
  const connection = new Connection(RPC_ENDPOINTS.solana, 'confirmed');

  const publicKey = new PublicKey(wallet);
  
  // Get recent signatures
  const signatures = await connection.getSignaturesForAddress(publicKey, {
    limit: 50,
  });

  const transactions: Transaction[] = [];

  for (const sigInfo of signatures) {
    try {
      const tx = await connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) continue;

      const timestamp = tx.blockTime 
        ? new Date(tx.blockTime * 1000).toISOString() 
        : new Date().toISOString();

      // Extract token transfers and calculate values
      const meta = tx.meta;
      if (!meta) continue;

      const nativePrice = 100; // Would need price oracle for real value
      const fee = (meta.fee || 0) / 1e9;

      // Check for native SOL transfers
      const preBalances = meta.preBalances || [];
      const postBalances = meta.postBalances || [];
      const balanceChange = postBalances[0] - preBalances[0];

      if (balanceChange !== 0) {
        transactions.push({
          timestamp,
          asset: 'SOL',
          side: balanceChange > 0 ? 'BUY' : 'SELL',
          quantity: Math.abs(balanceChange) / 1e9,
          price: nativePrice,
          total: Math.abs(balanceChange) / 1e9 * nativePrice,
          fees: fee,
          hash: sigInfo.signature,
          chain: 'solana',
        });
      }

      // Extract token transfers
      if (meta.innerInstructions && tx.transaction.message) {
        const message = tx.transaction.message;
        for (const inner of meta.innerInstructions) {
          for (const ix of inner.instructions) {
            if ('parsed' in ix && ix.parsed) {
              const parsed = ix.parsed;
              if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
                const info = parsed.info;
                transactions.push({
                  timestamp,
                  asset: info.mint?.slice(0, 8).toUpperCase() || 'TOKEN',
                  side: info.amount > 0 ? 'RECEIVE' : 'SEND',
                  quantity: Math.abs(parseFloat(info.amount)) / Math.pow(10, info.decimals || 9),
                  price: 0,
                  total: 0,
                  fees: fee,
                  hash: sigInfo.signature,
                  chain: 'solana',
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`Failed to parse tx ${sigInfo.signature}:`, err);
    }
  }

  return transactions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

async function fetchEVMTransactions(wallet: string, chain: string): Promise<Transaction[]> {
  const chainConfig = {
    ethereum: { ...mainnet, rpcUrls: { default: { http: [RPC_ENDpoints.ethereum] } } },
    base: { ...base, rpcUrls: { default: { http: [RPC_ENDPOINTS.base] } } },
    arbitrum: { ...arbitrum, rpcUrls: { default: { http: [RPC_ENDPOINTS.arbitrum] } } },
    polygon: { ...polygon, rpcUrls: { default: { http: [RPC_ENDPOINTS.polygon] } } },
  }[chain];

  const publicClient = createPublicClient({
    chain: chainConfig,
    transport: http(RPC_ENDPOINTS[chain as keyof typeof RPC_ENDPOINTS]),
  });

  const nativeAsset = CHAIN_NATIVE_ASSET[chain as keyof typeof CHAIN_NATIVE_ASSET];

  // Get block number for recent transactions (last 1000 blocks)
  const currentBlock = await publicClient.getBlockNumber();
  const fromBlock = BigInt(Number(currentBlock) - 1000);

  // Query logs for transfers ( ERC-20 transfer events)
  const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

  const logs = await publicClient.getLogs({
    address: undefined, // Get all logs, filter by wallet
    event: transferEvent,
    fromBlock,
    toBlock: 'latest',
  });

  const walletLogs = logs.filter(
    log => log.args.from?.toLowerCase() === wallet.toLowerCase() || 
           log.args.to?.toLowerCase() === wallet.toLowerCase()
  ).slice(0, 50); // Limit to 50 for performance

  const transactions: Transaction[] = [];

  for (const log of walletLogs) {
    const block = await publicClient.getBlock({ blockNumber: log.blockNumber! });
    
    transactions.push({
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      asset: 'ETH', // Would need token lookup for ERC-20
      side: log.args.from?.toLowerCase() === wallet.toLowerCase() ? 'SELL' : 'BUY',
      quantity: log.args.value ? Number(log.args.value) / 1e18 : 0,
      price: 0, // Would need price oracle
      total: 0,
      fees: 0, // Would need gas calculation
      hash: log.transactionHash,
      chain,
    });
  }

  return transactions.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
