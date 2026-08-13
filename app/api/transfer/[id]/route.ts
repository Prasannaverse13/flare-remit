/**
 * GET /api/transfer/[id]
 *   -> { id, step, stage, mintTxHash, redeemTxHash, ... }
 *
 * Public read endpoint used by the recipient view (/r/[id]) to poll
 * status without holding a sender-side session. Only safe-to-share
 * fields are returned; we strip anything sensitive (sender PII,
 * idempotency keys, etc.) on the way out.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPersistedTransfer } from '@/lib/persistentStore';

export const dynamic = 'force-dynamic';

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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const t = await getPersistedTransfer(params.id);
  if (!t) return NextResponse.json({ error: 'unknown transfer' }, { status: 404 });
  return NextResponse.json({
    id: t.id,
    step: t.step,
    stage: stageFromStep(t.step),
    amountFxrp: t.amountFxrp,
    recipientXrplAddress: t.recipientXrplAddress,
    recipientName: t.recipientName,
    senderName: t.senderName,
    mintTxHash: t.mintTxHash,
    redeemTxHash: t.redeemTxHash,
    collateralReservationId: t.collateralReservationId,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    pipelineError: t.pipelineError,
  });
}
