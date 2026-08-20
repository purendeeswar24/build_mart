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

export function isWebhookConfigured(): boolean {
  return !!env.RAZORPAY_WEBHOOK_SECRET && env.RAZORPAY_WEBHOOK_SECRET !== 'your-webhook-secret';
}

function timingSafeEqualStr(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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
    const err = new Error(`Razorpay create order failed: ${res.status} ${text}`);
    (err as Error & { statusCode?: number }).statusCode = 502;
    throw err;
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
  return timingSafeEqualStr(expected, input.signature);
}

/** Razorpay webhook HMAC of the raw JSON body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!isWebhookConfigured() || !signature) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET!).update(rawBody).digest('hex');
  return timingSafeEqualStr(expected, signature);
}
