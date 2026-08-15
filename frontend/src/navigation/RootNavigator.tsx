import React, { useRef } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme';
import { MainTabs } from './MainTabs';
import { AuthFlowScreen } from '../screens/auth/AuthFlowScreen';
import { LoginModal } from '../components/auth/LoginModal';
import { OfflineBanner } from '../components/layout/OfflineBanner';
import { useAuth } from '../hooks/useAuth';
import { analytics } from '../services/analytics.service';

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

function activeRouteName(state: NavigationState | PartialState<NavigationState> | undefined): string {
  if (!state || !('routes' in state) || !state.routes?.length) return 'Unknown';
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (route.state) return activeRouteName(route.state as NavigationState);
  return route.name;
}

export function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();
  const routeNameRef = useRef<string | undefined>(undefined);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.secondary,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <NavigationContainer
        theme={navTheme}
        onReady={() => {
          analytics.screen('AppReady');
        }}
        onStateChange={(state) => {
          const next = activeRouteName(state);
          if (next !== routeNameRef.current) {
            routeNameRef.current = next;
            analytics.screen(next);
          }
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
          {!isAuthenticated ? <Stack.Screen name="Auth" component={AuthFlowScreen} /> : null}
        </Stack.Navigator>
        <LoginModal />
      </NavigationContainer>
    </View>
  );
}
