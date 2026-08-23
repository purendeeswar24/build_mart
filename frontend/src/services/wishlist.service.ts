import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, getAccessToken } from './apiClient';

const WISHLIST_KEY = '@buildmart/wishlist';

export type WishlistItem = {
  productId: string;
  variantId?: string;
  addedAt: string;
};

export const wishlistService = {
  async list(): Promise<WishlistItem[]> {
    if (await getAccessToken()) {
      try {
        const res = await apiClient.get<{
          items: Array<{ product_id: string; variant_id?: string; created_at: string }>;
        }>('/api/v1/wishlist');
        return (res.items ?? []).map((i) => ({
          productId: i.product_id,
          variantId: i.variant_id,
          addedAt: i.created_at,
        }));
      } catch {
        /* local fallback */
      }
    }
    const raw = await AsyncStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WishlistItem[];
  },

  async save(items: WishlistItem[]) {
    await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  },

  async has(productId: string): Promise<boolean> {
    const list = await this.list();
    return list.some((i) => i.productId === productId);
  },

  async toggle(productId: string, variantId?: string): Promise<boolean> {
    if (await getAccessToken()) {
      try {
        const res = await apiClient.post<{ saved: boolean }>('/api/v1/wishlist', {
          productId,
          variantId,
        });
        return res.saved;
      } catch {
        /* local fallback */
      }
    }
    const list = await this.list();
    const idx = list.findIndex((i) => i.productId === productId);
    if (idx >= 0) {
      list.splice(idx, 1);
      await this.save(list);
      return false;
    }
    list.unshift({
      productId,
      variantId,
      addedAt: new Date().toISOString(),
    });
    await this.save(list);
    return true;
  },

  async remove(productId: string) {
    const next = (await this.list()).filter((i) => i.productId !== productId);
    await this.save(next);
  },
};
