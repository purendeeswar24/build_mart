import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/account/ProfileScreen';
import { AddressListScreen } from '../screens/account/AddressListScreen';
import { AddressEditScreen } from '../screens/account/AddressEditScreen';
import { WishlistScreen } from '../screens/account/WishlistScreen';
import { ProfileEditScreen } from '../screens/account/ProfileEditScreen';
import { SettingsScreen } from '../screens/account/SettingsScreen';
import { SupportScreen } from '../screens/account/SupportScreen';
import { ProductDetailScreen } from '../screens/product/ProductDetailScreen';
import type { AccountStackParamList } from './types';
import { withHomeBack } from './screenOptions';

const Stack = createNativeStackNavigator<AccountStackParamList>();

export function AccountStack() {
  return (
    <Stack.Navigator screenOptions={({ navigation }) => withHomeBack(navigation, { dark: true })}>
      <Stack.Screen name="Account" options={{ title: 'Account' }}>
        {({ navigation }) => (
          <ProfileScreen
            onOpenAddresses={() => navigation.navigate('Addresses')}
            onOpenWishlist={() => navigation.navigate('Wishlist')}
            onOpenSettings={() => navigation.navigate('Settings')}
            onOpenSupport={() => navigation.navigate('Support')}
            onOpenProfileEdit={() => navigation.navigate('ProfileEdit')}
            onOpenBulkQuote={() => navigation.navigate('BulkQuote')}
            onOpenOrders={() => navigation.getParent()?.navigate('OrdersTab' as never)}
            onOpenHire={() => navigation.getParent()?.navigate('HireTab' as never)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ProfileEdit"
        options={{
          title: 'Edit profile',
        }}
      >
        {({ navigation }) => <ProfileEditScreen onSaved={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen
        name="Addresses"
        options={{
          title: 'Saved addresses',
        }}
      >
        {({ navigation }) => (
          <AddressListScreen
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
      <Stack.Screen
        name="Wishlist"
        options={{
          title: 'Wishlist',
        }}
      >
        {({ navigation }) => (
          <WishlistScreen
            onProductPress={(productId) => navigation.navigate('ProductDetail', { productId })}
            onBrowse={() => navigation.getParent()?.navigate('HomeTab' as never)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ProductDetail"
        options={{
          title: 'Product',
        }}
      >
        {({ route, navigation }) => (
          <ProductDetailScreen
            productId={route.params.productId}
            onAdded={() => navigation.getParent()?.navigate('CartTab' as never)}
            onProductPress={(productId) => navigation.push('ProductDetail', { productId })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="Support"
        options={{
          title: 'Help & support',
        }}
      >
        {() => <SupportScreen mode="support" />}
      </Stack.Screen>
      <Stack.Screen
        name="BulkQuote"
        options={{
          title: 'Bulk quote',
        }}
      >
        {() => <SupportScreen mode="bulk" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
