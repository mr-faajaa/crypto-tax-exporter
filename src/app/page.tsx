'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, AlertCircle, Wallet, TrendingUp, TrendingDown, DollarSign, Activity, Calendar, Search, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

const SUPPORTED_CHAINS = [
  { id: 'solana', name: 'Solana', color: 'bg-purple-500' },
  { id: 'ethereum', name: 'Ethereum', color: 'bg-blue-500' },
  { id: 'base', name: 'Base', color: 'bg-indigo-500' },
  { id: 'arbitrum', name: 'Arbitrum', color: 'bg-blue-800' },
  { id: 'polygon', name: 'Polygon', color: 'bg-purple-700' },
  { id: 'bittensor', name: 'Bittensor', color: 'bg-orange-500' },
  { id: 'polkadot', name: 'Polkadot', color: 'bg-pink-500' },
  { id: 'osmosis', name: 'Osmosis', color: 'bg-cyan-500' },
  { id: 'ronin', name: 'Ronin', color: 'bg-blue-400' },
];

// Animated counter component
function AnimatedCounter({ value, prefix = '', decimals = 0, duration = 0.5 }: { value: number; prefix?: string; decimals?: number; duration?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration }}
    >
      {prefix}{value.toFixed(decimals)}
    </motion.span>
  );
}

// Spotlight card effect using CSS
function SpotlightCard({ children, className, spotlightColor = 'rgba(139, 92, 246, 0.15)' }: { children: React.ReactNode; className?: string; spotlightColor?: string }) {
  return (
    <Card className={cn("relative overflow-hidden transition-all duration-300 hover:shadow-xl", className)}>
      <div 
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${spotlightColor}, transparent 70%)`,
        }}
      />
      {children}
    </Card>
  );
}

export default function HomePage() {
  const [wallet, setWallet] = useState('');
  const [chain, setChain] = useState('solana');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [sideFilter, setSideFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const validateWallet = useCallback((addr: string, chainId: string): boolean => {
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
      setError('Please enter a wallet address');
      return;
    }

    if (!validateWallet(wallet, chain)) {
      setError(`Invalid ${SUPPORTED_CHAINS.find(c => c.id === chain)?.name} wallet address`);
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const response = await fetch(`/api/transactions?wallet=${encodeURIComponent(wallet)}&chain=${chain}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [wallet, chain, validateWallet]);

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
    const totalBuys = filteredTransactions.filter(tx => tx.side === 'BUY').reduce((sum, tx) => sum + tx.total, 0);
    const totalSells = filteredTransactions.filter(tx => tx.side === 'SELL').reduce((sum, tx) => sum + tx.total, 0);
    const totalFees = filteredTransactions.reduce((sum, tx) => sum + tx.fees, 0);
    const uniqueAssets = [...new Set(filteredTransactions.map(tx => tx.asset))];
    
    return {
      totalBuys,
      totalSells,
      totalFees,
      tradeCount: filteredTransactions.length,
      uniqueAssets: uniqueAssets.length,
    };
  }, [filteredTransactions]);

  const exportToCSV = useCallback(() => {
    if (filteredTransactions.length === 0) return;

    const headers = ['timestamp', 'chain', 'asset', 'side', 'quantity', 'price', 'total', 'fees', 'hash'];
    const rows = filteredTransactions.map(tx => [
      tx.timestamp, tx.chain, tx.asset, tx.side,
      tx.quantity.toString(), tx.price.toString(), tx.total.toString(),
      tx.fees.toString(), tx.hash
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-export-${wallet.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions, wallet]);

  const uniqueAssets = [...new Set(transactions.map(tx => tx.asset))].sort();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Aurora-style gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto py-8 px-4 max-w-7xl relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold flex items-center gap-3 text-wrap:balance">
            <Activity className="h-8 w-8 text-primary" aria-hidden="true" />
            Crypto Tax Exporter
          </h1>
          <p className="text-muted-foreground mt-2">
            Export transactions to tax-compatible formats. Multi-chain support via public RPC.
          </p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SpotlightCard className="mb-8" spotlightColor="rgba(139, 92, 246, 0.15)">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" aria-hidden="true" />
                Wallet Search
              </CardTitle>
              <CardDescription>
                Enter any supported chain wallet address. Uses free public RPC endpoints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={chain} onValueChange={setChain}>
                  <SelectTrigger className="w-full md:w-[180px]" aria-label="Select blockchain network">
                    <SelectValue placeholder="Chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", c.color)} aria-hidden="true" />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder={`Enter ${SUPPORTED_CHAINS.find(c => c.id === chain)?.name} address...`}
                    value={wallet}
                    onChange={e => setWallet(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchTransactions()}
                    className="pl-9"
                    aria-label="Wallet address"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <Button onClick={fetchTransactions} disabled={loading} className="min-w-[120px]">
                  {loading ? (
                    <>
                      <motion.span 
                        className="inline-block mr-2"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Activity className="h-4 w-4" />
                      </motion.span>
                      Loading...
                    </>
                  ) : (
                    'Fetch'
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4" role="alert">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </SpotlightCard>
        </motion.div>

        {/* Summary Cards */}
        <AnimatePresence>
          {filteredTransactions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
            >
              <SpotlightCard className="hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Activity className="h-4 w-4" aria-hidden="true" />
                    <span>Trades</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 tabular-nums">
                    <AnimatedCounter value={summary.tradeCount} duration={0.5} />
                  </p>
                </CardContent>
              </SpotlightCard>

              <SpotlightCard className="hover:shadow-lg" spotlightColor="rgba(34, 197, 94, 0.15)">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    <span>Buys</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-green-600 tabular-nums">
                    $<AnimatedCounter value={summary.totalBuys} decimals={2} duration={1} />
                  </p>
                </CardContent>
              </SpotlightCard>

              <SpotlightCard className="hover:shadow-lg" spotlightColor="rgba(239, 68, 68, 0.15)">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <TrendingDown className="h-4 w-4" aria-hidden="true" />
                    <span>Sells</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-red-600 tabular-nums">
                    $<AnimatedCounter value={summary.totalSells} decimals={2} duration={1} />
                  </p>
                </CardContent>
              </SpotlightCard>

              <SpotlightCard className="hover:shadow-lg" spotlightColor="rgba(107, 114, 128, 0.15)">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <DollarSign className="h-4 w-4" aria-hidden="true" />
                    <span>Fees</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 tabular-nums">
                    $<AnimatedCounter value={summary.totalFees} decimals={2} duration={0.8} />
                  </p>
                </CardContent>
              </SpotlightCard>

              <SpotlightCard className="hover:shadow-lg" spotlightColor="rgba(139, 92, 246, 0.15)">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span>Assets</span>
                  </div>
                  <p className="text-2xl font-bold mt-1 tabular-nums">
                    <AnimatedCounter value={summary.uniqueAssets} duration={0.5} />
                  </p>
                </CardContent>
              </SpotlightCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <AnimatePresence>
          {transactions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="mb-8 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                        aria-label="Search transactions"
                        autoComplete="off"
                      />
                    </div>

                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-[140px]" aria-label="Filter by date">
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={assetFilter} onValueChange={setAssetFilter}>
                      <SelectTrigger className="w-[140px]" aria-label="Filter by asset">
                        <SelectValue placeholder="Asset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assets</SelectItem>
                        {uniqueAssets.map(a => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={sideFilter} onValueChange={setSideFilter}>
                      <SelectTrigger className="w-[140px]" aria-label="Filter by side">
                        <SelectValue placeholder="Side" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sides</SelectItem>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={exportToCSV} aria-label="Export transactions to CSV">
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transactions Table */}
        <AnimatePresence>
          {filteredTransactions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Transactions</CardTitle>
                      <CardDescription>
                        {filteredTransactions.length} of {transactions.length} transactions
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Chain</TableHead>
                          <TableHead>Asset</TableHead>
                          <TableHead>Side</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Fees</TableHead>
                          <TableHead className="hidden lg:table-cell">Hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((tx, i) => (
                          <motion.tr
                            key={`${tx.hash}-${i}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <TableCell className="whitespace-nowrap">
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn(
                                "text-xs font-medium",
                                tx.chain === 'solana' && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                                tx.chain === 'ethereum' && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                                tx.chain === 'base' && "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
                                tx.chain === 'bittensor' && "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                                tx.chain === 'polkadot' && "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
                              )}>
                                {tx.chain}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono font-medium">
                              {tx.asset}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={tx.side === 'BUY' ? 'default' : 'destructive'}
                                className={cn(
                                  "gap-1",
                                  tx.side === 'BUY' && "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300",
                                  tx.side === 'SELL' && "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300"
                                )}
                              >
                                {tx.side === 'BUY' ? (
                                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                                )}
                                {tx.side}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {tx.quantity.toFixed(4)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              ${tx.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium tabular-nums">
                              ${tx.total.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground tabular-nums">
                              ${tx.fees.toFixed(2)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell font-mono text-sm text-muted-foreground max-w-[100px] truncate" title={tx.hash}>
                              {tx.hash}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading && (
          <Card className="mb-8">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty States */}
        {!loading && hasSearched && filteredTransactions.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
              <p className="text-lg text-muted-foreground mb-2">
                No transactions found
              </p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search query
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !hasSearched && (
          <Card>
            <CardContent className="py-20 text-center">
              <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
              <p className="text-xl text-muted-foreground mb-2">
                Enter a wallet address to get started
              </p>
              <p className="text-sm text-muted-foreground">
                Supports {SUPPORTED_CHAINS.map(c => c.name).join(', ')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
