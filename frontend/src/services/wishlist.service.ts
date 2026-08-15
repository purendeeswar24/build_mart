import AsyncStorage from '@react-native-async-storage/async-storage';

const WISHLIST_KEY = '@buildmart/wishlist';

export type WishlistItem = {
  productId: string;
  variantId?: string;
  addedAt: string;
};

export const wishlistService = {
  async list(): Promise<WishlistItem[]> {
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
