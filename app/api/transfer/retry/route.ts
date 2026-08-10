import { NextRequest, NextResponse } from 'next/server';
import { runFAssetRemittance } from '@/lib/fassets';
import { getPersistedTransfer, updatePersistedTransfer } from '@/lib/persistentStore';
import { useTransferStore } from '@/lib/store';

/** Retry only a payment-verified transfer. This endpoint is idempotent and
 * never starts minting for created/unverified payments. */
export async function POST(req: NextRequest) {
  const { transferId } = await req.json().catch(() => ({}));
  if (!transferId) return NextResponse.json({ error: 'transferId is required' }, { status: 400 });
  const transfer = await getPersistedTransfer(transferId);
  if (!transfer) return NextResponse.json({ error: 'unknown transfer' }, { status: 404 });
  if (!transfer.paymentVerifiedAt || !['failed', 'awaiting_executor', 'manual_review'].includes(transfer.step)) {
    return NextResponse.json({ error: 'transfer is not retryable or payment is not verified' }, { status: 409 });
  }
  await updatePersistedTransfer(transferId, { retryCount: (transfer.retryCount ?? 0) + 1, step: 'payment_received', pipelineError: undefined });
  useTransferStore.getState().update(transferId, { step: 'payment_received', pipelineError: undefined });
  try {
    const result = await runFAssetRemittance({ transferId, fxrpAmount: transfer.amountFxrp, recipientXrplAddress: transfer.recipientXrplAddress });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'retry failed';
    await updatePersistedTransfer(transferId, { step: 'manual_review', pipelineError: message });
    useTransferStore.getState().update(transferId, { step: 'manual_review', pipelineError: message });
    return NextResponse.json({ ok: false, error: message, manualReview: true }, { status: 503 });
  }
}
