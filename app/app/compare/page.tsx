'use client';

import { useEffect, useState } from 'react';
import { inr, usd } from '@/lib/format';
import { AppNav } from '@/components/AppNav';

const RAILS = [
  { name: 'FXRP Remit (this)', feePct: 0.5, feeFixedInr: 0, fxMarkupPct: 0, settleMins: 2, note: 'Native FXRP on Flare, redeemed to native XRP on XRPL.', accent: 'stat-green' },
  { name: 'Wise', feePct: 0.65, feeFixedInr: 25, fxMarkupPct: 0.35, settleMins: 60, note: 'Mid-market FX with a markup. Bank rails.', accent: 'stat-blue' },
  { name: 'Remitly', feePct: 1.5, feeFixedInr: 0, fxMarkupPct: 1.5, settleMins: 30, note: 'Premium tier. Express delivery.', accent: 'stat-orange' },
  { name: 'Western Union', feePct: 3.0, feeFixedInr: 50, fxMarkupPct: 4.5, settleMins: 15, note: 'Cash pickup, instant — but with the cost.', accent: 'smoke' },
];

export default function ComparePage() {
  const [amount, setAmount] = useState(5000);
  const [xrpUsd, setXrpUsd] = useState(0.62);
  const [src, setSrc] = useState<'ftso' | 'fallback'>('fallback');

  useEffect(() => {
    fetch(`/api/quote?inr=${amount}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.xrpUsd) setXrpUsd(d.xrpUsd);
        if (d?.xrpUsdSource) setSrc(d.xrpUsdSource);
      })
      .catch(() => {});
  }, [amount]);

  const usdGross = amount / 83.5;
  const xrpGross = usdGross / xrpUsd;

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
      <AppNav />
      <div className="space-y-10">
        <header>
          <p className="eyebrow">Compare</p>
          <h1
            className="mt-4 text-chalk"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 300, letterSpacing: '-0.037em', lineHeight: 1 }}
          >
            Fees, side by side.
          </h1>
          <p className="mt-4 max-w-[48ch] text-body text-bone">
            Live FTSO price for XRP/USD: <span className="font-mono text-bone">${xrpUsd.toFixed(4)}</span>{' '}
            <span className="chip ml-2">{src === 'ftso' ? 'FTSO' : 'fallback'}</span>
          </p>
        </header>

        <div className="card flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <p className="eyebrow">Amount in INR</p>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(Math.max(100, Number(e.target.value.replace(/[^0-9]/g, ''))))}
              className="mt-2 w-full bg-transparent text-chalk outline-none"
              style={{ fontSize: 'clamp(32px, 4vw, 40px)', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1 }}
            />
          </div>
          <div className="text-caption text-ash">
            ≈ {usd(usdGross)} → {xrpGross.toFixed(4)} XRP at mid-market
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-cards border border-bone/10 bg-bone/10 sm:grid-cols-2">
          {RAILS.map((r) => {
            const feePctAmt = (amount * r.feePct) / 100;
            const fxAmt = (usdGross * r.fxMarkupPct) / 100 * 83.5;
            const total = feePctAmt + r.feeFixedInr + fxAmt;
            const recipientUsd = (amount - total) / 83.5;
            const recipientXrp = recipientUsd / xrpUsd;
            const isUs = r.name.startsWith('FXRP');
            const accentBg = {
              'stat-green': 'bg-tintGreen',
              'stat-blue': 'bg-tintBlue',
              'stat-orange': 'bg-tintOrange',
              'smoke': 'bg-smoke',
            }[r.accent];
            return (
              <div
                key={r.name}
                className={['bg-obsidian p-6', isUs ? 'ring-1 ring-inset ring-bone/20' : ''].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <p className="text-subhead font-light text-chalk" style={{ letterSpacing: '-0.02em' }}>
                    {r.name}
                  </p>
                  {isUs && <span className="eyebrow text-bone">ours</span>}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <Stat label="Total fee" value={inr(total)} sub={`${(total / amount * 100).toFixed(2)}%`} accent={accentBg} />
                  <Stat label="Recipient" value={`${recipientXrp.toFixed(4)} XRP`} sub={usd(recipientUsd)} />
                  <Stat label="Settles" value={`${r.settleMins} min`} sub="avg" />
                </div>
                <p className="mt-5 text-caption text-ash">{r.note}</p>
              </div>
            );
          })}
        </div>

        <p className="text-caption text-ash max-w-[64ch]">
          Cross-border remittance from India is a $100B+/year market. Legacy rails skim 5–7% off every transfer.
          A 0.5% onchain path returns ~₹410 to the sender on a ₹5,000 transfer. Multiply that
          across corridors and the savings are material.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-subhead font-light text-chalk" style={{ letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p className="text-[11px] text-ash">{sub}</p>}
      {accent && <div className={`mt-2 h-0.5 w-6 rounded-full ${accent}`} />}
    </div>
  );
}
