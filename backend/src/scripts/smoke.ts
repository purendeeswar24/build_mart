/**
 * API smoke tests — run against a live backend:
 *   npx ts-node --transpile-only src/scripts/smoke.ts
 * Or: node dist/scripts/smoke.js after build
 */
import { issueDemoToken } from '../middleware/auth.middleware';

const BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

type Result = { name: string; ok: boolean; detail?: string };

async function req(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  const results: Result[] = [];
  const token = issueDemoToken({
    userId: 'demo-9999999999',
    role: 'homeowner',
    phone: '+919999999999',
  });

  // 1. Health
  {
    const { status, json } = await req('/health');
    results.push({
      name: 'GET /health',
      ok: status === 200 && json.status === 'ok',
      detail: JSON.stringify(json),
    });
  }

  // 2. Auth status
  {
    const { status, json } = await req('/api/v1/auth/status');
    results.push({
      name: 'GET /api/v1/auth/status',
      ok: status === 200 && !!json.mode,
      detail: JSON.stringify(json),
    });
  }

  // 3. Demo OTP
  {
    const { status, json } = await req('/api/v1/auth/otp/verify', {
      body: { phone: '9999999999', otp: '123456', fullName: 'Smoke Test' },
    });
    results.push({
      name: 'POST /api/v1/auth/otp/verify (demo)',
      ok: status === 200 && !!json.token,
      detail: status === 200 ? 'token issued' : JSON.stringify(json),
    });
  }

  // 4. /me with token
  {
    const { status, json } = await req('/api/v1/auth/me', { token });
    results.push({
      name: 'GET /api/v1/auth/me',
      ok: status === 200 && json.user?.id === 'demo-9999999999',
      detail: JSON.stringify(json.user ?? json),
    });
  }

  // 5. Unauthorized orders
  {
    const { status } = await req('/api/v1/orders');
    results.push({
      name: 'GET /api/v1/orders without auth → 401',
      ok: status === 401,
      detail: `status=${status}`,
    });
  }

  // 6. Create payment order
  {
    const { status, json } = await req('/api/v1/payments/create-order', {
      token,
      body: { amountRupees: 100, receipt: 'SMOKE001' },
    });
    results.push({
      name: 'POST /api/v1/payments/create-order',
      ok: status === 200 && !!json.orderId,
      detail: JSON.stringify(json),
    });
  }

  // 7. Verify demo signature
  {
    const orderId = `order_demo_smoke`;
    const paymentId = `pay_smoke`;
    const { status, json } = await req('/api/v1/payments/verify', {
      token,
      body: {
        razorpayOrderId: orderId,
        paymentId,
        signature: `demo_${orderId}`,
      },
    });
    results.push({
      name: 'POST /api/v1/payments/verify (demo)',
      ok: status === 200 && json.valid === true,
      detail: JSON.stringify(json),
    });
  }

  // 7b. Reject invalid signature
  {
    const { status } = await req('/api/v1/payments/verify', {
      token,
      body: {
        razorpayOrderId: 'order_x',
        paymentId: 'pay_x',
        signature: 'totally_invalid_signature',
      },
    });
    results.push({
      name: 'POST /api/v1/payments/verify rejects bad sig',
      ok: status === 400,
      detail: `status=${status}`,
    });
  }

  // 8. Place COD order
  let codOrderId = '';
  {
    const { status, json } = await req('/api/v1/orders', {
      token,
      method: 'POST',
      body: {
        userId: 'demo-9999999999',
        addressId: 'addr-1',
        addressLabel: 'Site',
        pincode: '500032',
        city: 'Hyderabad',
        paymentMethod: 'cod',
        subtotal: 549,
        deliveryFee: 0,
        total: 549,
        items: [
          {
            productId: 'p12',
            variantId: 'v12',
            variantLabel: '16oz',
            quantity: 1,
            priceAtPurchase: 549,
          },
        ],
      },
    });
    codOrderId = json.order?.id ?? '';
    results.push({
      name: 'POST /api/v1/orders (COD)',
      ok: status === 201 && !!codOrderId,
      detail: JSON.stringify(json.order ?? json),
    });
  }

  // 8a. Stored COD order can be listed and fetched
  {
    const listed = await req('/api/v1/orders', { token });
    const found = (listed.json.orders as Array<{ id?: string }> | undefined)?.some(
      (o) => o.id === codOrderId,
    );
    const one = codOrderId
      ? await req(`/api/v1/orders/${codOrderId}`, { token })
      : { status: 0, json: {} as { order?: { items?: unknown[]; order_items?: unknown[] } } };
    const row = one.json.order as
      | { id?: string; total?: number; order_items?: Array<{ quantity?: number }> }
      | undefined;
    results.push({
      name: 'GET /api/v1/orders stores COD order',
      ok: listed.status === 200 && !!found,
      detail: `count=${(listed.json.orders as unknown[] | undefined)?.length ?? 0} found=${found}`,
    });
    results.push({
      name: 'GET /api/v1/orders/:id returns items',
      ok:
        one.status === 200 &&
        row?.id === codOrderId &&
        Number(row?.total) === 549 &&
        (row?.order_items?.length ?? 0) === 1,
      detail: JSON.stringify(row ?? one.json),
    });
  }

  // 8b. Reject mismatched totals
  {
    const { status } = await req('/api/v1/orders', {
      token,
      method: 'POST',
      body: {
        userId: 'demo-9999999999',
        addressId: 'addr-1',
        paymentMethod: 'cod',
        subtotal: 549,
        deliveryFee: 0,
        total: 1,
        items: [
          {
            productId: 'p12',
            variantId: 'v12',
            quantity: 1,
            priceAtPurchase: 549,
          },
        ],
      },
    });
    results.push({
      name: 'POST /api/v1/orders rejects price mismatch',
      ok: status === 400,
      detail: `status=${status}`,
    });
  }

  // 8c. Confirm payment requires signature
  {
    const { status } = await req('/api/v1/orders/BMX/confirm-payment', {
      token,
      body: { paymentId: 'pay_x' },
    });
    results.push({
      name: 'POST confirm-payment requires signature',
      ok: status === 400,
      detail: `status=${status}`,
    });
  }

  // 8d. Place UPI order and confirm with demo signature
  {
    const placed = await req('/api/v1/orders', {
      token,
      method: 'POST',
      body: {
        userId: 'demo-9999999999',
        addressId: 'addr-1',
        paymentMethod: 'upi',
        subtotal: 549,
        deliveryFee: 0,
        total: 549,
        items: [
          {
            productId: 'p12',
            variantId: 'v12',
            quantity: 1,
            priceAtPurchase: 549,
          },
        ],
      },
    });
    const orderId = placed.json.order?.id as string | undefined;
    const rpId = placed.json.order?.razorpay_order_id as string | undefined;
    const confirm = orderId
      ? await req(`/api/v1/orders/${orderId}/confirm-payment`, {
          token,
          body: {
            paymentId: 'pay_smoke',
            razorpayOrderId: rpId,
            signature: `demo_${rpId}`,
          },
        })
      : { status: 0, json: {} };
    results.push({
      name: 'POST confirm-payment (demo UPI)',
      ok:
        placed.status === 201 &&
        confirm.status === 200 &&
        confirm.json.order?.payment_status === 'paid',
      detail: JSON.stringify(confirm.json.order ?? confirm.json),
    });
  }

  // 9. Security headers
  {
    const res = await fetch(`${BASE}/health`);
    const nosniff = res.headers.get('x-content-type-options');
    results.push({
      name: 'Security header X-Content-Type-Options',
      ok: nosniff === 'nosniff',
      detail: `x-content-type-options=${nosniff}`,
    });
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\nBuildMart API smoke tests\n' + '='.repeat(40));
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
    if (!r.ok && r.detail) console.log(`       ${r.detail}`);
  }
  console.log('='.repeat(40));
  console.log(
    failed.length === 0
      ? `All ${results.length} checks passed.`
      : `${failed.length}/${results.length} failed.`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
