import AsyncStorage from '@react-native-async-storage/async-storage';
import { stockService } from './stock.service';
import { apiClient, getAccessToken } from './apiClient';
import { isApiConfigured } from '../config/runtime';

const ORDERS_KEY = '@buildmart/orders';

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'upi' | 'card' | 'cod';

export type PlacedOrderItem = {
  productId: string;
  variantId: string;
  variantLabel: string;
  quantity: number;
  priceAtPurchase: number;
  title?: string;
};

export type PlacedOrder = {
  id: string;
  userId: string;
  addressId: string;
  addressLabel: string;
  pincode: string;
  city: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  total: number;
  etaMinutes: number;
  latitude?: number;
  longitude?: number;
  items: PlacedOrderItem[];
  createdAt: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  cancelReason?: string;
};

export type PlaceOrderInput = {
  userId: string;
  addressId: string;
  addressLabel: string;
  pincode: string;
  city: string;
  etaMinutes: number;
  latitude?: number;
  longitude?: number;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: {
    productId: string;
    variantId?: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
    title?: string;
  }[];
};

function nextOrderId() {
  return `BM${Math.floor(48000 + Math.random() * 9000)}`;
}

async function readAll(): Promise<PlacedOrder[]> {
  const raw = await AsyncStorage.getItem(ORDERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as PlacedOrder[];
}

async function writeAll(orders: PlacedOrder[]) {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function shouldUseApi(_userId?: string) {
  return isApiConfigured();
}

function mapApiOrder(row: Record<string, unknown>): PlacedOrder {
  const items = ((row.order_items as Array<Record<string, unknown>>) ?? []).map((i) => ({
    productId: String(i.product_id ?? ''),
    variantId: String(i.variant_id ?? ''),
    variantLabel: String(i.variant_label ?? ''),
    quantity: Number(i.quantity ?? 0),
    priceAtPurchase: Number(i.price_at_purchase ?? 0),
    title: i.title ? String(i.title) : undefined,
  }));
  return {
    id: String(row.id),
    userId: String(row.user_id),
    addressId: String(row.address_id),
    addressLabel: String(row.address_label ?? ''),
    pincode: String(row.pincode ?? ''),
    city: String(row.city ?? ''),
    status: row.status as OrderStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    paymentMethod: row.payment_method as PaymentMethod,
    subtotal: Number(row.subtotal ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    total: Number(row.total ?? 0),
    etaMinutes: Number(row.eta_minutes ?? 30),
    items,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    razorpayOrderId: row.razorpay_order_id ? String(row.razorpay_order_id) : undefined,
    razorpayPaymentId: row.razorpay_payment_id ? String(row.razorpay_payment_id) : undefined,
    cancelReason: row.cancel_reason ? String(row.cancel_reason) : undefined,
  };
}

export const ordersService = {
  async list(userId?: string): Promise<PlacedOrder[]> {
    const all = await readAll();
    const localFiltered = userId ? all.filter((o) => o.userId === userId) : all;

    if (userId && (await hasApiSession())) {
      try {
        const res = await apiClient.get<{ orders: Record<string, unknown>[] }>('/api/v1/orders');
        const remote = (res.orders ?? []).map(mapApiOrder);
        const byId = new Map(localFiltered.map((o) => [o.id, o]));
        for (const o of remote) byId.set(o.id, o);
        const merged = [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        const others = all.filter((o) => o.userId !== userId);
        await writeAll([...others, ...merged]);
        return merged;
      } catch {
        /* fall through to local cache */
      }
    }

    return localFiltered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async getById(orderId: string): Promise<PlacedOrder | null> {
    if (shouldUseApi() && (await getAccessToken())) {
      try {
        const res = await apiClient.get<{ order: Record<string, unknown> }>(
          `/api/v1/orders/${orderId}`,
        );
        if (res.order) {
          const mapped = mapApiOrder(res.order);
          const all = await readAll();
          const idx = all.findIndex((o) => o.id === orderId);
          if (idx >= 0) all[idx] = mapped;
          else all.unshift(mapped);
          await writeAll(all);
          return mapped;
        }
      } catch {
        /* fall through to local */
      }
    }
    const all = await readAll();
    const local = all.find((o) => o.id === orderId);
    if (local) return local;
    if (await hasApiSession()) {
      try {
        const res = await apiClient.get<{ order: Record<string, unknown> }>(`/api/v1/orders/${orderId}`);
        if (res.order) {
          const mapped = mapApiOrder(res.order);
          all.unshift(mapped);
          await writeAll(all);
          return mapped;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  },

  async validateStock(input: PlaceOrderInput) {
    return stockService.validateLines(
      input.items.map((i) => ({
        productId: i.productId,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
      })),
    );
  },

  async place(input: PlaceOrderInput): Promise<
    | { ok: true; order: PlacedOrder }
    | { ok: false; reason: 'stock'; issues: Awaited<ReturnType<typeof stockService.validateLines>> }
  > {
    const lines = input.items.map((i) => ({
      productId: i.productId,
      variantLabel: i.variantLabel,
      quantity: i.quantity,
    }));

    const isCod = input.paymentMethod === 'cod';

    const items: PlacedOrderItem[] = input.items.map((i) => {
      const v = stockService.findVariant(i.productId, i.variantLabel);
      return {
        productId: i.productId,
        variantId: i.variantId || v?.id || i.productId,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
        priceAtPurchase: i.unitPrice,
        title: i.title,
      };
    });

    if (await hasApiSession()) {
      try {
        const res = await apiClient.post<{
          order: {
            id: string;
            status: OrderStatus;
            payment_status: PaymentStatus;
            razorpay_order_id: string | null;
            total: number;
          };
        }>('/api/v1/orders', {
          userId: input.userId,
          addressId: input.addressId,
          addressLabel: input.addressLabel,
          pincode: input.pincode,
          city: input.city,
          etaMinutes: input.etaMinutes,
          latitude: input.latitude,
          longitude: input.longitude,
          paymentMethod: input.paymentMethod,
          subtotal: input.subtotal,
          deliveryFee: input.deliveryFee,
          total: input.total,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            variantLabel: i.variantLabel,
            title: i.title,
            quantity: i.quantity,
            priceAtPurchase: i.priceAtPurchase,
          })),
        });

        const order: PlacedOrder = {
          id: res.order.id,
          userId: input.userId,
          addressId: input.addressId,
          addressLabel: input.addressLabel,
          pincode: input.pincode,
          city: input.city,
          status: res.order.status,
          paymentStatus: res.order.payment_status,
          paymentMethod: input.paymentMethod,
          subtotal: input.subtotal,
          deliveryFee: input.deliveryFee,
          total: res.order.total,
          etaMinutes: input.etaMinutes,
          latitude: input.latitude,
          longitude: input.longitude,
          items,
          createdAt: new Date().toISOString(),
          razorpayOrderId: res.order.razorpay_order_id ?? undefined,
        };
        const all = await readAll();
        all.unshift(order);
        await writeAll(all);
        return { ok: true, order };
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.toLowerCase().includes('stock')) {
          const issues = await stockService.validateLines(lines);
          return { ok: false, reason: 'stock', issues };
        }
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
          throw e;
        }
        /* network / server down — store on device */
      }
    }

    if (isCod) {
      const dec = await stockService.decrementLines(lines);
      if (!dec.ok) return { ok: false, reason: 'stock', issues: dec.issues };
    } else {
      const issues = await stockService.validateLines(lines);
      if (issues.length) return { ok: false, reason: 'stock', issues };
    }

    const order: PlacedOrder = {
      id: nextOrderId(),
      userId: input.userId,
      addressId: input.addressId,
      addressLabel: input.addressLabel,
      pincode: input.pincode,
      city: input.city,
      status: isCod ? 'confirmed' : 'pending_payment',
      paymentStatus: 'pending',
      paymentMethod: input.paymentMethod,
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      total: input.total,
      etaMinutes: input.etaMinutes,
      items,
      createdAt: new Date().toISOString(),
      razorpayOrderId: isCod ? undefined : `order_demo_${Date.now()}`,
    };

    const all = await readAll();
    all.unshift(order);
    await writeAll(all);
    return { ok: true, order };
  },

  async confirmPaid(
    orderId: string,
    paymentId: string,
    opts?: { razorpayOrderId?: string; signature?: string },
  ): Promise<
    PlacedOrder | null | { error: 'stock'; issues: Awaited<ReturnType<typeof stockService.validateLines>> }
  > {
    if (await hasApiSession()) {
      try {
        const res = await apiClient.post<{
          order: {
            id: string;
            status: OrderStatus;
            payment_status: PaymentStatus;
            razorpay_payment_id?: string;
          };
        }>(`/api/v1/orders/${orderId}/confirm-payment`, {
          paymentId,
          razorpayOrderId: opts?.razorpayOrderId,
          signature: opts?.signature,
        });
        const all = await readAll();
        const idx = all.findIndex((o) => o.id === orderId);
        if (idx >= 0) {
          all[idx] = {
            ...all[idx],
            status: res.order.status,
            paymentStatus: res.order.payment_status,
            razorpayPaymentId: res.order.razorpay_payment_id ?? paymentId,
          };
          await writeAll(all);
          return all[idx];
        }
        return this.getById(orderId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.toLowerCase().includes('stock')) {
          return { error: 'stock', issues: [] };
        }
      }
    }

    const all = await readAll();
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx < 0) return null;

    const order = all[idx];
    if (order.paymentStatus === 'paid' && order.status === 'confirmed') {
      return order;
    }

    const dec = await stockService.decrementLines(
      order.items.map((i) => ({
        productId: i.productId,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
      })),
    );
    if (!dec.ok) return { error: 'stock', issues: dec.issues };

    all[idx] = {
      ...order,
      status: 'confirmed',
      paymentStatus: 'paid',
      razorpayPaymentId: paymentId,
    };
    await writeAll(all);
    return all[idx];
  },

  async markPaymentFailed(orderId: string): Promise<PlacedOrder | null> {
    const all = await readAll();
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx < 0) return null;
    all[idx] = {
      ...all[idx],
      status: 'pending_payment',
      paymentStatus: 'failed',
    };
    await writeAll(all);
    return all[idx];
  },

  async retryPayment(orderId: string): Promise<PlacedOrder | null> {
    const all = await readAll();
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx < 0) return null;
    all[idx] = {
      ...all[idx],
      paymentStatus: 'pending',
      razorpayOrderId: `order_demo_${Date.now()}`,
    };
    await writeAll(all);
    return all[idx];
  },

  async cancel(
    orderId: string,
    reason: string,
  ): Promise<PlacedOrder | null | { error: string }> {
    const all = await readAll();
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx < 0) return null;
    const order = all[idx];
    if (order.status !== 'confirmed' && order.status !== 'packed') {
      return { error: 'Only confirmed or packed orders can be cancelled.' };
    }

    const stockTaken =
      order.status === 'confirmed' ||
      order.status === 'packed' ||
      order.paymentStatus === 'paid';
    if (stockTaken) {
      await stockService.incrementLines(
        order.items.map((i) => ({
          productId: i.productId,
          variantLabel: i.variantLabel,
          quantity: i.quantity,
        })),
      );
    }

    all[idx] = {
      ...order,
      status: 'cancelled',
      cancelReason: reason,
    };
    await writeAll(all);
    return all[idx];
  },

  async advanceStatus(orderId: string): Promise<PlacedOrder | null> {
    const flow: OrderStatus[] = ['confirmed', 'packed', 'out_for_delivery', 'delivered'];
    const all = await readAll();
    const idx = all.findIndex((o) => o.id === orderId);
    if (idx < 0) return null;
    const order = all[idx];
    const i = flow.indexOf(order.status as (typeof flow)[number]);
    if (i < 0 || i >= flow.length - 1) return order;
    all[idx] = { ...order, status: flow[i + 1] };
    await writeAll(all);
    return all[idx];
  },
};
