import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  const [catThumb, setCatThumb] = useState<CatalogCategory | undefined>();
  const { width: windowWidth } = useWindowDimensions();
  const sideW = windowWidth < 400 ? 72 : 96;
  const [paneW, setPaneW] = useState(() => Math.max(windowWidth - sideW, 220));
  const cols = windowWidth < 420 ? 2 : paneW >= 560 ? 3 : 2;
  const cardW = Math.max(130, (paneW - GRID_PAD * 2 - GRID_GAP * (cols - 1)) / cols);

  const effectiveCategoryId = activeSubId ?? categoryId;

  const reload = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const queryCat = activeSubId ?? categoryId;
      const query = filtersToQuery(filters, { categoryId: queryCat });
      const [paged, children, nextFacets, category] = await Promise.all([
        productsService.queryProductsPaged({ ...query, limit: PAGE_SIZE, offset: 0 }),
        productsService.getSubcategories(categoryId),
        productsService.getFilterFacets(queryCat),
        productsService.getCategoryById(categoryId),
      ]);
      setProducts(paged.items);
      setTotal(paged.total);
      setHasMore(paged.hasMore);
      setSubs(children);
      setFacets(nextFacets);
      setCatThumb(category);
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
        <ScrollView
          style={[styles.sidebar, { width: sideW }]}
          contentContainerStyle={styles.sidebarContent}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={[styles.sideItem, { width: sideW - 10 }, !activeSubId && styles.sideItemOn]}
            onPress={() => selectSub(null)}
          >
            <View style={[styles.sideIcon, !activeSubId && styles.sideIconOn]}>
              {catThumb?.image ? (
                <SafeImage source={catThumb.image} style={styles.sideImg} contentFit="cover" />
              ) : (
                <Text style={styles.sideAll}>All</Text>
              )}
            </View>
            <Text style={[styles.sideLabel, !activeSubId && styles.sideLabelOn]} numberOfLines={1}>
              All
            </Text>
          </Pressable>
          {subs.map((s) => {
            const on = activeSubId === s.id;
            return (
              <Pressable
                key={s.id}
                style={[styles.sideItem, { width: sideW - 10 }, on && styles.sideItemOn]}
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

        <View
          style={styles.gridPane}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - paneW) > 2) setPaneW(w);
          }}
        >
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
              key={`grid-${cols}`}
              data={products}
              keyExtractor={(item) => item.id}
              key={`grid-${gridCols}`}
              numColumns={gridCols}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.grid}
              initialNumToRender={9}
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
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  sidebarContent: {
    flexGrow: 0,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sideItem: {
    width: SIDEBAR_W - 10,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 6,
    borderRadius: radii.md,
  },
  sideItemOn: {
    backgroundColor: colors.primaryMuted,
  },
  sideIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideIconOn: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  sideImg: { width: '100%', height: '100%' },
  sideAll: { fontSize: 12, fontWeight: '800', color: colors.text },
  sideLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: colors.textSecondary,
    fontWeight: '700',
    lineHeight: 13,
  },
  sideLabelOn: { color: colors.text },
  gridPane: { flex: 1, minWidth: 0, paddingTop: 8 },
  results: {
    ...typography.micro,
    color: colors.textSecondary,
    paddingHorizontal: GRID_PAD,
    marginBottom: 8,
  },
  grid: { paddingHorizontal: GRID_PAD, paddingBottom: spacing.xxl },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
});
