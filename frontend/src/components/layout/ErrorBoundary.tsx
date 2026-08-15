import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.screen} accessibilityRole="alert">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.msg}>
            {this.state.error.message || 'Unexpected error. Try reloading the screen.'}
          </Text>
          <Pressable
            style={styles.btn}
            onPress={() => this.setState({ error: null })}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 10,
  },
  title: { ...typography.heading, color: colors.text },
  msg: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  btn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 12,
    justifyContent: 'center',
  },
  btnText: { fontWeight: '700', color: colors.primaryInk },
});
