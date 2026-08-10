'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LandingConnect } from './LandingConnect';

/**
 * Transparent navigation over the hero photograph. Flush to page edges.
 * The only visible chrome is the wordmark on the left and the wallet
 * button on the right — no contained bar, no visible border.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-30 transition-colors',
        scrolled ? 'bg-obsidian/85 backdrop-blur' : 'bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex w-full max-w-page items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-chalk">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-7 text-body-sm text-chalk/85 md:flex">
          <Link href="/app/about" className="hover:text-chalk">How it works</Link>
          <Link href="/app/compare" className="hover:text-chalk">Compare fees</Link>
          <Link href="https://dev.flare.network/fassets/overview" target="_blank" rel="noreferrer" className="hover:text-chalk">
            FAssets
          </Link>
        </nav>
        <LandingConnect compact />
      </div>
    </header>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 14C7 6 17 6 21 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="14" r="2" fill="currentColor" />
      </svg>
      <span className="text-[15px] font-medium" style={{ letterSpacing: '-0.02em' }}>
        fxrp remit
      </span>
    </span>
  );
}
