import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { ProductGridSkeleton } from '../../components/layout/Skeleton';
import { CategoryTile, categoryTileSizeFor } from '../../components/product/CategoryTile';
import { useLayout } from '../../hooks/useLayout';
import { FadeIn } from '../../components/motion/FadeIn';
import { productsService, type CatalogCategory } from '../../services/products.service';
import { colors, radii, typography } from '../../theme';

type Props = {
  onCategoryPress?: (id: string, title: string) => void;
  onSearchPress?: () => void;
  onCartPress?: () => void;
  onProfilePress?: () => void;
  onCapacityPress?: () => void;
  onHomePress?: () => void;
};

export function CategoryListScreen({
  onCategoryPress,
  onCapacityPress,
  onHomePress,
}: Props) {
  const { width, gutter, categoryCols } = useLayout();
  const tileSize = categoryTileSizeFor(width, gutter, categoryCols);
  const { count } = useCart();
  const { selected, deliveryStatus } = useAddress();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await productsService.getTopCategories();
      if (!alive) return;
      setCategories(list);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const listHeader = (
    <View style={styles.headerBlock}>
      <Text style={styles.sub}>{categories.length} departments · tap to browse</Text>
      {onCapacityPress ? (
        <Pressable style={styles.toolBanner} onPress={onCapacityPress}>
          <Text style={styles.toolTitle}>Tank capacity calculator</Text>
          <Text style={styles.toolSub}>Size a water tank from household need →</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.chrome, { paddingTop: insets.top + 4 }]}>
        <View style={styles.titleRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            onPress={onHomePress}
            hitSlop={10}
            style={styles.backBtn}
          >
            <ChevronLeft size={28} color="#0A0A0A" />
          </Pressable>
          <Text style={[styles.title, isPhone && styles.titlePhone]} numberOfLines={1}>
            All categories
          </Text>
        </View>
      </View>
      {loading ? (
        <View style={{ padding: 16 }}>
          <ProductGridSkeleton count={8} cardWidth={tileSize} />
        </View>
      ) : (
        <FlatList
          data={categories}
          key={cols}
          keyExtractor={(item) => item.id}
          key={`cats-${categoryCols}`}
          numColumns={categoryCols}
          contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={
            <FadeIn>
              <View style={styles.headerBlock}>
                <Text style={styles.title}>All categories</Text>
                <Text style={styles.sub}>{categories.length} departments · tap to browse</Text>
                {onCapacityPress ? (
                  <Pressable style={styles.toolBanner} onPress={onCapacityPress}>
                    <Text style={styles.toolTitle}>Tank capacity calculator</Text>
                    <Text style={styles.toolSub}>Size a water tank from household need →</Text>
                  </Pressable>
                ) : null}
              </View>
            </FadeIn>
          }
          renderItem={({ item }) => (
            <CategoryTile
              category={item}
              compact
              size={tileSize}
              onPress={() => onCategoryPress?.(item.id, item.name)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.secondary },
  chrome: {
    backgroundColor: '#E8EAED',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D0D4DA',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  list: { paddingBottom: 40, paddingTop: 4 },
  headerBlock: { marginBottom: 16, marginTop: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.heading, color: '#0A0A0A', flex: 1 },
  titlePhone: { fontSize: 18, lineHeight: 24 },
  sub: { ...typography.caption, color: '#C4C0CE', marginTop: 4 },
  toolBanner: {
    marginTop: 14,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.secondaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  toolTitle: { fontSize: 14, fontWeight: '700', color: colors.textInverse },
  toolSub: { ...typography.caption, color: '#C4C0CE', marginTop: 4 },
  row: { justifyContent: 'space-between' },
});
