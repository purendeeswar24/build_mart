import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
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

export function AppHeader({
  cartCount = 0,
  searchPlaceholder = 'Search products',
  onSearchPress,
  onCartPress,
  onProfilePress,
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

  const searchField = (
    <Pressable accessibilityRole="search" onPress={onSearchPress} style={[styles.searchPress, compact && styles.searchPressCompact]}>
      <View style={[styles.search, isDark && styles.searchDark]}>
        <Search size={18} color="#6B8799" />
        <TextInput
          editable={false}
          placeholder={searchPlaceholder}
          placeholderTextColor="#6B8799"
          style={[styles.searchInput, { pointerEvents: 'none' }]}
        />
      </View>
    </Pressable>
  );

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
          <Text style={[styles.brand, compact && styles.brandCompact, isDark && styles.brandDark]}>
            BUILD<Text style={styles.brandAccent}>MART</Text>
          </Text>
        </View>

        {!compact ? searchField : null}

        <View style={[styles.actions, compact && styles.actionsCompact]}>
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
      {compact ? searchField : null}
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
    backgroundColor: '#E8EAED',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D0D4DA',
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
    flexShrink: 0,
  },
  brand: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: '#0A0A0A',
    textTransform: 'uppercase',
  },
  brandCompact: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  brandDark: {
    color: colors.textInverse,
  },
  brandAccent: {
    color: colors.primary,
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
    color: '#5C6570',
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
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(17, 17, 17, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(17, 17, 17, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
});
