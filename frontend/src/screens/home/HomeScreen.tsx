import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ClipboardList, Droplets, Package, Truck, Zap } from 'lucide-react-native';
import { AppHeader } from '../../components/layout/AppHeader';
import { HomeSkeleton } from '../../components/layout/Skeleton';
import { FadeIn } from '../../components/motion/FadeIn';
import { ProductCard } from '../../components/product/ProductCard';
import { CategoryTile } from '../../components/product/CategoryTile';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { productsService, type CatalogCategory, type ProductCardModel } from '../../services/products.service';
import { useCart } from '../../hooks/useCart';
import { useAddress } from '../../hooks/useAddress';
import { colors, radii, shadows, typography } from '../../theme';
import type { ImageSourcePropType } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 20;
const CARD_W = 168;
const CARD_GAP = 16;
const BANNER_W = SCREEN_W - H_PAD * 2;

type Props = {
  onSearchPress?: () => void;
  onCartPress?: () => void;
  onProfilePress?: () => void;
  onCategoryPress?: (id: string, title: string) => void;
  onProductPress?: (productId: string) => void;
  onCapacityPress?: () => void;
  onCategoriesTab?: () => void;
  onLocationPress?: () => void;
};

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, '0');
}

function SaleCountdown() {
  const [endsAt] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  });
  const [now, setNow] = useState(Date.now());
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [now, pulse]);

  const left = Math.max(0, endsAt - now);
  const hrs = Math.floor(left / 3_600_000);
  const mins = Math.floor((left % 3_600_000) / 60_000);
  const secs = Math.floor((left % 60_000) / 1000);

  return (
    <View style={styles.saleBottom}>
      <View style={styles.timerBox}>
        <Text style={styles.timerNum}>{pad2(hrs)}</Text>
        <Text style={styles.timerLbl}>Hrs</Text>
      </View>
      <View style={styles.timerBox}>
        <Text style={styles.timerNum}>{pad2(mins)}</Text>
        <Text style={styles.timerLbl}>Min</Text>
      </View>
      <Animated.View style={[styles.timerBox, { transform: [{ scale: pulse }] }]}>
        <Text style={styles.timerNum}>{pad2(secs)}</Text>
        <Text style={styles.timerLbl}>Sec</Text>
      </Animated.View>
    </View>
  );
}

function HeroWash({ children }: { children: React.ReactNode }) {
  const a = useRef(new Animated.Value(0.35)).current;
  const b = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(a, { toValue: 0.55, duration: 2200, useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.08, duration: 2200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(a, { toValue: 0.3, duration: 2200, useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.4, duration: 2200, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a, b]);

  return (
    <View style={styles.hero}>
      <Animated.View style={[styles.heroWashA, { opacity: a }]} />
      <Animated.View style={[styles.heroWashB, { opacity: b }]} />
      {children}
    </View>
  );
}

export function HomeScreen({
  onSearchPress,
  onCartPress,
  onProfilePress,
  onCategoryPress,
  onProductPress,
  onCapacityPress,
  onCategoriesTab,
  onLocationPress,
}: Props) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<ScrollView>(null);
  const { count } = useCart();
  const { selected, deliveryStatus } = useAddress();
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<ImageSourcePropType[]>([]);
  const [saleBanner, setSaleBanner] = useState<ImageSourcePropType | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [trending, setTrending] = useState<ProductCardModel[]>([]);
  const [bestSellers, setBestSellers] = useState<ProductCardModel[]>([]);
  const [featured, setFeatured] = useState<ProductCardModel[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const feed = await productsService.getHomeFeed();
      if (!alive) return;
      setBanners(feed.banners);
      setSaleBanner(feed.saleBanner);
      setCategories(feed.categories.slice(0, 8));
      setTrending(feed.trending);
      setBestSellers(feed.bestSellers);
      setFeatured(feed.featured);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => {
      setBannerIndex((i) => {
        const next = (i + 1) % banners.length;
        bannerRef.current?.scrollTo({ x: next * (BANNER_W + H_PAD), animated: true });
        return next;
      });
    }, 4200);
    return () => clearInterval(id);
  }, [banners.length]);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setBannerIndex(Math.round(x / (BANNER_W + H_PAD)));
  };

  const eta = deliveryStatus?.message?.includes('Delivery')
    ? deliveryStatus.message.replace('mins', 'mins')
    : 'Delivery in 30 mins';

  const openAllCategories = () => {
    onCategoriesTab?.() ??
      onCategoryPress?.(categories[0]?.id ?? 'c-tanks', categories[0]?.name ?? 'All');
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        city={selected?.city ?? 'Hyderabad'}
        etaLabel={eta}
        cartCount={count}
        onSearchPress={onSearchPress}
        onCartPress={onCartPress}
        onProfilePress={onProfilePress}
        onLocationPress={onLocationPress}
        variant="light"
      />

      {loading ? (
        <View style={styles.loader}>
          <HomeSkeleton />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <FadeIn>
            <HeroWash>
              <Text style={styles.heroEyebrow}>INDIA’S FAST LANE FOR SITES</Text>
              <Text style={styles.heroTitle}>
                30-minute delivery for <Text style={styles.heroAccent}>materials</Text>
              </Text>
              <Text style={styles.heroSub}>
                Pipes, cement, wires, paints & fittings — no minimum quantity.
              </Text>
              <View style={styles.heroPills}>
                <View style={styles.pill}>
                  <Zap size={12} color={colors.primaryDark} />
                  <Text style={styles.pillText}>30-min delivery</Text>
                </View>
                <View style={styles.pill}>
                  <Package size={12} color={colors.primaryDark} />
                  <Text style={styles.pillText}>Any quantity</Text>
                </View>
              </View>
            </HeroWash>
          </FadeIn>

          <FadeIn delay={80}>
            <ScrollView
              ref={bannerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onBannerScroll}
              scrollEventThrottle={16}
              style={styles.bannerScroller}
              decelerationRate="fast"
            >
              {banners.map((src, i) => (
                <View key={i} style={styles.bannerSlide}>
                  <Image source={src} style={styles.bannerImage} contentFit="cover" />
                  <View style={styles.bannerOverlay}>
                    <Text style={styles.bannerEyebrow}>30-MIN DELIVERY</Text>
                    <Text style={styles.bannerTitle}>
                      {i === 0 ? 'Site materials, ready when you are' : 'Pipes, paints & hardware'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.dots}>
              {banners.map((_, i) => (
                <View key={i} style={[styles.dot, i === bannerIndex && styles.dotActive]} />
              ))}
            </View>
          </FadeIn>

          <FadeIn delay={120}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Shop by category</Text>
              <Pressable onPress={openAllCategories}>
                <Text style={styles.seeAll}>View all</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
              decelerationRate="fast"
            >
              {categories.map((cat, i) => (
                <FadeIn key={cat.id} delay={i * 40} from="left" distance={16} duration={360}>
                  <CategoryTile
                    category={cat}
                    mini
                    compact
                    onPress={() => onCategoryPress?.(cat.id, cat.name)}
                  />
                </FadeIn>
              ))}
              <Pressable
                style={styles.bookHelpMini}
                onPress={onCapacityPress}
                accessibilityRole="button"
                accessibilityLabel="Tank capacity calculator"
              >
                <View style={styles.bookHelpIconMini}>
                  <Droplets size={20} color={colors.primaryInk} />
                </View>
                <Text style={styles.bookHelpLabel}>Tank</Text>
              </Pressable>
            </ScrollView>
          </FadeIn>

          <FadeIn delay={160}>
            <Section
              title="Trending products"
              badge="HOT"
              products={trending}
              onProductPress={onProductPress}
              onOpenCart={onCartPress}
              onAction={openAllCategories}
            />
          </FadeIn>

          <FadeIn delay={200}>
            <SectionHeader
              title="Limited offers"
              badge="SALE"
              actionLabel="Shop deals"
              onAction={() => onProductPress?.(featured[0]?.id ?? trending[0]?.id ?? '')}
            />
            <View style={styles.saleBlock}>
              <View style={styles.saleTop}>
                <Text style={styles.saleEyebrow}>LIMITED SALE</Text>
                <Text style={styles.saleTitle}>Get 25% off — tonight only</Text>
              </View>
              <SaleCountdown />
              {saleBanner ? (
                <Image source={saleBanner} style={styles.saleImg} contentFit="cover" />
              ) : null}
            </View>
          </FadeIn>

          <FadeIn delay={240}>
            <Section
              title="Best sellers"
              badge="TOP"
              products={bestSellers}
              onProductPress={onProductPress}
              onOpenCart={onCartPress}
              onAction={openAllCategories}
            />
          </FadeIn>

          <FadeIn delay={280}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Featured products</Text>
            </View>
            <View style={styles.featuredGrid}>
              {featured.map((p, i) => (
                <FadeIn key={p.id} delay={i * 50} distance={14}>
                  <ProductCard
                    product={p}
                    width={(SCREEN_W - H_PAD * 2 - CARD_GAP) / 2}
                    onPress={() => onProductPress?.(p.id)}
                    onAddPress={() => onProductPress?.(p.id)}
                    onOpenCart={onCartPress}
                  />
                </FadeIn>
              ))}
            </View>
          </FadeIn>

          <FadeIn delay={320}>
            <Text style={styles.howTitle}>How it works</Text>
            <View style={styles.howRow}>
              <HowCard
                icon={<Package size={20} color={colors.primaryInk} />}
                title="Browse & discover"
                body="Categories built for site needs"
              />
              <HowCard
                icon={<ClipboardList size={20} color={colors.primaryInk} />}
                title="Order instantly"
                body="No MOQ · checkout in minutes"
              />
              <HowCard
                icon={<Truck size={20} color={colors.primaryInk} />}
                title="Fast delivery"
                body="Doorstep in ~30 minutes"
              />
            </View>
          </FadeIn>

          <Pressable style={styles.toolBanner} onPress={onCapacityPress}>
            <Text style={styles.toolTitle}>Need a water tank?</Text>
            <Text style={styles.toolSub}>Capacity calculator → recommend in-stock sizes</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function HowCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.howCard}>
      <View style={styles.howIcon}>{icon}</View>
      <Text style={styles.howCardTitle}>{title}</Text>
      <Text style={styles.howCardBody}>{body}</Text>
    </View>
  );
}

function Section({
  title,
  badge,
  products,
  onProductPress,
  onOpenCart,
  onAction,
}: {
  title: string;
  badge?: string;
  products: ProductCardModel[];
  onProductPress?: (id: string) => void;
  onOpenCart?: () => void;
  onAction?: () => void;
}) {
  return (
    <>
      <SectionHeader title={title} badge={badge} onAction={onAction} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hRow}
        decelerationRate="fast"
      >
        {products.map((p, i) => (
          <FadeIn key={p.id} delay={i * 45} from="left" distance={18} duration={380}>
            <ProductCard
              product={p}
              width={CARD_W}
              onPress={() => onProductPress?.(p.id)}
              onAddPress={() => onProductPress?.(p.id)}
              onOpenCart={onOpenCart}
            />
          </FadeIn>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1 },
  content: { paddingBottom: 48 },
  hero: {
    paddingHorizontal: H_PAD,
    paddingTop: 20,
    paddingBottom: 16,
    marginHorizontal: H_PAD,
    marginTop: 12,
    borderRadius: radii.xl,
    backgroundColor: colors.sky,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  heroWashA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
  },
  heroWashB: {
    position: 'absolute',
    bottom: -50,
    left: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.skyDeep,
  },
  heroEyebrow: {
    ...typography.micro,
    color: colors.secondary,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroTitle: {
    ...typography.display,
    color: colors.text,
  },
  heroAccent: {
    color: colors.primaryDark,
  },
  heroSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 10,
    maxWidth: 320,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  pillText: {
    ...typography.micro,
    color: colors.text,
  },
  bannerScroller: { paddingLeft: H_PAD, marginTop: 12 },
  bannerSlide: {
    width: BANNER_W,
    height: 168,
    marginRight: H_PAD,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.soft,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    padding: 18,
  },
  bannerEyebrow: {
    ...typography.micro,
    color: colors.primary,
    fontWeight: '800',
    marginBottom: 6,
  },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: colors.textInverse },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 18 },
  sectionHead: {
    paddingHorizontal: H_PAD,
    paddingTop: 28,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { ...typography.subheading, color: colors.text },
  seeAll: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '700',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  catRow: {
    paddingHorizontal: H_PAD,
    gap: 12,
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  bookHelpMini: { width: 76, alignItems: 'center', gap: 4 },
  bookHelpIconMini: {
    width: 76,
    height: 76,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookHelpLabel: {
    ...typography.micro,
    fontSize: 10,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  hRow: { paddingHorizontal: H_PAD, gap: CARD_GAP, paddingBottom: 4 },
  saleBlock: {
    marginHorizontal: H_PAD,
    marginTop: 8,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
    ...shadows.card,
  },
  saleTop: { padding: 18, paddingBottom: 10 },
  saleEyebrow: { ...typography.micro, color: colors.primary, fontWeight: '800' },
  saleTitle: { fontSize: 18, fontWeight: '800', color: colors.textInverse, marginTop: 6 },
  saleBottom: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  timerBox: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 52,
  },
  timerNum: { fontSize: 16, fontWeight: '900', color: colors.primaryInk },
  timerLbl: { fontSize: 9, fontWeight: '700', color: colors.primaryInk, marginTop: 2 },
  saleImg: { height: 90, width: '100%', opacity: 0.35 },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: H_PAD,
    gap: CARD_GAP,
  },
  howTitle: {
    ...typography.subheading,
    color: colors.text,
    textAlign: 'center',
    marginTop: 36,
    marginBottom: 16,
  },
  howRow: {
    flexDirection: 'row',
    paddingHorizontal: H_PAD,
    gap: 12,
  },
  howCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    ...shadows.soft,
  },
  howIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howCardTitle: {
    ...typography.micro,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  howCardBody: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 13,
  },
  toolBanner: {
    marginHorizontal: H_PAD,
    marginTop: 28,
    marginBottom: 8,
    padding: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  toolTitle: { ...typography.subheading, color: colors.text, fontSize: 16 },
  toolSub: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
});
