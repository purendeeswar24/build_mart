import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/cart/CheckoutScreen';
import { OrderConfirmationScreen } from '../screens/cart/OrderConfirmationScreen';
import { AddressListScreen } from '../screens/account/AddressListScreen';
import { AddressEditScreen } from '../screens/account/AddressEditScreen';
import type { CartStackParamList } from './types';
import { withHomeBack } from './screenOptions';

const Stack = createNativeStackNavigator<CartStackParamList>();

export function CartStack() {
  return (
    <Stack.Navigator screenOptions={({ navigation }) => withHomeBack(navigation, { dark: true })}>
      <Stack.Screen name="Cart" options={{ title: 'Cart' }}>
        {({ navigation }) => (
          <CartScreen
            onCheckout={() => navigation.navigate('Checkout')}
            onChangeAddress={() => navigation.navigate('Addresses')}
            onBrowse={() => navigation.getParent()?.navigate('HomeTab' as never)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Checkout"
        options={{
          title: 'Checkout',
        }}
      >
        {({ navigation }) => (
          <CheckoutScreen
            onChangeAddress={() => navigation.navigate('Addresses')}
            onConfirmed={(orderId) =>
              navigation.replace('OrderConfirmation', { orderId })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="OrderConfirmation"
        options={{
          title: 'Order placed',
        }}
      >
        {({ route, navigation }) => (
          <OrderConfirmationScreen
            orderId={route.params.orderId}
            onTrack={() => {
              const orderId = route.params.orderId;
              navigation.getParent()?.navigate('OrdersTab' as never, {
                screen: 'OrderDetail',
                params: { orderId },
              } as never);
            }}
            onContinue={() => {
              navigation.getParent()?.navigate('HomeTab' as never);
              navigation.navigate('Cart');
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Addresses"
        options={{
          title: 'Addresses',
        }}
      >
        {({ navigation }) => (
          <AddressListScreen
            selectable
            onAdd={() => navigation.navigate('AddressEdit', {})}
            onEdit={(addressId) => navigation.navigate('AddressEdit', { addressId })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="AddressEdit"
        options={{
          title: 'Edit address',
        }}
      >
        {({ route, navigation }) => (
          <AddressEditScreen
            addressId={route.params.addressId}
            onSaved={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
