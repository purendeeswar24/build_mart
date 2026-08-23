import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/layout/AppHeader';
import { ProductGridSkeleton } from '../../components/layout/Skeleton';
import { CategoryTile, categoryTileSizeFor } from '../../components/product/CategoryTile';
import { useLayout } from '../../hooks/useLayout';
import { FadeIn } from '../../components/motion/FadeIn';
import { productsService, type CatalogCategory } from '../../services/products.service';
import { useCart } from '../../hooks/useCart';
import { useAddress } from '../../hooks/useAddress';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  onCategoryPress?: (id: string, title: string) => void;
  onSearchPress?: () => void;
  onCartPress?: () => void;
  onProfilePress?: () => void;
  onCapacityPress?: () => void;
};

export function CategoryListScreen({
  onCategoryPress,
  onSearchPress,
  onCartPress,
  onProfilePress,
  onCapacityPress,
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

  return (
    <View style={styles.screen}>
      <AppHeader
        city={selected?.city ?? 'Hyderabad'}
        etaLabel={deliveryStatus?.message ?? 'Delivery in 30 mins'}
        cartCount={count}
        onSearchPress={onSearchPress}
        onCartPress={onCartPress}
        onProfilePress={onProfilePress}
        variant="light"
      />
      {loading ? (
        <View style={{ padding: 16 }}>
          <ProductGridSkeleton count={8} cardWidth={tileSize} />
        </View>
      ) : (
        <FlatList
          data={categories}
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
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  headerBlock: { marginBottom: 16, marginTop: 8 },
  title: { ...typography.heading, color: colors.text },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  toolBanner: {
    marginTop: 14,
    padding: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  toolTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  toolSub: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  row: { justifyContent: 'space-between', marginBottom: 14 },
});
