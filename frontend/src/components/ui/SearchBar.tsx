import React from 'react';
import { Pressable, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';

type Props = {
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  editable?: boolean;
  style?: ViewStyle;
};

export function SearchBar({
  value,
  placeholder = 'Search cement, pipes, tanks…',
  onChangeText,
  onPress,
  editable = true,
  style,
}: Props) {
  const content = (
    <View style={[styles.container, style]}>
      <Search size={18} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        editable={editable && !onPress}
        style={[styles.input, onPress ? { pointerEvents: 'none' as const } : null]}
        returnKeyType="search"
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="search" onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
});
