import React, { useState } from 'react';
import { Image, type ImageProps } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { colors, radii } from '../../theme';

type Props = ImageProps & {
  fallbackTint?: string;
};

/** expo-image wrapper with muted fallback when load fails. */
export function SafeImage({
  fallbackTint = colors.surfaceMuted,
  style,
  onError,
  cachePolicy = 'memory-disk',
  transition = 80,
  ...rest
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <View style={[styles.fallback, { backgroundColor: fallbackTint }, style]} />;
  }

  return (
    <Image
      {...rest}
      cachePolicy={cachePolicy}
      transition={transition}
      style={style}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderRadius: radii.sm,
  },
});
