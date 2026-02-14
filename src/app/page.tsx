'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  FileSpreadsheet,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Constants
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

// Utility components
function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <Loader2 className="h-5 w-5" />
    </motion.div>
  );
}

function Badge({ children, variant = 'default', className }: { 
  children: React.ReactNode; 
  variant?: 'default' | 'success' | 'danger' | 'neutral';
  className?: string;
}) {
  const variants = {
    default: 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-[var(--color-accent)]/30',
    success: 'bg-[var(--color-success-muted)] text-[var(--color-success)] border-[var(--color-success)]/30',
    danger: 'bg-[var(--color-danger-muted)] text-[var(--color-danger)] border-[var(--color-danger)]/30',
    neutral: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border-[var(--color-border)]',
  };
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

function Button({ 
  children, 
  variant = 'primary', 
  className, 
  disabled,
  onClick,
  type = 'button'
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
    secondary: 'bg-[var(--color-bg-elevated)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]',
    ghost: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]',
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

function Input({ 
  value, 
  onChange, 
  placeholder, 
  onKeyDown,
  className 
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={cn(
        'w-full px-4 py-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]',
        'text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)]',
        'focus:border-[var(--color-accent)] focus:outline-none transition-colors',
        className
      )}
    />
  );
}

function Select({ 
  value, 
  onChange, 
  options,
  placeholder 
}: { 
  value: string; 
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'px-4 py-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]',
        'text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none transition-colors',
        'cursor-pointer appearance-none',
        'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b6b6b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")]',
        'bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10'
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.id} value={opt.id}>{opt.name}</option>
      ))}
    </select>
  );
}

// Main Component
export default function HomePage() {
  const [wallet, setWallet] = useState('');
  const [chain, setChain] = useState('solana');
  const [transactionType, setTransactionType] = useState<'spot' | 'perp'>('spot');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Filters
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
      // Always use mock data for demo
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
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-2">
            <FileSpreadsheet className="h-8 w-8 text-[var(--color-accent)]" />
            <span className="text-xs uppercase tracking-widest text-[var(--color-text-subtle)]">Tax Export</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-semibold mb-4 text-balance">
            {transactionType === 'perp' ? 'Perpetuals Tax Export' : 'Crypto Tax Export'}
          </h1>
          <p className="text-[var(--color-text-muted)] text-lg max-w-xl">
            {transactionType === 'perp' 
              ? 'Export your perpetuals & futures positions to CSV for tax reporting. Supports Hyperliquid, GMX, Synthetix.'
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
          <button
            onClick={() => setTransactionType('spot')}
            className={cn(
              'px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
              transactionType === 'spot' 
                ? 'bg-[var(--color-text)] text-[var(--color-bg)]' 
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            )}
          >
            <Activity className="inline-block h-4 w-4 mr-2" />
            Spot
          </button>
          <button
            onClick={() => setTransactionType('perp')}
            className={cn(
              'px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
              transactionType === 'perp' 
                ? 'bg-[var(--color-text)] text-[var(--color-bg)]' 
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            )}
          >
            <TrendingUp className="inline-block h-4 w-4 mr-2" />
            Perps
          </button>
        </motion.div>

        {/* Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <Select
              value={chain}
              onChange={setChain}
              options={transactionType === 'perp' ? PERP_EXCHANGES : SUPPORTED_CHAINS}
              placeholder={transactionType === 'perp' ? 'Select exchange' : 'Select chain'}
            />
            
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-subtle)]" />
              <Input
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                placeholder={`Enter ${transactionType === 'perp' ? PERP_EXCHANGES.find(e => e.id === chain)?.name : SUPPORTED_CHAINS.find(c => c.id === chain)?.name} address...`}
                className="pl-12"
              />
            </div>

            <Button onClick={fetchTransactions} disabled={loading} className="min-w-[120px]">
              {loading ? <Spinner /> : 'Fetch'}
            </Button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 rounded-lg bg-[var(--color-danger-muted)] text-[var(--color-danger)] text-sm"
            >
              {error}
            </motion.div>
          )}
        </motion.div>

        {/* Summary Stats */}
        <AnimatePresence>
          {filteredTransactions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 stagger-children"
            >
              {transactionType === 'perp' ? (
                <>
                  <StatCard label="Total PnL" value={summary.totalPnl} prefix="$" />
                  <StatCard label="Fees" value={summary.totalFees} prefix="$" />
                  <StatCard label="Funding" value={summary.totalFunding} prefix="$" />
                  <StatCard label="Open" value={summary.openPositions} />
                  <StatCard label="Assets" value={summary.uniqueAssets} />
                </>
              ) : (
                <>
                  <StatCard label="Trades" value={summary.tradeCount} />
                  <StatCard label="Buys" value={summary.totalBuys} prefix="$" />
                  <StatCard label="Sells" value={summary.totalSells} prefix="$" />
                  <StatCard label="Fees" value={summary.totalFees} prefix="$" />
                  <StatCard label="Assets" value={summary.uniqueAssets} />
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-subtle)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-10 py-2"
                />
              </div>

              <Select
                value={dateFilter}
                onChange={setDateFilter}
                options={[
                  { id: 'all', name: 'All time' },
                  { id: 'week', name: 'Last 7 days' },
                  { id: 'month', name: 'Last 30 days' },
                ]}
              />

              <Select
                value={assetFilter}
                onChange={setAssetFilter}
                options={[{ id: 'all', name: 'All assets' }, ...uniqueAssets.map(a => ({ id: a, name: a }))]}
              />

              {transactionType === 'spot' && (
                <Select
                  value={sideFilter}
                  onChange={setSideFilter}
                  options={[
                    { id: 'all', name: 'All sides' },
                    { id: 'BUY', name: 'Buy' },
                    { id: 'SELL', name: 'Sell' },
                  ]}
                />
              )}

              <Button variant="secondary" onClick={exportToCSV}>
                <Download className="h-4 w-4" />
                CSV
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
              className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Date</th>
                      {transactionType === 'perp' && (
                        <th className="text-left p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Exchange</th>
                      )}
                      {transactionType === 'spot' && (
                        <th className="text-left p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Chain</th>
                      )}
                      <th className="text-left p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Asset</th>
                      <th className="text-left p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Side</th>
                      <th className="text-right p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Size</th>
                      {transactionType === 'perp' ? (
                        <>
                          <th className="text-right p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Entry</th>
                          <th className="text-right p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Exit</th>
                          <th className="text-right p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">PnL</th>
                        </>
                      ) : (
                        <>
                          <th className="text-right p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Price</th>
                          <th className="text-right p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Total</th>
                        </>
                      )}
                      <th className="text-right p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Fees</th>
                      {transactionType === 'perp' && (
                        <>
                          <th className="text-right p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Funding</th>
                          <th className="text-center p-4 text-xs uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Lev</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, i) => (
                      <motion.tr
                        key={`${tx.hash}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                      >
                        <td className="p-4 text-sm text-[var(--color-text-muted)]">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </td>
                        {transactionType === 'perp' && (
                          <td className="p-4">
                            <Badge variant="neutral">{(tx as PerpTransaction).exchange}</Badge>
                          </td>
                        )}
                        {transactionType === 'spot' && (
                          <td className="p-4">
                            <Badge variant="neutral">{tx.chain}</Badge>
                          </td>
                        )}
                        <td className="p-4 font-mono text-sm font-medium">{tx.asset}</td>
                        <td className="p-4">
                          <Badge variant={tx.side === 'LONG' || tx.side === 'BUY' ? 'success' : 'danger'}>
                            {tx.side === 'LONG' || tx.side === 'BUY' ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {tx.side}
                          </Badge>
                        </td>
                        <td className="p-4 text-right font-mono text-sm tabular-nums">
                          {(tx as PerpTransaction).quantity?.toFixed(4) || (tx as SpotTransaction).quantity?.toFixed(4)}
                        </td>
                        {transactionType === 'perp' ? (
                          <>
                            <td className="p-4 text-right font-mono text-sm tabular-nums text-[var(--color-text-muted)]">
                              ${(tx as PerpTransaction).entry_price.toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono text-sm tabular-nums text-[var(--color-text-muted)]">
                              {(tx as PerpTransaction).exit_price ? `$${(tx as PerpTransaction).exit_price?.toFixed(2)}` : '—'}
                            </td>
                            <td className={cn(
                              "p-4 text-right font-mono text-sm tabular-nums font-medium",
                              (tx as PerpTransaction).pnl === undefined ? 'text-[var(--color-text-subtle)]' : 
                              (tx as PerpTransaction).pnl! >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                            )}>
                              {(tx as PerpTransaction).pnl !== undefined ? `$${(tx as PerpTransaction).pnl?.toFixed(2)}` : 'Open'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-4 text-right font-mono text-sm tabular-nums text-[var(--color-text-muted)]">
                              ${(tx as SpotTransaction).price.toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono text-sm tabular-nums font-medium">
                              ${(tx as SpotTransaction).total.toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="p-4 text-right font-mono text-sm tabular-nums text-[var(--color-text-muted)]">
                          ${tx.fees.toFixed(2)}
                        </td>
                        {transactionType === 'perp' && (
                          <>
                            <td className="p-4 text-right font-mono text-sm tabular-nums text-[var(--color-text-muted)]">
                              ${(tx as PerpTransaction).funding.toFixed(2)}
                            </td>
                            <td className="p-4 text-center">
                              {(tx as PerpTransaction).leverage > 0 && (
                                <span className="text-xs text-[var(--color-text-subtle)]">{(tx as PerpTransaction).leverage}x</span>
                              )}
                            </td>
                          </>
                        )}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && hasSearched && filteredTransactions.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Wallet className="h-16 w-16 mx-auto text-[var(--color-text-subtle)] mb-4" />
            <p className="text-[var(--color-text-muted)]">No transactions found</p>
          </motion.div>
        )}

        {!loading && !hasSearched && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex items-center justify-center">
              <Wallet className="h-10 w-10 text-[var(--color-accent)]" />
            </div>
            <p className="text-xl font-display mb-2">Enter a wallet address</p>
            <p className="text-[var(--color-text-muted)]">
              Supports {SUPPORTED_CHAINS.map(c => c.name).join(', ')}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, prefix = '' }: { label: string; value: number | undefined; prefix?: string }) {
  const displayValue = value ?? 0;
  return (
    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-subtle)] mb-1">{label}</p>
      <p className="text-2xl font-display font-semibold tabular-nums">
        {prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
