import { tryGetSupabaseAdmin } from '../config/supabase';
import { createRazorpayOrder, getRazorpayConfig } from '../config/razorpay';
import { AppError } from '../middleware/errorHandler.middleware';

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

function nextOrderId() {
  return `BM${Math.floor(48000 + Math.random() * 9000)}`;
}

export async function placeOrder(userId: string, body: PlaceOrderBody) {
  if (body.userId !== userId) {
    throw new AppError('FORBIDDEN', 'Order user does not match session.', 403);
  }
  if (!body.items.length) {
    throw new AppError('BAD_REQUEST', 'Cart is empty.', 400);
  }

  const isCod = body.paymentMethod === 'cod';
  const orderId = nextOrderId();
  const admin = tryGetSupabaseAdmin();

  let razorpayOrderId: string | null = null;
  if (!isCod) {
    const rp = await createRazorpayOrder({
      amountPaise: Math.round(body.total * 100),
      receipt: orderId,
    });
    razorpayOrderId = rp.id;
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

  if (admin) {
    if (isCod) {
      const ok = await admin.rpc('decrement_stock', {
        p_items: body.items.map((i) => ({
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
      });
      if (ok.error || ok.data === false) {
        throw new AppError('OUT_OF_STOCK', 'Some items are out of stock.', 409);
      }
    }

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
    if (itemsErr) throw new AppError('ORDER_FAILED', itemsErr.message, 500);
  }

  return {
    id: orderId,
    status: orderRow.status,
    payment_status: orderRow.payment_status,
    razorpay_order_id: razorpayOrderId,
    total: body.total,
    demo: getRazorpayConfig().demo || !admin,
    keyId: getRazorpayConfig().keyId,
    persisted: !!admin,
  };
}

export async function confirmPaidOrder(
  userId: string,
  orderId: string,
  paymentId: string,
  razorpayOrderId?: string,
) {
  const admin = tryGetSupabaseAdmin();
  if (!admin) {
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

  const items = (order.order_items ?? []) as Array<{ variant_id: string; quantity: number }>;
  const stock = await admin.rpc('decrement_stock', {
    p_items: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
  });
  if (stock.error || stock.data === false) {
    throw new AppError('OUT_OF_STOCK', 'Could not reserve stock for this payment.', 409);
  }

  const { error: updErr } = await admin
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      razorpay_payment_id: paymentId,
    })
    .eq('id', orderId)
    .eq('user_id', userId);

  if (updErr) throw new AppError('ORDER_FAILED', updErr.message, 500);

  return {
    id: orderId,
    status: 'confirmed',
    payment_status: 'paid',
    razorpay_payment_id: paymentId,
  };
}

export async function listOrders(userId: string) {
  const admin = tryGetSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError('ORDER_FAILED', error.message, 500);
  return data ?? [];
}
