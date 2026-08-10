'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-flare-border/60 bg-flare-bg/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-flare-text">FXRP Remit</div>
            <div className="text-[10px] uppercase tracking-widest text-flare-muted">
              UPI → XRP · built on Flare
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          <Link href="/send" className="btn-ghost text-sm">Send</Link>
          <Link href="/compare" className="btn-ghost text-sm">Compare fees</Link>
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}

function WalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // SSR / pre-hydration: render a static button that doesn't touch any
  // browser-only APIs. This is what was causing the blank page — the
  // wallet hooks were running before the client was ready.
  if (!mounted) {
    return (
      <button
        className="btn-ghost text-sm"
        type="button"
        aria-label="Connect wallet (loading)"
      >
        Connect
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="chip" title={address}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => disconnect()}
        >
          Disconnect
        </button>
      </div>
    );
  }

  const connector = connectors[0];

  return (
    <button
      type="button"
      className="btn-primary text-sm"
      disabled={!connector || isPending}
      onClick={() => connector && connect({ connector })}
    >
      {isPending ? 'Connecting…' : 'Connect wallet'}
    </button>
  );
}

function LogoMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-lg bg-flare-accent/15 ring-1 ring-flare-accent/40">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 14c4-8 12-8 16 0" stroke="#e62058" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="14" r="2" fill="#e62058" />
      </svg>
    </span>
  );
}
