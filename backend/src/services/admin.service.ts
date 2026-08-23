import { query, queryOne } from '../config/db';
import { listInventory } from './catalog.service';
import { routeFromHub } from './routing.service';

export async function getDashboardStats() {
  const today = await queryOne<{ n: string }>(
    `select count(*)::text as n from orders where created_at::date = current_date`,
  );
  const pendingPack = await queryOne<{ n: string }>(
    `select count(*)::text as n from orders where status = 'confirmed'`,
  );
  const outForDelivery = await queryOne<{ n: string }>(
    `select count(*)::text as n from orders where status = 'out_for_delivery'`,
  );
  const lowStock = await queryOne<{ n: string }>(
    `select count(*)::text as n from product_variants where stock_qty < 10`,
  );
  return {
    ordersToday: Number(today?.n ?? 0),
    pendingPack: Number(pendingPack?.n ?? 0),
    outForDelivery: Number(outForDelivery?.n ?? 0),
    lowStockSkus: Number(lowStock?.n ?? 0),
  };
}

export async function listAllOrders() {
  const orders = await query<Record<string, unknown>>(
    `select * from orders order by created_at desc limit 100`,
  );
  if (!orders.length) return [];
  const items = await query<Record<string, unknown>>(
    `select * from order_items where order_id = any($1::text[])`,
    [orders.map((o) => String(o.id))],
  );
  return Promise.all(
    orders.map(async (order) => {
      const lat = order.latitude != null ? Number(order.latitude) : null;
      const lng = order.longitude != null ? Number(order.longitude) : null;
      let route = null;
      if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        route = await routeFromHub(lat, lng);
      }
      return {
        ...order,
        order_items: items.filter((i) => i.order_id === order.id),
        route,
      };
    }),
  );
}

export async function listAdminProducts() {
  return listInventory();
}
