import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/cart/CheckoutScreen';
import { OrderConfirmationScreen } from '../screens/cart/OrderConfirmationScreen';
import { AddressListScreen } from '../screens/account/AddressListScreen';
import { AddressEditScreen } from '../screens/account/AddressEditScreen';
import type { CartStackParamList } from './types';

const Stack = createNativeStackNavigator<CartStackParamList>();

export function CartStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Cart" options={{ headerShown: false }}>
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
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
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
          headerShadowVisible: false,
          headerBackVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
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
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
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
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
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
