import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronDown, Heart, PackageSearch, Puzzle, Share2 } from 'lucide-react-native';
import {
  productsService,
  type ProductCardModel,
  type ProductDetailModel,
} from '../../services/products.service';
import { ProductCard } from '../../components/product/ProductCard';
import { EmptyState } from '../../components/layout/EmptyState';
import { HomeSkeleton } from '../../components/layout/Skeleton';
import { FadeIn } from '../../components/motion/FadeIn';
import { SafeImage } from '../../components/media/SafeImage';
import { useCart } from '../../hooks/useCart';
import { useFeedback } from '../../hooks/useFeedback';
import { useWishlist } from '../../hooks/useWishlist';
import { discountPercent, formatPrice } from '../../utils/formatPrice';
import { useLayout } from '../../hooks/useLayout';
import { colors, spacing, typography } from '../../theme';
import { a11y } from '../../theme/a11y';

type Props = {
  productId: string;
  onAdded?: () => void;
  onProductPress?: (productId: string) => void;
};

export function ProductDetailScreen({ productId, onAdded, onProductPress }: Props) {
  const { width, gutter } = useLayout();
  const heroW = Math.max(width - gutter * 2, 240);
  const [detail, setDetail] = useState<ProductDetailModel | null>(null);
  const [similar, setSimilar] = useState<ProductCardModel[]>([]);
  const [accessories, setAccessories] = useState<ProductCardModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [openSection, setOpenSection] = useState<string | null>('description');
  const [bundleSelected, setBundleSelected] = useState<Record<string, boolean>>({});
  const { addItem, addMany } = useCart();
  const { showToast, bounceCart } = useFeedback();
  const { isSaved, toggle: toggleWishlist } = useWishlist();
  const liked = isSaved(productId);
  const heartScale = useRef(new Animated.Value(1)).current;
  const [addedFlash, setAddedFlash] = useState(false);

  const popHeart = () => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.35,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
    ]).start();
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [data, sim, acc] = await Promise.all([
        productsService.getProductDetail(productId),
        productsService.getSimilarProducts(productId),
        productsService.getAccessories(productId),
      ]);
      if (!alive) return;
      setDetail(data);
      setSimilar(sim);
      setAccessories(acc);
      setVariantId(data?.defaultVariantId ?? null);
      setImageIndex(0);
      setBundleSelected(Object.fromEntries(acc.map((a) => [a.id, true])));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  const variant = useMemo(
    () => detail?.variants.find((v) => v.id === variantId) ?? detail?.variants[0],
    [detail, variantId],
  );

  const images = useMemo(() => {
    if (!variant) return [];
    // Repeat primary image as carousel placeholders until multi-angle assets exist
    return [variant.image, variant.image, variant.image];
  }, [variant]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <HomeSkeleton />
      </View>
    );
  }

  if (!detail || !variant) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon={PackageSearch}
          title="Product not found"
          message="This item may have been removed or is temporarily unavailable."
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            void (async () => {
              const data = await productsService.getProductDetail(productId);
              setDetail(data);
              setVariantId(data?.variants[0]?.id ?? null);
              setLoading(false);
            })();
          }}
        />
      </View>
    );
  }

  const off = discountPercent(variant.mrp, variant.selling_price);
  const pills = Object.entries(variant.attributes).map(([k, v]) => {
    if (k.includes('capacity') || k.includes('litre')) return `${v} litres`;
    if (k.includes('layer')) return `${v} layers`;
    if (k.includes('volume')) return `${v}L`;
    return String(v);
  });
  const outOfStock = variant.stock_qty <= 0;

  const toggle = (key: string) => setOpenSection((s) => (s === key ? null : key));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
        <View style={styles.topActions}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => {
              void toggleWishlist(productId).then(() => {
                popHeart();
                showToast(liked ? 'Removed from wishlist' : 'Saved to wishlist ❤️', {
                  tone: 'success',
                });
              });
            }}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Remove from wishlist' : 'Add to wishlist'}
            hitSlop={a11y.hitSlop}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Heart
                size={18}
                color={liked ? colors.danger : colors.text}
                fill={liked ? colors.danger : 'transparent'}
              />
            </Animated.View>
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Share product"
            hitSlop={a11y.hitSlop}
            onPress={() => {
              void Share.share({
                message: `Check out ${detail.title} on BuildMart — ${formatPrice(variant.selling_price)}`,
              });
            }}
          >
            <Share2 size={18} color={colors.text} />
          </Pressable>
        </View>

        <FadeIn>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            setImageIndex(Math.round(e.nativeEvent.contentOffset.x / heroW));
          }}
        >
          {images.map((src, i) => (
            <View key={i} style={[styles.hero, { width: heroW, backgroundColor: variant.imageTint }]}>
              <SafeImage
                source={src}
                style={styles.heroImage}
                contentFit="contain"
                fallbackTint={variant.imageTint}
              />
              {detail.warrantyYears && i === 0 ? (
                <View style={styles.warranty}>
                  <Text style={styles.warrantyText}>{detail.warrantyYears}-YR WARRANTY</Text>
                </View>
              ) : null}
              <View style={styles.deliveryChip}>
                <Text style={styles.deliveryChipText}>⚡ 30 MIN</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        </FadeIn>
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === imageIndex && styles.dotOn]} />
          ))}
        </View>

        <Text style={styles.brand}>{detail.brand}</Text>
        <Text style={styles.title}>{detail.title}</Text>

        <View style={styles.pills}>
          {pills.map((p) => (
            <View key={p} style={styles.pill}>
              <Text style={styles.pillText}>{p}</Text>
            </View>
          ))}
        </View>

        {detail.variants.length > 1 ? (
          <>
            <Text style={styles.sectionLabel}>Options</Text>
            <View style={styles.variantRow}>
              {detail.variants.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => setVariantId(v.id)}
                  style={[styles.variant, variant.id === v.id && styles.variantOn]}
                >
                  <Text style={[styles.variantText, variant.id === v.id && styles.variantTextOn]}>
                    {v.variant_label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(variant.selling_price)}</Text>
          <Text style={styles.mrp}>{formatPrice(variant.mrp)}</Text>
          <Text style={styles.off}>{off}% off</Text>
        </View>
        <Text style={styles.tax}>
          Inclusive of all taxes · {outOfStock ? 'Out of stock' : `In stock (${variant.stock_qty})`}
        </Text>

        {accessories.length > 0 ? (
          <View style={styles.bundleCard}>
            <View style={styles.bundleHead}>
              <Puzzle size={16} color={colors.primaryDark} />
              <Text style={styles.bundleTitle}>Complete your setup</Text>
            </View>
            {accessories.map((p) => {
              const on = !!bundleSelected[p.id];
              return (
                <Pressable
                  key={p.id}
                  style={styles.bundleRow}
                  onPress={() =>
                    setBundleSelected((s) => ({ ...s, [p.id]: !s[p.id] }))
                  }
                >
                  <View style={[styles.check, on && styles.checkOn]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bundleItemTitle}>{p.title}</Text>
                    <Text style={styles.bundleItemPrice}>{formatPrice(p.price)}</Text>
                  </View>
                  <Pressable onPress={() => onProductPress?.(p.id)}>
                    <Text style={styles.viewLink}>View</Text>
                  </Pressable>
                </Pressable>
              );
            })}
            <Pressable
              style={styles.addAll}
              onPress={() => {
                const items = accessories
                  .filter((p) => bundleSelected[p.id])
                  .map((p) => ({
                    productId: p.id,
                    variantLabel: p.defaultVariantLabel,
                    qty: 1,
                    unitPrice: p.price,
                  }));
                if (!items.length) return;
                addMany(items);
                bounceCart();
                showToast(`Added ${items.length} items to cart`, {
                  tone: 'success',
                  action: onAdded ? { label: 'View cart', onPress: onAdded } : undefined,
                });
                onAdded?.();
              }}
            >
              <Text style={styles.addAllText}>Add all to cart</Text>
            </Pressable>
          </View>
        ) : null}

        <Accordion
          title="Description"
          open={openSection === 'description'}
          onToggle={() => toggle('description')}
        >
          <Text style={styles.sectionBody}>{detail.description}</Text>
        </Accordion>
        <Accordion
          title="Specifications"
          open={openSection === 'specs'}
          onToggle={() => toggle('specs')}
        >
          {Object.entries(variant.attributes).map(([k, v]) => (
            <View key={k} style={styles.specRow}>
              <Text style={styles.specKey}>{k.replace(/_/g, ' ')}</Text>
              <Text style={styles.specVal}>{String(v)}</Text>
            </View>
          ))}
          {detail.material ? (
            <View style={styles.specRow}>
              <Text style={styles.specKey}>material</Text>
              <Text style={styles.specVal}>{detail.material}</Text>
            </View>
          ) : null}
        </Accordion>
        <Accordion
          title="Warranty"
          open={openSection === 'warranty'}
          onToggle={() => toggle('warranty')}
        >
          <Text style={styles.sectionBody}>
            {detail.warrantyYears
              ? `${detail.warrantyYears}-year manufacturer warranty against manufacturing defects.`
              : 'Standard manufacturer warranty applies. Keep your invoice for claims.'}
          </Text>
        </Accordion>
        <Accordion
          title="Delivery & Returns"
          open={openSection === 'delivery'}
          onToggle={() => toggle('delivery')}
        >
          <Text style={styles.sectionBody}>
            30-minute delivery in serviceable pincodes. Easy returns within 7 days for unused,
            unopened items.
          </Text>
        </Accordion>

        {accessories.length > 0 ? (
          <>
            <Text style={styles.blockTitle}>Compatible accessories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
              {accessories.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  width={140}
                  onPress={() => onProductPress?.(p.id)}
                  onAddPress={() => addItem(p.id, p.defaultVariantLabel, 1)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {similar.length > 0 ? (
          <>
            <Text style={styles.blockTitle}>Similar products</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
              {similar.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  width={140}
                  onPress={() => onProductPress?.(p.id)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.stepper}>
          <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.stepBtn}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.qty}>{qty}</Text>
          <Pressable onPress={() => setQty((q) => q + 1)} style={styles.stepBtn}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
        <Pressable
          style={[
            styles.addBtn,
            outOfStock && styles.addDisabled,
            addedFlash && styles.addSuccess,
          ]}
          disabled={outOfStock}
          onPress={() => {
            addItem(detail.id, variant.variant_label, qty, variant.selling_price);
            bounceCart();
            setAddedFlash(true);
            showToast('Added to cart', {
              tone: 'success',
              action: onAdded ? { label: 'View cart', onPress: onAdded } : undefined,
            });
            onAdded?.();
            setTimeout(() => setAddedFlash(false), 1000);
          }}
        >
          <Text style={[styles.addText, addedFlash && styles.addSuccessText]}>
            {outOfStock ? 'Out of stock' : addedFlash ? 'Added ✓' : 'Add to cart'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const rotate = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: open ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [open, rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.acc}>
      <Pressable style={styles.accHead} onPress={onToggle}>
        <Text style={styles.accTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <ChevronDown size={16} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>
      {open ? <View style={styles.accBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 20,
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 8,
  },
  topActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, paddingTop: 4 },
  iconBtn: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 22,
  },
  hero: {
    height: 280,
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 0,
  },
  heroImage: { width: '100%', height: '100%' },
  warranty: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.secondary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  warrantyText: { fontSize: 9, color: colors.primary, fontWeight: '700' },
  deliveryChip: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  deliveryChipText: { fontSize: 10, fontWeight: '800', color: colors.primaryInk },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.primary, width: 16 },
  brand: { ...typography.micro, color: colors.textSecondary, letterSpacing: 0.5, marginTop: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pillText: { fontSize: 10, color: colors.primaryInk, fontWeight: '700' },
  sectionLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 14, marginBottom: 6 },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variant: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  variantOn: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  variantText: { fontSize: 12, color: colors.textSecondary },
  variantTextOn: { color: colors.primary, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 16 },
  price: { fontSize: 24, fontWeight: '800', color: colors.text },
  mrp: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through' },
  off: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },
  tax: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  bundleCard: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  bundleHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bundleTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  bundleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  check: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  bundleItemTitle: { fontSize: 12, color: colors.text },
  bundleItemPrice: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  viewLink: { fontSize: 11, color: colors.primaryDark, fontWeight: '700' },
  addAll: {
    marginTop: 4,
    backgroundColor: colors.secondary,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addAllText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  acc: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  accHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  accBody: { paddingBottom: 10 },
  sectionBody: { ...typography.caption, color: colors.textSecondary },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  specKey: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
  specVal: { ...typography.caption, color: colors.text, fontWeight: '600' },
  blockTitle: { ...typography.subheading, color: colors.text, marginTop: 18, marginBottom: 8 },
  hRow: { gap: 10, paddingBottom: 4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
  },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  stepText: { fontSize: 14, color: '#4A4636' },
  qty: { fontSize: 13, color: colors.text, paddingHorizontal: 6 },
  addBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  addSuccess: { backgroundColor: colors.success },
  addDisabled: { opacity: 0.45 },
  addText: { fontSize: 13, fontWeight: '600', color: colors.primaryInk },
  addSuccessText: { color: colors.textInverse },
});
