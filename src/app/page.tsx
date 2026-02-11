'use client';

import { useState, useCallback } from 'react';

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

export default function HomePage() {
  const [wallet, setWallet] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chain, setChain] = useState('solana');

  const fetchTransactions = useCallback(async () => {
    if (!wallet.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/transactions?wallet=${wallet}&chain=${chain}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      setTransactions(data.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [wallet, chain]);

  const exportToCSV = useCallback(() => {
    if (transactions.length === 0) return;

    const headers = ['timestamp', 'asset', 'side', 'quantity', 'price', 'total', 'fees', 'hash'];
    const rows = transactions.map(tx => [
      tx.timestamp,
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Crypto Tax Exporter
        </h1>
        <p style={{ color: '#666' }}>
          Export crypto transactions to tax-compatible CSV format
        </p>
      </header>

      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <select
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '1rem',
            backgroundColor: 'white'
          }}
        >
          <option value="solana">Solana</option>
          <option value="ethereum" disabled>Ethereum (Coming Soon)</option>
          <option value="bittensor" disabled>Bittensor (Coming Soon)</option>
        </select>

        <input
          type="text"
          placeholder="Enter wallet address..."
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
          style={{
            flex: 1,
            minWidth: '300px',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '1rem'
          }}
        />

        <button
          onClick={fetchTransactions}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: loading ? '#ccc' : '#0066ff',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? 'Loading...' : 'Fetch'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: '#fee',
          color: '#c00',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {transactions.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#666' }}>
            {transactions.length} transactions found
          </span>
          <button
            onClick={exportToCSV}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#10b981',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Download CSV
          </button>
        </div>
      )}

      {transactions.length > 0 && (
        <div style={{ 
          borderRadius: '12px', 
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                {['Timestamp', 'Asset', 'Side', 'Quantity', 'Price', 'Total', 'Fees', 'Hash'].map(h => (
                  <th key={h} style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 100).map((tx, i) => (
                <tr key={tx.hash + i} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ 
                      backgroundColor: '#f3f4f6', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      {tx.asset}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ 
                      color: tx.side === 'BUY' ? '#10b981' : '#ef4444',
                      fontWeight: '500'
                    }}>
                      {tx.side}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>
                    {tx.quantity.toFixed(4)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>
                    ${tx.price.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: '500' }}>
                    ${tx.total.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#666' }}>
                    ${tx.fees.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#666', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tx.hash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length > 100 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.875rem' }}>
              Showing 100 of {transactions.length} transactions. Download CSV for full data.
            </div>
          )}
        </div>
      )}

      {transactions.length === 0 && !loading && !error && (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem', 
          color: '#666',
          backgroundColor: '#f9fafb',
          borderRadius: '12px'
        }}>
          <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Enter a wallet address to get started
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Supports Solana with more chains coming soon
          </p>
        </div>
      )}
    </div>
  );
}
