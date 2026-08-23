import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Droplets } from 'lucide-react-native';
import { productsService, type ProductCardModel } from '../../services/products.service';
import { ProductCard } from '../../components/product/ProductCard';
import { useLayout } from '../../hooks/useLayout';
import { colors, radii, spacing, typography } from '../../theme';

const LITRES_PER_PERSON_PER_DAY = 142.5;

type Props = {
  onProductPress?: (productId: string) => void;
  onViewAll?: (capacity: number) => void;
};

export function CapacityCalculatorScreen({ onProductPress, onViewAll }: Props) {
  const { width } = useLayout();
  const cardW = (width - 32 - 10) / 2;
  const [people, setPeople] = useState('4');
  const [bufferDays, setBufferDays] = useState('1');
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<ProductCardModel[]>([]);
  const [target, setTarget] = useState<number | null>(null);

  const dailyNeed = useMemo(() => {
    const n = Math.max(1, Number(people) || 1);
    return Math.round(n * LITRES_PER_PERSON_PER_DAY);
  }, [people]);

  const recommend = async () => {
    setLoading(true);
    const days = Math.max(1, Number(bufferDays) || 1);
    const need = dailyNeed * days;
    setTarget(need);

    const tanks = await productsService.queryProducts({
      categoryId: 'c-tanks',
      sort: 'price_asc',
    });

    const scored = tanks
      .map((p) => {
        const cap =
          Number(String(p.pills ?? '').match(/(\d+)\s*L/i)?.[1]) ||
          Number(p.defaultVariantLabel.replace(/\D/g, '')) ||
          0;
        return { p, cap, delta: Math.abs(cap - need) };
      })
      .filter((x) => x.cap > 0)
      .sort((a, b) => a.delta - b.delta || a.cap - b.cap);

    const above = scored.filter((x) => x.cap >= need);
    setRecs((above.length ? above : scored).slice(0, 6).map((x) => x.p));
    setLoading(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Droplets size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Capacity calculator</Text>
          <Text style={styles.heroSub}>
            Uses {LITRES_PER_PERSON_PER_DAY}L / person / day (135–150L range)
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Family / site members</Text>
        <TextInput
          value={people}
          onChangeText={setPeople}
          keyboardType="number-pad"
          style={styles.input}
        />
        <Text style={styles.label}>Storage buffer (days)</Text>
        <TextInput
          value={bufferDays}
          onChangeText={setBufferDays}
          keyboardType="number-pad"
          style={styles.input}
        />
        <Text style={styles.calc}>
          Daily need ≈ <Text style={styles.calcStrong}>{dailyNeed}L</Text>
          {target ? ` · Target ≈ ${target}L` : ''}
        </Text>
        <Pressable style={styles.cta} onPress={recommend}>
          <Text style={styles.ctaText}>View recommended tanks</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
      ) : (
        <FlatList
          data={recs}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          ListHeaderComponent={
            recs.length ? <Text style={styles.results}>Closest in-stock matches</Text> : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {target
                ? 'No tank matches found. Browse Water Tanks.'
                : 'Enter members and tap recommend.'}
            </Text>
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              width={cardW}
              onPress={() => onProductPress?.(item.id)}
            />
          )}
        />
      )}

      {target ? (
        <Pressable style={styles.browse} onPress={() => onViewAll?.(target)}>
          <Text style={styles.browseText}>Browse all water tanks</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.secondary,
  },
  heroTitle: { fontSize: 15, fontWeight: '700', color: colors.textInverse },
  heroSub: { ...typography.micro, color: '#8B889B', marginTop: 2 },
  form: { padding: spacing.lg },
  label: { ...typography.caption, color: colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
  },
  calc: { ...typography.caption, color: colors.textSecondary, marginTop: 12 },
  calcStrong: { color: colors.text, fontWeight: '700' },
  cta: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  ctaText: { fontWeight: '700', color: colors.primaryInk },
  results: {
    ...typography.subheading,
    color: colors.text,
    marginBottom: 10,
  },
  grid: { paddingHorizontal: spacing.lg, paddingBottom: 80 },
  row: { justifyContent: 'space-between', marginBottom: 10 },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginTop: 8,
  },
  browse: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  browseText: { color: colors.primary, fontWeight: '700' },
});
