import React from 'react';
import { View } from 'react-native';
import {
  BottomTabBar,
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { House, LayoutGrid, Hammer, ShoppingBag, ClipboardList, CircleUser } from 'lucide-react-native';
import { TabBarIcon } from '../components/layout/TabBarIcon';
import { FloatingCart } from '../components/feedback/FloatingCart';
import { ToastHost } from '../components/feedback/ToastHost';
import { useCart } from '../hooks/useCart';
import { colors } from '../theme';
import { AccountStack } from './AccountStack';
import { CartStack } from './CartStack';
import { CategoriesStack } from './CategoriesStack';
import { HireStack } from './HireStack';
import { HomeStack } from './HomeStack';
import { OrdersStack } from './OrdersStack';
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

function FloatingCartLayer({ navigation, state }: BottomTabBarProps) {
  const route = state.routes[state.index];
  const nested = getFocusedRouteNameFromRoute(route) ?? route.name;
  const hide =
    route.name === 'CartTab' || HIDE_FLOAT_ROUTES.has(String(nested));

  if (hide) return null;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 64, zIndex: 50 }}>
      <FloatingCart onPress={() => navigation.navigate('CartTab')} />
    </View>
  );
}

function AppTabBar(props: BottomTabBarProps) {
  return (
    <>
      <FloatingCartLayer {...props} />
      <BottomTabBar {...props} />
    </>
  );
}

export function MainTabs() {
  const { count } = useCart();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 64,
            paddingBottom: 8,
            paddingTop: 4,
            paddingHorizontal: 2,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
          tabBarItemStyle: {
            minWidth: 0,
            paddingHorizontal: 0,
          },
        }}
      >
      <Tab.Screen
        name="HomeTab"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={House} color={color} focused={focused} />
          ),
        }}
      >
        {({ navigation }) => (
          <HomeStack
            onOpenCart={() => navigation.navigate('CartTab')}
            onOpenAccount={() => navigation.navigate('AccountTab')}
            onHirePress={() => navigation.navigate('HireTab')}
            onHireJobPress={(jobId) =>
              navigation.navigate('HireTab', { screen: 'HireJob', params: { jobId } })
            }
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="CategoriesTab"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={LayoutGrid} color={color} focused={focused} />
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
        name="HireTab"
        component={HireStack}
        options={{
          title: 'Work',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={Hammer} color={color} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="CartTab"
        component={CartStack}
        options={{
          title: 'Cart',
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.primaryInk },
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={ShoppingBag} color={color} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={ClipboardList} color={color} focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon icon={CircleUser} color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
      <ToastHost />
    </View>
  );
}
