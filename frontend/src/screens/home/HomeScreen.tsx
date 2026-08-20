import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { ArrowRight, ClipboardList, Droplets, MapPin, Package, Truck, Zap } from 'lucide-react-native';
import { AppHeader } from '../../components/layout/AppHeader';
import { ProductCard } from '../../components/product/ProductCard';
import { CategoryTile } from '../../components/product/CategoryTile';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { HScroll } from '../../components/layout/HScroll';
import { productsService, type CatalogCategory, type ProductCardModel } from '../../services/products.service';
import { useCart } from '../../hooks/useCart';
import { useAddress } from '../../hooks/useAddress';
import { useFeedback } from '../../hooks/useFeedback';
import { colors, radii, shadows, typography } from '../../theme';
import type { ImageSourcePropType } from 'react-native';

const HERO_IMAGE = require('../../../assets/home-page.png');
const ABOUT_IMAGE = require('../../../assets/about-collage.png');
const H_PAD = 20;
const CARD_W = 168;
const CARD_GAP = 26;
const WIDE_BP = 768;
const TANK_SIZES = [
  { litres: 500, productId: 'p1', variant: '500L', price: 5200 },
  { litres: 750, productId: 'p16', variant: '750L', price: 5899 },
  { litres: 1000, productId: 'p1', variant: '1000L', price: 8200 },
  { litres: 1500, productId: 'p1', variant: '1500L', price: 11200 },
  { litres: 2000, productId: 'p1', variant: '2000L', price: 14500 },
] as const;

const HYD_AREAS = ['HITEC City', 'Gachibowli', 'Banjara Hills', 'Secunderabad'] as const;

type Props = {
  onSearchPress?: () => void;
  onCartPress?: () => void;
  onProfilePress?: () => void;
  onCategoryPress?: (id: string, title: string) => void;
  onProductPress?: (productId: string) => void;
  onCapacityPress?: () => void;
  onCategoriesTab?: () => void;
  onLocationPress?: () => void;
  onAboutPress?: () => void;
};

function LocationFooterBadge({
  city,
  pincode,
  eta,
  compact,
  onPress,
}: {
  city: string;
  pincode: string;
  eta: string;
  compact: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={[styles.locBadge, compact && styles.locBadgeCompact]}>
      <View style={[styles.locRow, compact && styles.locRowCompact]}>
        <View style={styles.locMain}>
          <View style={styles.locTop}>
            <View style={styles.locIcon}>
              <MapPin size={16} color={colors.primaryInk} />
            </View>
            <View style={styles.locCopy}>
              <Text style={styles.locKicker}>DELIVERING TO</Text>
              <Text style={[styles.locCity, compact && styles.locCityCompact]}>{city}</Text>
              <Text style={styles.locMeta}>
                PIN {pincode} · {eta} · COD available
              </Text>
            </View>
          </View>
          <View style={styles.locPills}>
            {HYD_AREAS.map((area) => (
              <View key={area} style={styles.locPill}>
                <Text style={styles.locPillText}>{area}</Text>
              </View>
            ))}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select your address"
          onPress={onPress}
          style={[styles.locBtn, compact && styles.locBtnCompact]}
        >
          <Text style={styles.locBtnText}>Select your address</Text>
        </Pressable>
      </View>
    </View>
  );
}

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
  const b = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(a, { toValue: 0.55, duration: 2200, useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.28, duration: 2200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(a, { toValue: 0.3, duration: 2200, useNativeDriver: true }),
          Animated.timing(b, { toValue: 0.12, duration: 2200, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a, b]);

  return (
    <View style={styles.heroWash}>
      <Animated.View style={[styles.heroWashA, { opacity: a }]} />
      <Animated.View style={[styles.heroWashB, { opacity: b }]} />
      {children}
    </View>
  );
}

function BuildmartHero({ isWide, compact }: { isWide: boolean; compact: boolean }) {
  return (
    <View style={[styles.hero, isWide ? styles.heroWide : styles.heroNarrow]}>
      <HeroWash>
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
          <Text style={styles.heroEyebrow}>INDIA’S FAST LANE FOR SITES</Text>
          <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
            30-minute delivery for <Text style={styles.heroAccent}>materials</Text>
          </Text>
          <Text style={[styles.heroSub, compact && styles.heroSubCompact]}>
            Pipes, cement, wires, paints & fittings — no minimum quantity.
          </Text>
          <Text style={[styles.heroDescription, compact && styles.heroDescCompact]}>
            Fast, reliable delivery of construction materials directly to your site. Same-day ordering available for most areas.
          </Text>
          <View style={styles.heroPills}>
            <View style={[styles.pill, styles.pillDelivery, compact && styles.pillCompact]}>
              <Zap size={12} color={colors.primaryDark} />
              <Text style={styles.pillText} numberOfLines={1}>
                30-min delivery
              </Text>
            </View>
            <View style={[styles.pill, compact && styles.pillCompact]}>
              <Package size={12} color={colors.primaryDark} />
              <Text style={styles.pillText} numberOfLines={1}>
                Any quantity
              </Text>
            </View>
          </View>
        </View>
      </HeroWash>
      <View style={[styles.heroMedia, isWide ? styles.heroMediaWide : styles.heroMediaNarrow]}>
        <Image
          source={HERO_IMAGE}
          style={styles.heroImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
          accessibilityLabel="Buildmart construction tools and building materials"
        />
      </View>
    </View>
  );
}

function AboutSection({
  isWide,
  compact,
  hPad,
  onReadMore,
  onLayout,
}: {
  isWide: boolean;
  compact: boolean;
  hPad: number;
  onReadMore?: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  return (
    <View
      style={[
        styles.about,
        { marginHorizontal: -hPad, paddingHorizontal: isWide ? 28 : hPad },
      ]}
      onLayout={onLayout}
    >
      <View style={styles.aboutHeading}>
        <View style={styles.aboutHeadingInner}>
          <View style={styles.aboutHeadingRow}>
            <View style={styles.aboutTitleBlock}>
              <Text style={[styles.aboutTitle, compact && styles.aboutTitleCompact]}>ABOUT</Text>
              <View style={styles.aboutRule} />
            </View>
            <Text style={[styles.aboutTitle, compact && styles.aboutTitleCompact, styles.aboutTitleAccent]}>
              US
            </Text>
          </View>
        </View>
      </View>
      <View style={isWide ? styles.aboutWide : styles.aboutNarrow}>
        <View style={[styles.aboutPhotoWrap, compact && styles.aboutPhotoWrapCompact]}>
          <Image
            source={ABOUT_IMAGE}
            style={[styles.aboutPhoto, compact && styles.aboutPhotoCompact]}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
            accessibilityLabel="Buildmart tools, site work and building materials"
          />
        </View>
        <View style={[styles.aboutCopy, isWide && styles.aboutCopyWide]}>
          <Text style={[styles.aboutBody, compact && styles.aboutBodyCompact]}>
            <Text style={styles.aboutLeadDark}>Build</Text>
            <Text style={styles.aboutLeadGold}>mart</Text>
            {' is the fast lane for construction sites. We stock tools, cement, pipes, paints, electricals and hardware — and deliver in about 30 minutes, with no minimum order quantity.'}
          </Text>
          <Text style={[styles.aboutBody, compact && styles.aboutBodyCompact]}>
            Contractors, site engineers and homeowners use Buildmart to replace last-minute shortages
            without waiting on a wholesale yard. Every SKU is checked for stock before checkout, so
            what you order is what arrives at the gate.
          </Text>
          <Text style={[styles.aboutBody, compact && styles.aboutBodyCompact]}>
            From a single fitting to a full materials drop, we keep pricing clear, quantities flexible
            and delivery windows tight — so work on site never stalls for want of a bag of cement or
            a length of pipe.
          </Text>
          <Pressable
            style={styles.aboutCta}
            onPress={onReadMore}
            accessibilityRole="button"
            accessibilityLabel="Read more about Buildmart"
          >
            <Text style={styles.aboutCtaText}>READ MORE</Text>
            <ArrowRight size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
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
  onAboutPress,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [pageW, setPageW] = useState(windowWidth);
  const isWide = pageW >= WIDE_BP;
  const isPhone = pageW < 600;
  const hPad = isPhone ? 14 : H_PAD;
  const catSize = isPhone ? 92 : 124;
  const bannerW = Math.max(pageW - hPad * 2, 240);
  const featuredCols = pageW >= 900 ? 3 : 2;
  const featuredW = Math.max(
    (pageW - hPad * 2 - CARD_GAP * (featuredCols - 1)) / featuredCols,
    120,
  );
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<ScrollView>(null);
  const { count, addItem } = useCart();
  const { selected, deliveryStatus } = useAddress();
  const { showToast, bounceCart } = useFeedback();
  const boot = productsService.getLocalHomeFeed();
  const [banners, setBanners] = useState<ImageSourcePropType[]>(boot.banners);
  const [saleBanner, setSaleBanner] = useState<ImageSourcePropType | null>(boot.saleBanner);
  const [categories, setCategories] = useState<CatalogCategory[]>(boot.categories);
  const [trending, setTrending] = useState<ProductCardModel[]>(boot.trending);
  const [bestSellers, setBestSellers] = useState<ProductCardModel[]>(boot.bestSellers);
  const [featured, setFeatured] = useState<ProductCardModel[]>(boot.featured);
  const aboutOffsetY = useRef(0);
  const headerHRef = useRef(0);
  const statusLightRef = useRef(false);
  const headerProgress = useRef(new Animated.Value(0)).current;
  const [headerSize, setHeaderSize] = useState(0);
  const [statusLight, setStatusLight] = useState(false);
  const headerHideStyle = useMemo(
    () => ({
      opacity: headerProgress.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [1, 0.65, 0],
      }),
      transform: [
        {
          translateY: headerProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, headerSize > 0 ? -(headerSize + 12) : -108],
          }),
        },
      ],
    }),
    [headerProgress, headerSize],
  );

  useEffect(() => {
    let alive = true;
    productsService.getHomeFeed().then((feed) => {
      if (!alive) return;
      setBanners(feed.banners);
      setSaleBanner(feed.saleBanner);
      setCategories(feed.categories.slice(0, 8));
      setTrending(feed.trending);
      setBestSellers(feed.bestSellers);
      setFeatured(feed.featured);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => {
      setBannerIndex((i) => {
        const next = (i + 1) % banners.length;
        bannerRef.current?.scrollTo({ x: next * (bannerW + H_PAD), animated: true });
        return next;
      });
    }, 4200);
    return () => clearInterval(id);
  }, [banners.length, bannerW]);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setBannerIndex(Math.round(x / (bannerW + H_PAD)));
  };

  const eta = deliveryStatus?.message?.includes('Delivery')
    ? deliveryStatus.message.replace('mins', 'mins')
    : 'Delivery in 30 mins';

  const openAllCategories = () => {
    onCategoriesTab?.() ??
      onCategoryPress?.(categories[0]?.id ?? 'c-tanks', categories[0]?.name ?? 'All');
  };

  const orderTank = () => {
    const size = TANK_SIZES.find((s) => s.litres === 1000) ?? TANK_SIZES[2];
    addItem(size.productId, size.variant, 1, size.price);
    bounceCart();
    showToast(`${size.litres}L tank added to cart`, {
      tone: 'success',
      action: onCartPress ? { label: 'View cart', onPress: onCartPress } : undefined,
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={statusLight ? 'light' : 'dark'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: hPad, paddingTop: headerSize },
        ]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setPageW(w);
        }}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const aboutY = aboutOffsetY.current;
          const h = headerHRef.current;
          if (aboutY <= 0 || h <= 0) return;
          const start = Math.max(aboutY - h - 8, 0);
          const end = Math.max(aboutY, start + 1);
          const p = Math.min(1, Math.max(0, (y - start) / (end - start)));
          headerProgress.setValue(p);
          const light = p > 0.5;
          if (light !== statusLightRef.current) {
            statusLightRef.current = light;
            setStatusLight(light);
          }
        }}
      >
        <View style={styles.heroWrap}>
          <BuildmartHero isWide={isWide} compact={!isWide} />
        </View>

        <View style={styles.belowHero}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onBannerScroll}
            scrollEventThrottle={16}
            style={styles.bannerScroller}
            contentContainerStyle={styles.bannerRow}
            decelerationRate="fast"
          >
            {banners.map((src, i) => (
              <View
                key={i}
                style={[
                  styles.bannerSlide,
                  { width: bannerW, marginRight: i === banners.length - 1 ? 0 : H_PAD },
                ]}
              >
                <Image
                  source={src}
                  style={styles.bannerImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={0}
                />
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
        </View>

        <View style={styles.belowHero}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, isPhone && styles.sectionTitleCompact]}>Shop by category</Text>
            <Pressable onPress={openAllCategories} style={[styles.seeAllBtn, isPhone && styles.seeAllBtnCompact]}>
              <Text style={[styles.seeAll, isPhone && styles.seeAllCompact]}>View all</Text>
            </Pressable>
          </View>
          <HScroll contentContainerStyle={styles.catRow} style={styles.catScroller}>
            {categories.map((cat) => (
              <CategoryTile
                key={cat.id}
                category={cat}
                mini
                compact
                size={catSize}
                onPress={() => onCategoryPress?.(cat.id, cat.name)}
              />
            ))}
            <Pressable
              style={[styles.bookHelpMini, { width: catSize }]}
              onPress={onCapacityPress}
              accessibilityRole="button"
              accessibilityLabel="Tank capacity calculator"
            >
              <View style={[styles.bookHelpIconMini, { width: catSize, height: catSize }]}>
                <Droplets size={isPhone ? 24 : 32} color={colors.primaryInk} />
              </View>
              <Text style={styles.bookHelpLabel}>Tank</Text>
            </Pressable>
          </HScroll>
        </View>

        <AboutSection
          isWide={isWide}
          compact={!isWide}
          hPad={hPad}
          onReadMore={onAboutPress}
          onLayout={(e) => {
            aboutOffsetY.current = e.nativeEvent.layout.y;
          }}
        />

        <Section
          title="Trending products"
          badge="HOT"
          products={trending}
          onProductPress={onProductPress}
          onOpenCart={onCartPress}
          onAction={openAllCategories}
          compact={isPhone}
        />

        <View>
          <SectionHeader
            title="Limited offers"
            badge="SALE"
            actionLabel="Shop deals"
            padded={false}
            compact={isPhone}
            onAction={() => onProductPress?.(featured[0]?.id ?? trending[0]?.id ?? '')}
          />
          <View style={styles.saleBlock}>
            {saleBanner ? (
              <Image
                source={saleBanner}
                style={styles.saleImg}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            ) : null}
            <View style={styles.saleOverlay}>
              <Text style={styles.saleEyebrow}>LIMITED SALE</Text>
              <Text style={[styles.saleTitle, isPhone && styles.saleTitleCompact]}>Get 25% off — tonight only</Text>
              <Text style={[styles.saleCopy, isPhone && styles.saleCopyCompact]}>
                Cement, steel, electricals & hardware. Extra 10% off on 5+ bags — 30-min
                delivery, any quantity.
              </Text>
              <View style={styles.salePerks}>
                <View style={styles.salePerk}>
                  <Text style={styles.salePerkText}>Free 30-min delivery</Text>
                </View>
                <View style={styles.salePerk}>
                  <Text style={styles.salePerkText}>Extra 10% on bulk</Text>
                </View>
                <View style={styles.salePerk}>
                  <Text style={styles.salePerkText}>No min. order</Text>
                </View>
              </View>
              <SaleCountdown />
              <Pressable
                style={styles.saleCta}
                onPress={() => onProductPress?.(featured[0]?.id ?? trending[0]?.id ?? '')}
                accessibilityRole="button"
                accessibilityLabel="Shop the sale"
              >
                <Text style={styles.saleCtaText}>Shop the sale</Text>
                <ArrowRight size={20} color={colors.primaryInk} />
              </Pressable>
            </View>
          </View>
        </View>

        <Section
          title="Best sellers"
          badge="TOP"
          products={bestSellers}
          onProductPress={onProductPress}
          onOpenCart={onCartPress}
          onAction={openAllCategories}
          compact={isPhone}
        />

        <View>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, isPhone && styles.sectionTitleCompact]}>Featured products</Text>
          </View>
          <View style={styles.featuredGrid}>
            {featured.map((p) => (
              <View key={p.id} style={{ width: featuredW }}>
                <ProductCard
                  product={p}
                  width={featuredW}
                  onPress={() => onProductPress?.(p.id)}
                  onAddPress={() => onProductPress?.(p.id)}
                  onOpenCart={onCartPress}
                />
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={[styles.howTitle, isPhone && styles.howTitleCompact]}>How it works</Text>
          <View style={[styles.howRow, !isWide && styles.howRowNarrow]}>
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
        </View>

          <View style={[styles.toolBanner, isPhone && styles.toolBannerCompact]}>
            <View style={styles.toolCopy}>
              <Text style={styles.toolTitle}>Need a water tank?</Text>
              <Pressable onPress={onCapacityPress} accessibilityRole="button">
                <Text style={styles.toolSub}>Capacity calculator → recommend in-stock sizes</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.toolOrderBtn}
              onPress={orderTank}
              accessibilityRole="button"
              accessibilityLabel="Order 1000 litre tank"
            >
              <Text style={styles.toolOrderText}>Order</Text>
            </Pressable>
          </View>

          <LocationFooterBadge
            city={selected?.city ?? 'Hyderabad'}
            pincode={selected?.pincode ?? '500032'}
            eta={
              deliveryStatus?.etaMinutes
                ? `${deliveryStatus.etaMinutes}-min delivery`
                : '30-min delivery'
            }
            compact={isPhone}
            onPress={onLocationPress}
          />
        </ScrollView>
      <Animated.View
        pointerEvents={statusLight ? 'none' : 'auto'}
        style={[styles.headerOverlay, headerHideStyle]}
      >
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h <= 1) return;
            if (Math.abs(h - headerHRef.current) < 1) return;
            headerHRef.current = h;
            setHeaderSize(h);
          }}
        >
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
        </View>
      </Animated.View>
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
  compact,
}: {
  title: string;
  badge?: string;
  products: ProductCardModel[];
  onProductPress?: (id: string) => void;
  onOpenCart?: () => void;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <>
      <SectionHeader title={title} badge={badge} onAction={onAction} padded={false} compact={compact} />
      <HScroll contentContainerStyle={styles.hRow} style={styles.catScroller}>
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            width={CARD_W}
            onPress={() => onProductPress?.(p.id)}
            onAddPress={() => onProductPress?.(p.id)}
            onOpenCart={onOpenCart}
          />
        ))}
      </HScroll>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  content: { paddingBottom: 48, maxWidth: '100%' },
  heroWrap: {
    alignSelf: 'stretch',
    paddingTop: 20,
  },
  hero: {
    alignSelf: 'stretch',
    marginTop: 0,
    borderRadius: radii.xl,
    backgroundColor: '#000000',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 420,
    minHeight: 420,
  },
  heroNarrow: {
    flexDirection: 'column',
  },
  heroWash: {
    flex: 1.15,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    minWidth: 0,
    backgroundColor: '#000000',
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
    bottom: -40,
    left: -16,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
  },
  heroCopy: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    zIndex: 1,
    maxWidth: '100%',
  },
  heroCopyCompact: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  heroMedia: {
    overflow: 'hidden',
    backgroundColor: colors.secondary,
  },
  heroMediaWide: {
    flex: 1,
    minWidth: 0,
    height: 420,
    minHeight: 420,
  },
  heroMediaNarrow: {
    width: '100%',
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  about: {
    marginTop: 28,
    backgroundColor: '#000000',
    overflow: 'hidden',
    paddingTop: 36,
    paddingBottom: 44,
  },
  aboutWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 340,
    gap: 28,
  },
  aboutNarrow: {
    flexDirection: 'column',
    gap: 22,
  },
  aboutPhotoWrap: {
    flex: 1.15,
    width: '100%',
    minHeight: 300,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  aboutPhotoWrapCompact: {
    minHeight: 220,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
  },
  aboutPhoto: {
    width: '100%',
    height: '100%',
    minHeight: 300,
  },
  aboutPhotoCompact: {
    minHeight: 220,
  },
  aboutCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  aboutCopyWide: {
    paddingLeft: 8,
    paddingVertical: 8,
  },
  aboutHeading: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  aboutHeadingInner: {
    alignItems: 'center',
  },
  aboutHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  aboutTitleBlock: {
    alignItems: 'stretch',
  },
  aboutTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  aboutTitleCompact: {
    fontSize: 24,
    lineHeight: 28,
  },
  aboutTitleAccent: {
    color: colors.primary,
  },
  aboutRule: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#FFFFFF',
    marginTop: 6,
  },
  aboutBody: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 520,
    marginBottom: 14,
  },
  aboutBodyCompact: {
    fontSize: 15,
    lineHeight: 23,
    maxWidth: '100%',
  },
  aboutLeadDark: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  aboutLeadGold: {
    color: colors.primary,
    fontWeight: '800',
  },
  aboutCta: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  aboutCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heroEyebrow: {
    ...typography.micro,
    color: colors.textInverse,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroTitle: {
    ...typography.display,
    color: colors.textInverse,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '900',
  },
  heroTitleCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  heroAccent: {
    color: colors.primary,
  },
  heroSub: {
    ...typography.body,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 10,
    maxWidth: 420,
    fontSize: 16,
    lineHeight: 24,
  },
  heroSubCompact: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: '100%',
  },
  heroDescription: {
    ...typography.body,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 10,
    maxWidth: 420,
    fontSize: 14,
    lineHeight: 22,
  },
  heroDescCompact: {
    fontSize: 13,
    lineHeight: 19,
    maxWidth: '100%',
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
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  pillDelivery: {
    minWidth: 178,
    paddingHorizontal: 18,
  },
  pillCompact: {
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillText: {
    ...typography.micro,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
  belowHero: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    maxWidth: '100%',
  },
  bannerScroller: { marginTop: 12, maxWidth: '100%' },
  bannerRow: {
    flexGrow: 1,
  },
  bannerSlide: {
    height: 168,
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
    paddingTop: 28,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { ...typography.subheading, color: colors.text, fontSize: 22, lineHeight: 27, flexShrink: 1, paddingRight: 8 },
  sectionTitleCompact: { fontSize: 18, lineHeight: 22 },
  seeAllBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  seeAllBtnCompact: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
  },
  seeAll: {
    ...typography.caption,
    fontSize: 15,
    lineHeight: 20,
    color: colors.secondary,
    fontWeight: '800',
  },
  seeAllCompact: { fontSize: 13, lineHeight: 16 },
  catScroller: {
    maxWidth: '100%',
    flexGrow: 0,
  },
  catRow: {
    gap: 12,
    paddingBottom: 4,
    alignItems: 'flex-start',
  },
  bookHelpMini: { width: 124, alignItems: 'center', gap: 6 },
  bookHelpIconMini: {
    width: 124,
    height: 124,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookHelpLabel: {
    ...typography.micro,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  hRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: CARD_GAP,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 10,
  },
  saleBlock: {
    marginTop: 8,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
    minHeight: 360,
    ...shadows.card,
  },
  saleImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.42,
  },
  saleOverlay: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  saleEyebrow: {
    ...typography.micro,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  saleTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.textInverse,
    marginTop: 8,
    textAlign: 'center',
  },
  saleTitleCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  saleCopy: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 840,
    width: '100%',
    textAlign: 'center',
    alignSelf: 'center',
  },
  saleCopyCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  salePerks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  salePerk: {
    backgroundColor: colors.secondaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.35)',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  salePerkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  saleCta: {
    alignSelf: 'center',
    zIndex: 2,
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 24,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saleCtaText: {
    color: colors.primaryInk,
    fontSize: 17,
    fontWeight: '800',
  },
  saleBottom: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 16,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  timerBox: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 58,
  },
  timerNum: { fontSize: 20, fontWeight: '900', color: colors.primaryInk },
  timerLbl: { fontSize: 11, fontWeight: '700', color: colors.primaryInk, marginTop: 2 },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    paddingVertical: 10,
  },
  howTitle: {
    ...typography.subheading,
    color: colors.text,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 27,
    marginTop: 36,
    marginBottom: 16,
  },
  howTitleCompact: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 24,
  },
  howRow: {
    flexDirection: 'row',
    gap: 12,
  },
  howRowNarrow: {
    flexWrap: 'wrap',
  },
  howCard: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 140,
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
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
    textAlign: 'center',
  },
  howCardBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  toolBanner: {
    marginTop: 28,
    marginBottom: 8,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  toolBannerCompact: {
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  toolCopy: {
    alignItems: 'center',
    maxWidth: 420,
  },
  toolTitle: {
    ...typography.subheading,
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  toolSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  toolOrderBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 28,
    paddingVertical: 12,
    minHeight: 44,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolOrderText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryInk,
  },
  locBadge: {
    marginTop: 14,
    marginBottom: 8,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  locBadgeCompact: {
    padding: 14,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  locRowCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  locMain: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  locTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locCopy: {
    flex: 1,
    minWidth: 0,
  },
  locKicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
  },
  locCity: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  locCityCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  locMeta: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 4,
  },
  locPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locPill: {
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.45)',
    backgroundColor: 'rgba(212, 160, 23, 0.12)',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  locBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  locBtnCompact: {
    alignSelf: 'stretch',
  },
  locBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryInk,
  },
});
