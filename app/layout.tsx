import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';
import './henry.css';

export const metadata: Metadata = {
  title: 'FXRP Remit — Cross-border settlement on Flare',
  description:
    'UPI to native XRP in two minutes. FAssets (FXRP) on Flare, settled on the XRPL. Track 1, Flare Summer Signal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
