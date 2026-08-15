import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../hooks/useCart';
import { useFeedback } from '../../hooks/useFeedback';
import { colors, motion, radii, shadows } from '../../theme';

type Props = {
  onPress?: () => void;
};

/** Zepto-style floating cart — slides in, bounces on add */
export function FloatingCart({ onPress }: Props) {
  const { count, total } = useCart();
  const { cartBounceToken } = useFeedback();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(0);

  useEffect(() => {
    if (count <= 0) {
      enter.setValue(0);
      prevCount.current = 0;
      return;
    }
    if (prevCount.current === 0) {
      enter.setValue(0);
      Animated.spring(enter, {
        toValue: 1,
        useNativeDriver: true,
        speed: motion.springPop.speed,
        bounciness: motion.springPop.bounciness,
      }).start();
    }
    if (count !== prevCount.current && prevCount.current > 0) {
      Animated.sequence([
        Animated.spring(badgeScale, {
          toValue: 1.35,
          useNativeDriver: true,
          speed: 50,
          bounciness: 10,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 8,
        }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, enter, badgeScale]);

  useEffect(() => {
    if (!cartBounceToken) return;
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.12,
          useNativeDriver: true,
          speed: 40,
          bounciness: 12,
        }),
        Animated.timing(translateY, { toValue: -10, duration: 120, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 16,
          bounciness: 10,
        }),
        Animated.timing(translateY, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]),
    ]).start();
  }, [cartBounceToken, scale, translateY]);

  if (count <= 0) return null;

  const slide = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 8) }]}>
      <Animated.View
        style={{
          opacity: enter,
          transform: [{ scale }, { translateY: Animated.add(translateY, slide) }],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open cart, ${count} items`}
          onPress={onPress}
          style={styles.btn}
        >
          <View style={styles.iconWrap}>
            <ShoppingCart size={18} color={colors.primaryInk} />
            <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
              <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
            </Animated.View>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>View cart</Text>
            <Text style={styles.sub}>
              {count} item{count === 1 ? '' : 's'}
            </Text>
          </View>
          <Text style={styles.total}>₹{Math.round(total)}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    left: 0,
    right: 0,
    zIndex: 900,
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.secondary,
    borderRadius: radii.xl,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 420,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.lifted,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.skyDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.textInverse },
  copy: { flex: 1 },
  title: { color: colors.textInverse, fontWeight: '800', fontSize: 14 },
  sub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  total: { color: colors.primary, fontWeight: '900', fontSize: 15 },
});
