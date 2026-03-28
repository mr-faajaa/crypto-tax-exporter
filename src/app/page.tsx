'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { 
  Download, 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  ExternalLink,
  Clock,
  Hash,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  { id: 'solana', name: 'Solana', color: '#9945FF' },
  { id: 'ethereum', name: 'Ethereum', color: '#627EEA' },
  { id: 'base', name: 'Base', color: '#0052FF' },
  { id: 'arbitrum', name: 'Arbitrum', color: '#28A0F0' },
  { id: 'polygon', name: 'Polygon', color: '#8247E5' },
  { id: 'optimism', name: 'Optimism', color: '#FF0420' },
  { id: 'bittensor', name: 'Bittensor', color: '#252525' },
  { id: 'polkadot', name: 'Polkadot', color: '#E6007A' },
  { id: 'osmosis', name: 'Osmosis', color: '#1E1E1E' },
  { id: 'ronin', name: 'Ronin', color: '#C3141D' },
];

const PERP_EXCHANGES = [
  { id: 'hyperliquid', name: 'Hyperliquid', color: '#4A47EE' },
  { id: 'perpetual', name: 'Perpetual Protocol', color: '#9393DD' },
  { id: 'gmx', name: 'GMX', color: '#05F2AF' },
  { id: 'synthetix', name: 'Synthetix', color: '#1A1A2E' },
];

// Spring-based animated counter
function AnimatedNumber({ value, prefix = '', decimals = 2 }: { value: number; prefix?: string; decimals?: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}`);
  
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  
  return <motion.span>{display}</motion.span>;
}

// Subtle fade-in wrapper
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Chain badge with colored dot
function ChainBadge({ chain, color }: { chain: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-background/80">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {chain}
    </span>
  );
}

// PnL indicator
function PnLIndicator({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span className={cn(
      "font-mono tabular-nums",
      isPositive ? "text-emerald-400" : "text-red-400"
    )}>
      {isPositive ? '+' : ''}{value.toFixed(2)}
    </span>
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

  const inputRef = useRef<HTMLInputElement>(null);

  const currentOptions = transactionType === 'perp' ? PERP_EXCHANGES : SUPPORTED_CHAINS;
  const currentOption = currentOptions.find(o => o.id === chain) || currentOptions[0];

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
    <div className="min-h-screen bg-background">
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
      
      <div className="relative">
        <div className="container mx-auto px-6 py-16 max-w-7xl">
          
          {/* Editorial Header - Left aligned */}
          <FadeIn className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="h-5 w-5 text-amber-500/80" />
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60 font-medium">Tax Export</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 text-left">
              <span className="text-foreground">{transactionType === 'perp' ? 'Perpetuals' : 'Crypto'}</span>
              <br />
              <span className="text-amber-500/90">Tax Export</span>
            </h1>
            <p className="text-muted-foreground/70 text-lg max-w-xl text-left leading-relaxed">
              {transactionType === 'perp' 
                ? 'Export your perpetuals & futures positions to CSV for tax reporting.'
                : 'Multi-chain spot transactions exported to tax-compliant CSV format.'}
            </p>
          </FadeIn>

          {/* Type Toggle - Understated */}
          <FadeIn delay={0.05} className="flex gap-1 mb-8 bg-secondary/50 p-1 rounded-lg w-fit">
            <button
              onClick={() => setTransactionType('spot')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                transactionType === 'spot' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Spot
            </button>
            <button
              onClick={() => setTransactionType('perp')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                transactionType === 'perp' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Perps
            </button>
          </FadeIn>

          {/* Search Section */}
          <FadeIn delay={0.1}>
            <Card className="mb-8 border-border/50 bg-background/80 backdrop-blur">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Chain/Exchange Selector */}
                  <div className="relative">
                    <div className="flex items-center gap-2 px-4 py-3 bg-secondary rounded-lg border border-border min-w-[180px]">
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: currentOption.color }} 
                      />
                      <select
                        value={chain}
                        onChange={(e) => setChain(e.target.value)}
                        className="bg-transparent text-sm font-medium outline-none cursor-pointer flex-1 appearance-none"
                      >
                        {currentOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Wallet Input */}
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Enter wallet address..."
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      className="h-12 bg-secondary border-border text-sm font-mono pl-12"
                      onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Hash className="h-4 w-4" />
                    </span>
                  </div>

                  {/* Fetch Button */}
                  <Button 
                    onClick={fetchTransactions}
                    disabled={loading}
                    className="h-12 px-8 bg-amber-500 hover:bg-amber-600 text-black font-medium"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Fetch
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-sm text-red-400"
                  >
                    {error}
                  </motion.p>
                )}
              </div>
            </Card>
          </FadeIn>

          {/* Summary Stats */}
          <AnimatePresence mode="wait">
            {hasSearched && filteredTransactions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mb-8"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Trades */}
                  <FadeIn delay={0.15} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-xs uppercase tracking-wider text-muted-foreground/60">Trades</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{summary.tradeCount}</p>
                  </FadeIn>

                  {transactionType === 'perp' ? (
                    <>
                      {/* PnL */}
                      <FadeIn delay={0.2} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground/60">PnL</span>
                        </div>
                        <p className="text-2xl font-bold"><PnLIndicator value={summary.totalPnl ?? 0} /></p>
                      </FadeIn>
                      {/* Fees */}
                      <FadeIn delay={0.25} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground/60">Fees</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-500/80 tabular-nums">${summary.totalFees?.toFixed(2)}</p>
                      </FadeIn>
                      {/* Open */}
                      <FadeIn delay={0.3} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground/60">Open</span>
                        </div>
                        <p className="text-2xl font-bold tabular-nums">{summary.openPositions}</p>
                      </FadeIn>
                    </>
                  ) : (
                    <>
                      {/* Buys */}
                      <FadeIn delay={0.2} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                          <span className="text-xs uppercase tracking-wider text-muted-foreground/60">Buys</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400 tabular-nums">${summary.totalBuys?.toFixed(2)}</p>
                      </FadeIn>
                      {/* Sells */}
                      <FadeIn delay={0.25} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowUpRight className="h-4 w-4 text-red-400" />
                          <span className="text-xs uppercase tracking-wider text-muted-foreground/60">Sells</span>
                        </div>
                        <p className="text-2xl font-bold text-red-400 tabular-nums">${summary.totalSells?.toFixed(2)}</p>
                      </FadeIn>
                      {/* Fees */}
                      <FadeIn delay={0.3} className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground/60">Fees</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-500/80 tabular-nums">${summary.totalFees?.toFixed(2)}</p>
                      </FadeIn>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters & Table */}
          <AnimatePresence mode="wait">
            {hasSearched && filteredTransactions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                {/* Filters Row */}
                <FadeIn delay={0.2}>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {/* Date Filter */}
                    <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                      {['all', 'week', 'month'].map(filter => (
                        <button
                          key={filter}
                          onClick={() => setDateFilter(filter)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            dateFilter === filter 
                              ? "bg-background text-foreground" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {filter === 'all' ? 'All' : filter === 'week' ? '7d' : '30d'}
                        </button>
                      ))}
                    </div>

                    {/* Asset Filter */}
                    <select
                      value={assetFilter}
                      onChange={(e) => setAssetFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-lg outline-none cursor-pointer"
                    >
                      <option value="all">All Assets</option>
                      {uniqueAssets.map(asset => (
                        <option key={asset} value={asset}>{asset}</option>
                      ))}
                    </select>

                    {/* Side Filter */}
                    <select
                      value={sideFilter}
                      onChange={(e) => setSideFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-lg outline-none cursor-pointer"
                    >
                      <option value="all">All Sides</option>
                      {transactionType === 'perp' ? (
                        <>
                          <option value="LONG">Long</option>
                          <option value="SHORT">Short</option>
                        </>
                      ) : (
                        <>
                          <option value="BUY">Buy</option>
                          <option value="SELL">Sell</option>
                        </>
                      )}
                    </select>

                    {/* Search */}
                    <div className="flex-1 min-w-[200px] relative">
                      <Input
                        type="text"
                        placeholder="Search asset, hash..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 text-xs bg-secondary/50 pl-8"
                      />
                      <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Export */}
                    <Button 
                      onClick={exportToCSV}
                      variant="outline" 
                      className="ml-auto h-8 text-xs gap-2"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </Button>
                  </div>
                </FadeIn>

                {/* Transactions Table */}
                <FadeIn delay={0.25}>
                  <Card className="border-border/50 bg-background/80 backdrop-blur overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/50 hover:bg-transparent">
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60">Time</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60">Asset</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60">Side</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 text-right">Quantity</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 text-right">Price</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 text-right">Total</TableHead>
                            {transactionType === 'perp' && (
                              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 text-right">PnL</TableHead>
                            )}
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60 text-right">Fees</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60">Chain</TableHead>
                            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground/60">Hash</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence mode="popLayout">
                            {filteredTransactions.slice(0, 50).map((tx, i) => {
                              const isPerp = transactionType === 'perp';
                              const perpTx = tx as PerpTransaction;
                              const spotTx = tx as SpotTransaction;
                              
                              return (
                                <motion.tr
                                  key={tx.hash + i}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  transition={{ delay: i * 0.02, duration: 0.2 }}
                                  className="border-border/30 hover:bg-secondary/30"
                                >
                                  <TableCell className="text-sm text-muted-foreground/80 font-mono">
                                    {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </TableCell>
                                  <TableCell className="font-medium">{tx.asset}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "font-medium text-xs",
                                        tx.side === 'BUY' || tx.side === 'LONG' 
                                          ? "border-emerald-500/50 text-emerald-400" 
                                          : "border-red-500/50 text-red-400"
                                      )}
                                    >
                                      {tx.side}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-mono tabular-nums text-sm">
                                    {tx.quantity.toFixed(4)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono tabular-nums text-sm">
                                    ${isPerp ? perpTx.entry_price.toFixed(2) : spotTx.price.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono tabular-nums text-sm">
                                    ${isPerp ? (perpTx.pnl || 0).toFixed(2) : spotTx.total.toFixed(2)}
                                  </TableCell>
                                  {isPerp && (
                                    <TableCell className="text-right">
                                      <PnLIndicator value={perpTx.pnl || 0} />
                                    </TableCell>
                                  )}
                                  <TableCell className="text-right font-mono tabular-nums text-sm text-muted-foreground/60">
                                    ${tx.fees.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <ChainBadge 
                                      chain={tx.chain} 
                                      color={SUPPORTED_CHAINS.find(c => c.id === tx.chain)?.color || '#666'} 
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground/50 max-w-[80px] truncate">
                                    {tx.hash.slice(0, 8)}...
                                  </TableCell>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                    
                    {filteredTransactions.length > 50 && (
                      <div className="p-4 text-center text-sm text-muted-foreground/60 border-t border-border/50">
                        Showing 50 of {filteredTransactions.length} transactions
                      </div>
                    )}
                  </Card>
                </FadeIn>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          <AnimatePresence>
            {hasSearched && filteredTransactions.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="text-center py-20"
              >
                <p className="text-muted-foreground/60">No transactions found</p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
