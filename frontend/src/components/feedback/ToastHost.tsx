import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../hooks/useCart';
import { useFeedback, type ToastPayload } from '../../hooks/useFeedback';
import { colors, motion, radii, shadows } from '../../theme';

export function ToastHost() {
  const { toast, hideToast } = useFeedback();
  const { count } = useCart();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState<ToastPayload | null>(null);
  const hiding = useRef(false);

  useEffect(() => {
    if (toast) {
      hiding.current = false;
      setVisible(toast);
      translateY.setValue(80);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: motion.spring.speed,
          bounciness: motion.spring.bounciness,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.fast,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!visible || hiding.current) return;
    hiding.current = true;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 60,
        duration: motion.exit,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.exit,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(null);
      hiding.current = false;
    });
  }, [toast, opacity, translateY, visible]);

  if (!visible) return null;

  const tone = visible.tone ?? 'success';
  const Icon = tone === 'info' ? Info : CheckCircle2;
  const iconColor = tone === 'info' ? colors.skyDeep : colors.success;
  const cartOffset = count > 0 ? 72 : 0;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, 12) + 64 + cartOffset },
      ]}
    >
      <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
        <Icon size={18} color={iconColor} />
        <Text style={styles.msg} numberOfLines={2}>
          {visible.message}
        </Text>
        {visible.action ? (
          <Pressable
            onPress={() => {
              visible.action?.onPress();
              hideToast();
            }}
            style={styles.action}
          >
            <Text style={styles.actionText}>{visible.action.label}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.lg,
    maxWidth: 440,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadows.lifted,
  },
  msg: {
    flex: 1,
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
  action: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  actionText: {
    color: colors.primaryInk,
    fontWeight: '800',
    fontSize: 12,
  },
});
