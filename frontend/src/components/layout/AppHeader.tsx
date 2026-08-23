import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bolt, MapPin, Search, ShoppingBag, CircleUser } from 'lucide-react-native';
import { useLayout } from '../../hooks/useLayout';
import { colors, radii, typography } from '../../theme';

type Props = {
  city?: string;
  etaLabel?: string;
  cartCount?: number;
  searchPlaceholder?: string;
  onSearchPress?: () => void;
  onCartPress?: () => void;
  onProfilePress?: () => void;
  onLocationPress?: () => void;
  variant?: 'dark' | 'light';
};

/** BuildZap-style light header: brand · delivery · cart/user · search */
export function AppHeader({
  city = 'Hyderabad',
  etaLabel = 'Delivery in 30 mins',
  cartCount = 0,
  searchPlaceholder = 'Search products',
  onSearchPress,
  onCartPress,
  onProfilePress,
  onLocationPress,
  variant = 'light',
}: Props) {
  const insets = useSafeAreaInsets();
  const { gutter } = useLayout();
  const isDark = variant === 'dark';
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(cartCount);

  useEffect(() => {
    if (cartCount === prevCount.current) return;
    prevCount.current = cartCount;
    if (cartCount <= 0) return;
    Animated.sequence([
      Animated.spring(badgeScale, {
        toValue: 1.35,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
    ]).start();
  }, [cartCount, badgeScale]);

  return (
    <View
      style={[
        styles.wrapper,
        isDark ? styles.wrapperDark : styles.wrapperLight,
        { paddingTop: insets.top + 10, paddingHorizontal: gutter },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.brandBlock}>
          <Text style={[styles.brand, isDark && styles.brandDark]}>
            BUILD<Text style={styles.brandAccent}>MART</Text>
          </Text>
          <Bolt size={14} color={colors.primary} style={styles.bolt} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onLocationPress}
          style={styles.location}
        >
          <Text style={[styles.eta, isDark && styles.etaDark]} numberOfLines={1}>
            {etaLabel.includes('Delivery') ? etaLabel : `Delivery in 30 mins`}
          </Text>
          <View style={styles.cityRow}>
            <MapPin size={11} color={isDark ? colors.textMuted : colors.textSecondary} />
            <Text style={[styles.city, isDark && styles.cityDark]} numberOfLines={1}>
              {city}
            </Text>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cart, ${cartCount} items`}
            onPress={onCartPress}
            style={[styles.actionBtn, isDark ? styles.actionBtnDark : styles.actionBtnLight]}
          >
            <ShoppingBag size={18} color={isDark ? colors.textInverse : colors.text} />
            {cartCount > 0 ? (
              <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
                <Text style={styles.badgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </Animated.View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={onProfilePress}
            style={[styles.actionBtn, isDark ? styles.actionBtnDark : styles.actionBtnLight]}
          >
            <CircleUser size={18} color={isDark ? colors.textInverse : colors.text} />
          </Pressable>
        </View>
      </View>

      <Pressable accessibilityRole="search" onPress={onSearchPress}>
        <View style={[styles.search, isDark && styles.searchDark]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            editable={false}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { pointerEvents: 'none' }]}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: 14,
    gap: 12,
  },
  wrapperDark: {
    backgroundColor: colors.secondary,
  },
  wrapperLight: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  brand: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    color: colors.text,
    letterSpacing: -0.3,
  },
  brandDark: {
    color: colors.textInverse,
  },
  brandAccent: {
    color: colors.primary,
  },
  bolt: {
    marginLeft: 1,
  },
  location: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  eta: {
    ...typography.label,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  etaDark: {
    color: colors.textInverse,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  city: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  cityDark: {
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    position: 'relative',
    paddingHorizontal: 8,
  },
  actionBtnLight: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnDark: {
    backgroundColor: colors.secondaryMuted,
  },
  actionLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionLabelDark: {
    color: colors.textMuted,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryInk,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    minHeight: 46,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchDark: {
    backgroundColor: colors.secondaryMuted,
    borderColor: colors.secondaryMuted,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 10,
  },
});
