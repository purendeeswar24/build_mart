import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/home/HomeScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { CategoryDetailScreen } from '../screens/category/CategoryDetailScreen';
import { ProductDetailScreen } from '../screens/product/ProductDetailScreen';
import { CapacityCalculatorScreen } from '../screens/tools/CapacityCalculatorScreen';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

type Props = {
  onOpenCart: () => void;
  onOpenAccount: () => void;
};

export function HomeStack({ onOpenCart, onOpenAccount }: Props) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" options={{ headerShown: false }}>
        {({ navigation }) => (
          <HomeScreen
            onSearchPress={() => navigation.navigate('Search')}
            onCartPress={onOpenCart}
            onProfilePress={onOpenAccount}
            onLocationPress={() =>
              navigation.getParent()?.navigate('AccountTab', {
                screen: 'AddressEdit',
                params: {},
              } as never)
            }
            onCategoryPress={(categoryId, title) =>
              navigation.navigate('CategoryDetail', { categoryId, title })
            }
            onCategoriesTab={() => navigation.getParent()?.navigate('CategoriesTab' as never)}
            onProductPress={(productId) => navigation.navigate('ProductDetail', { productId })}
            onCapacityPress={() => navigation.navigate('CapacityCalculator')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="CategoryDetail"
        options={({ route }) => ({
          title: route.params.title,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
        })}
      >
        {({ route, navigation }) => (
          <CategoryDetailScreen
            title={route.params.title}
            categoryId={route.params.categoryId}
            onProductPress={(productId) => navigation.navigate('ProductDetail', { productId })}
            onOpenCart={onOpenCart}
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
        name="CapacityCalculator"
        options={{
          title: 'Capacity calculator',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#E8F1F8' },
        }}
      >
        {({ navigation }) => (
          <CapacityCalculatorScreen
            onProductPress={(productId) => navigation.navigate('ProductDetail', { productId })}
            onViewAll={() =>
              navigation.navigate('CategoryDetail', {
                categoryId: 'c-tanks',
                title: 'Water Tanks',
              })
            }
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search', headerShadowVisible: false }}
      />
    </Stack.Navigator>
  );
}
