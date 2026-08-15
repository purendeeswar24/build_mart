import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { productsService, type ProductCardModel } from '../services/products.service';
import { deliveryFeeFor } from '../services/address.service';
import { analytics } from '../services/analytics.service';
import { SEED_VARIANTS } from '../data/seedCatalog';

export type CartLine = {
  productId: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  hydrated: boolean;
  addItem: (productId: string, variantLabel?: string, qty?: number, unitPrice?: number) => void;
  addMany: (items: { productId: string; variantLabel?: string; qty?: number; unitPrice?: number }[]) => void;
  setQuantity: (productId: string, variantLabel: string, quantity: number) => void;
  removeItem: (productId: string, variantLabel: string) => void;
  clear: () => void;
  getProduct: (id: string) => ProductCardModel | undefined;
};

const CART_KEY = '@buildmart/cart';
const CartContext = createContext<CartContextValue | null>(null);
const CATALOG = productsService.listSeedCards();

function priceFor(productId: string, variantLabel: string) {
  const v = SEED_VARIANTS.find(
    (x) => x.product_id === productId && x.variant_label === variantLabel,
  );
  return v?.selling_price ?? CATALOG.find((p) => p.id === productId)?.price ?? 0;
}

export function CartProvider({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_KEY);
        if (raw) setLines(JSON.parse(raw) as CartLine[]);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const getProduct = useCallback((id: string) => CATALOG.find((p) => p.id === id), []);

  const addItem = useCallback(
    (productId: string, variantLabel = 'Default', qty = 1, unitPrice?: number) => {
      const price = unitPrice ?? priceFor(productId, variantLabel);
      setLines((prev) => {
        const idx = prev.findIndex(
          (l) => l.productId === productId && l.variantLabel === variantLabel,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
          return next;
        }
        return [...prev, { productId, variantLabel, quantity: qty, unitPrice: price }];
      });
      analytics.addToCart(productId, qty);
    },
    [],
  );

  const addMany = useCallback(
    (items: { productId: string; variantLabel?: string; qty?: number; unitPrice?: number }[]) => {
      items.forEach((item) =>
        addItem(item.productId, item.variantLabel, item.qty ?? 1, item.unitPrice),
      );
    },
    [addItem],
  );

  const setQuantity = useCallback((productId: string, variantLabel: string, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.productId === productId && l.variantLabel === variantLabel ? { ...l, quantity } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string, variantLabel: string) => {
    setLines((prev) =>
      prev.filter((l) => !(l.productId === productId && l.variantLabel === variantLabel)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines],
  );
  const deliveryFee = useMemo(() => deliveryFeeFor(subtotal), [subtotal]);
  const total = subtotal + deliveryFee;
  const count = useMemo(() => lines.reduce((n, l) => n + l.quantity, 0), [lines]);

  const value = useMemo(
    () => ({
      lines,
      count,
      subtotal,
      deliveryFee,
      total,
      hydrated,
      addItem,
      addMany,
      setQuantity,
      removeItem,
      clear,
      getProduct,
    }),
    [
      lines,
      count,
      subtotal,
      deliveryFee,
      total,
      hydrated,
      addItem,
      addMany,
      setQuantity,
      removeItem,
      clear,
      getProduct,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
