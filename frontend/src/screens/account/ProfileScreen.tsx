import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Briefcase,
  ChevronRight,
  Heart,
  Headset,
  LogOut,
  MapPin,
  Package,
  Settings,
  UserRound,
} from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_OPTIONS } from '../../services/auth.service';
import { colors, radii, spacing, typography } from '../../theme';

const MENU = [
  { key: 'profile', label: 'Edit profile', icon: UserRound },
  { key: 'addresses', label: 'Saved addresses', icon: MapPin },
  { key: 'orders', label: 'Order history', icon: Package },
  { key: 'wishlist', label: 'Wishlist', icon: Heart },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'support', label: 'Help & support', icon: Headset },
] as const;

type Props = {
  onOpenAddresses?: () => void;
  onOpenOrders?: () => void;
  onOpenWishlist?: () => void;
  onOpenSettings?: () => void;
  onOpenSupport?: () => void;
  onOpenProfileEdit?: () => void;
  onOpenBulkQuote?: () => void;
};

export function ProfileScreen({
  onOpenAddresses,
  onOpenOrders,
  onOpenWishlist,
  onOpenSettings,
  onOpenSupport,
  onOpenProfileEdit,
  onOpenBulkQuote,
}: Props) {
  const { user, isAuthenticated, openLoginModal, signOut } = useAuth();

  const initials = (user?.fullName || 'BM')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    ROLE_OPTIONS.find((r) => r.value === user?.role)?.label ?? 'Guest';

  const isPro =
    user?.role === 'contractor' ||
    user?.role === 'civil_engineer' ||
    user?.role === 'vendor';

  if (!isAuthenticated) {
    return (
      <View style={styles.screen}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>?</Text>
          </View>
          <View>
            <Text style={styles.name}>Welcome to BuildMart</Text>
            <Text style={styles.meta}>Log in for orders, wishlist & faster checkout</Text>
          </View>
        </View>
        <View style={{ padding: spacing.lg }}>
          <Pressable style={styles.loginBtn} onPress={openLoginModal}>
            <Text style={styles.loginBtnText}>Log in / Create account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 32 }}>
      <Pressable style={styles.hero} onPress={onOpenProfileEdit}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.meta}>
            {roleLabel}
            {user?.phone ? ` · ${user.phone}` : ''}
          </Text>
          {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
        </View>
        <ChevronRight size={16} color="#8B889B" />
      </Pressable>

      <View style={styles.menu}>
        {MENU.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.key}
              style={styles.menuRow}
              onPress={() => {
                if (item.key === 'profile') onOpenProfileEdit?.();
                if (item.key === 'addresses') onOpenAddresses?.();
                if (item.key === 'orders') onOpenOrders?.();
                if (item.key === 'wishlist') onOpenWishlist?.();
                if (item.key === 'settings') onOpenSettings?.();
                if (item.key === 'support') onOpenSupport?.();
              }}
            >
              <Icon size={17} color={colors.primaryDark} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={14} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </View>

      {isPro ? (
        <View style={styles.proCard}>
          <View style={styles.proHead}>
            <Briefcase size={14} color={colors.primaryDark} />
            <Text style={styles.proTitle}>For professionals</Text>
          </View>
          <Text style={styles.proBody}>
            Bulk pricing and GST invoicing
            {user?.gstin ? ` · GSTIN ${user.gstin}` : ''}
          </Text>
          <Pressable style={styles.proCta} onPress={onOpenBulkQuote}>
            <Text style={styles.proCtaText}>Request bulk quote</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable style={styles.logout} onPress={() => signOut()}>
        <LogOut size={17} color={colors.danger} />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: colors.primaryInk },
  name: { fontSize: 14, fontWeight: '600', color: colors.textInverse },
  meta: { ...typography.micro, color: '#8B889B', marginTop: 2 },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginBtnText: { fontWeight: '700', color: colors.primaryInk },
  menu: { paddingHorizontal: spacing.lg, paddingTop: 8 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, ...typography.body, color: colors.text },
  proCard: {
    marginHorizontal: spacing.lg,
    marginTop: 12,
    backgroundColor: colors.surfaceWarm,
    borderRadius: radii.md,
    padding: 12,
  },
  proHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  proTitle: { ...typography.caption, fontWeight: '700', color: colors.text },
  proBody: { ...typography.micro, color: colors.textSecondary, marginBottom: 9 },
  proCta: {
    backgroundColor: colors.secondary,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: 'center',
  },
  proCtaText: { ...typography.caption, fontWeight: '700', color: colors.primary },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  logoutText: { ...typography.body, color: colors.danger },
});
