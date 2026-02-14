'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Wallet, 
  TrendingUp, 
  Activity, 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

// Types
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
  leverage: number;
  liquidation?: boolean;
}

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

type Transaction = SpotTransaction | PerpTransaction;

const SUPPORTED_CHAINS = [
  { id: 'solana', name: 'Solana' },
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'base', name: 'Base' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'bittensor', name: 'Bittensor' },
  { id: 'polkadot', name: 'Polkadot' },
  { id: 'osmosis', name: 'Osmosis' },
  { id: 'ronin', name: 'Ronin' },
];

const PERP_EXCHANGES = [
  { id: 'hyperliquid', name: 'Hyperliquid' },
  { id: 'perpetual', name: 'Perpetual Protocol' },
  { id: 'gmx', name: 'GMX' },
  { id: 'synthetix', name: 'Synthetix Perps' },
];

function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <Loader2 className="h-4 w-4" />
    </motion.div>
  );
}

export default function HomePage() {
  const [wallet, setWallet] = useState('');
  const [chain, setChain] = useState('solana');
  const [transactionType, setTransactionType] = useState<'spot' | 'perp'>('spot');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  const [dateFilter, setDateFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [sideFilter, setSideFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const validateWallet = useCallback((addr: string, chainId: string): boolean => {
    if (!addr.trim()) return false;
    switch (chainId) {
      case 'solana': return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
      case 'ethereum': return /^0x[a-fA-F0-9]{40}$/.test(addr);
      case 'bittensor': return /^5[a-zA-Z0-9]{47}$/.test(addr);
      case 'polkadot': return /^1[a-zA-HJ-NP-Z1-9]{33}$/.test(addr);
      default: return addr.length >= 32;
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!wallet.trim()) {
      setError('Enter a wallet address');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);
    setTransactions([]);

    try {
      const response = await fetch(`/api/transactions?wallet=${encodeURIComponent(wallet)}&chain=${chain}&type=${transactionType}&mock=true`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [wallet, chain, transactionType]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    const now = new Date();
    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= monthAgo);
    }

    if (assetFilter !== 'all') {
      filtered = filtered.filter(tx => tx.asset === assetFilter);
    }

    if (sideFilter !== 'all') {
      filtered = filtered.filter(tx => tx.side === sideFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.asset.toLowerCase().includes(query) ||
        tx.hash.toLowerCase().includes(query) ||
        tx.side.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [transactions, dateFilter, assetFilter, sideFilter, searchQuery]);

  const summary = useMemo(() => {
    if (transactionType === 'perp') {
      const perps = filteredTransactions as PerpTransaction[];
      const totalPnl = perps.reduce((sum, tx) => sum + (tx.pnl || 0), 0);
      const totalFees = perps.reduce((sum, tx) => sum + tx.fees, 0);
      const totalFunding = perps.reduce((sum, tx) => sum + tx.funding, 0);
      const uniqueAssets = [...new Set(perps.map(tx => tx.asset))];
      const openPositions = perps.filter(tx => tx.exit_price === undefined);
      
      return { totalPnl, totalFees, totalFunding, tradeCount: filteredTransactions.length, uniqueAssets: uniqueAssets.length, openPositions: openPositions.length };
    }

    const spots = filteredTransactions as SpotTransaction[];
    const totalBuys = spots.filter(tx => tx.side === 'BUY').reduce((sum, tx) => sum + tx.total, 0);
    const totalSells = spots.filter(tx => tx.side === 'SELL').reduce((sum, tx) => sum + tx.total, 0);
    const totalFees = spots.reduce((sum, tx) => sum + tx.fees, 0);
    const uniqueAssets = [...new Set(spots.map(tx => tx.asset))];
    
    return { totalBuys, totalSells, totalFees, tradeCount: filteredTransactions.length, uniqueAssets: uniqueAssets.length };
  }, [filteredTransactions, transactionType]);

  const exportToCSV = useCallback(() => {
    if (filteredTransactions.length === 0) return;

    let csv: string;
    if (transactionType === 'perp') {
      const perps = filteredTransactions as PerpTransaction[];
      const headers = ['timestamp', 'asset', 'side', 'quantity', 'entry_price', 'exit_price', 'pnl', 'fees', 'funding', 'exchange', 'leverage', 'liquidation', 'chain', 'hash'];
      const rows = perps.map(tx => [
        tx.timestamp, tx.asset, tx.side, tx.quantity.toString(), tx.entry_price.toString(),
        tx.exit_price?.toString() || '', tx.pnl?.toString() || '', tx.fees.toString(), tx.funding.toString(),
        tx.exchange, tx.leverage.toString(), tx.liquidation ? 'YES' : 'NO', tx.chain, tx.hash
      ]);
      csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else {
      const spots = filteredTransactions as SpotTransaction[];
      const headers = ['timestamp', 'chain', 'asset', 'side', 'quantity', 'price', 'total', 'fees', 'hash'];
      const rows = spots.map(tx => [tx.timestamp, tx.chain, tx.asset, tx.side, tx.quantity.toString(), tx.price.toString(), tx.total.toString(), tx.fees.toString(), tx.hash]);
      csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transactionType}-export-${wallet.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions, transactionType, wallet]);

  const uniqueAssets = [...new Set(transactions.map(tx => tx.asset))].sort();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <FileSpreadsheet className="h-6 w-6 text-orange-500" />
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Tax Export</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {transactionType === 'perp' ? 'Perpetuals Tax Export' : 'Crypto Tax Export'}
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            {transactionType === 'perp' 
              ? 'Export your perpetuals & futures positions to CSV for tax reporting.'
              : 'Multi-chain spot transactions exported to tax-compliant CSV format.'}
          </p>
        </motion.div>

        {/* Type Toggle */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2 mb-6"
        >
          <Button
            variant={transactionType === 'spot' ? 'default' : 'ghost'}
            onClick={() => setTransactionType('spot')}
            className={transactionType === 'spot' ? '' : 'text-muted-foreground'}
          >
            <Activity className="h-4 w-4 mr-2" />
            Spot
          </Button>
          <Button
            variant={transactionType === 'perp' ? 'default' : 'ghost'}
            onClick={() => setTransactionType('perp')}
            className={transactionType === 'perp' ? '' : 'text-muted-foreground'}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Perps
          </Button>
        </motion.div>

        {/* Search Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <Select
                  value={chain}
                  onValueChange={setChain}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder={transactionType === 'perp' ? 'Exchange' : 'Chain'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(transactionType === 'perp' ? PERP_EXCHANGES : SUPPORTED_CHAINS).map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                    placeholder={`Enter ${transactionType === 'perp' ? PERP_EXCHANGES.find(e => e.id === chain)?.name : SUPPORTED_CHAINS.find(c => c.id === chain)?.name} address...`}
                    className="pl-10"
                  />
                </div>

                <Button onClick={fetchTransactions} disabled={loading} className="min-w-[100px]">
                  {loading ? <Spinner /> : 'Fetch'}
                </Button>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary Stats */}
        <AnimatePresence>
          {filteredTransactions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
            >
              {transactionType === 'perp' ? (
                <>
                  <StatCard label="Total PnL" value={summary.totalPnl ?? 0} prefix="$" />
                  <StatCard label="Fees" value={summary.totalFees ?? 0} prefix="$" />
                  <StatCard label="Funding" value={summary.totalFunding ?? 0} prefix="$" />
                  <StatCard label="Open" value={summary.openPositions ?? 0} />
                  <StatCard label="Assets" value={summary.uniqueAssets ?? 0} />
                </>
              ) : (
                <>
                  <StatCard label="Trades" value={summary.tradeCount ?? 0} />
                  <StatCard label="Buys" value={summary.totalBuys ?? 0} prefix="$" />
                  <StatCard label="Sells" value={summary.totalSells ?? 0} prefix="$" />
                  <StatCard label="Fees" value={summary.totalFees ?? 0} prefix="$" />
                  <StatCard label="Assets" value={summary.uniqueAssets ?? 0} />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters & Export */}
        <AnimatePresence>
          {transactions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap items-center gap-4 mb-6"
            >
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-10"
                />
              </div>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assetFilter} onValueChange={setAssetFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assets</SelectItem>
                  {uniqueAssets.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {transactionType === 'spot' && (
                <Select value={sideFilter} onValueChange={setSideFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Side" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sides</SelectItem>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <AnimatePresence>
          {filteredTransactions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      {transactionType === 'perp' ? (
                        <TableHead>Exchange</TableHead>
                      ) : (
                        <TableHead>Chain</TableHead>
                      )}
                      <TableHead>Asset</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      {transactionType === 'perp' ? (
                        <>
                          <TableHead className="text-right">Entry</TableHead>
                          <TableHead className="text-right">Exit</TableHead>
                          <TableHead className="text-right">PnL</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </>
                      )}
                      <TableHead className="text-right">Fees</TableHead>
                      {transactionType === 'perp' && (
                        <>
                          <TableHead className="text-right">Funding</TableHead>
                          <TableHead className="text-center">Lev</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx, i) => (
                      <motion.tr
                        key={`${tx.hash}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.01 }}
                      >
                        <TableCell className="text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </TableCell>
                        {transactionType === 'perp' ? (
                          <TableCell>
                            <Badge variant="secondary">{(tx as PerpTransaction).exchange}</Badge>
                          </TableCell>
                        ) : (
                          <TableCell>
                            <Badge variant="secondary">{tx.chain}</Badge>
                          </TableCell>
                        )}
                        <TableCell className="font-mono font-medium">{tx.asset}</TableCell>
                        <TableCell>
                          <Badge variant={tx.side === 'LONG' || tx.side === 'BUY' ? 'default' : 'destructive'}>
                            {tx.side === 'LONG' || tx.side === 'BUY' ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {tx.side}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {(tx as PerpTransaction).quantity?.toFixed(4) || (tx as SpotTransaction).quantity?.toFixed(4)}
                        </TableCell>
                        {transactionType === 'perp' ? (
                          <>
                            <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                              ${(tx as PerpTransaction).entry_price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                              {(tx as PerpTransaction).exit_price ? `$${(tx as PerpTransaction).exit_price?.toFixed(2)}` : '—'}
                            </TableCell>
                            <TableCell className={cn(
                              "text-right font-mono tabular-nums font-medium",
                              (tx as PerpTransaction).pnl === undefined ? 'text-muted-foreground' : 
                              (tx as PerpTransaction).pnl! >= 0 ? 'text-green-500' : 'text-red-500'
                            )}>
                              {(tx as PerpTransaction).pnl !== undefined ? `$${(tx as PerpTransaction).pnl?.toFixed(2)}` : 'Open'}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                              ${(tx as SpotTransaction).price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums font-medium">
                              ${(tx as SpotTransaction).total.toFixed(2)}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                          ${tx.fees.toFixed(2)}
                        </TableCell>
                        {transactionType === 'perp' && (
                          <>
                            <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                              ${(tx as PerpTransaction).funding.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              {(tx as PerpTransaction).leverage > 0 && (
                                <span className="text-xs text-muted-foreground">{(tx as PerpTransaction).leverage}x</span>
                              )}
                            </TableCell>
                          </>
                        )}
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty States */}
        {!loading && hasSearched && filteredTransactions.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No transactions found</p>
          </motion.div>
        )}

        {!loading && !hasSearched && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-dashed flex items-center justify-center">
              <Wallet className="h-10 w-10 text-orange-500" />
            </div>
            <p className="text-xl font-semibold mb-2">Enter a wallet address</p>
            <p className="text-muted-foreground">
              Supports {SUPPORTED_CHAINS.map(c => c.name).join(', ')}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, prefix = '' }: { label: string; value: number; prefix?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold tabular-nums">
          {prefix}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </CardContent>
    </Card>
  );
}
