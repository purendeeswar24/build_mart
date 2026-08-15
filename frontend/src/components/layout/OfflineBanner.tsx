import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { colors, spacing } from '../../theme';

function readOnline(): boolean {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true;
}

/** Lightweight online detector (web events + optional health ping). */
export function useOnline() {
  const [online, setOnline] = useState(readOnline);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const on = () => setOnline(true);
      const off = () => setOnline(false);
      window.addEventListener('online', on);
      window.addEventListener('offline', off);
      return () => {
        window.removeEventListener('online', on);
        window.removeEventListener('offline', off);
      };
    }

    const base = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const tick = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        await fetch(`${base}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        setOnline(true);
      } catch {
        // Backend down ≠ device offline; keep last known for native demos
      }
    };
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  return { online, setOnline };
}

export function OfflineBanner() {
  const { online, setOnline } = useOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;

  return (
    <View
      style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]}
      accessibilityRole="alert"
    >
      <WifiOff size={14} color={colors.textInverse} />
      <Text style={styles.text}>You’re offline — some actions may fail</Text>
      <Pressable
        onPress={() => setOnline(readOnline())}
        accessibilityRole="button"
        accessibilityLabel="Retry connection check"
        style={styles.retry}
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  text: { flex: 1, color: colors.textInverse, fontSize: 12, fontWeight: '600' },
  retry: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  retryText: { color: colors.textInverse, fontSize: 11, fontWeight: '700' },
});
