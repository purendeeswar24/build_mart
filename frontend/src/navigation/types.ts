export type RootTabParamList = {
  HomeTab: undefined;
  CategoriesTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
  AccountTab: undefined;
  AboutTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Search: undefined;
  CategoryDetail: { categoryId: string; title: string };
  ProductDetail: { productId: string };
  CapacityCalculator: undefined;
};

export type CategoriesStackParamList = {
  Categories: undefined;
  CategoryDetail: { categoryId: string; title: string };
  ProductDetail: { productId: string };
  Search: undefined;
  CapacityCalculator: undefined;
};

export type CartStackParamList = {
  Cart: undefined;
  Checkout: undefined;
  OrderConfirmation: { orderId: string };
  Addresses: undefined;
  AddressEdit: { addressId?: string };
};

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetail: { orderId: string };
};

export type AccountStackParamList = {
  Account: undefined;
  ProfileEdit: undefined;
  Addresses: undefined;
  AddressEdit: { addressId?: string };
  Wishlist: undefined;
  ProductDetail: { productId: string };
  Settings: undefined;
  Support: undefined;
  BulkQuote: undefined;
};
