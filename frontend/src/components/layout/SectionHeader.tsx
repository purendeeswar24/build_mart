import React, { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../../theme';

type Props = PropsWithChildren<{
  title: string;
  actionLabel?: string;
  badge?: string;
  onAction?: () => void;
}>;

/** Section title with optional pulsing badge for offers / trending */
export function SectionHeader({
  title,
  actionLabel = 'View all',
  badge,
  onAction,
  children,
}: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!badge) return;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.85,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [badge, glow, pulse]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.left}>
          {badge ? (
            <Animated.View
              style={[styles.badge, { opacity: glow, transform: [{ scale: pulse }] }]}
            >
              <Text style={styles.badgeText}>{badge}</Text>
            </Animated.View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {children ??
          (onAction ? (
            <Pressable
              onPress={onAction}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.actionText}>{actionLabel}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.action, styles.actionText]}>{actionLabel}</Text>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { ...typography.subheading, color: colors.text },
  action: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  actionText: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: colors.skyDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.textInverse,
    letterSpacing: 0.4,
  },
});
