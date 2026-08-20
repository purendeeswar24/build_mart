import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Circle, CircleCheck, MapPin, Truck } from 'lucide-react-native';
import {
  ordersService,
  type PlacedOrder,
  type OrderStatus,
} from '../../services/orders.service';
import { stockService } from '../../services/stock.service';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatPrice';
import { colors, spacing } from '../../theme';

const STEPS = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
] as const;

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Found better price',
  'Delivery too late',
  'Changed mind',
  'Other',
];

type Props = {
  orderId: string;
  onGoToCart?: () => void;
  onSupport?: () => void;
};

function stepIndex(status: OrderStatus) {
  if (status === 'pending_payment' || status === 'cancelled') return -1;
  const i = STEPS.findIndex((s) => s.key === status);
  return i >= 0 ? i : 0;
}

export function OrderDetailScreen({ orderId, onGoToCart, onSupport }: Props) {
  const { addMany } = useCart();
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const o = await ordersService.getById(orderId);
    setOrder(o);
    setLoading(false);
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const canCancel = order?.status === 'confirmed' || order?.status === 'packed';

  const onCancel = () => {
    if (!order || !canCancel) return;
    Alert.alert('Cancel order', 'Why are you cancelling?', [
      ...CANCEL_REASONS.map((reason) => ({
        text: reason,
        onPress: () => {
          void (async () => {
            const result = await ordersService.cancel(order.id, reason);
            if (result && 'error' in result) {
              Alert.alert('Cannot cancel', result.error);
              return;
            }
            await load();
            Alert.alert('Cancelled', 'Your order has been cancelled.');
          })();
        },
      })),
      { text: 'Keep order', style: 'cancel' },
    ]);
  };

  const onReorder = async () => {
    if (!order) return;
    const skipped: string[] = [];
    const toAdd: { productId: string; variantLabel?: string; qty?: number; unitPrice?: number }[] =
      [];

    for (const item of order.items) {
      const issues = await stockService.validateLines([
        {
          productId: item.productId,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
        },
      ]);
      if (issues.length) {
        skipped.push(
          `${item.title ?? item.productId} (${item.variantLabel}) — ${issues[0].available} left`,
        );
        continue;
      }
      toAdd.push({
        productId: item.productId,
        variantLabel: item.variantLabel,
        qty: item.quantity,
        unitPrice: item.priceAtPurchase,
      });
    }

    if (toAdd.length) addMany(toAdd);

    if (skipped.length && toAdd.length) {
      Alert.alert(
        'Partial reorder',
        `Added ${toAdd.length} item(s).\nSkipped:\n${skipped.join('\n')}`,
        [
          { text: 'OK' },
          { text: 'View cart', onPress: onGoToCart },
        ],
      );
    } else if (skipped.length && !toAdd.length) {
      Alert.alert('Nothing added', `All items unavailable:\n${skipped.join('\n')}`);
    } else {
      Alert.alert('Added to cart', `${toAdd.length} item(s) ready to checkout.`, [
        { text: 'OK' },
        { text: 'View cart', onPress: onGoToCart },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.meta}>Order not found</Text>
        <Pressable style={styles.reorder} onPress={() => void load()}>
          <Text style={styles.reorderText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const activeIdx = stepIndex(order.status);
  const showMap = order.status === 'out_for_delivery' || order.status === 'delivered';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.meta}>
          {order.status === 'cancelled'
            ? `Cancelled${order.cancelReason ? ` · ${order.cancelReason}` : ''}`
            : order.paymentStatus === 'failed'
              ? 'Payment failed'
              : order.status === 'pending_payment'
                ? 'Awaiting payment'
                : `Placed · ${formatPrice(order.total)}`}
        </Text>

        {showMap ? (
          <View style={styles.map}>
            <View style={styles.mapPattern} />
            <View style={styles.pin}>
              <MapPin size={22} color={colors.primaryInk} fill={colors.primary} />
            </View>
            <View style={styles.etaPill}>
              <Truck size={13} color={colors.primary} />
              <Text style={styles.etaText}>
                {order.status === 'delivered'
                  ? 'Delivered'
                  : `Driver en route · ETA ~${order.etaMinutes} min`}
              </Text>
            </View>
            <Text style={styles.mapAddr} numberOfLines={2}>
              {order.addressLabel}, {order.city} {order.pincode}
            </Text>
          </View>
        ) : (
          <View style={styles.map}>
            <View style={styles.mapPattern} />
            <View style={styles.etaPill}>
              <Truck size={13} color={colors.primary} />
              <Text style={styles.etaText}>
                {order.status === 'cancelled'
                  ? 'Order cancelled'
                  : `ETA ~${order.etaMinutes} min · ${order.city}`}
              </Text>
            </View>
          </View>
        )}

        {order.status !== 'cancelled' ? (
          <View style={styles.tracker}>
            {STEPS.map((step, i) => {
              const done = activeIdx >= 0 && i <= activeIdx;
              const lineDone = activeIdx >= 0 && i < activeIdx;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.rail}>
                    {done ? (
                      <CircleCheck size={16} color={colors.primary} />
                    ) : (
                      <Circle size={16} color="#D8D2BE" />
                    )}
                    {i < STEPS.length - 1 ? (
                      <View style={[styles.line, lineDone && styles.lineDone]} />
                    ) : null}
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={[styles.stepLabel, !done && styles.stepMuted]}>{step.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery</Text>
          <Text style={styles.cardBody}>{order.addressLabel}</Text>
          <Text style={styles.cardMuted}>
            {order.city}, {order.pincode}
          </Text>
          <Text style={[styles.cardTitle, { marginTop: 10 }]}>Payment</Text>
          <Text style={styles.cardBody}>
            {order.paymentMethod === 'cod'
              ? 'Cash on delivery'
              : order.paymentMethod === 'upi'
                ? 'UPI (Razorpay)'
                : 'Card / Netbanking'}{' '}
            · {order.paymentStatus}
          </Text>
        </View>

        <View style={styles.items}>
          {order.items.map((item) => (
            <View key={`${item.variantId}-${item.variantLabel}`} style={styles.itemRow}>
              <Text style={styles.itemTitle}>
                {item.title ?? item.productId} · {item.variantLabel}
              </Text>
              <Text style={styles.itemMeta}>
                ×{item.quantity} · {formatPrice(item.priceAtPurchase * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.reorder} onPress={() => void onReorder()}>
          <Text style={styles.reorderText}>Reorder</Text>
        </Pressable>

        {canCancel ? (
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel order</Text>
          </Pressable>
        ) : null}

        {order.status !== 'cancelled' &&
        order.status !== 'delivered' &&
        order.status !== 'pending_payment' ? (
          <Pressable
            style={styles.demo}
            onPress={() => {
              void (async () => {
                await ordersService.advanceStatus(order.id);
                await load();
              })();
            }}
          >
            <Text style={styles.demoText}>Simulate next status (demo)</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.support} onPress={onSupport} accessibilityRole="button">
          <Text style={styles.supportText}>Contact support</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.secondary },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 40 },
  meta: { fontSize: 10, color: '#C4C0CE', marginBottom: 8 },
  map: {
    minHeight: 120,
    backgroundColor: colors.secondaryMuted,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'flex-end',
    padding: 12,
  },
  mapPattern: {
    ...StyleSheet.absoluteFill,
    opacity: 0.2,
    backgroundColor: colors.primary,
  },
  pin: {
    position: 'absolute',
    top: '32%',
    left: '46%',
  },
  etaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 6,
  },
  etaText: { fontSize: 11, fontWeight: '600', color: colors.textInverse },
  mapAddr: { fontSize: 10, color: '#C4C0CE' },
  tracker: { marginBottom: 16 },
  stepRow: { flexDirection: 'row', minHeight: 44 },
  rail: { width: 24, alignItems: 'center' },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#3A3D4A',
    marginVertical: 2,
  },
  lineDone: { backgroundColor: colors.primary },
  stepBody: { flex: 1, paddingLeft: 8, paddingBottom: 12 },
  stepLabel: { fontSize: 13, fontWeight: '600', color: colors.textInverse },
  stepMuted: { color: '#8B889B', fontWeight: '500' },
  card: {
    backgroundColor: colors.secondaryMuted,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3D4A',
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 10, fontWeight: '700', color: '#C4C0CE', marginBottom: 2 },
  cardBody: { fontSize: 12, color: colors.textInverse },
  cardMuted: { fontSize: 11, color: '#C4C0CE', marginTop: 2 },
  items: {
    backgroundColor: colors.secondaryMuted,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3D4A',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  itemRow: { gap: 2 },
  itemTitle: { fontSize: 12, color: colors.textInverse },
  itemMeta: { fontSize: 10, color: '#C4C0CE' },
  reorder: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  reorderText: { fontSize: 13, fontWeight: '700', color: colors.primaryInk },
  cancel: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3A3D4A',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: colors.secondaryMuted,
  },
  cancelText: { fontSize: 12, color: '#E57373', fontWeight: '600' },
  demo: {
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  demoText: { fontSize: 11, color: '#C4C0CE' },
  support: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
  },
  supportText: { fontSize: 12, color: colors.textInverse, fontWeight: '600' },
});
