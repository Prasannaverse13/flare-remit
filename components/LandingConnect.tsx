'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { shortAddr } from '@/lib/format';

/**
 * Connect Wallet button for the landing page.
 *
 * The redirect to /app only fires after the *user* clicks the button on
 * this page — not on a generic `isConnected === true` from a stale
 * wagmi cache. This keeps the landing stable on reload and on
 * direct deep-links to /.
 */
export function LandingConnect({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  // True only between the user clicking Connect and the wallet confirming.
  // Prevents a stale-cache `isConnected` from auto-redirecting the landing.
  const [userInitiated, setUserInitiated] = useState(false);

  useEffect(() => {
    if (mounted && userInitiated && isConnected) {
      const t = setTimeout(() => {
        setUserInitiated(false);
        router.push('/app');
      }, 500);
      return () => clearTimeout(t);
    }
  }, [mounted, userInitiated, isConnected, router]);

  if (!mounted) {
    return (
      <button className="btn-pill" type="button" disabled aria-label="Loading">
        Connect wallet
      </button>
    );
  }

  if (isConnected && address && !userInitiated) {
    // Stale connection from a previous session — show the address but
    // don't auto-redirect. The user can disconnect, or click "Enter"
    // to go to the app shell.
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-bone/15 bg-tar px-3 py-1.5 text-[12px] text-bone">
          {shortAddr(address, 6, 4)}
        </span>
        <button
          type="button"
          className="btn-pill"
          onClick={() => router.push('/app')}
        >
          Enter app →
        </button>
        <button
          type="button"
          className="btn-ghost-pill"
          onClick={() => disconnect()}
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (isConnected && address && userInitiated) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-bone/15 bg-tar px-3 py-1.5 text-[12px] text-bone">
          {shortAddr(address, 6, 4)}
        </span>
        <span className="text-[11px] text-ash">Entering…</span>
      </div>
    );
  }

  const connector = connectors[0];
  const label = isPending
    ? 'Connecting…'
    : compact
    ? 'Connect wallet'
    : 'Connect to start';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn-pill"
        disabled={!connector || isPending}
        onClick={() => {
          setUserInitiated(true);
          if (connector) connect({ connector });
        }}
      >
        {label}
      </button>
      {error && !compact && (
        <span className="text-[11px] text-ash" title={error.message}>
          {error.message.split('\n')[0].slice(0, 32)}
        </span>
      )}
    </div>
  );
}
