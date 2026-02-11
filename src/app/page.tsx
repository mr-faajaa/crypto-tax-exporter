'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, AlertCircle, Wallet } from 'lucide-react';
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
  { id: 'solana', name: 'Solana' },
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'base', name: 'Base' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'polygon', name: 'Polygon' },
];

export default function HomePage() {
  const [wallet, setWallet] = useState('');
  const [chain, setChain] = useState('solana');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const validateWallet = useCallback((addr: string, chainId: string): boolean => {
    switch (chainId) {
      case 'solana':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
      case 'ethereum':
      case 'base':
      case 'arbitrum':
      case 'polygon':
        return /^0x[a-fA-F0-9]{40}$/.test(addr);
      default:
        return addr.length > 0;
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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [wallet, chain, validateWallet]);

  const exportToCSV = useCallback(() => {
    if (transactions.length === 0) return;

    const headers = ['timestamp', 'chain', 'asset', 'side', 'quantity', 'price', 'total', 'fees', 'hash'];
    const rows = transactions.map(tx => [
      tx.timestamp,
      tx.chain,
      tx.asset,
      tx.side,
      tx.quantity.toString(),
      tx.price.toString(),
      tx.total.toString(),
      tx.fees.toString(),
      tx.hash
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${wallet.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions, wallet]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10 px-4 max-w-6xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8" />
              Crypto Tax Exporter
            </CardTitle>
            <CardDescription>
              Export crypto transactions to tax-compatible CSV format. Supports multiple chains.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={chain} onValueChange={setChain}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CHAINS.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder={`Enter ${SUPPORTED_CHAINS.find(c => c.id === chain)?.name} wallet address...`}
                value={wallet}
                onChange={e => setWallet(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchTransactions()}
                className="flex-1"
                disabled={loading}
              />

              <Button onClick={fetchTransactions} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
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

        {transactions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Transactions</CardTitle>
                  <CardDescription>
                    {transactions.length} transactions found
                  </CardDescription>
                </div>
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
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
                      <TableHead className="hidden xl:table-cell">Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx, i) => (
                      <TableRow key={`${tx.hash}-${i}`}>
                        <TableCell>
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary">
                            {tx.chain}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium">{tx.asset}</span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-medium",
                            tx.side === 'BUY' ? "text-green-600" : 
                            tx.side === 'SELL' ? "text-red-600" : "text-gray-600"
                          )}>
                            {tx.side}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {tx.quantity.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${tx.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ${tx.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          ${tx.fees.toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell font-mono text-sm text-muted-foreground max-w-[120px] truncate">
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

        {loading && (
          <Card className="mt-8">
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

        {!loading && hasSearched && transactions.length === 0 && !error && (
          <Card className="mt-8">
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                No transactions found for this wallet on {SUPPORTED_CHAINS.find(c => c.id === chain)?.name}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !hasSearched && (
          <Card className="mt-8">
            <CardContent className="py-16 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-2">
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
