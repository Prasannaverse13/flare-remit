import { NextRequest, NextResponse } from 'next/server';
import { submitPaymentReference } from '@/lib/mockUpi';

/** Manual-review fallback for a personal UPI VPA. A PSP webhook is the only
 * trusted path that transitions an order to paid and starts minting. */
export async function POST(req: NextRequest) {
  const { orderId, paymentRef } = await req.json().catch(() => ({}));
  if (!orderId || !paymentRef) return NextResponse.json({ error: 'orderId and paymentRef are required' }, { status: 400 });
  const order = submitPaymentReference(orderId, paymentRef);
  if (!order) return NextResponse.json({ error: 'invalid payment reference or order' }, { status: 400 });
  return NextResponse.json({ ok: true, verified: order.verified === true, status: order.verified ? 'verified' : 'awaiting_verification', order }, { status: 202 });
}
