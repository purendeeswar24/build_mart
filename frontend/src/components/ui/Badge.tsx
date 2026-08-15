import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

type BadgeTone = 'delivery' | 'sale' | 'info' | 'neutral';

type Props = {
  label: string;
  tone?: BadgeTone;
  style?: ViewStyle;
};

const toneStyles: Record<BadgeTone, { bg: string; fg: string }> = {
  delivery: { bg: colors.badgeDelivery, fg: colors.primary },
  sale: { bg: colors.danger, fg: '#FFFFFF' },
  info: { bg: colors.primaryMuted, fg: colors.secondary },
  neutral: { bg: colors.border, fg: colors.textSecondary },
};

export function Badge({ label, tone = 'info', style }: Props) {
  const palette = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  text: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
