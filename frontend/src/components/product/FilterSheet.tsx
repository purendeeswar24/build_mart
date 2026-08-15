import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import {
  type FilterFacets,
  type ProductQuery,
  type SortOption,
} from '../../services/products.service';
import { colors, radii, spacing, typography } from '../../theme';

export type ActiveFilters = {
  brands: string[];
  attributes: Record<string, string[]>;
  priceMin?: number;
  priceMax?: number;
  sort: SortOption;
};

export const EMPTY_FILTERS: ActiveFilters = {
  brands: [],
  attributes: {},
  sort: 'popularity',
};

type Props = {
  visible: boolean;
  facets: FilterFacets | null;
  value: ActiveFilters;
  onClose: () => void;
  onApply: (next: ActiveFilters) => void;
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

export function FilterSheet({ visible, facets, value, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<ActiveFilters>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const toggleBrand = (brand: string) => {
    setDraft((d) => ({
      ...d,
      brands: d.brands.includes(brand)
        ? d.brands.filter((b) => b !== brand)
        : [...d.brands, brand],
    }));
  };

  const toggleAttr = (key: string, val: string) => {
    setDraft((d) => {
      const current = d.attributes[key] ?? [];
      const next = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      return {
        ...d,
        attributes: { ...d.attributes, [key]: next },
      };
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Filters</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.section}>Sort</Text>
            <View style={styles.wrap}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setDraft((d) => ({ ...d, sort: opt.value }))}
                  style={[styles.chip, draft.sort === opt.value && styles.chipOn]}
                >
                  <Text style={[styles.chipText, draft.sort === opt.value && styles.chipTextOn]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.section}>Brand</Text>
            <View style={styles.wrap}>
              {(facets?.brands ?? []).map((brand) => (
                <Pressable
                  key={brand}
                  onPress={() => toggleBrand(brand)}
                  style={[styles.chip, draft.brands.includes(brand) && styles.chipOn]}
                >
                  <Text
                    style={[styles.chipText, draft.brands.includes(brand) && styles.chipTextOn]}
                  >
                    {brand}
                  </Text>
                </Pressable>
              ))}
            </View>

            {(facets?.attributeKeys ?? []).map((attr) => (
              <View key={attr.key}>
                <Text style={styles.section}>{attr.label}</Text>
                <View style={styles.wrap}>
                  {attr.values.map((val) => {
                    const on = (draft.attributes[attr.key] ?? []).includes(val);
                    return (
                      <Pressable
                        key={val}
                        onPress={() => toggleAttr(attr.key, val)}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{val}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <Text style={styles.section}>
              Price range (₹{facets?.priceMin ?? 0} – ₹{facets?.priceMax ?? 0})
            </Text>
            <View style={styles.priceRow}>
              <TextInput
                keyboardType="number-pad"
                placeholder="Min"
                placeholderTextColor={colors.textMuted}
                value={draft.priceMin != null ? String(draft.priceMin) : ''}
                onChangeText={(t) =>
                  setDraft((d) => ({
                    ...d,
                    priceMin: t ? Number(t) : undefined,
                  }))
                }
                style={styles.priceInput}
              />
              <Text style={styles.to}>to</Text>
              <TextInput
                keyboardType="number-pad"
                placeholder="Max"
                placeholderTextColor={colors.textMuted}
                value={draft.priceMax != null ? String(draft.priceMax) : ''}
                onChangeText={(t) =>
                  setDraft((d) => ({
                    ...d,
                    priceMax: t ? Number(t) : undefined,
                  }))
                }
                style={styles.priceInput}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.clearBtn}
              onPress={() => setDraft({ ...EMPTY_FILTERS, sort: 'popularity' })}
            >
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
            <Pressable
              style={styles.applyBtn}
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            >
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function filtersToQuery(
  filters: ActiveFilters,
  base: Pick<ProductQuery, 'categoryId' | 'search'> = {},
): ProductQuery {
  const attributes = Object.fromEntries(
    Object.entries(filters.attributes).filter(([, v]) => v.length > 0),
  );
  return {
    ...base,
    brands: filters.brands.length ? filters.brands : undefined,
    attributes: Object.keys(attributes).length ? attributes : undefined,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    sort: filters.sort,
  };
}

export function activeFilterChips(filters: ActiveFilters): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];
  for (const b of filters.brands) chips.push({ key: `brand:${b}`, label: b });
  for (const [attr, values] of Object.entries(filters.attributes)) {
    for (const v of values) chips.push({ key: `attr:${attr}:${v}`, label: v });
  }
  if (filters.priceMin != null || filters.priceMax != null) {
    chips.push({
      key: 'price',
      label: `₹${filters.priceMin ?? 0}–₹${filters.priceMax ?? '∞'}`,
    });
  }
  return chips;
}

export function removeChip(filters: ActiveFilters, chipKey: string): ActiveFilters {
  if (chipKey.startsWith('brand:')) {
    const brand = chipKey.slice(6);
    return { ...filters, brands: filters.brands.filter((b) => b !== brand) };
  }
  if (chipKey.startsWith('attr:')) {
    const [, attr, ...rest] = chipKey.split(':');
    const val = rest.join(':');
    return {
      ...filters,
      attributes: {
        ...filters.attributes,
        [attr]: (filters.attributes[attr] ?? []).filter((v) => v !== val),
      },
    };
  }
  if (chipKey === 'price') {
    return { ...filters, priceMin: undefined, priceMax: undefined };
  }
  return filters;
}

export function sortLabel(sort: SortOption) {
  return SORT_OPTIONS.find((s) => s.value === sort)?.label ?? 'Popularity';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { padding: spacing.lg, paddingBottom: 24 },
  section: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 11, color: '#4A4636' },
  chipTextOn: { color: colors.primary, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
  },
  to: { ...typography.caption, color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  clearBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  clearText: { fontSize: 13, color: colors.text },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  applyText: { fontSize: 13, fontWeight: '700', color: colors.primaryInk },
});
