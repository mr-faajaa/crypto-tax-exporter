import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crypto Tax Exporter',
  description: 'Export crypto transactions to tax CSV format',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
