/**
 * Hero stat block. Pulls a fresh FTSO quote on the client so the home
 * page shows live prices, not stale ones.
 */
'use client';

import { useEffect, useState } from 'react';
import { inr, usd } from '@/lib/format';

type Quote = {
  inr: number;
  xrpUsd: number;
  xrpUsdSource: 'ftso' | 'fallback';
  inrPerXrp: number;
  platformFeeBips: number;
  mintBufferBips: number;
  platformFeeInr: number;
  mintBufferInr: number;
  totalFeeInr: number;
  fxrpAmount: number;
  ftsoTimestamp: number | null;
};

export function HeroStats() {
  const [q, setQ] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/quote?inr=5000')
      .then((r) => r.json())
      .then((d) => mounted && setQ(d))
      .catch((e) => mounted && setErr(String(e)));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="label">Sending ₹5,000 to Manila</div>
        <span className="chip">
          <span className="h-1.5 w-1.5 rounded-full bg-flare-success" />
          {q?.xrpUsdSource === 'ftso' ? 'FTSO live' : 'fallback price'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat label="XRP price" value={q ? usd(q.xrpUsd) : '—'} sub={q ? `1 XRP = ${inr(q.inrPerXrp)}` : ''} />
        <Stat label="Recipient gets" value={q ? `${q.fxrpAmount} XRP` : '—'} sub="after fees" />
        <Stat label="Total fees" value={q ? inr(q.totalFeeInr) : '—'} sub="platform + mint buffer" />
        <Stat label="vs Western Union" value="₹410" sub="≈ 7.2% of ₹5,000" tone="warn" />
      </div>

      {err && <div className="mt-3 text-xs text-flare-muted">quote err: {err}</div>}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'warn';
}) {
  const color =
    tone === 'warn' ? 'text-flare-gold' : 'text-flare-text';
  return (
    <div className="rounded-xl border border-flare-border bg-flare-surface/60 p-3">
      <div className="label">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-flare-muted">{sub}</div>}
    </div>
  );
}
