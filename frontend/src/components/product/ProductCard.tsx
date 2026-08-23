import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors, motion, radii, shadows, typography } from '../../theme';
import { formatPrice } from '../../utils/formatPrice';
import type { ProductCardModel } from '../../services/products.service';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import { useFeedback } from '../../hooks/useFeedback';
import { a11y } from '../../theme/a11y';
import { SafeImage } from '../media/SafeImage';

type Props = {
  product: ProductCardModel;
  width?: number;
  style?: ViewStyle;
  onPress?: () => void;
  onAddPress?: () => void;
  onOpenCart?: () => void;
};

export function ProductCard({
  product,
  width = 168,
  style,
  onPress,
  onAddPress,
  onOpenCart,
}: Props) {
  const { isSaved, toggle } = useWishlist();
  const { addItem } = useCart();
  const { showToast, bounceCart } = useFeedback();
  const liked = isSaved(product.id);
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  const animateHover = (on: boolean) => {
    setHovered(on);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: on ? 1.03 : 1,
        useNativeDriver: true,
        ...motion.springSnappy,
      }),
      Animated.timing(lift, {
        toValue: on ? -5 : 0,
        duration: motion.fast,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, {
      toValue: hovered ? 1.03 : 1,
      useNativeDriver: true,
      ...motion.spring,
    }).start();
  };

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
        ...motion.spring,
      }),
    ]).start();
  };

  const onHeart = async () => {
    const on = await toggle(product.id);
    popHeart();
    showToast(on ? 'Saved to wishlist ❤️' : 'Removed from wishlist', { tone: 'success' });
  };

  const onAdd = () => {
    if (product.hasVariants) {
      onAddPress?.() ?? onPress?.();
      return;
    }
    addItem(product.id, product.defaultVariantLabel || 'Standard', 1, product.price);
    bounceCart();
    setAddedFlash(true);
    Animated.sequence([
      Animated.spring(ctaScale, {
        toValue: 1.06,
        useNativeDriver: true,
        speed: 40,
        bounciness: 8,
      }),
      Animated.spring(ctaScale, {
        toValue: 1,
        useNativeDriver: true,
        ...motion.spring,
      }),
    ]).start();
    showToast('Added to cart', {
      action: onOpenCart ? { label: 'View cart', onPress: onOpenCart } : undefined,
    });
    setTimeout(() => setAddedFlash(false), 900);
  };

  return (
    <Animated.View
      style={[{ width, transform: [{ scale }, { translateY: lift }] }, style]}
    >
      <View style={[styles.card, hovered && styles.cardHover]}>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          {...(Platform.OS === 'web'
            ? {
                onHoverIn: () => animateHover(true),
                onHoverOut: () => animateHover(false),
              }
            : {})}
        >
          <View
            style={[
              styles.imageWrap,
              {
                backgroundColor: product.imageTint || colors.surfaceMuted,
                height: Math.min(140, Math.round(width * 0.72)),
              },
            ]}
          >
            <SafeImage
              source={product.image}
              style={styles.image}
              contentFit="cover"
              transition={0}
              recyclingKey={product.id}
              fallbackTint={product.imageTint}
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>30 MIN</Text>
            </View>
            {hovered ? <View style={styles.hoverGlow} /> : null}
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Remove from wishlist' : 'Add to wishlist'}
          onPress={() => void onHeart()}
          style={styles.heart}
          hitSlop={a11y.hitSlop}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Heart
              size={16}
              color={liked ? colors.danger : colors.textSecondary}
              fill={liked ? colors.danger : 'transparent'}
            />
          </Animated.View>
        </Pressable>

        <View style={styles.body}>
          <Pressable onPress={onPress}>
            <Text style={styles.title} numberOfLines={2}>
              {product.title}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(product.price)}</Text>
              {product.mrp > product.price ? (
                <Text style={styles.mrp}>{formatPrice(product.mrp)}</Text>
              ) : null}
            </View>
          </Pressable>

          <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <Pressable
              accessibilityRole="button"
              onPress={onAdd}
              style={[styles.cta, addedFlash && styles.ctaSuccess]}
            >
              <Text style={[styles.ctaText, addedFlash && styles.ctaSuccessText]}>
                {addedFlash ? 'Added ✓' : product.hasVariants ? 'View options' : 'Add'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    ...shadows.card,
  },
  cardHover: {
    borderColor: colors.primary,
    ...shadows.lifted,
  },
  imageWrap: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hoverGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(212, 160, 23, 0.12)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.badgeDelivery,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  heart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26, 26, 26, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
    minHeight: 108,
    justifyContent: 'space-between',
  },
  title: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    fontWeight: '600',
    minHeight: 32,
    paddingRight: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingRight: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  mrp: {
    ...typography.micro,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  cta: {
    marginTop: 4,
    borderRadius: radii.md,
    paddingVertical: 13,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  ctaSuccess: {
    backgroundColor: colors.success,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryInk,
  },
  ctaSuccessText: {
    color: colors.textInverse,
  },
});
