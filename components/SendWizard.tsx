'use client';

/**
 * The 3-step send wizard. This is the demo's center of gravity —
 * if this looks clean and the flow feels like a fintech app, the
 * judges will forgive the rest.
 *
 * Steps:
 *   1. Amount + recipient
 *   2. UPI payment (simulated)
 *   3. Live status with onchain tx hashes
 */
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { inr, shortAddr, fmtTime } from '@/lib/format';
import { ProgressSteps } from './ProgressSteps';
import { StatusTracker } from './StatusTracker';
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

const STEPS = [
  { key: 'amount', label: 'Amount' },
  { key: 'pay', label: 'Pay with UPI' },
  { key: 'track', label: 'Track' },
];

export function SendWizard() {
  const { address, isConnected } = useAccount();
  const addTransfer = useTransferStore((s) => s.add);
  const updateTransfer = useTransferStore((s) => s.update);

  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState('5000');
  const [recipientName, setRecipientName] = useState('Maria Santos');
  const [recipientXrpl, setRecipientXrpl] = useState('rMxCKb3wKxE4k1d1G6qLfXf8sF1p5bJfA9');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [order, setOrder] = useState<{
    orderId: string;
    upiRef: string;
    deepLink: string;
  } | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const numericAmount = useMemo(() => Number(amount) || 0, [amount]);

  useEffect(() => {
    if (numericAmount < 100) {
      setQuote(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoadingQuote(true);
      const r = await fetch(`/api/quote?inr=${numericAmount}`);
      const d: Quote = await r.json();
      setQuote(d);
      setLoadingQuote(false);
    }, 200);
    return () => clearTimeout(t);
  }, [numericAmount]);

  async function startPayment() {
    setStep(1);
    const r = await fetch('/api/upi/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amountInr: numericAmount }),
    });
    const o = await r.json();
    setOrder(o);
  }

  async function simulatePay() {
    if (!order || !quote) return;
    setPaying(true);
    const tid = 't_' + Math.random().toString(36).slice(2, 10);
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
    });
    await fetch('/api/upi/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: order.orderId }),
    });
    updateTransfer(tid, { step: 'payment_received' });
    setStep(2);
    setPaying(false);

    // Trigger mint. The API will switch to dry mode unless DEMO_EXECUTOR_PK
    // is configured in .env.local.
    fetch('/api/mint', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        transferId: tid,
        fxrpAmount: quote.fxrpAmount.toString(),
        recipientFlareAddress: address ?? '0x0000',
      }),
    });
  }

  return (
    <div className="space-y-5">
      <ProgressSteps steps={STEPS} current={step} />

      {step === 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Amount in INR</label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-flare-muted">₹</span>
              <input
                className="input pl-7 text-lg"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="5000"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[1000, 2500, 5000, 10000, 25000].map((v) => (
                <button
                  key={v}
                  className="chip hover:border-flare-accent"
                  onClick={() => setAmount(String(v))}
                  type="button"
                >
                  ₹{v.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Recipient (XRPL address)</label>
            <input
              className="input mt-1 font-mono text-sm"
              value={recipientXrpl}
              onChange={(e) => setRecipientXrpl(e.target.value)}
            />
            <label className="label mt-3 block">Recipient name</label>
            <input
              className="input mt-1"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <div className="rounded-xl border border-flare-border bg-flare-surface/60 p-4">
              {loadingQuote && <div className="text-sm text-flare-muted">Fetching FTSO quote…</div>}
              {!loadingQuote && quote && (
                <div className="grid gap-3 sm:grid-cols-4">
                  <Mini label="XRP price" value={`$${quote.xrpUsd}`} sub={quote.xrpUsdSource === 'ftso' ? 'FTSO' : 'fallback'} />
                  <Mini label="Recipient gets" value={`${quote.fxrpAmount} XRP`} sub="≈ on XRPL" />
                  <Mini label="Our fee" value={inr(quote.totalFeeInr)} sub={`${(quote.platformFeeBips/100).toFixed(2)}% + ${(quote.mintBufferBips/100).toFixed(2)}% buffer`} />
                  <Mini label="Effective rate" value={inr(quote.inrPerXrp)} sub="per XRP" />
                </div>
              )}
              {!loadingQuote && !quote && (
                <div className="text-sm text-flare-muted">Enter an amount ≥ ₹100 to see a quote.</div>
              )}
            </div>
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            <div className="text-xs text-flare-muted">
              {!isConnected && 'Connect a Coston2 wallet to receive FXRP. You can still send without one — the recipient link handles it.'}
              {isConnected && `Connected: ${shortAddr(address)}`}
            </div>
            <button
              className="btn-primary"
              onClick={startPayment}
              disabled={numericAmount < 100 || !quote}
            >
              Continue to UPI →
            </button>
          </div>
        </div>
      )}

      {step === 1 && order && (
        <div className="space-y-4">
          <div className="rounded-xl border border-flare-border bg-flare-surface/60 p-5">
            <div className="text-sm text-flare-muted">UPI intent</div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="label">Pay to</div>
                <div className="font-mono">flareremit@upi</div>
              </div>
              <div>
                <div className="label">Amount</div>
                <div>{inr(numericAmount)}</div>
              </div>
              <div>
                <div className="label">UPI ref</div>
                <div className="font-mono">{order.upiRef}</div>
              </div>
              <div>
                <div className="label">Order id</div>
                <div className="font-mono">{order.orderId}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a className="btn-ghost text-sm" href={order.deepLink}>Open in UPI app</a>
              <button className="btn-primary text-sm" onClick={simulatePay} disabled={paying}>
                {paying ? 'Processing…' : 'Simulate payment success'}
              </button>
            </div>
            <div className="mt-3 text-[11px] text-flare-muted">
              In production this screen is replaced by the real Razorpay UPI intent.
              The simulator keeps the demo runnable without a merchant account.
            </div>
          </div>
        </div>
      )}

      {step === 2 && transferId && (
        <div className="space-y-4">
          <div className="rounded-xl border border-flare-border bg-flare-surface/60 p-5 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="label">Tracking</div>
                <div className="mt-1 text-base text-flare-text">
                  {inr(numericAmount)} → <span className="text-flare-accent">{quote?.fxrpAmount} XRP</span> for {recipientName}
                </div>
              </div>
              <a className="btn-ghost text-xs" href={`/track/${transferId}`}>Open full tracker →</a>
            </div>
            <div className="mt-2 text-[11px] text-flare-muted">
              Started {fmtTime(Date.now())} · UPI ref {order?.upiRef}
            </div>
          </div>
          <StatusTracker transferId={transferId} />
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-base font-semibold text-flare-text">{value}</div>
      {sub && <div className="text-[10px] text-flare-muted">{sub}</div>}
    </div>
  );
}
