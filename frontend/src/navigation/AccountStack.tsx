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

const Stack = createNativeStackNavigator<AccountStackParamList>();

export function AccountStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Account" options={{ headerShown: false }}>
        {({ navigation }) => (
          <ProfileScreen
            onOpenAddresses={() => navigation.navigate('Addresses')}
            onOpenWishlist={() => navigation.navigate('Wishlist')}
            onOpenSettings={() => navigation.navigate('Settings')}
            onOpenSupport={() => navigation.navigate('Support')}
            onOpenProfileEdit={() => navigation.navigate('ProfileEdit')}
            onOpenBulkQuote={() => navigation.navigate('BulkQuote')}
            onOpenOrders={() => navigation.getParent()?.navigate('OrdersTab' as never)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ProfileEdit"
        options={{
          title: 'Edit profile',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
        }}
      >
        {({ navigation }) => <ProfileEditScreen onSaved={() => navigation.goBack()} />}
      </Stack.Screen>
      <Stack.Screen
        name="Addresses"
        options={{
          title: 'Saved addresses',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
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
      <Stack.Screen
        name="Wishlist"
        options={{
          title: 'Wishlist',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
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
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
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
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
        }}
      />
      <Stack.Screen
        name="Support"
        options={{
          title: 'Help & support',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
        }}
      >
        {() => <SupportScreen mode="support" />}
      </Stack.Screen>
      <Stack.Screen
        name="BulkQuote"
        options={{
          title: 'Bulk quote',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
        }}
      >
        {() => <SupportScreen mode="bulk" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
