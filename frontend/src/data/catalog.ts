/** @deprecated Prefer productsService — kept for gradual migration. */
export {
  SEED_PRODUCTS,
  SEED_VARIANTS,
  SEED_BANNERS as BANNERS,
  SEED_SALE_BANNER as SALE_BANNER,
} from './seedCatalog';

export type { SeedCategory as CatalogCategory } from './seedCatalog';

import { SEED_CATEGORIES } from './seedCatalog';
import { productsService, type ProductCardModel } from '../services/products.service';

export type CatalogProduct = ProductCardModel;

export const CATEGORIES = SEED_CATEGORIES.filter((c) => !c.parent_id).sort(
  (a, b) => a.sort_order - b.sort_order,
);

export const PRODUCTS: CatalogProduct[] = productsService.listSeedCards();

export function productsByCategory(categoryId: string) {
  return PRODUCTS.filter((p) => p.categoryId === categoryId);
}
