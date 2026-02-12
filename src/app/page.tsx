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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, AlertCircle, Wallet, TrendingUp, TrendingDown, DollarSign, Activity, Calendar, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { id: 'base', name: 'Base', color: 'bg-blue-600' },
  { id: 'arbitrum', name: 'Arbitrum', color: 'bg-blue-800' },
  { id: 'polygon', name: 'Polygon', color: 'bg-purple-700' },
];

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
      default: return addr.length > 0;
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!wallet.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    if (!validateWallet(wallet, chain)) {
      setError(`Invalid wallet address for ${SUPPORTED_CHAINS.find(c => c.id === chain)?.name}`);
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

    // Date filter
    const now = new Date();
    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= monthAgo);
    }

    // Asset filter
    if (assetFilter !== 'all') {
      filtered = filtered.filter(tx => tx.asset === assetFilter);
    }

    // Side filter
    if (sideFilter !== 'all') {
      filtered = filtered.filter(tx => tx.side === sideFilter);
    }

    // Search filter
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
      netVolume: totalBuys + totalSells,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-wrap: balance">
            <Activity className="h-8 w-8 text-primary" aria-hidden="true" />
            Crypto Tax Exporter
          </h1>
          <p className="text-muted-foreground mt-2">
            Export transactions to tax-compatible formats. Multi-chain support.
          </p>
        </div>

        {/* Search Card */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" aria-hidden="true" />
              Wallet Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={chain} onValueChange={setChain}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Chain" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CHAINS.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder={`Enter ${SUPPORTED_CHAINS.find(c => c.id === chain)?.name} address...`}
                value={wallet}
                onChange={e => setWallet(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchTransactions()}
                className="flex-1"
                disabled={loading}
              />

              <Button onClick={fetchTransactions} disabled={loading} className="min-w-[120px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading
                  </>
                ) : (
                  'Fetch'
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {filteredTransactions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm">Trades</span>
                </div>
                <p className="text-2xl font-bold mt-1">{summary.tradeCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Buys</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-green-600">${summary.totalBuys.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm">Sells</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-red-600">${summary.totalSells.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Fees</span>
                </div>
                <p className="text-2xl font-bold mt-1">${summary.totalFees.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Assets</span>
                </div>
                <p className="text-2xl font-bold mt-1">{summary.uniqueAssets}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {transactions.length > 0 && (
          <Card className="mb-8">
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
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={assetFilter} onValueChange={setAssetFilter}>
                  <SelectTrigger className="w-[140px]">
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
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Side" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sides</SelectItem>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        {filteredTransactions.length > 0 && (
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
                      <TableRow key={`${tx.hash}-${i}`}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(
                            'text-xs',
                            tx.chain === 'solana' && 'bg-purple-100 text-purple-700',
                            tx.chain === 'ethereum' && 'bg-blue-100 text-blue-700',
                            tx.chain === 'base' && 'bg-indigo-100 text-indigo-700'
                          )}>
                            {tx.chain}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {tx.asset}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.side === 'BUY' ? 'default' : 'destructive'}>
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
                        <TableCell className="hidden lg:table-cell font-mono text-sm text-muted-foreground max-w-[100px] truncate">
                          {tx.hash}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

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
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
              <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground mb-2">
                Enter a wallet address to get started
              </p>
              <p className="text-sm text-muted-foreground">
                Supports Solana, Ethereum, Base, Arbitrum, and Polygon
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
