import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, typography } from '../../theme';
import { discountPercent, formatPrice } from '../../utils/formatPrice';

type Props = {
  mrp: number;
  sellingPrice: number;
  style?: ViewStyle;
  compact?: boolean;
};

export function PriceTag({ mrp, sellingPrice, style, compact = false }: Props) {
  const off = discountPercent(mrp, sellingPrice);

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.selling, compact && styles.sellingCompact]}>
        {formatPrice(sellingPrice)}
      </Text>
      {mrp > sellingPrice ? (
        <Text style={styles.mrp}>{formatPrice(mrp)}</Text>
      ) : null}
      {off > 0 ? <Text style={styles.off}>{off}% OFF</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  selling: {
    ...typography.subheading,
    color: colors.text,
  },
  sellingCompact: {
    fontSize: 15,
  },
  mrp: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  off: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
});
