'use client';

import { useTransferStore } from '@/lib/store';
import { inr, shortAddr, fmtTime } from '@/lib/format';
import { AppNav } from '@/components/AppNav';

export default function TrackIndexPage() {
  const transfers = useTransferStore((s) => Object.values(s.transfers));
  const recent = transfers.slice(-5).reverse();

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
      <AppNav />
      <div className="space-y-10">
        <header>
          <p className="eyebrow">Track</p>
          <h1
            className="mt-4 text-chalk"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 300, letterSpacing: '-0.037em', lineHeight: 1 }}
          >
            Recent transfers
          </h1>
          <p className="mt-4 max-w-[48ch] text-body text-bone">
            The transfers you start on the Send page appear here. State is held in the
            browser for the demo; production swaps in a queue.
          </p>
        </header>

        {recent.length === 0 ? (
          <div className="card">
            <p className="text-body text-bone">No transfers yet. Start one from the Send page.</p>
          </div>
        ) : (
          <ul className="space-y-px overflow-hidden rounded-cards border border-bone/10 bg-bone/10">
            {recent.map((t) => (
              <li key={t.id} className="bg-obsidian p-5">
                <div className="grid items-center gap-3 sm:grid-cols-4">
                  <div>
                    <p className="eyebrow">From → To</p>
                    <p className="mt-1 text-caption text-chalk">{inr(t.amountInr)} → {t.amountFxrp} XRP</p>
                  </div>
                  <div>
                    <p className="eyebrow">Recipient</p>
                    <p className="mt-1 text-caption text-bone">{t.recipientName}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Status</p>
                    <p className="mt-1 text-caption text-bone">{t.step.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Started</p>
                    <p className="mt-1 text-caption text-bone">{fmtTime(t.createdAt)}</p>
                  </div>
                </div>
                {t.mintTxHash && (
                  <p className="mt-3 break-all font-mono text-[11px] text-ash">
                    mint · {shortAddr(t.mintTxHash, 12, 10)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
