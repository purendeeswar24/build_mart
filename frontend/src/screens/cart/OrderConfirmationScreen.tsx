import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Package } from 'lucide-react-native';
import { ordersService, type PlacedOrder } from '../../services/orders.service';
import { formatPrice } from '../../utils/formatPrice';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  orderId: string;
  onTrack?: () => void;
  onContinue?: () => void;
};

export function OrderConfirmationScreen({ orderId, onTrack, onContinue }: Props) {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const o = await ordersService.getById(orderId);
      if (!alive) return;
      setOrder(o);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [orderId]);

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
        <Text style={styles.missing}>Order not found</Text>
        <Pressable style={styles.secondaryBtn} onPress={onContinue}>
          <Text style={styles.secondaryText}>Continue shopping</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <CheckCircle2 size={48} color={colors.success} />
        <Text style={styles.title}>Order confirmed</Text>
        <Text style={styles.sub}>#{order.id}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Package size={16} color={colors.primaryDark} />
          <Text style={styles.cardLabel}>
            ETA · ~{order.etaMinutes} min to {order.city}
          </Text>
        </View>
        <Text style={styles.addr}>{order.addressLabel}</Text>
        <Text style={styles.meta}>
          {order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Paid online'} ·{' '}
          {formatPrice(order.total)}
        </Text>
        <Text style={styles.items}>
          {order.items.map((i) => `${i.title ?? i.productId} ×${i.quantity}`).join(' · ')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={onTrack}>
          <Text style={styles.primaryText}>Track order</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onContinue}>
          <Text style={styles.secondaryText}>Continue shopping</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', marginTop: 32, marginBottom: 24, gap: 8 },
  title: { ...typography.heading, color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  addr: { fontSize: 12, color: colors.textSecondary },
  meta: { fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 4 },
  items: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  actions: { marginTop: 28, gap: 10 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { fontSize: 14, fontWeight: '700', color: colors.primaryInk },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: { fontSize: 14, fontWeight: '600', color: colors.text },
  missing: { ...typography.subheading, color: colors.text, marginBottom: 16 },
});
