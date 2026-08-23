import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

const SCREEN_H = Dimensions.get('window').height;

function useLoop(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, duration, v]);
  return v;
}

function Orb({
  size,
  color,
  style,
  dx,
  dy,
  duration,
  delay,
}: {
  size: number;
  color: string;
  style: object;
  dx: number;
  dy: number;
  duration: number;
  delay?: number;
}) {
  const t = useLoop(duration, delay);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.7, 0.35] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        style,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

const SPARKS = [
  { left: '12%', top: '18%', size: 5, duration: 3600, delay: 0, dy: -28 },
  { left: '78%', top: '22%', size: 4, duration: 4200, delay: 200, dy: 22 },
  { left: '22%', top: '72%', size: 6, duration: 5000, delay: 400, dy: -18 },
  { left: '86%', top: '64%', size: 4, duration: 3800, delay: 600, dy: 26 },
  { left: '48%', top: '12%', size: 5, duration: 4400, delay: 150, dy: 20 },
  { left: '8%', top: '48%', size: 4, duration: 4100, delay: 800, dy: -22 },
  { left: '64%', top: '80%', size: 5, duration: 4700, delay: 300, dy: -30 },
  { left: '38%', top: '86%', size: 4, duration: 3900, delay: 500, dy: 16 },
];

function Spark({
  left,
  top,
  size,
  duration,
  delay,
  dy,
}: {
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  dy: number;
}) {
  const t = useLoop(duration, delay);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.95, 0.15] });
  return (
    <Animated.View
      style={[
        styles.spark,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

/** Soft gold / sky motion for dark empty pages — no center ring. */
export function AmbientDarkBg() {
  const sweep = useLoop(5600);
  const sweepY = sweep.interpolate({ inputRange: [0, 1], outputRange: [-80, SCREEN_H] });
  const sweepOpacity = sweep.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.55, 0] });

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Orb size={340} color={colors.primary} style={styles.orbA} dx={48} dy={-56} duration={6200} />
      <Orb size={260} color={colors.skyDeep} style={styles.orbB} dx={-52} dy={40} duration={7400} delay={200} />
      <Orb size={200} color={colors.primary} style={styles.orbC} dx={28} dy={48} duration={5800} delay={500} />
      <Animated.View
        style={[
          styles.sweep,
          { opacity: sweepOpacity, transform: [{ translateY: sweepY }] },
        ]}
      />
      {SPARKS.map((s, i) => (
        <Spark key={i} {...s} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
  orbA: {
    top: -90,
    left: -80,
  },
  orbB: {
    bottom: -70,
    right: -60,
  },
  orbC: {
    top: '40%',
    right: '4%',
  },
  sweep: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(212, 160, 23, 0.18)',
  },
  spark: {
    position: 'absolute',
    backgroundColor: colors.primary,
  },
});
