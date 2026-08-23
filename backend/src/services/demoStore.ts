/** In-memory order store for demo mode (no Supabase). Lost on process restart. */

export type DemoOrderItem = {
  product_id: string | null;
  variant_id: string;
  variant_label: string | null;
  title: string | null;
  quantity: number;
  price_at_purchase: number;
};

export type DemoOrderRow = {
  id: string;
  user_id: string;
  address_id: string;
  address_label: string | null;
  pincode: string | null;
  city: string | null;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  eta_minutes: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  cancel_reason: string | null;
  created_at: string;
  order_items: DemoOrderItem[];
};

const MAX_ORDERS = 500;
const byId = new Map<string, DemoOrderRow>();

export const demoStore = {
  save(order: DemoOrderRow): DemoOrderRow {
    byId.set(order.id, order);
    if (byId.size > MAX_ORDERS) {
      const oldest = byId.keys().next().value;
      if (oldest) byId.delete(oldest);
    }
    return order;
  },

  get(id: string): DemoOrderRow | undefined {
    return byId.get(id);
  },

  listByUser(userId: string): DemoOrderRow[] {
    return [...byId.values()]
      .filter((o) => o.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  findByRazorpayOrderId(razorpayOrderId: string): DemoOrderRow | undefined {
    return [...byId.values()].find((o) => o.razorpay_order_id === razorpayOrderId);
  },

  update(id: string, userId: string, patch: Partial<DemoOrderRow>): DemoOrderRow | null {
    const cur = byId.get(id);
    if (!cur || cur.user_id !== userId) return null;
    const next = { ...cur, ...patch, id: cur.id, user_id: cur.user_id };
    byId.set(id, next);
    return next;
  },
};
