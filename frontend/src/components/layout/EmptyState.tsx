import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { Button } from '../ui/Button';
import { AmbientDarkBg } from './AmbientDarkBg';

type Props = {
  title: string;
  message?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'light' | 'dark';
  features?: string[];
};

export function EmptyState({
  title,
  message,
  icon: Icon,
  actionLabel,
  onAction,
  tone = 'light',
  features,
}: Props) {
  const dark = tone === 'dark';
  const { width } = useWindowDimensions();
  const compact = width < 600;
  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      {dark ? <AmbientDarkBg /> : null}
      <View style={[styles.inner, dark && styles.innerDark, compact && styles.innerCompact]}>
        {Icon ? (
          <View style={dark ? [styles.iconWrap, compact && styles.iconWrapCompact] : undefined}>
            <Icon
              size={dark ? (compact ? 56 : 88) : 40}
              color={dark ? colors.primary : colors.textSecondary}
              strokeWidth={dark ? 1.5 : 2}
            />
          </View>
        ) : null}
        <Text style={[styles.title, dark && styles.titleDark, compact && dark && styles.titleDarkCompact]}>
          {title}
        </Text>
        {message ? (
          <Text
            style={[
              styles.message,
              dark && styles.messageDark,
              compact && dark && styles.messageDarkCompact,
            ]}
          >
            {message}
          </Text>
        ) : null}
        {dark && features?.length ? (
          <View style={styles.features}>
            {features.map((item) => (
              <View key={item} style={styles.feature}>
                <Text style={styles.featureText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {actionLabel && onAction ? (
          <Button
            title={actionLabel}
            onPress={onAction}
            size={dark ? 'lg' : 'md'}
            style={dark ? [styles.btnDark, compact && styles.btnDarkCompact] : styles.btn}
            textStyle={dark ? styles.btnDarkText : undefined}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  containerDark: {
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
    gap: 14,
    zIndex: 1,
  },
  innerDark: {
    maxWidth: 560,
    gap: 18,
  },
  innerCompact: {
    paddingHorizontal: 8,
    gap: 12,
  },
  iconWrap: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 160, 23, 0.55)',
    backgroundColor: 'rgba(212, 160, 23, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconWrapCompact: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  title: {
    ...typography.subheading,
    color: colors.text,
    textAlign: 'center',
  },
  titleDark: {
    color: colors.textInverse,
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: -1,
  },
  titleDarkCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  messageDark: {
    color: '#F0ECF6',
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '400',
    maxWidth: 480,
  },
  messageDarkCompact: {
    fontSize: 16,
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  feature: {
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.45)',
    backgroundColor: 'rgba(212, 160, 23, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  featureText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  btn: {
    marginTop: spacing.md,
    minWidth: 160,
  },
  btnDark: {
    marginTop: 12,
    minWidth: 260,
    minHeight: 56,
    alignSelf: 'center',
  },
  btnDarkCompact: {
    minWidth: 0,
    width: '100%',
    maxWidth: 320,
    minHeight: 48,
  },
  btnDarkText: {
    fontSize: 18,
    fontWeight: '800',
  },
});
