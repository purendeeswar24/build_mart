import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, MapPin, Trash2, ShoppingCart } from 'lucide-react-native';
import { useCart } from '../../hooks/useCart';
import { useAddress } from '../../hooks/useAddress';
import { useAuth } from '../../hooks/useAuth';
import { formatPrice } from '../../utils/formatPrice';
import { colors, radii, spacing, typography } from '../../theme';
import { EmptyState } from '../../components/layout/EmptyState';
import { SafeImage } from '../../components/media/SafeImage';

type Props = {
  onCheckout?: () => void;
  onChangeAddress?: () => void;
  onBrowse?: () => void;
};

export function CartScreen({ onCheckout, onChangeAddress, onBrowse }: Props) {
  const { lines, subtotal, deliveryFee, total, setQuantity, removeItem, getProduct, count } =
    useCart();
  const { selected, deliveryStatus } = useAddress();
  const { requireAuth } = useAuth();

  if (!lines.length) {
    return (
      <View style={[styles.screen, styles.center]}>
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          message="Add materials from Home or Categories to get started."
          actionLabel="Browse materials"
          onAction={onBrowse}
        />
      </View>
    );
  }

  const blocked = deliveryStatus && !deliveryStatus.serviceable;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your cart</Text>

        <Pressable style={styles.address} onPress={onChangeAddress}>
          <MapPin size={16} color={colors.primaryDark} />
          <View style={styles.addressText}>
            <Text style={styles.addressTitle}>
              {selected
                ? `${selected.label} — ${selected.fullAddress}`
                : 'Add a delivery address'}
            </Text>
            <Text
              style={[
                styles.addressSub,
                blocked ? { color: colors.danger } : undefined,
              ]}
            >
              {deliveryStatus?.message ?? 'Select address for ETA'}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.textSecondary} />
        </Pressable>

        <View style={styles.list}>
          {lines.map((line) => {
            const product = getProduct(line.productId);
            if (!product) return null;
            return (
              <View key={`${line.productId}-${line.variantLabel}`} style={styles.row}>
                <SafeImage
                  source={product.image}
                  style={styles.thumb}
                  contentFit="cover"
                  fallbackTint={product.imageTint}
                />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.itemTitle}>{product.title}</Text>
                    <Pressable onPress={() => removeItem(line.productId, line.variantLabel)}>
                      <Trash2 size={14} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <Text style={styles.itemSub}>{line.variantLabel}</Text>
                  <View style={styles.rowFooter}>
                    <View style={styles.stepper}>
                      <Pressable
                        onPress={() =>
                          setQuantity(line.productId, line.variantLabel, line.quantity - 1)
                        }
                        style={styles.stepBtn}
                      >
                        <Text style={styles.stepText}>−</Text>
                      </Pressable>
                      <Text style={styles.qty}>{line.quantity}</Text>
                      <Pressable
                        onPress={() =>
                          setQuantity(line.productId, line.variantLabel, line.quantity + 1)
                        }
                        style={styles.stepBtn}
                      >
                        <Text style={styles.stepText}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.linePrice}>
                      {formatPrice(line.unitPrice * line.quantity)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({count})</Text>
            <Text style={styles.summaryLabel}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text
              style={[
                styles.summaryLabel,
                deliveryFee === 0 ? { color: colors.success } : undefined,
              ]}
            >
              {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
            </Text>
          </View>
          {deliveryFee > 0 ? (
            <Text style={styles.freeHint}>Free delivery above ₹999</Text>
          ) : null}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.total}>Total</Text>
            <Text style={styles.total}>{formatPrice(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {blocked ? (
          <Text style={styles.blockMsg}>
            Checkout blocked — change to a serviceable pincode (e.g. 500032).
          </Text>
        ) : null}
        <Pressable
          style={[styles.checkout, blocked && styles.checkoutDisabled]}
          disabled={!!blocked}
          onPress={() => requireAuth(() => onCheckout?.())}
        >
          <Text style={styles.checkoutText}>Proceed to checkout</Text>
          <Text style={styles.checkoutText}>{formatPrice(total)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center' },
  content: { padding: spacing.lg, paddingBottom: 120 },
  title: { ...typography.subheading, color: colors.text, marginBottom: 8 },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceWarm,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  addressText: { flex: 1 },
  addressTitle: { ...typography.caption, color: colors.text, fontWeight: '600' },
  addressSub: { ...typography.micro, color: colors.textSecondary, marginTop: 1 },
  list: { paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  itemTitle: { ...typography.caption, color: colors.text, flex: 1 },
  itemSub: { ...typography.micro, color: colors.textSecondary, marginTop: 1 },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  stepBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  stepText: { ...typography.caption, color: colors.text },
  qty: { ...typography.caption, paddingHorizontal: 4, color: colors.text },
  linePrice: { fontSize: 13, fontWeight: '700', color: colors.text },
  summary: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    gap: 6,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
  freeHint: { ...typography.micro, color: colors.textMuted },
  totalRow: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  total: { fontSize: 14, fontWeight: '700', color: colors.text },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  blockMsg: {
    ...typography.micro,
    color: colors.danger,
    marginBottom: 8,
    textAlign: 'center',
  },
  checkout: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkoutDisabled: { opacity: 0.45 },
  checkoutText: { fontSize: 14, fontWeight: '700', color: colors.primaryInk },
});
