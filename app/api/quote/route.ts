/**
 * GET /api/quote?inr=5000
 *
 * Returns a quote in INR -> FXRP based on the live FTSO price.
 * Falls back to a sensible static price if the oracle read fails
 * (which is common on testnet when no FTSO provider is registered).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getXrpUsdFromFtso } from '@/lib/ftso';

const FALLBACK_XRP_USD = 0.62;          // ~ real-world-ish; not financial advice
const INR_PER_USD = 83.5;               // demo static FX
const PLATFORM_FEE_BIPS = 50;           // 0.50%
const MINT_BUFFER_BIPS = 30;            // 0.30% slippage buffer for minting

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const inr = Number(searchParams.get('inr') ?? 0);
  const min = Number(process.env.UPI_MIN_AMOUNT_INR ?? 100);
  const max = Number(process.env.UPI_MAX_AMOUNT_INR ?? 100000);
  if (!Number.isFinite(inr) || inr < min || inr > max) {
    return NextResponse.json({ error: 'invalid amount' }, { status: 400 });
  }

  const ftso = await getXrpUsdFromFtso();
  const xrpUsd = ftso?.xrpUsd ?? FALLBACK_XRP_USD;

  const inrPerXrp = xrpUsd * INR_PER_USD;
  const platformFeeInr = (inr * PLATFORM_FEE_BIPS) / 10_000;
  const mintBufferInr = (inr * MINT_BUFFER_BIPS) / 10_000;
  const netInr = inr - platformFeeInr - mintBufferInr;
  const fxrpAmount = netInr / inrPerXrp;
  const totalFeeInr = platformFeeInr + mintBufferInr;

  return NextResponse.json({
    inr,
    xrpUsd,
    xrpUsdSource: ftso?.source ?? 'fallback',
    inrPerXrp,
    platformFeeBips: PLATFORM_FEE_BIPS,
    mintBufferBips: MINT_BUFFER_BIPS,
    platformFeeInr: round2(platformFeeInr),
    mintBufferInr: round2(mintBufferInr),
    totalFeeInr: round2(totalFeeInr),
    fxrpAmount: Number(fxrpAmount.toFixed(4)),
    ftsoTimestamp: ftso?.timestamp ?? null,
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
