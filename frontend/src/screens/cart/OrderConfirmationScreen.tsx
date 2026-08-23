import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Circle, CircleCheck, Clock3, MapPin, Truck } from 'lucide-react-native';
import { ordersService, type PlacedOrder } from '../../services/orders.service';
import { formatPrice } from '../../utils/formatPrice';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  orderId: string;
  onTrack?: () => void;
  onContinue?: () => void;
};

const STEPS = ['Confirmed', 'Packed', 'On the way', 'Delivered'] as const;

function formatCountdown(totalSec: number) {
  const safe = Math.max(0, totalSec);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function OrderConfirmationScreen({ orderId, onTrack, onContinue }: Props) {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const o = await ordersService.getById(orderId);
      if (!alive) return;
      setOrder(o);
      if (o) setRemaining(Math.max(1, o.etaMinutes) * 60);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    const timer = setInterval(() => {
      setRemaining((n) => (n > 0 ? n - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [order]);

  const etaLabel = useMemo(() => {
    if (remaining <= 0) return 'Arriving shortly';
    const mins = Math.max(1, Math.ceil(remaining / 60));
    return `Arriving in ${mins} min`;
  }, [remaining]);

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
        <Text style={styles.missing}>Order #{orderId} was placed</Text>
        <Text style={styles.addr}>Open Orders to see timing and tracking.</Text>
        <Pressable style={styles.primaryBtn} onPress={onTrack}>
          <Text style={styles.primaryText}>View order timing</Text>
        </Pressable>
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
        <Text style={styles.title}>Order placed</Text>
        <Text style={styles.sub}>#{order.id}</Text>
      </View>

      <View style={styles.etaCard}>
        <View style={styles.etaTop}>
          <Clock3 size={18} color={colors.primaryInk} />
          <Text style={styles.etaTitle}>{etaLabel}</Text>
        </View>
        <Text style={styles.clock}>{formatCountdown(remaining)}</Text>
        <Text style={styles.etaHint}>
          Typical delivery · ~{order.etaMinutes} min to {order.city || 'your address'}
        </Text>
        <View style={styles.steps}>
          {STEPS.map((label, i) => (
            <View key={label} style={styles.step}>
              {i === 0 ? (
                <CircleCheck size={16} color={colors.primary} />
              ) : (
                <Circle size={16} color="#D8D2BE" />
              )}
              <Text style={[styles.stepText, i === 0 && styles.stepOn]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Truck size={16} color={colors.primaryDark} />
          <Text style={styles.cardLabel}>Delivery details</Text>
        </View>
        <View style={styles.row}>
          <MapPin size={14} color={colors.textSecondary} />
          <Text style={styles.addr}>
            {order.addressLabel}
            {order.city ? ` · ${order.city}` : ''} {order.pincode}
          </Text>
        </View>
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
          <Text style={styles.primaryText}>Track live timing</Text>
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
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  hero: { alignItems: 'center', marginTop: 20, marginBottom: 20, gap: 8 },
  title: { ...typography.heading, color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary },
  etaCard: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 14,
  },
  etaTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  etaTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryInk },
  clock: {
    marginTop: 8,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.primaryInk,
  },
  etaHint: { marginTop: 4, fontSize: 12, color: colors.primaryInk, opacity: 0.8 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  step: { alignItems: 'center', gap: 4, flex: 1 },
  stepText: { fontSize: 9, color: colors.primaryInk, opacity: 0.6, textAlign: 'center' },
  stepOn: { opacity: 1, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  addr: { flex: 1, fontSize: 12, color: colors.textSecondary },
  meta: { fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 4 },
  items: { fontSize: 11, color: colors.textSecondary },
  actions: { marginTop: 24, gap: 10 },
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
  missing: { ...typography.subheading, color: colors.text, textAlign: 'center' },
});
