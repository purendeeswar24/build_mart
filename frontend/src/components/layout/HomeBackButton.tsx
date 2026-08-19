import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

type Props = {
  onPress: () => void;
  color?: string;
};

export function HomeBackButton({ onPress, color = '#0A0A0A' }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to home"
      hitSlop={12}
      onPress={onPress}
      style={styles.btn}
    >
      <ChevronLeft size={28} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
});
