import React, { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LayoutProvider } from '../../hooks/useLayout';
import { colors } from '../../theme';
import { layout } from '../../theme/layout';

type Props = {
  children: React.ReactNode;
};

/**
 * One storefront for web + mobile:
 * - Phone: full width
 * - Desktop: centered page with side space (max 1180px)
 */
export function AppShell({ children }: Props) {
  const { width } = useWindowDimensions();
  const [innerWidth, setInnerWidth] = useState(
    Math.min(width, layout.contentMaxWidth),
  );

  return (
    <View style={styles.root}>
      <View
        style={styles.page}
        onLayout={(e) => {
          const next = Math.round(e.nativeEvent.layout.width);
          if (next > 0 && next !== innerWidth) setInnerWidth(next);
        }}
      >
        <LayoutProvider width={innerWidth}>
          <View style={styles.fill}>{children}</View>
        </LayoutProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    overflow: 'hidden',
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
    minHeight: 0,
  },
});
