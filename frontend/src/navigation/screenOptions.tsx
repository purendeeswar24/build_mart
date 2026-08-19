import React from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { HomeBackButton } from '../components/layout/HomeBackButton';
import { colors } from '../theme';
import { goToHome } from './goToHome';

export function withHomeBack(
  navigation: NavigationProp<ParamListBase>,
  _opts?: { dark?: boolean },
): NativeStackNavigationOptions {
  const fg = '#0A0A0A';
  const bg = '#E8EAED';
  return {
    headerShadowVisible: false,
    headerBackVisible: false,
    headerStyle: { backgroundColor: bg },
    headerTintColor: fg,
    headerTitleAlign: 'center',
    headerTitleStyle: { fontWeight: '700', color: fg, fontSize: 17 },
    contentStyle: { backgroundColor: colors.background },
    headerLeft: () => <HomeBackButton onPress={() => goToHome(navigation)} color={fg} />,
  };
}
