import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PackageSearch, SlidersHorizontal, X } from 'lucide-react-native';
import { ProductCard } from '../../components/product/ProductCard';
import { EmptyState } from '../../components/layout/EmptyState';
import { ProductGridSkeleton } from '../../components/layout/Skeleton';
import { SafeImage } from '../../components/media/SafeImage';
import {
  FilterSheet,
  EMPTY_FILTERS,
  activeFilterChips,
  filtersToQuery,
  removeChip,
  sortLabel,
  type ActiveFilters,
} from '../../components/product/FilterSheet';
import {
  productsService,
  type CatalogCategory,
  type FilterFacets,
  type ProductCardModel,
} from '../../services/products.service';
import { useLayout } from '../../hooks/useLayout';
import { colors, radii, spacing, typography } from '../../theme';

const SIDEBAR_W = 88;
const GRID_PAD = 14;
const GRID_GAP = 14;
const PAGE_SIZE = 8;

type Props = {
  title: string;
  categoryId?: string;
  onProductPress?: (productId: string) => void;
  onSubcategoryPress?: (id: string, title: string) => void;
  onOpenCart?: () => void;
};

export function CategoryDetailScreen({
  title,
  categoryId,
  onProductPress,
  onSubcategoryPress,
  onOpenCart,
}: Props) {
  const { width, isMobile } = useLayout();
  const gridCols = isMobile ? 2 : 3;
  const cardW = (width - SIDEBAR_W - GRID_PAD * 2 - GRID_GAP * (gridCols - 1)) / gridCols;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [products, setProducts] = useState<ProductCardModel[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [subs, setSubs] = useState<CatalogCategory[]>([]);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [facets, setFacets] = useState<FilterFacets | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveCategoryId = activeSubId ?? categoryId;

  const reload = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const queryCat = activeSubId ?? categoryId;
      const query = filtersToQuery(filters, { categoryId: queryCat });
      const [paged, children, nextFacets] = await Promise.all([
        productsService.queryProductsPaged({ ...query, limit: PAGE_SIZE, offset: 0 }),
        productsService.getSubcategories(categoryId),
        productsService.getFilterFacets(queryCat),
      ]);
      setProducts(paged.items);
      setTotal(paged.total);
      setHasMore(paged.hasMore);
      setSubs(children);
      setFacets(nextFacets);
    } catch {
      setError('Could not load products. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [categoryId, filters, activeSubId]);

  useEffect(() => {
    setActiveSubId(null);
  }, [categoryId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!effectiveCategoryId || !hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const query = filtersToQuery(filters, { categoryId: effectiveCategoryId });
      const paged = await productsService.queryProductsPaged({
        ...query,
        limit: PAGE_SIZE,
        offset: products.length,
      });
      setProducts((prev) => [...prev, ...paged.items]);
      setHasMore(paged.hasMore);
      setTotal(paged.total);
    } finally {
      setLoadingMore(false);
    }
  }, [effectiveCategoryId, filters, hasMore, loadingMore, loading, products.length]);

  const chips = useMemo(() => activeFilterChips(filters), [filters]);

  const selectSub = (id: string | null) => {
    setActiveSubId(id);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle} numberOfLines={1}>
          {title}
        </Text>
        <Pressable style={styles.sortBtn} onPress={() => setSheetOpen(true)}>
          <Text style={styles.sortText}>{sortLabel(filters.sort)}</Text>
          <SlidersHorizontal size={14} color={colors.text} />
        </Pressable>
      </View>

      {chips.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {chips.map((c) => (
            <Pressable
              key={c.key}
              style={styles.selectedChip}
              onPress={() => setFilters((f) => removeChip(f, c.key))}
            >
              <Text style={styles.selectedText}>{c.label}</Text>
              <X size={10} color={colors.text} />
            </Pressable>
          ))}
          <Pressable onPress={() => setFilters(EMPTY_FILTERS)}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <View style={styles.body}>
        {/* BuildZap-style category rail — compact, leaves room for products */}
        <ScrollView style={styles.sidebar} showsVerticalScrollIndicator={false}>
          <Pressable
            style={[styles.sideItem, !activeSubId && styles.sideItemOn]}
            onPress={() => selectSub(null)}
          >
            <View style={[styles.sideIcon, !activeSubId && styles.sideIconOn]}>
              <Text style={styles.sideAll}>All</Text>
            </View>
            <Text style={[styles.sideLabel, !activeSubId && styles.sideLabelOn]} numberOfLines={2}>
              All
            </Text>
          </Pressable>
          {subs.map((s) => {
            const on = activeSubId === s.id;
            return (
              <Pressable
                key={s.id}
                style={[styles.sideItem, on && styles.sideItemOn]}
                onPress={() => selectSub(s.id)}
              >
                <View style={[styles.sideIcon, on && styles.sideIconOn]}>
                  <SafeImage
                    source={s.image}
                    style={styles.sideImg}
                    contentFit="cover"
                  />
                </View>
                <Text style={[styles.sideLabel, on && styles.sideLabelOn]} numberOfLines={2}>
                  {s.shortName || s.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.gridPane}>
          <Text style={styles.results}>{total} products</Text>
          {error ? (
            <EmptyState
              icon={PackageSearch}
              title="Couldn’t load"
              message={error}
              actionLabel="Retry"
              onAction={() => void reload()}
            />
          ) : loading ? (
            <ProductGridSkeleton count={4} cardWidth={cardW} />
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              key={`grid-${gridCols}`}
              numColumns={gridCols}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.grid}
              initialNumToRender={6}
              windowSize={7}
              onEndReached={() => void loadMore()}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
                ) : (
                  <View style={{ height: 24 }} />
                )
              }
              ListEmptyComponent={
                <EmptyState
                  icon={PackageSearch}
                  title="No products match"
                  message="Try another subcategory or clear filters."
                  actionLabel="Clear filters"
                  onAction={() => setFilters(EMPTY_FILTERS)}
                />
              }
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  width={cardW}
                  onPress={() => onProductPress?.(item.id)}
                  onAddPress={() => onProductPress?.(item.id)}
                  onOpenCart={onOpenCart}
                />
              )}
            />
          )}
        </View>
      </View>

      <FilterSheet
        visible={sheetOpen}
        facets={facets}
        value={filters}
        onClose={() => setSheetOpen(false)}
        onApply={setFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pageTitle: { ...typography.subheading, color: colors.text, flex: 1, marginRight: 12 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortText: { ...typography.micro, color: colors.text },
  chipRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, alignItems: 'center' },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  selectedText: { ...typography.micro, color: colors.text },
  clear: { ...typography.micro, color: colors.skyDeep, paddingHorizontal: 4, fontWeight: '700' },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  sideItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sideItemOn: {
    backgroundColor: colors.surfaceWarm,
    borderLeftColor: colors.primary,
  },
  sideIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideIconOn: {
    borderColor: colors.primary,
  },
  sideImg: { width: '100%', height: '100%' },
  sideAll: { fontSize: 11, fontWeight: '800', color: colors.text },
  sideLabel: {
    fontSize: 9,
    textAlign: 'center',
    color: colors.textSecondary,
    fontWeight: '600',
    lineHeight: 11,
  },
  sideLabelOn: { color: colors.text },
  gridPane: { flex: 1, paddingTop: 8 },
  results: {
    ...typography.micro,
    color: colors.textSecondary,
    paddingHorizontal: GRID_PAD,
    marginBottom: 8,
  },
  grid: { paddingHorizontal: GRID_PAD, paddingBottom: spacing.xxl },
  gridRow: { justifyContent: 'space-between', marginBottom: GRID_GAP },
});
