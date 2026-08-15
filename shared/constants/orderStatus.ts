import type { OrderStatus } from '../types/order.types';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'packed',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
