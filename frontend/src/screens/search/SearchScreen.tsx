import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { SearchBar } from '../../components/ui';
import { ProductCard } from '../../components/product/ProductCard';
import { EmptyState } from '../../components/layout/EmptyState';
import { ProductGridSkeleton } from '../../components/layout/Skeleton';
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
  type FilterFacets,
  type ProductCardModel,
} from '../../services/products.service';
import { useLayout } from '../../hooks/useLayout';
import { colors, radii, spacing, typography } from '../../theme';

const RECENT_KEY = '@buildmart/recent-searches';
const PAGE_SIZE = 8;

export function SearchScreen() {
  const { width, gutter, cardGap, featuredCols } = useLayout();
  const cardW = (width - gutter * 2 - cardGap * (featuredCols - 1)) / featuredCols;
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<ProductCardModel[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [facets, setFacets] = useState<FilterFacets | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (raw) setRecent(JSON.parse(raw) as string[]);
    });
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setSuggestions(await productsService.searchSuggest(q));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setTotal(0);
      setHasMore(false);
      setFacets(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const productQuery = filtersToQuery(filters, { search: q });
      const [paged, nextFacets] = await Promise.all([
        productsService.queryProductsPaged({ ...productQuery, limit: PAGE_SIZE, offset: 0 }),
        productsService.getFilterFacets(undefined, q),
      ]);
      setResults(paged.items);
      setTotal(paged.total);
      setHasMore(paged.hasMore);
      setFacets(nextFacets);
      setLoading(false);
    }, 280);
    return () => clearTimeout(t);
  }, [query, filters]);

  const chips = useMemo(() => activeFilterChips(filters), [filters]);

  const commitSearch = async (q: string) => {
    const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
    setRecent(next);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const openProduct = (id: string) => {
    commitSearch(query.trim());
    (navigation as { navigate: (a: string, b: object) => void }).navigate('ProductDetail', {
      productId: id,
    });
  };

  return (
    <View style={styles.screen}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        editable
        placeholder="Search cement, pipes, tanks…"
        style={styles.search}
      />

      {query.trim().length < 2 ? (
        <View style={styles.recentBlock}>
          {suggestions.length > 0 ? (
            <>
              <Text style={styles.hint}>Suggestions</Text>
              {suggestions.map((s) => (
                <Pressable key={s} onPress={() => setQuery(s)}>
                  <Text style={styles.recentItem}>{s}</Text>
                </Pressable>
              ))}
            </>
          ) : null}
          <Text style={[styles.hint, { marginTop: 12 }]}>Recent searches</Text>
          {recent.length === 0 ? (
            <Text style={styles.empty}>Try “tank”, “paint”, or “wire”</Text>
          ) : (
            recent.map((r) => (
              <Pressable
                key={r}
                onPress={() => {
                  setQuery(r);
                  commitSearch(r);
                }}
              >
                <Text style={styles.recentItem}>{r}</Text>
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <>
          <View style={styles.toolbar}>
            <Text style={styles.results}>{total} results</Text>
            <Pressable style={styles.filterBtn} onPress={() => setSheetOpen(true)}>
              <SlidersHorizontal size={14} color={colors.text} />
              <Text style={styles.filterBtnText}>{sortLabel(filters.sort)}</Text>
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
                <Text style={styles.clear}>Clear all</Text>
              </Pressable>
            </ScrollView>
          ) : null}

          {loading ? (
            <ProductGridSkeleton count={4} cardWidth={cardW} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              key={`search-${featuredCols}`}
              numColumns={featuredCols}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.grid}
              initialNumToRender={6}
              windowSize={7}
              onEndReached={() => {
                if (!hasMore || loadingMore || loading) return;
                const q = query.trim();
                void (async () => {
                  setLoadingMore(true);
                  const productQuery = filtersToQuery(filters, { search: q });
                  const paged = await productsService.queryProductsPaged({
                    ...productQuery,
                    limit: PAGE_SIZE,
                    offset: results.length,
                  });
                  setResults((prev) => [...prev, ...paged.items]);
                  setHasMore(paged.hasMore);
                  setLoadingMore(false);
                })();
              }}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator style={{ marginVertical: 12 }} color={colors.primary} />
                ) : null
              }
              ListEmptyComponent={
                <EmptyState
                  icon={Search}
                  title={`No matches for “${query}”`}
                  message={
                    chips.length
                      ? 'Try clearing filters or a different keyword.'
                      : 'Try another keyword like tank, paint, or wire.'
                  }
                  actionLabel={chips.length ? 'Clear filters' : undefined}
                  onAction={chips.length ? () => setFilters(EMPTY_FILTERS) : undefined}
                />
              }
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  width={cardW}
                  onPress={() => openProduct(item.id)}
                />
              )}
            />
          )}
        </>
      )}

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
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  search: { marginBottom: spacing.md },
  recentBlock: { gap: 4 },
  hint: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  recentItem: { ...typography.body, color: colors.text, paddingVertical: 8 },
  empty: { ...typography.body, color: colors.textSecondary, marginTop: 12 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  results: { ...typography.micro, color: colors.textSecondary },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBtnText: { ...typography.micro, color: colors.text },
  chipRow: { gap: 6, marginBottom: 10, alignItems: 'center' },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  selectedText: { ...typography.micro, color: colors.text },
  clear: { ...typography.micro, color: colors.primaryDark, paddingHorizontal: 4 },
  grid: { paddingBottom: spacing.xxl },
  row: { justifyContent: 'space-between', marginBottom: 10 },
});
