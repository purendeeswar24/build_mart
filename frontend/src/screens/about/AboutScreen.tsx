import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { colors, radii, shadows, typography } from '../../theme';

const ABOUT_IMAGE = require('../../../assets/about-collage.png');

function AnimatedPhotoFrame({ children }: { children: React.ReactNode }) {
  const spin = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 5200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.5,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    rotate.start();
    pulse.start();
    return () => {
      rotate.stop();
      pulse.stop();
    };
  }, [glow, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.frame}>
      <Animated.View style={[styles.spinRing, { opacity: glow, transform: [{ rotate }] }]} />
      <View style={styles.photoInner}>{children}</View>
    </View>
  );
}

export function AboutScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (compact ? 16 : 20),
          paddingHorizontal: compact ? 14 : 20,
        },
      ]}
    >
      <View style={styles.heading}>
        <View style={styles.headingInner}>
          <Text style={[styles.title, compact && styles.titleCompact]}>
            ABOUT <Text style={styles.titleAccent}>US</Text>
          </Text>
          <View style={styles.rule} />
        </View>
      </View>

      <AnimatedPhotoFrame>
        <Image
          source={ABOUT_IMAGE}
          style={styles.photo}
          contentFit="cover"
          accessibilityLabel="Buildmart tools, site work and building materials"
        />
      </AnimatedPhotoFrame>

      <Text style={styles.body}>
        <Text style={styles.brandBuild}>Build</Text>
        <Text style={styles.brandMart}>mart</Text>
        {' is the fast lane for construction sites. We stock tools, cement, pipes, paints, electricals and hardware — and deliver in about 30 minutes, with no minimum order quantity.'}
      </Text>
      <Text style={styles.body}>
        Contractors, site engineers and homeowners use Buildmart to replace last-minute shortages
        without waiting on a wholesale yard. Every SKU is checked for stock before checkout, so
        what you order is what arrives at the gate.
      </Text>
      <Text style={styles.body}>
        From a single fitting to a full materials drop, we keep pricing clear, quantities flexible
        and delivery windows tight — so work on site never stalls for want of a bag of cement or a
        length of pipe.
      </Text>
      <Text style={styles.body}>
        Our catalogue covers power tools, hand tools, building materials, plumbing, electricals,
        paints, safety supplies and hardware. Order from the site office or from home — we bring
        the store to your plot.
      </Text>
      <Text style={styles.body}>
        Need a tank size, a pipe run or a last-minute bag of cement? Browse categories, add any
        quantity to cart, and check out. Support is available 8am–8pm IST if a delivery or product
        question comes up.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.secondary },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    color: colors.textInverse,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  titleAccent: { color: colors.primary },
  heading: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
  },
  headingInner: {
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  rule: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginTop: 8,
  },
  frame: {
    alignSelf: 'stretch',
    marginHorizontal: 10,
    marginBottom: 20,
    borderRadius: radii.xl,
    padding: 3,
    overflow: 'hidden',
    backgroundColor: colors.secondary,
    ...shadows.card,
  },
  spinRing: {
    position: 'absolute',
    width: '170%',
    height: '170%',
    top: '-35%',
    left: '-35%',
    borderWidth: 3,
    borderTopColor: colors.primary,
    borderRightColor: '#F5D76E',
    borderBottomColor: colors.primaryDark,
    borderLeftColor: 'transparent',
    borderRadius: 48,
  },
  photoInner: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.secondaryMuted,
  },
  photo: {
    width: '100%',
    height: 260,
  },
  body: {
    ...typography.body,
    color: colors.textInverse,
    fontSize: 19,
    lineHeight: 28,
    marginBottom: 14,
  },
  brandBuild: {
    color: colors.textInverse,
    fontWeight: '800',
  },
  brandMart: {
    color: colors.primary,
    fontWeight: '800',
  },
});
