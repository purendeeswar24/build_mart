import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Package } from 'lucide-react-native';
import { productsService } from '../../services/products.service';
import { ordersService, type PlacedOrder, type OrderStatus } from '../../services/orders.service';
import { formatPrice } from '../../utils/formatPrice';
import { colors, radii, spacing, typography } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { EmptyState } from '../../components/layout/EmptyState';
import { ListRowSkeleton } from '../../components/layout/Skeleton';
import { SafeImage } from '../../components/media/SafeImage';

const CATALOG = productsService.listSeedCards();

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  pending_payment: 'Pending payment',
  confirmed: 'Confirmed',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type Props = {
  onOpenOrder?: (orderId: string) => void;
  onLoginPress?: () => void;
  onBrowse?: () => void;
};

export function OrderListScreen({ onOpenOrder, onLoginPress, onBrowse }: Props) {
  const { isAuthenticated, requireAuth, openLoginModal, user } = useAuth();
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setOrders([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await ordersService.list(user?.id);
      setOrders(list);
    } catch {
      setError('Could not load orders. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon={Package}
          title="Orders"
          message="Log in to track deliveries and reorder past purchases."
          actionLabel="Log in"
          onAction={() => {
            openLoginModal();
            onLoginPress?.();
          }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ListRowSkeleton rows={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon={Package}
          title="Couldn’t load orders"
          message={error}
          actionLabel="Retry"
          onAction={() => void load()}
        />
      </View>
    );
  }

  if (!orders.length) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon={Package}
          title="No orders yet"
          message="Browse materials, add to cart, and checkout — orders appear here."
          actionLabel="Browse materials"
          onAction={onBrowse}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const thumbs = item.items
            .map((i) => CATALOG.find((p) => p.id === i.productId))
            .filter(Boolean);
          return (
            <Pressable
              style={styles.card}
              onPress={() => {
                if (!requireAuth()) return;
                onOpenOrder?.(item.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Order ${item.id}, ${STATUS_LABEL[item.status] ?? item.status}`}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.orderId}>Order #{item.id}</Text>
                  <Text style={styles.meta}>{formatWhen(item.createdAt)}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>
              <View style={styles.thumbs}>
                {thumbs.map((p) =>
                  p ? (
                    <SafeImage
                      key={p.id}
                      source={p.image}
                      style={styles.thumb}
                      contentFit="cover"
                      fallbackTint={p.imageTint}
                    />
                  ) : null,
                )}
              </View>
              <Text style={styles.total}>{formatPrice(item.total)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  orderId: { fontSize: 13, fontWeight: '600', color: colors.text },
  meta: { ...typography.micro, color: colors.textSecondary, marginTop: 2 },
  badge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, color: colors.primaryInk, fontWeight: '600' },
  thumbs: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surfaceMuted },
  total: { fontSize: 13, fontWeight: '700', color: colors.text },
});
