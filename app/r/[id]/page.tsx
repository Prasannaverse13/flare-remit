/**
 * /r/[id] — shareable recipient view. No auth, no app install required.
 *
 * The sender shares this link with the recipient. The page reads the
 * transfer from the persistent server-side store and renders a clean
 * view: "You're receiving X XRP from Y" + live status + onchain proof.
 *
 * The page is server-rendered (Next.js App Router default) so it works
 * even if the recipient opens it on a fresh device. The status poll
 * happens client-side after hydration.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPersistedTransfer, listPersistedTransfers } from '@/lib/persistentStore';
import { RecipientTracker } from './RecipientTracker';
import { COSTON2 } from '@/lib/flare';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RecipientPage({ params }: { params: { id: string } }) {
  const transfer = await getPersistedTransfer(params.id);
  if (!transfer) notFound();
  return <RecipientView transfer={transfer} />;
}

function RecipientView({ transfer }: { transfer: NonNullable<Awaited<ReturnType<typeof getPersistedTransfer>>> }) {
  const step = transfer.step;
  const isFinal = step === 'settled' || step === 'redeemed';
  const isFailed = step === 'failed';
  const stage = stageFromStep(step);
  return (
    <div className="min-h-screen text-bone" style={{ background: '#0a0a0a' }}>
      <div className="mx-auto w-full max-w-[640px] px-5 py-10 sm:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone/50">fxrp remit · recipient view</p>
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
            <RecipientTracker transferId={transfer.id} step={step} stage={stage} />
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
                    href={`${COSTON2.blockExplorers?.default?.url ?? 'https://coston2-explorer.flare.network'}/tx/${transfer.redeemTxHash}`}
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

function stageFromStep(step: string): number {
  const order: Record<string, number> = {
    created: 0,
    payment_submitted: 1,
    payment_received: 1,
    awaiting_executor: 1,
    reserved: 2,
    minting: 3,
    proof_submitted: 4,
    minted: 5,
    transferred: 5,
    redeemed: 6,
    settled: 6,
    failed: -1,
  };
  return order[step] ?? 0;
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

// Tell Next.js which dynamic params to pre-render at build time. For the demo
// we keep this empty; the route is fully dynamic (force-dynamic above).
export async function generateStaticParams() {
  try {
    const all = await listPersistedTransfers();
    return all.slice(-10).map((t) => ({ id: t.id }));
  } catch {
    return [];
  }
}
