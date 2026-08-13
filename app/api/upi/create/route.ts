/**
 * POST /api/upi/create
 *   body: { amountInr: number, ... }
 *   ->  { orderId, upiRef, amountInr, deepLink }
 *
 * Creates a UPI intent (deeplink + QR). For the demo we generate the link
 * ourselves. In production this calls Razorpay order.create.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createUpiOrder } from '@/lib/mockUpi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = Number(body?.amountInr);
    const min = 100;
    const max = 100000;
    if (!Number.isFinite(raw) || raw < min || raw > max) {
      return NextResponse.json(
        { error: `amount must be between ₹${min} and ₹${max}` },
        { status: 400 }
      );
    }
    const order = createUpiOrder(raw);
    // UPI Common Library payload — interoperable across GPay, PhonePe, Paytm, BHIM.
    const params = new URLSearchParams({
      pa: 'flareremit@upi',
      pn: 'Flare Remit',
      mc: '0000',
      tr: order.upiRef,
      tn: 'FXRP Remittance',
      am: raw.toFixed(2),
      cu: 'INR',
    });
    const upiString = `upi://pay?${params.toString()}`;
    return NextResponse.json({
      orderId: order.orderId,
      upiRef: order.upiRef,
      amountInr: order.amountInr,
      deepLink: upiString,
      interoperability: 'UPI Common Library QR / intent',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'upi create failed', detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
