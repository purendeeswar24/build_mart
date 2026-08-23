import React, { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../../theme';

type Props = PropsWithChildren<{
  title: string;
  actionLabel?: string;
  badge?: string;
  onAction?: () => void;
  padded?: boolean;
  compact?: boolean;
}>;

/** Section title with optional pulsing badge for offers / trending */
export function SectionHeader({
  title,
  actionLabel = 'View all',
  badge,
  onAction,
  padded = true,
  compact = false,
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
    <View style={[styles.wrap, !padded && styles.wrapFlush]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {badge ? (
            <Animated.View
              style={[styles.badge, { opacity: glow, transform: [{ scale: pulse }] }]}
            >
              <Text style={styles.badgeText}>{badge}</Text>
            </Animated.View>
          ) : null}
          <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        </View>
        {children ??
          (onAction ? (
            <Pressable
              onPress={onAction}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [
                styles.action,
                compact && styles.actionCompact,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.actionText, compact && styles.actionTextCompact]}>{actionLabel}</Text>
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
  wrapFlush: {
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, paddingRight: 8 },
  title: { ...typography.subheading, color: colors.text, fontSize: 22, lineHeight: 27, flexShrink: 1 },
  titleCompact: { fontSize: 18, lineHeight: 22 },
  action: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radii.pill,
    overflow: 'hidden',
    flexShrink: 0,
  },
  actionCompact: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
  },
  actionText: {
    ...typography.caption,
    fontSize: 15,
    lineHeight: 20,
    color: colors.secondary,
    fontWeight: '800',
  },
  actionTextCompact: { fontSize: 13, lineHeight: 16 },
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
