import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import { useWishlist } from '../../hooks/useWishlist';
import { productsService } from '../../services/products.service';
import { ProductCard } from '../../components/product/ProductCard';
import { EmptyState } from '../../components/layout/EmptyState';
import { colors, spacing } from '../../theme';
import { useCart } from '../../hooks/useCart';

const CARD_W = 160;

type Props = {
  onProductPress?: (productId: string) => void;
  onBrowse?: () => void;
};

export function WishlistScreen({ onProductPress, onBrowse }: Props) {
  const { productIds, hydrated, toggle } = useWishlist();
  const { addItem } = useCart();
  const catalog = useMemo(() => productsService.listSeedCards(), []);

  const products = useMemo(
    () => catalog.filter((p) => productIds.has(p.id)),
    [catalog, productIds],
  );

  if (!hydrated) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!products.length) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon={Heart}
          title="Wishlist is empty"
          message="Tap the heart on any product to save it here."
          actionLabel="Browse materials"
          onAction={onBrowse}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View>
            <ProductCard
              product={item}
              width={CARD_W}
              onPress={() => onProductPress?.(item.id)}
              onAddPress={() => {
                addItem(item.id, undefined, 1, item.price);
              }}
            />
            <Pressable style={styles.remove} onPress={() => void toggle(item.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingBottom: 40 },
  row: { justifyContent: 'space-between', marginBottom: 8 },
  remove: { alignItems: 'center', paddingVertical: 6, marginBottom: 8 },
  removeText: { fontSize: 11, color: colors.danger, fontWeight: '600' },
});
