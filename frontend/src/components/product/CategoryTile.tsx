import React, { useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radii, shadows, typography } from '../../theme';
import type { CatalogCategory } from '../../services/products.service';
import { SafeImage } from '../media/SafeImage';

const GAP = 10;
const H_PAD = 20;
/** Compact 4-up home strip — less vertical space */
export const CATEGORY_TILE_SIZE = (Dimensions.get('window').width - H_PAD * 2 - GAP * 3) / 4;
/** Mini size for horizontal scroller */
export const CATEGORY_MINI_SIZE = 76;

type Props = {
  category: CatalogCategory;
  onPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
  size?: number;
  mini?: boolean;
};

export function CategoryTile({
  category,
  onPress,
  style,
  compact = false,
  size,
  mini = false,
}: Props) {
  const dim = size ?? (mini ? CATEGORY_MINI_SIZE : CATEGORY_TILE_SIZE);
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={category.name}
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 0 }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start()
      }
      style={[{ width: dim, alignItems: 'center', gap: mini ? 4 : 6 }, style]}
    >
      <Animated.View
        style={[
          { transform: [{ scale }] },
          styles.tile,
          mini && styles.tileMini,
          { width: dim, height: dim },
        ]}
      >
        <SafeImage
          source={category.image}
          style={{ width: '100%', height: '100%', borderRadius: mini ? radii.sm : radii.md }}
          contentFit="cover"
          transition={220}
        />
      </Animated.View>
      <Text style={[styles.label, mini && styles.labelMini]} numberOfLines={2}>
        {compact || mini ? category.shortName : category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.soft,
  },
  tileMini: {
    borderRadius: radii.sm,
  },
  label: {
    ...typography.micro,
    fontSize: 10,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 12,
    fontWeight: '600',
  },
  labelMini: {
    fontSize: 9,
    lineHeight: 11,
  },
});
