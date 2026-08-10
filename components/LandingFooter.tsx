'use client';

import Link from 'next/link';

/**
 * Editorial footer — three columns of wordmark / links / links, plus a
 * hairline rule and a system-status line. Pure typographic, no boxes.
 */
export function LandingFooter() {
  return (
    <footer className="mx-auto w-full max-w-page px-6 pb-16 pt-12">
      <div className="h-px w-full bg-bone/10" />
      <div className="grid grid-cols-1 gap-12 py-12 sm:grid-cols-3">
        <div>
          <div className="text-[20px] font-light text-chalk" style={{ letterSpacing: '-0.02em' }}>
            fxrp remit
          </div>
          <p className="mt-3 max-w-[260px] text-body-sm text-ash">
            Cross-border remittance on Flare FAssets. UPI in, native XRP out.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Product</p>
          <ul className="space-y-2 text-body-sm text-bone">
            <li><Link href="/app">Send money</Link></li>
            <li><Link href="/app/compare">Compare fees</Link></li>
            <li><Link href="/app/track">Track a transfer</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Build</p>
          <ul className="space-y-2 text-body-sm text-bone">
            <li>
              <a href="https://dev.flare.network/fassets/overview" target="_blank" rel="noreferrer">FAssets docs</a>
            </li>
            <li>
              <a href="https://faucet.flare.network/coston2" target="_blank" rel="noreferrer">Coston2 faucet</a>
            </li>
            <li>
              <a href="https://dorahacks.io/hackathon/flaresummersignal/detail" target="_blank" rel="noreferrer">Hackathon</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-start justify-between gap-3 border-t border-bone/10 pt-6 text-[11px] text-ash sm:flex-row sm:items-center">
        <span>© 2026 Flare Summer Signal — Track 1 build</span>
        <span className="font-mono">Coston2 testnet · v0.1.0</span>
      </div>
    </footer>
  );
}
