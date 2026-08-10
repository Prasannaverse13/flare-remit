'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { useState, type ReactNode } from 'react';
import { COSTON2 } from '@/lib/flare';
import { injected } from 'wagmi/connectors';

/**
 * Wallet provider. The previous version pulled in RainbowKit + its
 * transitive wallet SDKs (coinbase, solana, x402…) which dramatically
 * slowed first paint and frequently left the page in a "Loading..."
 * state on dev. The wallet is non-essential to the demo flow — the
 * sender can simulate a UPI payment without one, and the recipient
 * page is what really matters. So we keep wagmi around for the address
 * display in the header, but skip the heavy RainbowKit surface.
 */
const wagmiConfig = createConfig({
  chains: [COSTON2],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [COSTON2.id]: http(COSTON2.rpcUrls.default.http[0]),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
