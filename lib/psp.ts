import crypto from 'node:crypto';

export type PspProvider = 'razorpay' | 'cashfree' | 'paddle' | 'demo';

/** Verify signed PSP payloads. Secrets stay server-side in .env.local. */
export function verifyPspWebhook(rawBody: string, signature: string | null, provider: PspProvider) {
  if (provider === 'demo') return process.env.NODE_ENV !== 'production' && process.env.UPI_DEMO_MODE !== 'false';
  if (provider === 'paddle') {
    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const values = Object.fromEntries(signature.split(';').map((part) => part.split('='))) as Record<string, string>;
    const ts = values.ts;
    const h1 = values.h1;
    if (!ts || !h1 || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(h1));
  }
  const secret = provider === 'razorpay' ? process.env.RAZORPAY_WEBHOOK_SECRET : process.env.CASHFREE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function configuredPsp(): PspProvider {
  const provider = String(process.env.UPI_PSP ?? '').toLowerCase();
  return provider === 'razorpay' || provider === 'cashfree' || provider === 'paddle' ? provider : 'demo';
}
