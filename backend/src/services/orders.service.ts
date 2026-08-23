import { createRazorpayOrder, getRazorpayConfig } from '../config/razorpay';
import { isDatabaseConfigured, query, queryOne } from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { ensureUser } from './users.service';

export type PlaceOrderBody = {
  userId: string;
  addressId: string;
  addressLabel?: string;
  pincode?: string;
  city?: string;
  etaMinutes?: number;
  latitude?: number;
  longitude?: number;
  paymentMethod: 'upi' | 'card' | 'cod';
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: Array<{
    productId?: string;
    variantId: string;
    variantLabel?: string;
    title?: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
};

function nextOrderId() {
  return `BM${Math.floor(48000 + Math.random() * 9000)}`;
}

async function decrementStock(
  items: Array<{ variantId: string; quantity: number }>,
): Promise<boolean> {
  const result = await queryOne<{ decrement_stock: boolean }>(
    'select decrement_stock($1::jsonb) as decrement_stock',
    [JSON.stringify(items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })))],
  );
  return result?.decrement_stock === true;
}

export async function placeOrder(userId: string, body: PlaceOrderBody) {
  if (body.userId !== userId) {
    throw new AppError('FORBIDDEN', 'Order user does not match session.', 403);
  }
  if (!body.items.length) {
    throw new AppError('BAD_REQUEST', 'Cart is empty.', 400);
  }

  const dbReady = isDatabaseConfigured();
  let pricedItems = body.items;
  let subtotal = body.subtotal;
  let deliveryFee = body.deliveryFee;
  let total = body.total;

  if (dbReady) {
    const variants = await query<{
      id: string;
      product_id: string;
      variant_label: string;
      selling_price: string | number;
    }>(
      `select id, product_id, variant_label, selling_price
       from product_variants where id = any($1::text[])`,
      [body.items.map((item) => item.variantId)],
    );
    const byId = new Map(variants.map((row) => [row.id, row]));
    pricedItems = body.items.map((item) => {
      const row = byId.get(item.variantId);
      if (!row) {
        throw new AppError('BAD_REQUEST', 'One or more items are no longer available.', 400);
      }
      return {
        ...item,
        productId: item.productId ?? row.product_id,
        variantLabel: item.variantLabel ?? row.variant_label,
        priceAtPurchase: Number(row.selling_price),
      };
    });
    subtotal = pricedItems.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);
    deliveryFee = subtotal >= 999 ? 0 : 49;
    total = subtotal + deliveryFee;
  }

  const isCod = body.paymentMethod === 'cod';
  const orderId = nextOrderId();

  let razorpayOrderId: string | null = null;
  if (!isCod) {
    const rp = await createRazorpayOrder({
      amountPaise: Math.round(total * 100),
      receipt: orderId,
    });
    razorpayOrderId = rp.id;
  }

  const status = isCod ? 'confirmed' : 'pending_payment';
  const paymentStatus = 'pending';

  if (dbReady) {
    await ensureUser(userId);
    if (isCod) {
      const ok = await decrementStock(pricedItems);
      if (!ok) throw new AppError('OUT_OF_STOCK', 'Some items are out of stock.', 409);
    }

    await query(
      `insert into orders (
         id, user_id, address_id, address_label, pincode, city, status, payment_status,
         payment_method, subtotal, delivery_fee, total, eta_minutes, razorpay_order_id,
         latitude, longitude
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        orderId,
        userId,
        body.addressId,
        body.addressLabel ?? null,
        body.pincode ?? null,
        body.city ?? null,
        status,
        paymentStatus,
        body.paymentMethod,
        subtotal,
        deliveryFee,
        total,
        body.etaMinutes ?? 30,
        razorpayOrderId,
        body.latitude ?? null,
        body.longitude ?? null,
      ],
    );

    for (const item of pricedItems) {
      await query(
        `insert into order_items (
           order_id, product_id, variant_id, variant_label, title, quantity, price_at_purchase
         ) values ($1,$2,$3,$4,$5,$6,$7)`,
        [
          orderId,
          item.productId ?? null,
          item.variantId,
          item.variantLabel ?? null,
          item.title ?? null,
          item.quantity,
          item.priceAtPurchase,
        ],
      );
    }
  }

  return {
    id: orderId,
    status,
    payment_status: paymentStatus,
    razorpay_order_id: razorpayOrderId,
    total,
    demo: getRazorpayConfig().demo || !dbReady,
    keyId: getRazorpayConfig().keyId,
    persisted: dbReady,
  };
}

export async function confirmPaidOrder(
  userId: string,
  orderId: string,
  paymentId: string,
  razorpayOrderId?: string,
) {
  if (!isDatabaseConfigured()) {
    return {
      id: orderId,
      status: 'confirmed',
      payment_status: 'paid',
      razorpay_payment_id: paymentId,
      demo: true,
    };
  }

  const order = await queryOne<{
    id: string;
    status: string;
    payment_status: string;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
  }>(
    'select id, status, payment_status, razorpay_order_id, razorpay_payment_id from orders where id = $1 and user_id = $2',
    [orderId, userId],
  );

  if (!order) throw new AppError('NOT_FOUND', 'Order not found.', 404);

  if (order.payment_status === 'paid') {
    return {
      id: orderId,
      status: order.status,
      payment_status: 'paid',
      razorpay_payment_id: order.razorpay_payment_id,
    };
  }

  if (razorpayOrderId && order.razorpay_order_id && razorpayOrderId !== order.razorpay_order_id) {
    throw new AppError('PAYMENT_MISMATCH', 'Razorpay order mismatch.', 400);
  }

  const items = await query<{ variant_id: string; quantity: number }>(
    'select variant_id, quantity from order_items where order_id = $1',
    [orderId],
  );
  const ok = await decrementStock(
    items.map((i) => ({ variantId: i.variant_id, quantity: i.quantity })),
  );
  if (!ok) throw new AppError('OUT_OF_STOCK', 'Could not reserve stock for this payment.', 409);

  await query(
    `update orders
     set status = 'confirmed', payment_status = 'paid', razorpay_payment_id = $3
     where id = $1 and user_id = $2`,
    [orderId, userId, paymentId],
  );

  return {
    id: orderId,
    status: 'confirmed',
    payment_status: 'paid',
    razorpay_payment_id: paymentId,
  };
}

export async function getOrder(userId: string, orderId: string) {
  if (!isDatabaseConfigured()) return null;
  const order = await queryOne<Record<string, unknown>>(
    'select * from orders where id = $1 and user_id = $2',
    [orderId, userId],
  );
  if (!order) return null;
  const items = await query<Record<string, unknown>>(
    'select * from order_items where order_id = $1',
    [orderId],
  );
  return { ...order, order_items: items };
}

export async function listOrders(userId: string) {
  if (!isDatabaseConfigured()) return [];

  const orders = await query<Record<string, unknown>>(
    'select * from orders where user_id = $1 order by created_at desc',
    [userId],
  );
  if (!orders.length) return [];

  const items = await query<Record<string, unknown>>(
    'select * from order_items where order_id = any($1::text[])',
    [orders.map((o) => String(o.id))],
  );

  return orders.map((order) => ({
    ...order,
    order_items: items.filter((i) => i.order_id === order.id),
  }));
}
