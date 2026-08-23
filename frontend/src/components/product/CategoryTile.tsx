import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import {
  Box,
  Droplets,
  Hammer,
  Layers,
  Lightbulb,
  PaintBucket,
  Pipette,
  Plug,
  Shield,
  SprayCan,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, radii, shadows, typography } from '../../theme';
import { useLayout } from '../../hooks/useLayout';
import type { CatalogCategory } from '../../services/products.service';
import { SafeImage } from '../media/SafeImage';

const GAP = 10;

export function categoryTileSizeFor(width: number, gutter = 20, columns = 4) {
  return (width - gutter * 2 - GAP * Math.max(columns - 1, 0)) / columns;
}

const ICON_BY_SLUG: Record<string, LucideIcon> = {
  'plywood-boards': Layers,
  'building-materials': Box,
  'ceiling-solutions': Layers,
  electricals: Plug,
  'adhesive-bonding': SprayCan,
  'kitchen-fixtures': UtensilsCrossed,
  lighting: Lightbulb,
  'hardware-accessories': Wrench,
  paints: PaintBucket,
  'sanitary-bath': Droplets,
  'industrial-steel': Shield,
  'water-proofing': Shield,
  tools: Hammer,
  'tiles-accessories': Layers,
  'plumbing-pipes': Pipette,
  'home-kitchen': UtensilsCrossed,
};

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
  const { width, gutter } = useLayout();
  const dim = size ?? (mini ? 76 : categoryTileSizeFor(width, gutter));
  const scale = useRef(new Animated.Value(1)).current;
  const Icon = ICON_BY_SLUG[category.slug] ?? Box;

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
          style={{ width: '100%', height: '100%', borderRadius: mini ? radii.md : radii.lg }}
          contentFit="cover"
          transition={220}
        />
        <View style={[styles.iconBadge, mini && styles.iconBadgeMini]}>
          <Icon size={mini ? 12 : 14} color={colors.primaryInk} strokeWidth={2.4} />
        </View>
      </Animated.View>
      <Text style={[styles.label, mini && styles.labelMini]} numberOfLines={2}>
        {compact || mini ? category.shortName : category.name}
      </Text>
    </Pressable>
  );
}

/** @deprecated use categoryTileSizeFor(width) */
export const CATEGORY_TILE_SIZE = 76;
export const CATEGORY_MINI_SIZE = 76;

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.soft,
  },
  tileMini: {
    borderRadius: radii.md,
  },
  iconBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  iconBadgeMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    right: 4,
    bottom: 4,
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
