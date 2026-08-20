import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrderListScreen } from '../screens/orders/OrderListScreen';
import { OrderDetailScreen } from '../screens/orders/OrderDetailScreen';
import type { OrdersStackParamList } from './types';
import { withHomeBack } from './screenOptions';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={({ navigation }) => withHomeBack(navigation, { dark: true })}>
      <Stack.Screen
        name="Orders"
        options={{
          title: 'Orders',
        }}
      >
        {({ navigation }) => (
          <OrderListScreen
            onOpenOrder={(orderId) => navigation.navigate('OrderDetail', { orderId })}
            onBrowse={() => navigation.getParent()?.navigate('HomeTab' as never)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="OrderDetail"
        options={({ route }) => ({
          title: `Order #${route.params.orderId}`,
        })}
      >
        {({ route, navigation }) => (
          <OrderDetailScreen
            orderId={route.params.orderId}
            onGoToCart={() => navigation.getParent()?.navigate('CartTab' as never)}
            onSupport={() =>
              navigation.getParent()?.navigate('AccountTab' as never, {
                screen: 'Support',
              } as never)
            }
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
