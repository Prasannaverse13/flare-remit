/**
 * Mock UPI / Razorpay integration. In production this is replaced with a real
 * Razorpay order creation + webhook. For the hackathon demo we simulate the
 * UPI intent screen and return a deterministic payment reference so the
 * minting flow can be exercised end-to-end without a real merchant account.
 */
export interface UpiOrder {
  orderId: string;
  amountInr: number;
  upiRef: string;
  status: 'created' | 'submitted' | 'paid' | 'failed';
  paymentRef?: string;
  paidAt?: number;
  verified?: boolean;
}

const globalForUpi = globalThis as typeof globalThis & { __flareUpiOrders?: Map<string, UpiOrder> };
const ORDERS = globalForUpi.__flareUpiOrders ?? new Map<string, UpiOrder>();
globalForUpi.__flareUpiOrders = ORDERS;

export function createUpiOrder(amountInr: number): UpiOrder {
  const orderId = 'order_' + Math.random().toString(36).slice(2, 10);
  const order: UpiOrder = {
    orderId,
    amountInr,
    upiRef: Math.floor(Math.random() * 1e10).toString().padStart(10, '0'),
    status: 'created',
  };
  ORDERS.set(orderId, order);
  return order;
}

export function markPaid(orderId: string): UpiOrder | null {
  const o = ORDERS.get(orderId);
  if (!o) return null;
  if (o.status === 'paid') return o;
  o.status = 'paid';
  o.paidAt = Date.now();
  ORDERS.set(orderId, o);
  return o;
}

export function submitPaymentReference(orderId: string, paymentRef: string): UpiOrder | null {
  const normalized = String(paymentRef).trim().toUpperCase();
  if (!/^[A-Z0-9-]{8,40}$/.test(normalized)) return null;
  const order = ORDERS.get(orderId);
  if (!order || order.status === 'paid') return null;
  order.status = 'submitted';
  order.paymentRef = normalized;
  order.verified = true;
  ORDERS.set(orderId, order);
  return order;
}

export function getOrder(orderId: string): UpiOrder | null {
  return ORDERS.get(orderId) ?? null;
}

/**
 * Razorpay test-mode wiring. If NEXT_PUBLIC_RAZORPAY_KEY_ID is set in env,
 * the front-end will attempt to open the real Razorpay UPI intent. Otherwise
 * the wizard falls back to the in-app "Simulate UPI payment" button.
 */
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '';
