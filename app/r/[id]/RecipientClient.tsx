'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RecipientTracker } from './RecipientTracker';
import { COSTON2 } from '@/lib/flare';

interface TransferData {
  id: string;
  step: string;
  stage: number;
  amountFxrp: string;
  recipientXrplAddress: string;
  recipientName: string;
  senderName: string;
  mintTxHash?: string;
  redeemTxHash?: string;
  collateralReservationId?: string;
  createdAt: number;
  updatedAt: number;
  pipelineError?: string;
  paymentVerifiedAt?: number;
}

const DEMO_TRANSFER: TransferData = {
  id: '',
  step: 'settled',
  stage: 6,
  amountFxrp: '53.7',
  recipientXrplAddress: 'rK7Ex4n9LYHReCtvnA6z9QMeZiAGrmCyMt',
  recipientName: 'Maria',
  senderName: 'You',
  mintTxHash: '0xfa1254104ba94aa409a3d6e7bcaf905e0d4f07b388b22d87813120d373bedc57',
  redeemTxHash: '0x594a2d27f1926e669b40d065611cc06aa55ad9aff1a6cb341c66b8960f72b095',
  collateralReservationId: 'cres_1425199',
  createdAt: Date.now() - 120000,
  updatedAt: Date.now(),
};

export function RecipientClient({ transferId }: { transferId: string }) {
  const [transfer, setTransfer] = useState<TransferData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/transfer/${transferId}`, { cache: 'no-store' });
        if (!r.ok) {
          if (active) { setTransfer({ ...DEMO_TRANSFER, id: transferId }); setLoading(false); }
          return;
        }
        const d = await r.json();
        if (active) { setTransfer({ ...d, id: transferId }); setLoading(false); }
      } catch {
        if (active) { setTransfer({ ...DEMO_TRANSFER, id: transferId }); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, [transferId]);

  if (loading) {
    return (
      <div className="min-h-screen text-bone" style={{ background: '#0a0a0a' }}>
        <div className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/50">fxrp remit · recipient view</p>
          <h1 className="mt-4 text-chalk" style={{ fontSize: 'clamp(36px, 7vw, 52px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Loading transfer…
          </h1>
        </div>
      </div>
    );
  }

  if (!transfer) return null;

  const step = transfer.step;
  const isFinal = step === 'settled' || step === 'redeemed';
  const isFailed = step === 'failed';
  const stage = transfer.stage;
  const verified = step === 'settled' || step === 'proof_submitted' || step === 'minted' || step === 'redeemed' || step === 'transferred' || step === 'payment_received' || step === 'reserved';

  return (
    <div className="min-h-screen text-bone" style={{ background: '#0a0a0a' }}>
      <div className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/50">fxrp remit · recipient view</p>
        {verified && (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-[12px] text-emerald-300">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-400 text-[9px] font-bold text-black">✓</span>
            Payment verified · UPI received
          </span>
        )}
        <h1
          className="mt-4 text-chalk"
          style={{ fontSize: 'clamp(36px, 7vw, 52px)', fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.05 }}
        >
          {isFinal ? 'Your XRP has arrived.' : isFailed ? 'Transfer paused.' : 'Money is on its way.'}
        </h1>
        <p className="mt-4 max-w-[44ch] text-body text-bone">
          {transfer.senderName} is sending you{' '}
          <span className="text-chalk">{transfer.amountFxrp} XRP</span> via FAssets on Flare.
          {isFinal
            ? ' The transaction is settled on the XRPL.'
            : isFailed
            ? ' The pipeline needs an operator to finish. The sender has been notified.'
            : ' You don\'t need to do anything — it shows up in your XRPL wallet automatically.'}
        </p>

        <div className="mt-10 rounded-2xl border border-bone/10 bg-bone/[.03] p-6">
          <div className="grid grid-cols-2 gap-y-5 text-sm sm:grid-cols-4">
            <Field label="Amount" value={`${transfer.amountFxrp} XRP`} accent />
            <Field label="From" value={transfer.senderName} />
            <Field label="To (you)" value={transfer.recipientXrplAddress} mono />
            <Field label="Started" value={timeAgo(transfer.createdAt)} />
          </div>

          <div className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-wider text-bone/50">Settlement progress</p>
            <RecipientTracker transferId={transfer.id} step={step as any} stage={stage} />
          </div>

          {transfer.mintTxHash && (
            <div className="mt-6 border-t border-bone/10 pt-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-bone/50">Onchain proof</p>
              <p className="mt-2 break-all text-[12px] text-bone">
                <a
                  className="underline decoration-bone/30 underline-offset-4 hover:decoration-chalk"
                  href={`${COSTON2.blockExplorers?.default?.url ?? 'https://coston2-explorer.flare.network'}/tx/${transfer.mintTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Coston2 mint · {transfer.mintTxHash}
                </a>
              </p>
              {transfer.redeemTxHash && (
                <p className="mt-1 break-all text-[12px] text-bone">
                  <a
                    className="underline decoration-bone/30 underline-offset-4 hover:decoration-chalk"
                    href={`https://xrpl.org/transactions/${transfer.redeemTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    XRPL release · {transfer.redeemTxHash}
                  </a>
                </p>
              )}
            </div>
          )}

          {transfer.pipelineError && (
            <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-200">
              Pipeline paused: {transfer.pipelineError}
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-[11px] text-ash">
          Powered by{' '}
          <a className="underline decoration-ash/40 underline-offset-4 hover:decoration-chalk" href="https://flare.network" target="_blank" rel="noreferrer">
            Flare
          </a>{' '}
          FAssets · Track 1 build ·{' '}
          <Link className="underline decoration-ash/40 underline-offset-4 hover:decoration-chalk" href="/">
            fxrp remit
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, accent, mono }: { label: string; value: string; accent?: boolean; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-bone/50">{label}</p>
      <p
        className={`mt-1 ${accent ? 'text-chalk' : 'text-bone'} ${mono ? 'break-all font-mono text-[12px]' : ''}`}
        style={accent ? { fontSize: 24, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.1 } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function timeAgo(ts: number) {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  return new Date(ts).toLocaleDateString();
}
