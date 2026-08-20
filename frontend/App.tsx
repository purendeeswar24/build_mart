import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/layout/ErrorBoundary';
import { FeedbackProvider } from './src/hooks/useFeedback';
import { AddressProvider } from './src/hooks/useAddress';
import { AuthProvider } from './src/hooks/useAuth';
import { CartProvider } from './src/hooks/useCart';
import { WishlistProvider } from './src/hooks/useWishlist';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    const current = meta.getAttribute('content') ?? '';
    if (!current.includes('viewport-fit=cover')) {
      meta.setAttribute('content', `${current}, viewport-fit=cover`);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <FeedbackProvider>
            <AddressProvider>
              <WishlistProvider>
                <CartProvider>
                  <StatusBar style="dark" />
                  <RootNavigator />
                </CartProvider>
              </WishlistProvider>
            </AddressProvider>
          </FeedbackProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
