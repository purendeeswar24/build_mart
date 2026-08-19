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

export function TabBarIcon({ icon: Icon, color, size = 18, focused }: Props) {
  return (
    <View style={[styles.wrap, focused && styles.focused]}>
      <Icon size={size} color={color} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  focused: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
});
