import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '../../theme';

type Props = {
  icon: LucideIcon;
  color: string;
  size?: number;
  focused?: boolean;
};

export function TabBarIcon({ icon: Icon, color, size = 20, focused }: Props) {
  return (
    <View style={[styles.wrap, focused && styles.focused]}>
      <Icon
        size={size}
        color={focused ? colors.primaryInk : color}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focused: {
    backgroundColor: colors.primary,
  },
});
