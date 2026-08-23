import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/layout/ErrorBoundary';
import { FeedbackProvider } from './src/hooks/useFeedback';
import { AddressProvider } from './src/hooks/useAddress';
import { AuthProvider } from './src/hooks/useAuth';
import { CartProvider } from './src/hooks/useCart';
import { WishlistProvider } from './src/hooks/useWishlist';
import { AppShell } from './src/components/layout/AppShell';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <FeedbackProvider>
            <AddressProvider>
              <WishlistProvider>
                <CartProvider>
                  <StatusBar style="dark" />
                  <AppShell>
                    <RootNavigator />
                  </AppShell>
                </CartProvider>
              </WishlistProvider>
            </AddressProvider>
          </FeedbackProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
