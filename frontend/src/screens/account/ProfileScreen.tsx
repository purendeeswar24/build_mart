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
import { AmbientDarkBg } from '../../components/layout/AmbientDarkBg';

const MENU = [
  { key: 'profile', label: 'Edit profile', icon: UserRound },
  { key: 'addresses', label: 'Saved addresses', icon: MapPin },
  { key: 'orders', label: 'Order history', icon: Package },
  { key: 'hire', label: 'Open work / bids', icon: Briefcase },
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
  onOpenHire?: () => void;
};

export function ProfileScreen({
  onOpenAddresses,
  onOpenOrders,
  onOpenWishlist,
  onOpenSettings,
  onOpenSupport,
  onOpenProfileEdit,
  onOpenBulkQuote,
  onOpenHire,
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
      <View style={styles.guestScreen}>
        <AmbientDarkBg />
        <View style={styles.guestInner}>
          <View style={styles.guestAvatar}>
            <Text style={styles.guestAvatarText}>?</Text>
          </View>
          <Text style={styles.guestTitle}>Welcome to BuildMart</Text>
          <Text style={styles.guestMeta}>Log in for orders, wishlist & faster checkout</Text>
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
                if (item.key === 'hire') onOpenHire?.();
                if (item.key === 'wishlist') onOpenWishlist?.();
                if (item.key === 'settings') onOpenSettings?.();
                if (item.key === 'support') onOpenSupport?.();
              }}
            >
              <View style={styles.menuIcon}>
                <Icon size={16} color={colors.primaryInk} strokeWidth={2.3} />
              </View>
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
  screen: { flex: 1, backgroundColor: colors.secondary },
  guestScreen: {
    flex: 1,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  guestInner: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    zIndex: 1,
    gap: 12,
  },
  guestAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  guestAvatarText: { fontSize: 32, fontWeight: '800', color: colors.primaryInk },
  guestTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.textInverse,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  guestMeta: {
    fontSize: 16,
    lineHeight: 24,
    color: '#C4C0CE',
    textAlign: 'center',
    marginBottom: 10,
  },
  hero: {
    backgroundColor: colors.secondaryMuted,
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
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 260,
    width: '100%',
    maxWidth: 320,
  },
  loginBtnText: { fontWeight: '800', color: colors.primaryInk, fontSize: 16 },
  menu: { paddingHorizontal: spacing.lg, paddingTop: 8 },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3A3D4A',
  },
  menuLabel: { flex: 1, ...typography.body, color: colors.textInverse },
  proCard: {
    marginHorizontal: spacing.lg,
    marginTop: 12,
    backgroundColor: colors.secondaryMuted,
    borderRadius: radii.md,
    padding: 12,
  },
  proHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  proTitle: { ...typography.caption, fontWeight: '700', color: colors.textInverse },
  proBody: { ...typography.micro, color: '#C4C0CE', marginBottom: 9 },
  proCta: {
    backgroundColor: colors.primary,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: 'center',
  },
  proCtaText: { ...typography.caption, fontWeight: '700', color: colors.primaryInk },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  logoutText: { ...typography.body, color: '#E57373' },
});
