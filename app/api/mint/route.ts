import { NextRequest, NextResponse } from 'next/server';
import { runFAssetRemittance } from '@/lib/fassets';
import { useTransferStore } from '@/lib/store';
import { getPersistedTransfer, updatePersistedTransfer } from '@/lib/persistentStore';

export const maxDuration = 300;

/**
 * Starts the real Coston2 FXRP lifecycle after UPI confirmation:
 * reserveCollateral → FDC-backed executeMinting → redeem to XRPL.
 * No faucet or synthetic transaction is returned from this endpoint.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { transferId, fxrpAmount, recipientXrplAddress } = body;
  if (!transferId || !fxrpAmount || !recipientXrplAddress) {
    return NextResponse.json({ error: 'transferId, fxrpAmount and recipientXrplAddress are required' }, { status: 400 });
  }
  if (!(await getPersistedTransfer(transferId)) && !useTransferStore.getState().get(transferId)) {
    return NextResponse.json({ error: 'unknown transfer' }, { status: 404 });
  }

  try {
    const result = await runFAssetRemittance({ transferId, fxrpAmount, recipientXrplAddress });
    return NextResponse.json({ ok: true, mode: 'fassets', ...result });
  } catch (error: any) {
    useTransferStore.getState().update(transferId, { step: 'failed' });
    await updatePersistedTransfer(transferId, { step: 'failed', pipelineError: error instanceof Error ? error.message : 'FAsset remittance failed' });
    const message = error instanceof Error ? error.message : 'FAsset remittance failed';
    const needsConfig = /EXECUTOR_PK|FASSET_MINT_PROOF/.test(message);
    return NextResponse.json({ ok: false, error: message, needsConfig }, { status: needsConfig ? 503 : 500 });
  }
}
