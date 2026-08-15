import crypto from 'crypto';
import { env } from './env';

export function isRazorpayConfigured(): boolean {
  return (
    !!env.RAZORPAY_KEY_ID &&
    !!env.RAZORPAY_KEY_SECRET &&
    !env.RAZORPAY_KEY_ID.includes('xxxxx') &&
    env.RAZORPAY_KEY_SECRET !== 'your-razorpay-secret'
  );
}

export function getRazorpayConfig(): {
  keyId: string;
  keySecret: string;
  demo: boolean;
} {
  if (!isRazorpayConfigured()) {
    return { keyId: 'rzp_test_demo', keySecret: 'demo', demo: true };
  }
  return {
    keyId: env.RAZORPAY_KEY_ID!,
    keySecret: env.RAZORPAY_KEY_SECRET!,
    demo: false,
  };
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  currency?: string;
}): Promise<{ id: string; amount: number; currency: string; receipt: string }> {
  const { keyId, keySecret, demo } = getRazorpayConfig();
  if (demo) {
    return {
      id: `order_demo_${Date.now()}`,
      amount: input.amountPaise,
      currency: input.currency ?? 'INR',
      receipt: input.receipt,
    };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: input.currency ?? 'INR',
      receipt: input.receipt,
      payment_capture: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay create order failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
  return data;
}

export function verifyRazorpaySignature(input: {
  razorpayOrderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret, demo } = getRazorpayConfig();
  if (demo) {
    // Demo checkout only issues signatures prefixed with demo_
    return input.signature.startsWith('demo_');
  }
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${input.razorpayOrderId}|${input.paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  } catch {
    return false;
  }
}
