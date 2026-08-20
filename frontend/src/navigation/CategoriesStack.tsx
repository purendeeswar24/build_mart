import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CategoryListScreen } from '../screens/category/CategoryListScreen';
import { CategoryDetailScreen } from '../screens/category/CategoryDetailScreen';
import { ProductDetailScreen } from '../screens/product/ProductDetailScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import type { CategoriesStackParamList } from './types';
import { withHomeBack } from './screenOptions';
import { goToHome } from './goToHome';

const Stack = createNativeStackNavigator<CategoriesStackParamList>();

type Props = {
  onOpenCart: () => void;
  onOpenAccount: () => void;
};

export function CategoriesStack({ onOpenCart, onOpenAccount }: Props) {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        ...withHomeBack(navigation),
      })}
    >
      <Stack.Screen
        name="Categories"
        options={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}
      >
        {({ navigation }) => (
          <CategoryListScreen
            onCategoryPress={(categoryId, title) =>
              navigation.navigate('CategoryDetail', { categoryId, title })
            }
            onSearchPress={() => navigation.navigate('Search')}
            onCartPress={onOpenCart}
            onProfilePress={onOpenAccount}
            onHomePress={() => goToHome(navigation)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="CategoryDetail"
        options={({ route }) => ({
          title: route.params.title,
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
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
    </Stack.Navigator>
  );
}
