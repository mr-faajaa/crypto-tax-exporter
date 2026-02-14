'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, AlertCircle, Wallet, TrendingUp, TrendingDown, DollarSign, Activity, Calendar, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Custom ReactBits-style implementations (no Three.js dependency)

// Hyperspeed starfield background
function HyperspeedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const stars: { x: number; y: number; z: number; size: number }[] = [];
    const numStars = 600;
    
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width - canvas.width / 2,
        y: Math.random() * canvas.height - canvas.height / 2,
        z: Math.random() * canvas.width,
        size: Math.random() * 2,
      });
    }
    
    let speed = 2;
    let animationId: number;
    
    const animate = () => {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      stars.forEach((star) => {
        star.z -= speed;
        if (star.z <= 0) {
          star.z = canvas.width;
          star.x = Math.random() * canvas.width - cx;
          star.y = Math.random() * canvas.height - cy;
        }
        
        const x = (star.x / star.z) * 100 + cx;
        const y = (star.y / star.z) * 100 + cy;
        const size = (1 - star.z / canvas.width) * star.size * 3;
        
        if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
          const brightness = Math.max(0, 1 - star.z / canvas.width);
          ctx.fillStyle = `rgba(139, 92, 246, ${brightness})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Speed line effect for fast stars
          if (speed > 5 && brightness > 0.7) {
            ctx.strokeStyle = `rgba(139, 92, 246, ${brightness * 0.5})`;
            ctx.lineWidth = size * 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - size * 3, y);
            ctx.stroke();
          }
        }
      });
      
      speed = Math.min(speed + 0.005, 20);
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-20"
      style={{ background: 'linear-gradient(to bottom, #0a0a0f 0%, #0d0d1a 100%)' }}
    />
  );
}

// Aurora overlay effect
function AuroraOverlay() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.25) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.15) 0%, transparent 60%)',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(139, 92, 246, 0.02) 80px, rgba(139, 92, 246, 0.02) 160px)',
        }}
        animate={{ x: [-160, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

// SpotlightCard with cursor tracking
function SpotlightCard({ children, className, spotlightColor = 'rgba(139, 92, 246, 0.5)' }: { children: React.ReactNode; className?: string; spotlightColor?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    card.addEventListener('mousemove', handleMouseMove);
    return () => card.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)' }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, ${spotlightColor}, transparent 50%)` }}
        transition={{ duration: 0.1 }}
      />
      {children}
    </motion.div>
  );
}

// CountUp animated counter
function CountUp({ end, prefix = '', decimals = 0, duration = 1.5 }: { end: number; prefix?: string; decimals?: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(easeProgress * end);
      if (progress < 1) requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [end, duration]);

  return <span className="font-bold tabular-nums">{prefix}{count.toFixed(decimals)}</span>;
}

// DecryptedText reveal effect
function DecryptedText({ text, speed = 40, revealSpeed = 30 }: { text: string; speed?: number; revealSpeed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayed(text.substring(0, currentIndex + 1) + 
          text.substring(currentIndex + 1).split('').map(() => chars[Math.floor(Math.random() * chars.length)]).join(''));
        currentIndex++;
      } else {
        setDisplayed(text);
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, chars]);

  if (isComplete) return <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">{text}</span>;

  return (
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
      {displayed}
    </motion.span>
  );
}

// AnimatedContent wrapper
function AnimatedContent({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, delay, type: 'spring', stiffness: 100 }}
    >
      {children}
    </motion.div>
  );
}

// ClickSpark wrapper
function ClickSpark({ children, sparkColor = '#8b5cf6', sparkCount = 8 }: { children: React.ReactNode; sparkColor?: string; sparkCount?: number }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      {children}
    </motion.div>
  );
}

// LetterGlitch text effect
function LetterGlitch({ text, glitchSpeed = 50, center, className = '' }: { text: string; glitchSpeed?: number; center?: boolean; className?: string }) {
  const [displayText, setDisplayText] = useState(text);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';

  useEffect(() => {
    let phase = 0;
    const maxPhases = 5;
    const timeouts: NodeJS.Timeout[] = [];
    const scramble = () => {
      if (phase < maxPhases) {
        setDisplayText(text.split('').map((char, i) => {
          if (i < phase || i >= text.length - phase) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join(''));
        phase++;
        timeouts.push(setTimeout(scramble, glitchSpeed));
      } else {
        setDisplayText(text);
      }
    };
    timeouts.push(setTimeout(scramble, 100));
    return () => timeouts.forEach(clearTimeout);
  }, [text, glitchSpeed, chars]);

  return <span className={cn(center && 'flex justify-center', className)}>{displayText}</span>;
}

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
  { id: 'solana', name: 'Solana', color: 'from-purple-500 to-purple-700' },
  { id: 'ethereum', name: 'Ethereum', color: 'from-blue-500 to-blue-700' },
  { id: 'base', name: 'Base', color: 'from-indigo-500 to-indigo-700' },
  { id: 'arbitrum', name: 'Arbitrum', color: 'from-blue-800 to-blue-900' },
  { id: 'polygon', name: 'Polygon', color: 'from-purple-700 to-purple-900' },
  { id: 'bittensor', name: 'Bittensor', color: 'from-orange-500 to-orange-700' },
  { id: 'polkadot', name: 'Polkadot', color: 'from-pink-500 to-pink-700' },
  { id: 'osmosis', name: 'Osmosis', color: 'from-cyan-500 to-cyan-700' },
  { id: 'ronin', name: 'Ronin', color: 'from-blue-400 to-blue-600' },
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
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Hyperspeed Background */}
      <HyperspeedBackground />

      {/* Aurora Overlay */}
      <AuroraOverlay />

      <div className="container mx-auto py-12 px-4 max-w-7xl relative z-10">
        {/* Header */}
        <AnimatedContent delay={0}>
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="text-center mb-12"
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-black mb-4 tracking-tight"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <DecryptedText
                text="CRYPTO TAX EXPORTER"
                speed={40}
                revealSpeed={30}
              />
            </motion.h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Multi-chain transactions with hyperspeed precision. Export to tax-compatible formats.
            </p>
          </motion.div>
        </AnimatedContent>

        {/* Search Card */}
        <AnimatedContent delay={0.2}>
          <SpotlightCard 
            className="mb-8 bg-slate-900/80 backdrop-blur-xl border-slate-700/50"
            spotlightColor="#8b5cf6"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white text-xl">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <Wallet className="h-6 w-6 text-purple-400" />
                </motion.div>
                Wallet Search
              </CardTitle>
              <CardDescription className="text-gray-400">
                Enter any supported chain wallet address. Uses free public RPC endpoints.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={chain} onValueChange={setChain}>
                  <SelectTrigger className="w-full md:w-[180px] bg-slate-800/50 border-slate-600 text-white">
                    <SelectValue placeholder="Chain" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {SUPPORTED_CHAINS.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-white hover:bg-slate-700">
                        <span className="flex items-center gap-2">
                          <span className={cn("w-3 h-3 rounded-full bg-gradient-to-r", c.color)} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder={`Enter ${SUPPORTED_CHAINS.find(c => c.id === chain)?.name} address...`}
                    value={wallet}
                    onChange={e => setWallet(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchTransactions()}
                    className="pl-12 h-12 bg-slate-800/50 border-slate-600 text-white placeholder:text-gray-500"
                    aria-label="Wallet address"
                    autoComplete="off"
                  />
                </div>

                <ClickSpark sparkColor="#8b5cf6" sparkCount={8}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={fetchTransactions} 
                      disabled={loading}
                      className="h-12 px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold"
                    >
                      {loading ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Activity className="h-5 w-5" />
                        </motion.span>
                      ) : (
                        'FETCH'
                      )}
                    </Button>
                  </motion.div>
                </ClickSpark>
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4 bg-red-900/50 border-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </SpotlightCard>
        </AnimatedContent>

        {/* Summary Cards */}
        <AnimatePresence>
          {filteredTransactions.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
            >
              {[
                { label: 'Trades', value: summary.tradeCount, color: 'from-blue-500 to-cyan-500', icon: Activity, delay: 0, isCount: false },
                { label: 'Buys', value: summary.totalBuys, prefix: '$', color: 'from-green-500 to-emerald-500', icon: TrendingUp, delay: 0.1, isCurrency: true },
                { label: 'Sells', value: summary.totalSells, prefix: '$', color: 'from-red-500 to-orange-500', icon: TrendingDown, delay: 0.2, isCurrency: true },
                { label: 'Fees', value: summary.totalFees, prefix: '$', color: 'from-gray-500 to-gray-700', icon: DollarSign, delay: 0.3, isCurrency: true },
                { label: 'Assets', value: summary.uniqueAssets, color: 'from-purple-500 to-pink-500', icon: Calendar, delay: 0.4, isCount: false },
              ].map((stat, i) => (
                <AnimatedContent key={stat.label} delay={stat.delay}>
                  <SpotlightCard
                    className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50"
                    spotlightColor={stat.color.replace('from-', 'rgba(').replace(' to-', ', ').split(',')[0] + ', 0.5)'}
                  >
                    <CardContent className="pt-6">
                      <div className={cn("flex items-center gap-2 text-sm bg-gradient-to-r bg-clip-text text-transparent", stat.color)}>
                        <stat.icon className="h-4 w-4" />
                        <span>{stat.label}</span>
                      </div>
                      <p className="text-3xl font-bold mt-2 tabular-nums text-white">
                        {stat.isCurrency ? (
                          <CountUp 
                            end={stat.value} 
                            prefix={stat.prefix || ''} 
                            decimals={2}
                            duration={1.5}
                          />
                        ) : (
                          <CountUp end={stat.value} duration={1} />
                        )}
                      </p>
                    </CardContent>
                  </SpotlightCard>
                </AnimatedContent>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <AnimatePresence>
          {transactions.length > 0 && (
            <AnimatedContent delay={0.5}>
              <Card className="mb-8 bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-800/50 border-slate-600 text-white"
                        autoComplete="off"
                      />
                    </div>

                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="all" className="text-white">All Time</SelectItem>
                        <SelectItem value="week" className="text-white">Last 7 Days</SelectItem>
                        <SelectItem value="month" className="text-white">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={assetFilter} onValueChange={setAssetFilter}>
                      <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue placeholder="Asset" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="all" className="text-white">All Assets</SelectItem>
                        {uniqueAssets.map(a => (
                          <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={sideFilter} onValueChange={setSideFilter}>
                      <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue placeholder="Side" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="all" className="text-white">All Sides</SelectItem>
                        <SelectItem value="BUY" className="text-white">Buy</SelectItem>
                        <SelectItem value="SELL" className="text-white">Sell</SelectItem>
                      </SelectContent>
                    </Select>

                    <ClickSpark sparkColor="#8b5cf6" sparkCount={6}>
                      <Button variant="outline" onClick={exportToCSV} className="border-slate-600 text-white hover:bg-slate-700">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                    </ClickSpark>
                  </div>
                </CardContent>
              </Card>
            </AnimatedContent>
          )}
        </AnimatePresence>

        {/* Transactions Table */}
        <AnimatePresence>
          {filteredTransactions.length > 0 && (
            <AnimatedContent delay={0.6}>
              <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-xl">Transactions</CardTitle>
                  <CardDescription className="text-gray-400">
                    {filteredTransactions.length} of {transactions.length} transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-slate-700/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-800/50 border-slate-700/50">
                          <TableHead className="text-gray-300">Date</TableHead>
                          <TableHead className="text-gray-300">Chain</TableHead>
                          <TableHead className="text-gray-300">Asset</TableHead>
                          <TableHead className="text-gray-300">Side</TableHead>
                          <TableHead className="text-right text-gray-300">Quantity</TableHead>
                          <TableHead className="text-right text-gray-300">Price</TableHead>
                          <TableHead className="text-right text-gray-300">Total</TableHead>
                          <TableHead className="text-right text-gray-300">Fees</TableHead>
                          <TableHead className="hidden lg:table-cell text-gray-300">Hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((tx, i) => (
                          <motion.tr
                            key={`${tx.hash}-${i}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.03 }}
                            className="border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                          >
                            <TableCell className="text-gray-300 whitespace-nowrap">
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn(
                                "text-xs font-medium bg-gradient-to-r",
                                tx.chain === 'solana' && "from-purple-500 to-purple-700 text-white",
                                tx.chain === 'ethereum' && "from-blue-500 to-blue-700 text-white",
                                tx.chain === 'base' && "from-indigo-500 to-indigo-700 text-white",
                                tx.chain === 'bittensor' && "from-orange-500 to-orange-700 text-white",
                                tx.chain === 'polkadot' && "from-pink-500 to-pink-700 text-white",
                              )}>
                                {tx.chain}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono font-medium text-white">
                              {tx.asset}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={cn(
                                  "gap-1",
                                  tx.side === 'BUY' && "bg-green-500/20 text-green-400 border-green-500/50",
                                  tx.side === 'SELL' && "bg-red-500/20 text-red-400 border-red-500/50"
                                )}
                              >
                                {tx.side === 'BUY' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {tx.side}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-gray-300 tabular-nums">
                              {tx.quantity.toFixed(4)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-gray-300 tabular-nums">
                              ${tx.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-white tabular-nums">
                              ${tx.total.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-gray-400 tabular-nums">
                              ${tx.fees.toFixed(2)}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell font-mono text-sm text-gray-500 max-w-[100px] truncate" title={tx.hash}>
                              {tx.hash}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </AnimatedContent>
          )}
        </AnimatePresence>

        {/* Loading State with LetterGlitch */}
        {loading && (
          <Card className="mb-8 bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
            <CardHeader>
              <LetterGlitch
                text="FETCHING BLOCKCHAIN DATA..."
                glitchSpeed={50}
                center
                className="text-purple-400"
              />
              <Skeleton className="h-6 w-48 bg-slate-700" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-20 bg-slate-700" />
                    <Skeleton className="h-4 w-16 bg-slate-700" />
                    <Skeleton className="h-4 w-24 bg-slate-700" />
                    <Skeleton className="h-4 w-20 bg-slate-700" />
                    <Skeleton className="h-4 w-16 bg-slate-700" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty States */}
        {!loading && hasSearched && filteredTransactions.length === 0 && (
          <AnimatedContent>
            <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
              <CardContent className="py-16 text-center">
                <Activity className="h-16 w-16 mx-auto text-gray-500 mb-4" />
                <p className="text-xl text-gray-300 mb-2">No transactions found</p>
                <p className="text-gray-500">Try adjusting your filters or search query</p>
              </CardContent>
            </Card>
          </AnimatedContent>
        )}

        {!loading && !hasSearched && (
          <AnimatedContent>
            <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
              <CardContent className="py-20 text-center">
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Wallet className="h-20 w-20 mx-auto text-purple-500 mb-4" />
                </motion.div>
                <p className="text-2xl text-white mb-2">Enter a wallet address to get started</p>
                <p className="text-gray-500">Supports {SUPPORTED_CHAINS.map(c => c.name).join(', ')}</p>
              </CardContent>
            </Card>
          </AnimatedContent>
        )}
      </div>
    </div>
  );
}
