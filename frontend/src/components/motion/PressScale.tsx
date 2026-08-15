import React, { useRef, type PropsWithChildren } from 'react';
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../../theme';

type Props = PropsWithChildren<{
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
}>;

/** Pressable with a snappy scale-down — use for CTAs and tiles. */
export function PressScale({
  children,
  onPress,
  style,
  pressedScale = 0.96,
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(scale, {
          toValue: pressedScale,
          useNativeDriver: true,
          ...motion.springSnappy,
        }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          ...motion.spring,
        }).start()
      }
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
