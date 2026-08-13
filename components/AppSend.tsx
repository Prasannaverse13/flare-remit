'use client';

/**
 * AppSend — Henry style. The product is a single white card sitting
 * on the dark canvas (the inversion trick from the Henry brief).
 * Side rail of small dark cards on the right.
 */

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { inr, shortAddr, fmtTime } from '@/lib/format';
import { useTransferStore } from '@/lib/store';

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

export function AppSend() {
  const { address } = useAccount();
  const addTransfer = useTransferStore((s) => s.add);
  const updateTransfer = useTransferStore((s) => s.update);

  const [amount, setAmount] = useState('5000');
  const [recipientName, setRecipientName] = useState('Maria Santos');
  const [recipientXrpl, setRecipientXrpl] = useState('rMxCKb3wKxE4k1d1G6qLfXf8sF1p5bJfA9');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [order, setOrder] = useState<{ orderId: string; upiRef: string; deepLink: string } | null>(null);
  const [showUpi, setShowUpi] = useState(false);
  const [upiQr, setUpiQr] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [stage, setStage] = useState<'compose' | 'pay' | 'tracking'>('compose');
  const [paying, setPaying] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const t = useTransferStore((s) => (transferId ? s.transfers[transferId] : undefined));

  useEffect(() => {
    if (!showUpi || !order) return;
    let cancelled = false;
    import('qrcode').then(({ default: QRCode }) =>
      QRCode.toDataURL(order.deepLink, { width: 240, margin: 2, errorCorrectionLevel: 'M' }),
    ).then((url) => { if (!cancelled) setUpiQr(url); }).catch(() => { if (!cancelled) setUpiQr(null); });
    return () => { cancelled = true; };
  }, [showUpi, order]);

  const numericAmount = useMemo(() => Number(amount) || 0, [amount]);

  useEffect(() => {
    if (numericAmount < 100) {
      setQuote(null);
      return;
    }
    const to = setTimeout(async () => {
      setLoadingQuote(true);
      const r = await fetch(`/api/quote?inr=${numericAmount}`);
      const d: Quote = await r.json();
      setQuote(d);
      setLoadingQuote(false);
    }, 200);
    return () => clearTimeout(to);
  }, [numericAmount]);

  async function startPayment() {
    setStage('pay');
    setPayError(null);
    const tid = transferId ?? ('t_' + Math.random().toString(36).slice(2, 10));
    setTransferId(tid);
    try {
      const r = await fetch('/api/upi/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          amountInr: numericAmount,
          transferId: tid,
          recipientName,
          recipientXrplAddress: recipientXrpl,
          fxrpAmount: quote?.fxrpAmount ?? '',
        }),
      });
      const o = await r.json().catch(() => null);
      if (!r.ok || !o?.deepLink) {
        setPayError(o?.error ?? `UPI order failed (${r.status})`);
        setStage('compose');
        return;
      }
      setOrder(o);
      // Auto-open the UPI modal so the user immediately sees the QR / deeplink
      // instead of having to click "Open in UPI app" again.
      setShowUpi(true);
    } catch (e: any) {
      setPayError(e?.message ?? 'Network error talking to /api/upi/create');
      setStage('compose');
    }
  }

  async function simulatePay() {
    if (!order || !quote) return;
    setPaying(true);
    const tid = transferId ?? ('t_' + Math.random().toString(36).slice(2, 10));
    const idempotencyKey = `upi_${order.orderId}_${tid}`;
    setTransferId(tid);
    addTransfer({
      id: tid,
      senderName: 'You',
      recipientName,
      recipientXrplAddress: recipientXrpl,
      recipientFlareAddress: address ?? '0x0000',
      amountInr: numericAmount,
      amountFxrp: quote.fxrpAmount.toString(),
      xrpUsdAtQuote: quote.xrpUsd,
      feeInr: quote.totalFeeInr,
      upiOrderId: order.orderId,
      upiRef: order.upiRef,
      step: 'created',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      idempotencyKey,
      retryCount: 0,
    });
    const webhookResponse = await fetch('/api/upi/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-flare-demo': 'true' },
      body: JSON.stringify({
        orderId: order.orderId,
        transferId: tid,
        fxrpAmount: quote.fxrpAmount.toString(),
        recipientXrplAddress: recipientXrpl,
        recipientName,
        amountInr: numericAmount,
        recipientFlareAddress: address ?? '0x0000',
        upiRef: order.upiRef,
        idempotencyKey,
      }),
    });
    const webhookResult = await webhookResponse.json().catch(() => ({}));
    if (webhookResult.fassets) {
      updateTransfer(tid, {
        step: 'settled',
        mintTxHash: webhookResult.fassets.mintTxHash,
        redeemTxHash: webhookResult.fassets.redeemTxHash,
        collateralReservationId: webhookResult.fassets.reservationId,
      });
    } else if (!webhookResponse.ok) {
      updateTransfer(tid, { step: webhookResult.awaitingSetup ? 'awaiting_executor' : 'failed', pipelineError: webhookResult.error });
    } else {
      updateTransfer(tid, { step: 'payment_received' });
    }
    setStage('tracking');
    setPaying(false);
  }

  async function submitPaymentReference() {
    if (!order || paymentRef.trim().length < 8) return;
    const response = await fetch('/api/upi/confirm', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: order.orderId, paymentRef }),
    });
    if (response.ok) {
      setVerificationPending(true);
      setShowUpi(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      {/* The white product card — the inversion. */}
      <div className="product-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/8 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-black" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-black/70">
              fxrp remit · transfer
            </span>
          </div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-black/40">
            {stage === 'compose' && '01 / compose'}
            {stage === 'pay' && '02 / pay'}
            {stage === 'tracking' && '03 / tracking'}
          </span>
        </div>

        {stage !== 'tracking' && (
          <div className="space-y-8 p-6 sm:p-8">
            <Field label="You send">
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] text-black/60">₹</span>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-transparent text-[44px] font-light text-black outline-none placeholder:text-black/20"
                  style={{ letterSpacing: '-0.02em', lineHeight: 1 }}
                  placeholder="5000"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[1000, 2500, 5000, 10000, 25000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className="rounded-full border border-black/15 bg-white px-3 py-1 text-[12px] text-black/70 hover:border-black/40"
                  >
                    ₹{v.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Recipient gets">
              <div className="flex items-baseline gap-2">
                <input
                  value={quote ? quote.fxrpAmount.toFixed(4) : '—'}
                  readOnly
                  className="w-full bg-transparent text-[44px] font-light text-black/40 outline-none"
                  style={{ letterSpacing: '-0.02em', lineHeight: 1 }}
                />
                <span className="text-[20px] text-black/60">XRP</span>
              </div>
              <div className="mt-1 text-[12px] text-black/55">
                {quote
                  ? `at $${quote.xrpUsd.toFixed(4)} · ${quote.xrpUsdSource === 'ftso' ? 'FTSO live' : 'fallback price'}`
                  : loadingQuote
                  ? 'Fetching FTSO quote…'
                  : 'Enter an amount above to quote'}
              </div>
            </Field>

            <Field label="Recipient">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="border-b border-black/15 bg-transparent py-2 text-[15px] text-black outline-none focus:border-black"
                  placeholder="Name"
                />
                <input
                  value={recipientXrpl}
                  onChange={(e) => setRecipientXrpl(e.target.value)}
                  className="border-b border-black/15 bg-transparent py-2 font-mono text-[12px] text-black outline-none focus:border-black"
                  placeholder="rXXXXX… XRPL address"
                />
              </div>
            </Field>

            {quote && (
              <div className="rounded-lg border border-black/8 bg-black/2 p-4">
                <Row label="Platform fee" value={inr(quote.platformFeeInr)} sub={`${(quote.platformFeeBips / 100).toFixed(2)}%`} />
                <Row label="Mint buffer" value={inr(quote.mintBufferInr)} sub={`${(quote.mintBufferBips / 100).toFixed(2)}%`} />
                <div className="my-3 h-px w-full bg-black/10" />
                <Row label="Recipient receives" value={`${quote.fxrpAmount.toFixed(4)} XRP`} strong />
                <Row label="Settles in" value="≈ 2 min" sub="UPI → XRPL" />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-[12px] text-black/55">
                {stage === 'compose'
                  ? 'A UPI QR will pop up so you can scan with GPay, PhonePe, Paytm, or any UPI app.'
                  : 'Scan the QR or copy the link, then click "I paid" to continue.'}
              </p>
              {payError && (
                <span className="ml-3 rounded-full bg-rose-50 px-3 py-1 text-[11px] text-rose-700" role="alert">
                  {payError}
                </span>
              )}
              {stage === 'compose' ? (
                <button
                  type="button"
                  onClick={startPayment}
                  disabled={numericAmount < 100 || !quote}
                  className="rounded-full bg-black px-5 py-2.5 text-[13px] font-medium text-chalk transition hover:bg-black/85 disabled:opacity-40"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  Pay with UPI →
                </button>
              ) : (
                order && <UpiOrderRow order={order} onOpen={() => setShowUpi(true)} onSimulate={simulatePay} onSubmit={submitPaymentReference} verificationPending={verificationPending} paying={paying} />
              )}
            </div>
          </div>
        )}

        {stage === 'tracking' && t && (
          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <p className="mono-label">In flight</p>
              <p className="mt-2 text-[24px] font-light text-black" style={{ letterSpacing: '-0.02em' }}>
                {inr(numericAmount)} → {t.amountFxrp} XRP
              </p>
              <p className="mt-1 text-[12px] text-black/55">
                for {t.recipientName} · started {fmtTime(t.createdAt)}
              </p>
            </div>
            <Tracker
              step={t.step}
              mintHash={t.mintTxHash}
              transferHash={t.transferTxHash}
              redeemHash={t.redeemTxHash}
            />
            {t.pipelineError && <p className="mt-5 rounded-lg bg-amber-50 p-3 font-mono text-[11px] text-amber-900">Payment received, but settlement is paused: {t.pipelineError}</p>}
          </div>
        )}
      </div>

      {showUpi && order && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5" role="dialog" aria-modal="true" aria-label="UPI payment">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-black shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-mono text-[10px] uppercase tracking-wider text-black/50">UPI intent ready</p><h2 className="mt-2 text-2xl font-light">Pay ₹{numericAmount.toLocaleString('en-IN')}</h2></div>
              <button type="button" onClick={() => setShowUpi(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-xl" aria-label="Close payment panel">×</button>
            </div>
            <p className="mt-4 text-sm text-black/65">On a phone, continue to your UPI app. On desktop, copy the payment link or use the demo confirmation below.</p>
            <div className="mx-auto mt-5 w-max rounded-2xl bg-white p-3 shadow-[0_2px_18px_rgba(0,0,0,.12)]">
              {upiQr ? <img src={upiQr} alt="Scan to pay with UPI" className="h-52 w-52" /> : <div className="grid h-52 w-52 place-items-center text-center text-xs text-black/45">Generating secure UPI QR…</div>}
            </div>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-black/45">Scan with Google Pay · PhonePe · Paytm · BHIM · any UPI app</p>
            <div className="mt-5 rounded-xl border border-black/10 bg-black/[.03] p-4 font-mono text-[11px] break-all">{order.deepLink}</div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={order.deepLink} className="rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white">Continue to UPI app</a>
              <button type="button" onClick={() => navigator.clipboard?.writeText(order.deepLink)} className="rounded-full border border-black/20 px-4 py-2.5 text-sm">Copy payment link</button>
            </div>
            <label className="mt-5 block text-sm font-medium">UPI transaction ID / UTR
              <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Enter the UTR after paying" className="mt-2 w-full rounded-xl border border-black/15 px-3 py-3 font-mono text-sm outline-none focus:border-black" />
            </label>
            <button type="button" onClick={submitPaymentReference} disabled={paymentRef.trim().length < 8} className="mt-3 w-full rounded-full border border-black/20 px-4 py-3 text-sm font-medium disabled:opacity-40">Submit UTR for verification</button>
            <button type="button" onClick={() => { setShowUpi(false); simulatePay(); }} disabled={paying} className="mt-6 w-full rounded-full bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-40">{paying ? 'Processing…' : 'I paid — confirm & continue'}</button>
            <p className="mt-3 text-center text-[11px] text-black/45">Demo confirmation is for local testing only. Production minting requires a signed PSP webhook.</p>
          </div>
        </div>
      )}

      {/* Side rail */}
      <aside className="space-y-6">
        <div className="card">
          <p className="eyebrow">Corridor</p>
          <p className="mt-2 text-subhead text-chalk" style={{ letterSpacing: '-0.015em' }}>
            India → Philippines
          </p>
          <p className="mt-1 text-caption text-ash">
            UPI on the sender side, native XRP on the XRPL on the recipient side. FXRP is the in-flight asset on Flare.
          </p>
        </div>

        {t && (
          <div className="card">
            <p className="eyebrow">Status</p>
            <p className="mt-2 text-subhead text-chalk" style={{ letterSpacing: '-0.015em' }}>
              {t.step.replace(/_/g, ' ')}
            </p>
            {t.mintTxHash && (
              <p className="mt-2 break-all font-mono text-[11px] text-ash">{shortAddr(t.mintTxHash, 10, 8)}</p>
            )}
          </div>
        )}

        <div className="card">
          <p className="eyebrow">Stack</p>
          <ul className="mt-3 space-y-2 text-caption text-bone">
            <li>UPI onramp</li>
            <li>FAssets — FXRP</li>
            <li>Flare L1 — Coston2</li>
            <li>XRPL — native XRP</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mono-label">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[12px] text-black/55">{label}</span>
      <span className={`text-[14px] text-black ${strong ? 'font-medium' : ''}`}>
        {value}
        {sub && <span className="ml-1 text-[11px] text-black/40">{sub}</span>}
      </span>
    </div>
  );
}

function UpiOrderRow({
  order,
  onOpen,
  onSubmit,
  onSimulate,
  verificationPending,
  paying,
}: {
  order: { orderId: string; upiRef: string; deepLink: string };
  onOpen: () => void;
  onSubmit: () => void;
  onSimulate: () => void;
  verificationPending: boolean;
  paying: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {verificationPending && <span className="rounded-full bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Awaiting payment verification</span>}
      <button type="button" onClick={onOpen} className="rounded-full border border-black/20 px-4 py-2 text-[13px] text-black hover:border-black/60">
        Show UPI QR
      </button>
      <button
        type="button"
        onClick={onSimulate}
        disabled={paying}
        className="rounded-full bg-black px-5 py-2.5 text-[13px] font-medium text-chalk transition hover:bg-black/85 disabled:opacity-40"
      >
        {paying ? 'Processing…' : 'I paid — continue'}
      </button>
    </div>
  );
}

function Tracker({
  step,
  mintHash,
  transferHash,
  redeemHash,
}: {
  step: string;
  mintHash?: string;
  transferHash?: string;
  redeemHash?: string;
}) {
  const order: Record<string, number> = {
    created: 0, payment_submitted: 1, payment_received: 1, awaiting_executor: 1, reserved: 2, minting: 3, proof_submitted: 4, minted: 5, transferred: 5, redeemed: 6, settled: 6, failed: -1,
  };
  const cur = order[step] ?? 0;
  const stages = ['UPI', 'Reserved', 'Mint proof', 'Minted', 'Redeemed'];
  return (
    <div>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {stages.map((s, i) => {
          const done = i < cur;
          const active = i === cur;
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={[
                  'grid h-6 w-6 place-items-center rounded-full text-[10px] font-mono',
                  done
                    ? 'bg-black text-chalk'
                    : active
                    ? 'border border-black text-black'
                    : 'border border-black/20 text-black/40',
                ].join(' ')}
              >
                {i + 1}
              </span>
              <span className={`text-[12px] ${done || active ? 'text-black' : 'text-black/40'}`}>{s}</span>
              {i < stages.length - 1 && <span className="mx-1 h-px w-6 bg-black/15" />}
            </li>
          );
        })}
      </ol>
      <div className="mt-5 space-y-1 font-mono text-[11px] text-black/55">
        {mintHash && <p>mint · {shortAddr(mintHash, 10, 8)}</p>}
        {transferHash && <p>transfer · {shortAddr(transferHash, 10, 8)}</p>}
        {redeemHash && <p>redeem · {redeemHash}</p>}
      </div>
    </div>
  );
}
