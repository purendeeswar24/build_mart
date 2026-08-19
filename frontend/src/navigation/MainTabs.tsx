import React from 'react';
import { View } from 'react-native';
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Grid3x3, Home, Info, Package, ShoppingCart, User } from 'lucide-react-native';
import { TabBarIcon } from '../components/layout/TabBarIcon';
import { FloatingCart } from '../components/feedback/FloatingCart';
import { ToastHost } from '../components/feedback/ToastHost';
import { useCart } from '../hooks/useCart';
import { colors } from '../theme';
import { useLayout } from '../theme/layout';
import { AccountStack } from './AccountStack';
import { CartStack } from './CartStack';
import { CategoriesStack } from './CategoriesStack';
import { HomeStack } from './HomeStack';
import { OrdersStack } from './OrdersStack';
import { AboutScreen } from '../screens/about/AboutScreen';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const HIDE_FLOAT_ROUTES = new Set([
  'CartTab',
  'ProductDetail',
  'Checkout',
  'AddressSelect',
  'AddressEdit',
  'PaymentResult',
]);

function FloatingCartLayer({ navigation, state, tabH }: BottomTabBarProps & { tabH: number }) {
  const route = state.routes[state.index];
  const nested = getFocusedRouteNameFromRoute(route) ?? route.name;
  const hide =
    route.name === 'CartTab' || HIDE_FLOAT_ROUTES.has(String(nested));

  if (hide) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: tabH, zIndex: 900 }}
    >
      <FloatingCart onPress={() => navigation.navigate('CartTab')} />
    </View>
  );
}

function AppTabBar(props: BottomTabBarProps) {
  const { tabH } = useLayout();
  return (
    <>
      <FloatingCartLayer {...props} tabH={tabH} />
      <BottomTabBar {...props} />
    </>
  );
}

export function MainTabs() {
  const { count } = useCart();
  const { isPhone, tabH, tabBottomPad, tabContentH } = useLayout();

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <Tab.Navigator
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: '#6B8799',
          tabBarStyle: {
            backgroundColor: '#E8EAED',
            borderTopColor: '#D0D4DA',
            height: tabH,
            paddingBottom: tabBottomPad,
            paddingTop: 0,
          },
          tabBarItemStyle: {
            height: tabContentH,
            paddingTop: isPhone ? 6 : 4,
            paddingBottom: isPhone ? 4 : 4,
          },
          tabBarIconStyle: {
            marginTop: 0,
            marginBottom: 0,
          },
          tabBarLabelStyle: {
            fontSize: isPhone ? 9 : 10,
            fontWeight: '600',
            lineHeight: 12,
            marginTop: 1,
            marginBottom: 0,
            padding: 0,
          },
          tabBarAllowFontScaling: false,
        }}
      >
        <Tab.Screen
          name="HomeTab"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon icon={Home} color={color} focused={focused} size={isPhone ? 20 : 18} />
            ),
          }}
        >
          {({ navigation }) => (
            <HomeStack
              onOpenCart={() => navigation.navigate('CartTab')}
              onOpenAccount={() => navigation.navigate('AccountTab')}
              onOpenAbout={() => navigation.navigate('AboutTab')}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="AboutTab"
          component={AboutScreen}
          options={{
            title: 'About',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon icon={Info} color={color} focused={focused} size={isPhone ? 20 : 18} />
            ),
          }}
        />

        <Tab.Screen
          name="CategoriesTab"
          options={{
            title: 'Categories',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon icon={Grid3x3} color={color} focused={focused} size={isPhone ? 20 : 18} />
            ),
          }}
        >
          {({ navigation }) => (
            <CategoriesStack
              onOpenCart={() => navigation.navigate('CartTab')}
              onOpenAccount={() => navigation.navigate('AccountTab')}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="CartTab"
          component={CartStack}
          options={{
            title: 'Cart',
            tabBarBadge: count > 0 ? count : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.primaryInk },
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon icon={ShoppingCart} color={color} focused={focused} size={isPhone ? 20 : 18} />
            ),
          }}
        />

        <Tab.Screen
          name="OrdersTab"
          component={OrdersStack}
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon icon={Package} color={color} focused={focused} size={isPhone ? 20 : 18} />
            ),
          }}
        />

        <Tab.Screen
          name="AccountTab"
          component={AccountStack}
          options={{
            title: 'Account',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon icon={User} color={color} focused={focused} size={isPhone ? 20 : 18} />
            ),
          }}
        />
      </Tab.Navigator>
      <ToastHost />
    </View>
  );
}
