import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Crypto Tax Exporter | Export Perpetuals & Spot to CSV',
  description: 'Export crypto transactions to tax CSV format. Multi-chain support for spot and perpetuals. Awaken Tax compatible.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=messapia@400,500,600,700&f[]=jost@400,500,600&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=necto-mono@400,500&display=swap" rel="stylesheet" />
      </head>
      <body style={{
        '--font-display': "'Messapia', system-ui, sans-serif",
        '--font-body': "'Jost', system-ui, sans-serif", 
        '--font-mono': "'Necto Mono', 'JetBrains Mono', monospace"
      } as React.CSSProperties}>
        {children}
      </body>
    </html>
  );
}
