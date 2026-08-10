/**
 * POST /api/upi/create
 *   body: { amountInr: number }
 *   ->  { orderId, upiRef, amountInr, deepLink }
 *
 * In real life this is Razorpay's order creation endpoint. For the demo
 * we generate a deterministic-looking UPI deep link so the simulated
 * payment screen feels real.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createUpiOrder } from '@/lib/mockUpi';
import { createPaddleTransaction } from '@/lib/paddle';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { amountInr } = body;
  const min = Number(process.env.UPI_MIN_AMOUNT_INR ?? 100);
  const max = Number(process.env.UPI_MAX_AMOUNT_INR ?? 100000);
  if (!Number.isFinite(Number(amountInr)) || Number(amountInr) < min || Number(amountInr) > max) {
    return NextResponse.json({ error: `amount must be between ₹${min} and ₹${max}` }, { status: 400 });
  }
  const order = createUpiOrder(Number(amountInr));
  const transferId = String(body.transferId ?? '');
  const customData = {
    upiOrderId: order.orderId,
    transferId,
    amountInr: Number(amountInr),
    recipientName: String(body.recipientName ?? 'Recipient'),
    recipientXrplAddress: String(body.recipientXrplAddress ?? ''),
    fxrpAmount: String(body.fxrpAmount ?? ''),
    idempotencyKey: `paddle_${order.orderId}`,
  };
  if (process.env.UPI_PSP === 'paddle') {
    const transaction = await createPaddleTransaction({ amountInr: Number(amountInr), customData });
    if (!transaction.checkout?.url) return NextResponse.json({ error: 'Paddle did not return a checkout URL' }, { status: 502 });
    return NextResponse.json({ orderId: order.orderId, upiRef: order.upiRef, amountInr: order.amountInr, deepLink: transaction.checkout.url, provider: 'paddle', paddleTransactionId: transaction.id });
  }
  // UPI Common Library payload. One standards-based URI/QR is interoperable
  // across Google Pay, PhonePe, Paytm, BHIM and other compliant Indian apps.
  // Replace the demo VPA with an acquiring-bank/PSP-issued VPA in production.
  const params = new URLSearchParams({
    pa: process.env.UPI_VPA ?? 'flareremit@upi',
    pn: process.env.UPI_MERCHANT_NAME ?? 'Flare Remit',
    mc: process.env.UPI_MCC ?? '0000',
    tr: order.upiRef,
    tn: 'FXRP Remittance',
    am: Number(amountInr).toFixed(2),
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
}
