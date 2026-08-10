'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import { shortAddr } from '@/lib/format';

/**
 * Tiny wallet indicator. Shows an address dot when connected,
 * a power button when not. Designed to live inside the side dock.
 */
export function AppConnectPill() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (!mounted) {
    return <span className="h-2 w-2 rounded-full bg-smoke" />;
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        className="tappable flex flex-col items-center gap-1"
        onClick={() => disconnect()}
        title={`${address} — click to disconnect`}
      >
        <span
          className="block h-2.5 w-2.5 rounded-full"
          style={{ background: '#30d158', boxShadow: '0 0 8px #30d158' }}
        />
        <span className="text-[9px] font-mono text-smoke">{shortAddr(address, 2, 2)}</span>
      </button>
    );
  }

  const connector = connectors[0];

  return (
    <button
      type="button"
      className="tappable grid place-items-center"
      onClick={() => connector && connect({ connector })}
      disabled={!connector || isPending}
      title={isPending ? 'Connecting…' : 'Connect wallet'}
    >
      <span
        className="block h-2.5 w-2.5 rounded-full"
        style={{ background: '#48484a' }}
      />
    </button>
  );
}
