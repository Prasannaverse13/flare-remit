/**
 * POST /api/upi/webhook
 *   body: { orderId, transferId }
 *
 * Marks the UPI order as paid and updates the transfer state to
 * 'payment_received'. In a real Razorpay integration this would be
 * invoked by Razorpay's server-to-server webhook with a valid signature;
 * here we just accept the JSON from the wizard's "Simulate payment"
 * button. The same handler is wired to execute the FAsset mint in /api/mint.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getOrder, markPaid } from '@/lib/mockUpi';
import { runFAssetRemittance } from '@/lib/fassets';
import { useTransferStore, type Transfer } from '@/lib/store';
import { configuredPsp, verifyPspWebhook } from '@/lib/psp';
import { getPersistedTransfer, persistTransfer, updatePersistedTransfer } from '@/lib/persistentStore';

export const dynamic = 'force-dynamic';
// 2026-08-13: signature check fix, see commit 51a40d5 + 8f2ce29

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? req.headers.get('x-cashfree-signature') ?? req.headers.get('paddle-signature');
  const provider = configuredPsp();
  const demo = req.headers.get('x-flare-demo') === 'true';
  if (!verifyPspWebhook(rawBody, signature, demo ? 'demo' : provider)) {
    return NextResponse.json({ error: 'invalid webhook signature' }, { status: 401 });
  }
  const payload = JSON.parse(rawBody || '{}');
  const paddleData = provider === 'paddle' && payload?.event_type === 'transaction.completed' ? payload.data : null;
  if (provider === 'paddle' && !paddleData) return NextResponse.json({ ok: true, ignored: true });
  const custom = paddleData?.custom_data ?? {};
  const orderId = custom.upiOrderId ?? payload.orderId;
  const transferId = custom.transferId ?? payload.transferId;
  const fxrpAmount = custom.fxrpAmount ?? payload.fxrpAmount;
  const recipientXrplAddress = custom.recipientXrplAddress ?? payload.recipientXrplAddress;
  const recipientName = custom.recipientName ?? payload.recipientName;
  const amountInr = custom.amountInr ?? payload.amountInr;
  const recipientFlareAddress = custom.recipientFlareAddress ?? payload.recipientFlareAddress;
  const upiRef = custom.upiRef ?? payload.upiRef ?? paddleData?.id;
  const idempotencyKey = custom.idempotencyKey ?? req.headers.get('x-idempotency-key') ?? payload.idempotencyKey ?? `paddle_${paddleData?.id ?? orderId}`;
  if (!orderId || !idempotencyKey) return NextResponse.json({ error: 'orderId and idempotencyKey are required' }, { status: 400 });
  const existing = transferId ? (await getPersistedTransfer(transferId)) : undefined;
  const existingStep = existing?.step;
  if (existing?.idempotencyKey === idempotencyKey && existingStep && ['payment_received', 'awaiting_executor', 'reserved', 'proof_submitted', 'settled'].includes(existingStep)) {
    return NextResponse.json({ ok: true, duplicate: true, status: existingStep });
  }
  const pendingOrder = getOrder(orderId);
  if (amountInr !== undefined && pendingOrder && Math.abs(Number(amountInr) - pendingOrder.amountInr) > 0.01) {
    return NextResponse.json({ error: 'webhook amount does not match the UPI order' }, { status: 400 });
  }
  // Primary: real PSP marks order paid via webhook (Razorpay/Cashfree).
  // Fallback: Paddle constructs order from body; demo mode constructs from body
  // because Vercel serverless instances don't share in-memory order state.
  const order = provider === 'paddle'
    ? { orderId, amountInr: Number(amountInr), upiRef: String(upiRef), status: 'paid' as const, paidAt: Date.now() }
    : markPaid(orderId)
    ?? (demo ? { orderId, amountInr: Number(amountInr ?? 0), upiRef: String(upiRef ?? ''), status: 'paid' as const, paidAt: Date.now() } : null);
  if (!order) {
    return NextResponse.json({ error: 'unknown order' }, { status: 404 });
  }
  if (transferId) {
    if (!useTransferStore.getState().get(transferId)) {
      const transfer: Transfer = {
        id: transferId,
        senderName: 'You',
        recipientName: recipientName ?? 'Recipient',
        recipientXrplAddress,
        recipientFlareAddress: recipientFlareAddress ?? '0x0000',
        amountInr: Number(amountInr ?? 0),
        amountFxrp: String(fxrpAmount),
        xrpUsdAtQuote: 0,
        feeInr: 0,
        upiOrderId: order.orderId,
        upiRef: upiRef ?? order.upiRef,
        step: 'created',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        idempotencyKey,
        retryCount: 0,
      };
      useTransferStore.getState().add(transfer);
      await persistTransfer(transfer);
    }
    useTransferStore.getState().update(transferId, { step: 'payment_received' });
    await updatePersistedTransfer(transferId, { step: 'payment_received', paymentVerifiedAt: Date.now(), upiRef: upiRef ?? order.upiRef });
    try {
      const result = await runFAssetRemittance({ transferId, fxrpAmount, recipientXrplAddress });
      return NextResponse.json({ ok: true, order, fassets: result });
    } catch (error: any) {
      const message = error?.message ?? 'FAsset pipeline failed';
      const awaitingSetup = /EXECUTOR_PK|FASSET_MINT_PROOF|agent vault/i.test(message);
      useTransferStore.getState().update(transferId, { step: awaitingSetup ? 'awaiting_executor' : 'failed', pipelineError: message });
      await updatePersistedTransfer(transferId, { step: awaitingSetup ? 'awaiting_executor' : 'failed', pipelineError: message, retryCount: (existing?.retryCount ?? 0) + 1, manualReviewReason: awaitingSetup ? undefined : message });
      return NextResponse.json({ ok: false, order, error: message, awaitingSetup }, { status: 503 });
    }
  }
  return NextResponse.json({ ok: true, order });
}
