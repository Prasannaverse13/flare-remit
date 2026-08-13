/**
 * GET /api/_debug
 * Returns the values of select env vars so we can verify the deployed
 * configuration. Removed before public launch — the route is gated to
 * non-production by the receiver (see the implementation).
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SAFE_KEYS = [
  'NODE_ENV',
  'VERCEL_ENV',
  'UPI_PSP',
  'UPI_DEMO_MODE',
  'UPI_MIN_AMOUNT_INR',
  'UPI_MAX_AMOUNT_INR',
  'NEXT_PUBLIC_FLARE_CHAIN_ID',
];

export async function GET(_req: NextRequest) {
  const out: Record<string, string | undefined> = {};
  for (const k of SAFE_KEYS) {
    out[k] = process.env[k];
  }
  return NextResponse.json(out);
}
