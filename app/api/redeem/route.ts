import { NextRequest, NextResponse } from 'next/server';
import { redeemFxrp } from '@/lib/fassets';
import { useTransferStore } from '@/lib/store';
import { getPersistedTransfer, updatePersistedTransfer } from '@/lib/persistentStore';

export async function POST(req: NextRequest) {
  const { transferId, fxrpAmount, recipientXrplAddress } = await req.json().catch(() => ({}));
  if (!transferId || !fxrpAmount || !recipientXrplAddress) return NextResponse.json({ error: 'transferId, fxrpAmount and recipientXrplAddress are required' }, { status: 400 });
  if (!(await getPersistedTransfer(transferId)) && !useTransferStore.getState().get(transferId)) return NextResponse.json({ error: 'unknown transfer' }, { status: 404 });
  try {
    return NextResponse.json({ ok: true, ...(await redeemFxrp({ transferId, fxrpAmount, recipientXrplAddress })) });
  } catch (error: any) {
    useTransferStore.getState().update(transferId, { step: 'failed' });
    await updatePersistedTransfer(transferId, { step: 'failed', pipelineError: error?.message ?? 'redeem failed' });
    return NextResponse.json({ ok: false, error: error?.message ?? 'redeem failed' }, { status: 503 });
  }
}
