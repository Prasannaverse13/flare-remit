const API_VERSION = '1';

function apiBase() {
  return process.env.PADDLE_ENV === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
}

export async function createPaddleTransaction(input: {
  amountInr: number;
  customData: Record<string, string | number>;
}) {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error('PADDLE_API_KEY is not configured');
  const response = await fetch(`${apiBase()}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Paddle-Version': API_VERSION,
    },
    body: JSON.stringify({
      collection_mode: 'automatic',
      currency_code: 'INR',
      custom_data: input.customData,
      items: [{
        quantity: 1,
        price: {
          description: 'FXRP Remit UPI settlement',
          product: {
            name: 'FXRP Remittance',
            description: 'UPI to native XRP remittance on Flare',
            tax_category: process.env.PADDLE_TAX_CATEGORY ?? 'digital-goods',
          },
          unit_price: { amount: String(Math.round(input.amountInr * 100)), currency_code: 'INR' },
        },
      }],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.data?.id) throw new Error(payload?.error?.detail ?? 'Paddle transaction creation failed');
  return payload.data as { id: string; status: string; checkout?: { url?: string } };
}
