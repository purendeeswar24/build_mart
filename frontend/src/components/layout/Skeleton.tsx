import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radii } from '../../theme';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: object;
};

export function SkeletonBlock({
  width = '100%' as number | `${number}%`,
  height = 16,
  radius = radii.sm,
  style,
}: Props) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton({ width = 148 }: { width?: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <SkeletonBlock height={width * 0.72} radius={radii.md} />
      <SkeletonBlock height={10} style={{ marginTop: 8, width: '40%' }} />
      <SkeletonBlock height={12} style={{ marginTop: 6, width: '90%' }} />
      <SkeletonBlock height={12} style={{ marginTop: 4, width: '70%' }} />
      <SkeletonBlock height={32} style={{ marginTop: 10 }} radius={radii.sm} />
    </View>
  );
}

export function ProductGridSkeleton({
  count = 4,
  cardWidth = 148,
}: {
  count?: number;
  cardWidth?: number;
}) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} width={cardWidth} />
      ))}
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.home}>
      <SkeletonBlock height={140} radius={radii.lg} style={{ marginBottom: 16 }} />
      <View style={styles.row}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} width={72} height={72} radius={radii.lg} />
        ))}
      </View>
      <SkeletonBlock height={18} style={{ marginTop: 20, width: '45%' }} />
      <ProductGridSkeleton count={4} />
    </View>
  );
}

export function ListRowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 10, padding: 16 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} height={72} radius={radii.md} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceMuted,
  },
  card: {
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
  },
  home: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
