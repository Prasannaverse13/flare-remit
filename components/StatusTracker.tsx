'use client';

import { useTransferStore } from '@/lib/store';
import { shortAddr } from '@/lib/format';
import { FXRP_EXPLORER } from '@/lib/flare';
import { Check, Loader2, X } from 'lucide-react';

const STAGES: { key: any; label: string }[] = [
  { key: 'created', label: 'Created' },
  { key: 'payment_received', label: 'UPI received' },
  { key: 'minting', label: 'Minting FXRP' },
  { key: 'minted', label: 'Minted' },
  { key: 'transferred', label: 'Transferred to recipient' },
  { key: 'redeemed', label: 'Redeemed to native XRP' },
];

const ORDER: Record<string, number> = STAGES.reduce((acc, s, i) => {
  acc[s.key] = i;
  return acc;
}, {} as any);

export function StatusTracker({ transferId }: { transferId: string }) {
  const t = useTransferStore((s) => s.transfers[transferId]);

  if (!t) {
    return (
      <div className="rounded-xl border border-flare-border bg-flare-surface/60 p-4 text-sm text-flare-muted">
        Loading transfer…
      </div>
    );
  }

  const cur = ORDER[t.step] ?? 0;
  const failed = t.step === 'failed';

  return (
    <div className="rounded-xl border border-flare-border bg-flare-surface/60 p-5">
      <ol className="space-y-2">
        {STAGES.map((s, i) => {
          const done = !failed && i < cur;
          const active = !failed && i === cur;
          return (
            <li key={s.key} className="flex items-center gap-3">
              <span
                className={[
                  'grid h-6 w-6 place-items-center rounded-full border',
                  done
                    ? 'border-flare-success bg-flare-success/15 text-flare-success'
                    : active
                    ? 'border-flare-accent text-flare-accent'
                    : 'border-flare-border text-flare-muted',
                ].join(' ')}
              >
                {done ? <Check size={14} /> : active ? <Loader2 size={14} className="animate-spin" /> : <span className="text-[10px]">{i + 1}</span>}
              </span>
              <span className={done ? 'text-flare-text' : active ? 'text-flare-text' : 'text-flare-muted'}>
                {s.label}
              </span>
              {active && <span className="chip">in progress</span>}
            </li>
          );
        })}
        {failed && (
          <li className="flex items-center gap-2 text-flare-accentHi">
            <X size={16} /> Transfer failed. Check executor wallet + faucet.
          </li>
        )}
      </ol>

      <div className="mt-5 grid gap-2 text-xs text-flare-muted">
        {t.mintTxHash && (
          <div>
            Mint tx: <a className="text-flare-accent underline" href={FXRP_EXPLORER(t.mintTxHash)} target="_blank" rel="noreferrer">{shortAddr(t.mintTxHash, 10, 6)}</a>
          </div>
        )}
        {t.transferTxHash && t.transferTxHash !== t.mintTxHash && (
          <div>
            Transfer tx: <a className="text-flare-accent underline" href={FXRP_EXPLORER(t.transferTxHash)} target="_blank" rel="noreferrer">{shortAddr(t.transferTxHash, 10, 6)}</a>
          </div>
        )}
        {t.redeemTxHash && (
          <div>
            Redeem (XRPL): <span className="font-mono text-flare-text">{t.redeemTxHash}</span>
          </div>
        )}
      </div>
    </div>
  );
}
