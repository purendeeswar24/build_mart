import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, Shield, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography } from '../../theme';

export function SettingsScreen() {
  const clearLocal = () => {
    Alert.alert(
      'Clear local demo data?',
      'Removes cart, wishlist, addresses & orders from this device. You stay logged in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const keys = [
                '@buildmart/cart',
                '@buildmart/wishlist',
                '@buildmart/addresses',
                '@buildmart/orders',
                '@buildmart/stock_overrides',
              ];
              await AsyncStorage.multiRemove(keys);
              Alert.alert('Cleared', 'Restart screens or relaunch the app to refresh.');
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <Bell size={17} color={colors.primaryDark} />
        <View style={styles.body}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.sub}>Order updates via SMS (demo — always on)</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Shield size={17} color={colors.primaryDark} />
        <View style={styles.body}>
          <Text style={styles.title}>Privacy</Text>
          <Text style={styles.sub}>Session stored only on this device in demo mode</Text>
        </View>
      </View>
      <Pressable style={styles.row} onPress={clearLocal}>
        <Trash2 size={17} color={colors.danger} />
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.danger }]}>Clear demo data</Text>
          <Text style={styles.sub}>Cart, wishlist, addresses, orders</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  body: { flex: 1 },
  title: { ...typography.body, fontWeight: '600', color: colors.text },
  sub: { ...typography.micro, color: colors.textSecondary, marginTop: 2 },
});
