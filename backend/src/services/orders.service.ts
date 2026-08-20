import crypto from 'crypto';
import { tryGetSupabaseAdmin } from '../config/supabase';
import { createRazorpayOrder, getRazorpayConfig } from '../config/razorpay';
import { AppError } from '../middleware/errorHandler.middleware';
import { demoStore } from './demoStore';

export type PlaceOrderBody = {
  userId: string;
  addressId: string;
  addressLabel?: string;
  pincode?: string;
  city?: string;
  etaMinutes?: number;
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

const PRICE_EPS = 0.05;

function nextOrderId() {
  return `BM${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function assertTotals(body: PlaceOrderBody) {
  const itemsTotal = body.items.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);
  if (Math.abs(itemsTotal - body.subtotal) > PRICE_EPS) {
    throw new AppError('PRICE_MISMATCH', 'Subtotal does not match cart items.', 400);
  }
  if (Math.abs(body.subtotal + body.deliveryFee - body.total) > PRICE_EPS) {
    throw new AppError('PRICE_MISMATCH', 'Total does not match subtotal plus delivery.', 400);
  }
}

function canPersist(userId: string) {
  const admin = tryGetSupabaseAdmin();
  if (!admin || userId.startsWith('demo-')) {
    return { admin, persist: false as const };
  }
  return { admin, persist: true as const };
}

async function rollbackOrder(
  admin: NonNullable<ReturnType<typeof tryGetSupabaseAdmin>>,
  orderId: string,
) {
  await admin.from('order_items').delete().eq('order_id', orderId);
  await admin.from('orders').delete().eq('id', orderId);
}

export async function placeOrder(userId: string, body: PlaceOrderBody) {
  if (body.userId !== userId) {
    throw new AppError('FORBIDDEN', 'Order user does not match session.', 403);
  }
  if (!body.items.length) {
    throw new AppError('BAD_REQUEST', 'Cart is empty.', 400);
  }
  assertTotals(body);

  const isCod = body.paymentMethod === 'cod';
  const orderId = nextOrderId();
  const { admin, persist } = canPersist(userId);

  let razorpayOrderId: string | null = null;
  if (!isCod) {
    try {
      const rp = await createRazorpayOrder({
        amountPaise: Math.round(body.total * 100),
        receipt: orderId.slice(0, 40),
      });
      razorpayOrderId = rp.id;
    } catch {
      throw new AppError('PAYMENT_FAILED', 'Could not start payment. Try again.', 502);
    }
  }

  const orderRow = {
    id: orderId,
    user_id: userId,
    address_id: body.addressId,
    address_label: body.addressLabel ?? null,
    pincode: body.pincode ?? null,
    city: body.city ?? null,
    status: isCod ? 'confirmed' : 'pending_payment',
    payment_status: isCod ? 'pending' : 'pending',
    payment_method: body.paymentMethod,
    subtotal: body.subtotal,
    delivery_fee: body.deliveryFee,
    total: body.total,
    eta_minutes: body.etaMinutes ?? 30,
    razorpay_order_id: razorpayOrderId,
  };

  if (admin && persist) {
    const { error } = await admin.from('orders').insert(orderRow);
    if (error) throw new AppError('ORDER_FAILED', error.message, 500);

    const { error: itemsErr } = await admin.from('order_items').insert(
      body.items.map((i) => ({
        order_id: orderId,
        product_id: i.productId ?? null,
        variant_id: i.variantId,
        variant_label: i.variantLabel ?? null,
        title: i.title ?? null,
        quantity: i.quantity,
        price_at_purchase: i.priceAtPurchase,
      })),
    );
    if (itemsErr) {
      await rollbackOrder(admin, orderId);
      throw new AppError('ORDER_FAILED', itemsErr.message, 500);
    }

    if (isCod) {
      const ok = await admin.rpc('decrement_stock', {
        p_items: body.items.map((i) => ({
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
      });
      if (ok.error || ok.data === false) {
        await rollbackOrder(admin, orderId);
        throw new AppError('OUT_OF_STOCK', 'Some items are out of stock.', 409);
      }
    }
  } else {
    demoStore.save({
      ...orderRow,
      razorpay_payment_id: null,
      cancel_reason: null,
      created_at: new Date().toISOString(),
      order_items: body.items.map((i) => ({
        product_id: i.productId ?? null,
        variant_id: i.variantId,
        variant_label: i.variantLabel ?? null,
        title: i.title ?? null,
        quantity: i.quantity,
        price_at_purchase: i.priceAtPurchase,
      })),
    });
  }

  const rp = getRazorpayConfig();
  return {
    id: orderId,
    status: orderRow.status,
    payment_status: orderRow.payment_status,
    razorpay_order_id: razorpayOrderId,
    total: body.total,
    demo: rp.demo || !persist,
    keyId: rp.keyId,
    persisted: persist,
  };
}

export async function confirmPaidOrder(
  userId: string,
  orderId: string,
  paymentId: string,
  razorpayOrderId?: string,
) {
  const { admin, persist } = canPersist(userId);
  if (!admin || !persist) {
    const updated = demoStore.update(orderId, userId, {
      status: 'confirmed',
      payment_status: 'paid',
      razorpay_payment_id: paymentId,
    });
    if (!updated) {
      const existing = demoStore.get(orderId);
      if (existing) throw new AppError('NOT_FOUND', 'Order not found.', 404);
      // Order was placed only on device — still acknowledge demo payment
    }
    return {
      id: orderId,
      status: 'confirmed',
      payment_status: 'paid',
      razorpay_payment_id: paymentId,
      demo: true,
    };
  }

  const { data: order, error } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !order) {
    throw new AppError('NOT_FOUND', 'Order not found.', 404);
  }

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

  const { data: claimed, error: claimErr } = await admin
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      razorpay_payment_id: paymentId,
    })
    .eq('id', orderId)
    .eq('user_id', userId)
    .eq('payment_status', 'pending')
    .select('id')
    .maybeSingle();

  if (claimErr) throw new AppError('ORDER_FAILED', claimErr.message, 500);
  if (!claimed) {
    const { data: again } = await admin
      .from('orders')
      .select('status, payment_status, razorpay_payment_id')
      .eq('id', orderId)
      .maybeSingle();
    if (again?.payment_status === 'paid') {
      return {
        id: orderId,
        status: again.status,
        payment_status: 'paid',
        razorpay_payment_id: again.razorpay_payment_id,
      };
    }
    throw new AppError('ORDER_FAILED', 'Could not confirm this order.', 409);
  }

  const items = (order.order_items ?? []) as Array<{ variant_id: string; quantity: number }>;
  const stock = await admin.rpc('decrement_stock', {
    p_items: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
  });
  if (stock.error || stock.data === false) {
    await admin
      .from('orders')
      .update({
        status: 'pending_payment',
        payment_status: 'pending',
        razorpay_payment_id: null,
      })
      .eq('id', orderId);
    throw new AppError('OUT_OF_STOCK', 'Could not reserve stock for this payment.', 409);
  }

  return {
    id: orderId,
    status: 'confirmed',
    payment_status: 'paid',
    razorpay_payment_id: paymentId,
  };
}

export async function confirmPaidByRazorpayOrder(razorpayOrderId: string, paymentId: string) {
  const admin = tryGetSupabaseAdmin();
  if (!admin) {
    const demo = demoStore.findByRazorpayOrderId(razorpayOrderId);
    if (!demo) return { ignored: true as const };
    if (demo.payment_status === 'paid') return { id: demo.id, already: true as const };
    return confirmPaidOrder(demo.user_id, demo.id, paymentId, razorpayOrderId);
  }

  const { data: order } = await admin
    .from('orders')
    .select('id, user_id, payment_status')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();

  if (!order) return { ignored: true as const };
  if (order.payment_status === 'paid') {
    return { id: order.id, already: true as const };
  }

  return confirmPaidOrder(order.user_id, order.id, paymentId, razorpayOrderId);
}

export async function getOrder(userId: string, orderId: string) {
  const { admin, persist } = canPersist(userId);
  if (!admin || !persist) {
    const row = demoStore.get(orderId);
    if (!row || row.user_id !== userId) {
      throw new AppError('NOT_FOUND', 'Order not found.', 404);
    }
    return row;
  }

  const { data, error } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) throw new AppError('NOT_FOUND', 'Order not found.', 404);
  return data;
}

export async function listOrders(userId: string) {
  const { admin, persist } = canPersist(userId);
  if (!admin || !persist) return demoStore.listByUser(userId);

  const { data, error } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError('ORDER_FAILED', error.message, 500);
  return data ?? [];
}
