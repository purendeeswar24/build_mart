import React, { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { motion } from '../../theme';

type From = 'up' | 'left' | 'right' | 'none';

type Props = PropsWithChildren<{
  delay?: number;
  duration?: number;
  distance?: number;
  from?: From;
  style?: ViewStyle;
}>;

/** Soft entrance — fade + optional directional slide. */
export function FadeIn({
  children,
  delay = 0,
  duration = motion.enter,
  distance = 12,
  from = 'up',
  style,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(from === 'none' ? 0 : distance)).current;

  useEffect(() => {
    const axis = from === 'left' || from === 'right' ? 'translateX' : 'translateY';
    const start =
      from === 'left' ? -distance : from === 'right' ? distance : from === 'none' ? 0 : distance;
    translate.setValue(start);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, distance, duration, from, opacity, translate]);

  const transform =
    from === 'left' || from === 'right'
      ? [{ translateX: translate }]
      : from === 'none'
        ? []
        : [{ translateY: translate }];

  return (
    <Animated.View style={[{ opacity, transform }, style]}>
      {children}
    </Animated.View>
  );
}
