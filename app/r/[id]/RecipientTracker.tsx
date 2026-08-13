'use client';

import { useEffect, useState } from 'react';
import type { TransferStep } from '@/lib/store';

const STAGES = [
  { key: 'upi', label: 'UPI received' },
  { key: 'reserved', label: 'Collateral reserved' },
  { key: 'mint', label: 'FDC proof' },
  { key: 'minted', label: 'FXRP minted' },
  { key: 'redeemed', label: 'Redeemed to XRPL' },
];

/**
 * Polls /api/transfer/[id] every 5s while the transfer is in flight, so
 * the recipient sees the state advance without needing to refresh.
 */
export function RecipientTracker({
  transferId,
  step: initialStep,
  stage: initialStage,
}: {
  transferId: string;
  step: TransferStep;
  stage: number;
}) {
  const [step, setStep] = useState<TransferStep>(initialStep);
  const [stage, setStage] = useState<number>(initialStage);

  useEffect(() => {
    if (stage >= 6) return; // settled — no need to poll
    const tick = async () => {
      try {
        const r = await fetch(`/api/transfer/${transferId}`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (d?.step) setStep(d.step);
        if (typeof d?.stage === 'number') setStage(d.stage);
      } catch {
        // network blip — try again next tick
      }
    };
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [transferId, stage]);

  return (
    <div className="mt-3">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {STAGES.map((s, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={[
                  'grid h-6 w-6 place-items-center rounded-full text-[10px] font-mono',
                  done
                    ? 'bg-chalk text-obsidian'
                    : active
                    ? 'border border-chalk text-chalk'
                    : 'border border-bone/20 text-bone/40',
                ].join(' ')}
              >
                {i + 1}
              </span>
              <span className={`text-[12px] ${done || active ? 'text-chalk' : 'text-bone/40'}`}>{s.label}</span>
              {i < STAGES.length - 1 && <span className="mx-1 h-px w-5 bg-bone/15" />}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-bone/50">
        Current state · <span className="text-bone">{step.replace(/_/g, ' ')}</span>
      </p>
    </div>
  );
}
