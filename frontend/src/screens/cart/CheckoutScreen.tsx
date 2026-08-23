import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import {
  ChevronDown,
  Circle,
  CircleCheck,
  CreditCard,
  MapPin,
  QrCode,
  Banknote,
  Crosshair,
} from 'lucide-react-native';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useAddress } from '../../hooks/useAddress';
import { isCodEligible } from '../../services/address.service';
import { ordersService, type PaymentMethod } from '../../services/orders.service';
import { paymentsService } from '../../services/payments.service';
import { ApiError } from '../../services/apiClient';
import { LocationPermissionError, locationService } from '../../services/location.service';
import { LocationPermissionCard } from '../../components/location/LocationPermissionCard';
import { MapPinPicker } from '../../components/location/MapPinPicker';
import { analytics } from '../../services/analytics.service';
import { formatPrice } from '../../utils/formatPrice';
import { colors, spacing } from '../../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  onConfirmed?: (orderId: string) => void;
  onChangeAddress?: () => void;
};

export function CheckoutScreen({ onConfirmed, onChangeAddress }: Props) {
  const { subtotal, deliveryFee, total, count, clear, lines, getProduct } = useCart();
  const { requireAuth, isAuthenticated, user, signOut } = useAuth();
  const { selected, deliveryStatus, upsertAddress } = useAddress();
  const [locateNote, setLocateNote] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [itemsOpen, setItemsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [liveLoc, setLiveLoc] = useState<{
    latitude: number;
    longitude: number;
    label: string;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [askLocation, setAskLocation] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);

  const requestLiveLocation = useCallback(async () => {
    setLocating(true);
    setLocateNote('Allow location in the popup…');
    setAskLocation(true);
    setLocationBlocked(false);
    try {
      const loc = await locationService.detectUserLocation();
      setLiveLoc({
        latitude: loc.latitude,
        longitude: loc.longitude,
        label: loc.label,
      });
      await upsertAddress({
        id: selected?.id,
        label: selected?.label ?? 'Site',
        fullAddress: loc.label,
        pincode: loc.suggestedPincode ?? selected?.pincode ?? '500032',
        city: loc.city ?? selected?.city ?? 'Hyderabad',
        latitude: loc.latitude,
        longitude: loc.longitude,
        isDefault: selected?.isDefault ?? true,
      });
      setAskLocation(false);
      setLocationBlocked(false);
      setLocateNote(locationService.describeLocation(loc));
    } catch (e) {
      const denied =
        e instanceof LocationPermissionError &&
        (e.status === 'denied' || e.status === 'unavailable');
      setLocationBlocked(denied);
      setAskLocation(true);
      setLocateNote(e instanceof Error ? e.message : 'Could not get live location');
    } finally {
      setLocating(false);
    }
  }, [selected, upsertAddress]);

  const mapPin =
    liveLoc ??
    (selected?.latitude != null && selected.longitude != null
      ? {
          latitude: selected.latitude,
          longitude: selected.longitude,
          label: selected.fullAddress,
        }
      : null);

  const codOk = selected ? isCodEligible(selected.pincode) : false;

  const lineRows = useMemo(
    () =>
      lines.map((l) => {
        const p = getProduct(l.productId);
        return {
          ...l,
          title: p?.title ?? l.productId,
        };
      }),
    [lines, getProduct],
  );

  const placeOrder = () => {
    const go = async () => {
      if (!lines.length) {
        Alert.alert('Cart empty', 'Add items before placing an order.');
        return;
      }
      if (!selected) {
        Alert.alert('Address needed', 'Add a delivery address first.');
        return;
      }
      if (!deliveryStatus?.serviceable) {
        Alert.alert(
          'Not deliverable',
          'Selected address is outside our service area. Choose another pincode.',
        );
        return;
      }
      if (method === 'cod' && !codOk) {
        Alert.alert(
          'COD unavailable',
          'Cash on delivery is not available for this pincode. Choose UPI or Card.',
        );
        return;
      }

      setBusy(true);
      try {
        const input = {
          userId: user?.id ?? 'guest',
          addressId: selected.id,
          addressLabel: `${selected.label} — ${selected.fullAddress}`,
          pincode: selected.pincode,
          city: selected.city,
          etaMinutes: deliveryStatus.etaMinutes,
          latitude: liveLoc?.latitude ?? selected.latitude,
          longitude: liveLoc?.longitude ?? selected.longitude,
          paymentMethod: method,
          subtotal,
          deliveryFee,
          total,
          items: lineRows.map((l) => {
            const product = getProduct(l.productId);
            return {
              productId: l.productId,
              variantId: product?.defaultVariantId,
              variantLabel: l.variantLabel || product?.defaultVariantLabel || 'Standard',
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              title: l.title,
            };
          }),
        };

        const placed = await ordersService.place(input);
        if (!placed.ok) {
          Alert.alert(
            'Stock changed',
            placed.issues
              .map(
                (i) =>
                  `${i.variantLabel}: need ${i.requested}, only ${i.available} left`,
              )
              .join('\n'),
          );
          return;
        }

        const order = placed.order;

        if (method === 'cod') {
          clear();
          setPendingOrderId(null);
          analytics.purchase(order.id, order.total, 'cod');
          onConfirmed?.(order.id);
          return;
        }

        setPendingOrderId(order.id);
        const session = await paymentsService.createSession({
          orderId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          amountRupees: order.total,
        });

        const result = await paymentsService.openCheckout(session);
        if (result.status === 'success') {
          const verified = await paymentsService.verifyOnServer({
            razorpayOrderId: session.razorpayOrderId,
            paymentId: result.paymentId,
            signature: result.signature,
          });
          if (!verified) {
            await ordersService.markPaymentFailed(order.id);
            Alert.alert('Payment error', 'Could not verify payment signature.');
            return;
          }
          const confirmed = await ordersService.confirmPaid(order.id, result.paymentId, {
            razorpayOrderId: session.razorpayOrderId,
            signature: result.signature,
          });
          if (confirmed && 'error' in confirmed) {
            await ordersService.markPaymentFailed(order.id);
            Alert.alert(
              'Stock changed',
              confirmed.issues
                .map((i) => `${i.variantLabel}: need ${i.requested}, only ${i.available} left`)
                .join('\n') || 'Could not reserve stock.',
            );
            return;
          }
          clear();
          setPendingOrderId(null);
          analytics.purchase(order.id, order.total, method);
          onConfirmed?.(order.id);
          return;
        }

        if (result.status === 'failed') {
          await ordersService.markPaymentFailed(order.id);
          Alert.alert('Payment failed', `${result.reason}\nYou can retry from this screen.`, [
            { text: 'OK' },
          ]);
          return;
        }

        // cancelled — leave pending_payment; stock already reserved (demo)
        await ordersService.markPaymentFailed(order.id);
        Alert.alert(
          'Payment cancelled',
          'Order is pending payment. Tap Place order again to retry, or switch to COD if eligible.',
        );
      } catch (err) {
        const unauthorized = err instanceof ApiError && err.status === 401;
        if (unauthorized) {
          await signOut();
          requireAuth(() => void go());
          return;
        }
        Alert.alert(
          'Could not place order',
          err instanceof Error ? err.message : 'Please try again.',
        );
      } finally {
        setBusy(false);
      }
    };

    if (!isAuthenticated) requireAuth(() => void go());
    else void go();
  };

  const retryPending = async () => {
    if (!pendingOrderId) return;
    setBusy(true);
    try {
      const refreshed = await ordersService.retryPayment(pendingOrderId);
      if (!refreshed?.razorpayOrderId) return;
      const session = await paymentsService.createSession({
        orderId: refreshed.id,
        razorpayOrderId: refreshed.razorpayOrderId,
        amountRupees: refreshed.total,
      });
      const result = await paymentsService.openCheckout(session);
      if (result.status === 'success') {
        const verified = await paymentsService.verifyOnServer({
          razorpayOrderId: session.razorpayOrderId,
          paymentId: result.paymentId,
          signature: result.signature,
        });
        if (!verified) {
          await ordersService.markPaymentFailed(refreshed.id);
          Alert.alert('Payment error', 'Could not verify payment signature.');
          return;
        }
        const confirmed = await ordersService.confirmPaid(refreshed.id, result.paymentId, {
          razorpayOrderId: session.razorpayOrderId,
          signature: result.signature,
        });
        if (confirmed && 'error' in confirmed) {
          await ordersService.markPaymentFailed(refreshed.id);
          Alert.alert('Stock changed', 'Could not reserve items after payment.');
          return;
        }
        clear();
        setPendingOrderId(null);
        onConfirmed?.(refreshed.id);
      } else if (result.status === 'failed') {
        await ordersService.markPaymentFailed(refreshed.id);
        Alert.alert('Payment failed', result.reason);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Delivering to</Text>
        <Pressable style={styles.card} onPress={onChangeAddress}>
          <View style={styles.addrRow}>
            <MapPin size={15} color={colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addrTitle}>
                {selected
                  ? `${selected.label} — ${selected.fullAddress}`
                  : 'Select delivery address'}
              </Text>
              <Text style={styles.addrSub}>
                {selected
                  ? `${selected.city}, ${selected.pincode}`
                  : 'Required for checkout'}
              </Text>
              {deliveryStatus ? (
                <Text
                  style={[
                    styles.eta,
                    deliveryStatus.serviceable ? styles.ok : styles.bad,
                  ]}
                >
                  {deliveryStatus.message}
                </Text>
              ) : null}
            </View>
            <Text style={styles.change}>Change</Text>
          </View>
        </Pressable>
        <Pressable
          style={styles.liveBtn}
          disabled={locating}
          onPress={() => void requestLiveLocation()}
        >
          <Crosshair size={14} color={colors.primaryInk} />
          <Text style={styles.liveText}>
            {locating
              ? 'Waiting for permission…'
              : liveLoc
                ? `Live pin: ${liveLoc.label}`
                : 'Use current location'}
          </Text>
        </Pressable>
        <LocationPermissionCard
          visible={askLocation}
          waiting={locating}
          blocked={locationBlocked}
          onRetry={() => void requestLiveLocation()}
        />
        {locateNote && !askLocation ? <Text style={styles.addrSub}>{locateNote}</Text> : null}
        {mapPin ? (
          <MapPinPicker
            latitude={mapPin.latitude}
            longitude={mapPin.longitude}
            onChange={(latitude, longitude) => {
              void (async () => {
                const loc = await locationService.reverseGeocode(latitude, longitude);
                setLiveLoc({ latitude, longitude, label: loc.label });
                await upsertAddress({
                  id: selected?.id,
                  label: selected?.label ?? 'Site',
                  fullAddress: loc.label,
                  pincode: loc.suggestedPincode ?? selected?.pincode ?? '500032',
                  city: loc.city ?? selected?.city ?? 'Hyderabad',
                  latitude,
                  longitude,
                  isDefault: selected?.isDefault ?? true,
                });
                setLocateNote(locationService.describeLocation(loc));
              })();
            }}
          />
        ) : null}

        <Pressable
          style={styles.itemsToggle}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setItemsOpen((o) => !o);
          }}
        >
          <Text style={styles.itemsToggleText}>
            Order items ({count})
          </Text>
          <ChevronDown
            size={16}
            color={colors.textSecondary}
            style={{ transform: [{ rotate: itemsOpen ? '180deg' : '0deg' }] }}
          />
        </Pressable>
        {itemsOpen
          ? lineRows.map((l) => (
              <View key={`${l.productId}-${l.variantLabel}`} style={styles.itemRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {l.title} · {l.variantLabel}
                </Text>
                <Text style={styles.itemMeta}>
                  ×{l.quantity} · {formatPrice(l.unitPrice * l.quantity)}
                </Text>
              </View>
            ))
          : null}

        <Text style={styles.section}>Payment method</Text>
        <PayRow
          active={method === 'upi'}
          label="UPI (Razorpay)"
          icon={<QrCode size={16} color={method === 'upi' ? colors.textInverse : '#4A4636'} />}
          onPress={() => setMethod('upi')}
          dark
        />
        <PayRow
          active={method === 'card'}
          label="Card / Netbanking (Razorpay)"
          icon={<CreditCard size={16} color="#4A4636" />}
          onPress={() => setMethod('card')}
        />
        <PayRow
          active={method === 'cod'}
          label={codOk ? 'Cash on delivery' : 'COD (not available here)'}
          icon={<Banknote size={16} color="#4A4636" />}
          onPress={() => {
            if (!codOk) {
              Alert.alert('COD unavailable', 'Try a COD-eligible pincode (e.g. 500032).');
              return;
            }
            setMethod('cod');
          }}
          disabled={!codOk}
        />

        {pendingOrderId ? (
          <Pressable style={styles.retry} onPress={() => void retryPending()}>
            <Text style={styles.retryText}>Retry payment for #{pendingOrderId}</Text>
          </Pressable>
        ) : null}

        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>{count} items</Text>
            <Text style={styles.sumLabel}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Delivery</Text>
            <Text style={[styles.sumLabel, deliveryFee === 0 ? { color: colors.success } : null]}>
              {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
            </Text>
          </View>
          <View style={[styles.sumRow, styles.totalRow]}>
            <Text style={styles.total}>Total</Text>
            <Text style={styles.total}>{formatPrice(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.place, busy && { opacity: 0.7 }]}
          onPress={placeOrder}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryInk} />
          ) : (
            <Text style={styles.placeText}>Place order · {formatPrice(total)}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function PayRow({
  active,
  label,
  icon,
  onPress,
  dark,
  disabled,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  dark?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.payRow,
        active && dark ? styles.payDark : styles.payLight,
        active && !dark && styles.payActiveLight,
        disabled && { opacity: 0.45 },
      ]}
    >
      {active ? (
        <CircleCheck size={16} color={colors.primary} />
      ) : (
        <Circle size={16} color={colors.textMuted} />
      )}
      {icon}
      <Text style={[styles.payLabel, active && dark && { color: colors.textInverse }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 100 },
  section: { fontSize: 10, color: colors.textSecondary, marginBottom: 6, marginTop: 8 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  addrRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  addrTitle: { fontSize: 11, fontWeight: '600', color: colors.text },
  addrSub: { fontSize: 9, color: colors.textSecondary, marginTop: 1 },
  eta: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  ok: { color: colors.success },
  bad: { color: colors.danger },
  change: { fontSize: 10, color: colors.primaryDark },
  liveBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  liveText: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.primaryInk },
  itemsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 8,
  },
  itemsToggleText: { fontSize: 12, fontWeight: '600', color: colors.text },
  itemRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemTitle: { fontSize: 12, color: colors.text },
  itemMeta: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    padding: 12,
    marginBottom: 7,
  },
  payDark: { backgroundColor: colors.secondary },
  payLight: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  payActiveLight: { borderColor: colors.primary },
  payLabel: { fontSize: 12, color: '#4A4636' },
  retry: {
    marginTop: 4,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
  },
  retryText: { fontSize: 12, fontWeight: '600', color: colors.primaryInk, textAlign: 'center' },
  summary: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sumLabel: { fontSize: 11, color: colors.textSecondary },
  totalRow: {
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  total: { fontSize: 13, fontWeight: '600', color: colors.text },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg },
  place: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  placeText: { fontSize: 13, fontWeight: '600', color: colors.primaryInk },
});
