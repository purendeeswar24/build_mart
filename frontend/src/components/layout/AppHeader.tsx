import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, ShoppingCart, User } from 'lucide-react-native';
import { colors, typography } from '../../theme';

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
  const { width } = useWindowDimensions();
  const compact = width < 768;
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
        {
          paddingTop: insets.top + (compact ? 8 : 12),
          paddingBottom: compact ? 8 : 12,
          paddingHorizontal: compact ? 14 : 20,
        },
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
            style={styles.actionBtn}
          >
            <ShoppingCart size={22} color={isDark ? '#FFFFFF' : '#0A0A0A'} />
            <Text style={[styles.actionLabel, isDark && styles.actionLabelDark]}>Cart</Text>
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
            style={styles.actionBtn}
          >
            <View style={[styles.avatar, isDark && styles.avatarDark]}>
              <User size={16} color={isDark ? '#FFFFFF' : '#0A0A0A'} />
            </View>
            <Text style={[styles.actionLabel, isDark && styles.actionLabelDark]}>User</Text>
          </Pressable>
        </View>
      </View>
      {compact ? searchField : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: 12,
    gap: 10,
    backgroundColor: '#E8EAED',
    overflow: 'hidden',
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
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginLeft: 8,
    flexShrink: 0,
  },
  actionsCompact: {
    marginLeft: 0,
    gap: 8,
  },
  searchPress: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 120,
    maxWidth: 420,
  },
  searchPressCompact: {
    maxWidth: '100%',
    minWidth: 0,
    width: '100%',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F4F6F8',
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 44,
    gap: 10,
    borderWidth: 1,
    borderColor: '#D9DEE4',
  },
  searchDark: {
    backgroundColor: colors.secondaryMuted,
    borderColor: colors.secondaryMuted,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontWeight: '400',
    color: '#3D5A6C',
    paddingVertical: 10,
  },
  actionBtn: {
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    position: 'relative',
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
