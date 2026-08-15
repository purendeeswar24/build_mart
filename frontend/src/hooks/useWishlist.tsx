import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { wishlistService } from '../services/wishlist.service';

type WishlistContextValue = {
  productIds: Set<string>;
  hydrated: boolean;
  isSaved: (productId: string) => boolean;
  toggle: (productId: string, variantId?: string) => Promise<boolean>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: PropsWithChildren) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const list = await wishlistService.list();
    setIds(list.map((i) => i.productId));
    setHydrated(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(async (productId: string, variantId?: string) => {
    const on = await wishlistService.toggle(productId, variantId);
    setIds((prev) => {
      if (on) return prev.includes(productId) ? prev : [productId, ...prev];
      return prev.filter((id) => id !== productId);
    });
    return on;
  }, []);

  const productIds = useMemo(() => new Set(ids), [ids]);

  const value = useMemo(
    () => ({
      productIds,
      hydrated,
      isSaved: (productId: string) => productIds.has(productId),
      toggle,
      refresh,
    }),
    [productIds, hydrated, toggle, refresh],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
