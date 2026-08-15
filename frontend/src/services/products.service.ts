import type { ImageSourcePropType } from 'react-native';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import {
  SEED_BANNERS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_SALE_BANNER,
  SEED_VARIANTS,
  type SeedCategory,
  type SeedProduct,
  type SeedVariant,
} from '../data/seedCatalog';

export type CatalogCategory = SeedCategory;

export type ProductCardModel = {
  id: string;
  brand: string;
  title: string;
  categoryId: string;
  mrp: number;
  price: number;
  image: ImageSourcePropType;
  imageTint: string;
  badge?: '30 MIN' | 'BESTSELLER' | 'SALE';
  hasVariants: boolean;
  pills?: string;
  stockQty: number;
  defaultVariantId: string;
  defaultVariantLabel: string;
};

export type ProductDetailModel = ProductCardModel & {
  description: string;
  material?: string;
  warrantyYears?: number;
  features: string[];
  variants: SeedVariant[];
};

export type SortOption = 'popularity' | 'price_asc' | 'price_desc' | 'newest';

export type ProductQuery = {
  categoryId?: string;
  search?: string;
  brands?: string[];
  /** Dynamic attribute filters, e.g. { capacity_litres: ['1000'], layers: ['4'] } */
  attributes?: Record<string, string[]>;
  priceMin?: number;
  priceMax?: number;
  sort?: SortOption;
  inStockOnly?: boolean;
  /** Pagination */
  limit?: number;
  offset?: number;
};

export type PagedProducts = {
  items: ProductCardModel[];
  total: number;
  hasMore: boolean;
};

export type FilterFacets = {
  brands: string[];
  priceMin: number;
  priceMax: number;
  /** Attribute keys present in this category's variants */
  attributeKeys: { key: string; label: string; values: string[] }[];
};

/** Compatible accessories join (product_id → accessory product ids) */
const PRODUCT_ACCESSORIES: Record<string, string[]> = {
  p1: ['p6'],
  p16: ['p6'],
};

function attrLabel(key: string) {
  if (key.includes('capacity') || key.includes('litre')) return 'Capacity';
  if (key.includes('layer')) return 'Layers';
  if (key.includes('volume')) return 'Volume';
  if (key.includes('finish')) return 'Finish';
  if (key.includes('size')) return 'Size';
  if (key.includes('weight')) return 'Weight';
  if (key.includes('amp')) return 'Amps';
  if (key.includes('watt')) return 'Watts';
  if (key.includes('diameter')) return 'Diameter';
  if (key.includes('thickness')) return 'Thickness';
  if (key.includes('length')) return 'Length';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAttrValue(key: string, value: string | number | boolean) {
  if (key.includes('capacity') || key.includes('litre') || key.includes('volume')) return `${value}L`;
  if (key.includes('layer')) return String(value);
  if (key.includes('weight_kg')) return `${value}kg`;
  return String(value);
}

function productMatchesQuery(product: SeedProduct, query: ProductQuery): boolean {
  const variants = variantsFor(product.id);
  if (!variants.length) return false;

  if (query.search) {
    const q = query.search.trim().toLowerCase();
    if (!product.title.toLowerCase().includes(q) && !product.brand.toLowerCase().includes(q)) {
      return false;
    }
  }

  if (query.brands?.length && !query.brands.includes(product.brand)) return false;

  const matchingVariants = variants.filter((v) => {
    if (query.inStockOnly && v.stock_qty <= 0) return false;
    if (query.priceMin != null && v.selling_price < query.priceMin) return false;
    if (query.priceMax != null && v.selling_price > query.priceMax) return false;
    if (query.attributes) {
      for (const [key, values] of Object.entries(query.attributes)) {
        if (!values.length) continue;
        const raw = v.attributes[key];
        if (raw == null) return false;
        const formatted = formatAttrValue(key, raw);
        const asString = String(raw);
        if (!values.includes(formatted) && !values.includes(asString)) return false;
      }
    }
    return true;
  });

  return matchingVariants.length > 0;
}

function sortCards(cards: ProductCardModel[], sort: SortOption = 'popularity') {
  const meta = Object.fromEntries(SEED_PRODUCTS.map((p) => [p.id, p]));
  const next = [...cards];
  switch (sort) {
    case 'price_asc':
      return next.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return next.sort((a, b) => b.price - a.price);
    case 'newest':
      return next.reverse();
    case 'popularity':
    default:
      return next.sort((a, b) => {
        const score = (id: string) =>
          (meta[id]?.bestseller ? 2 : 0) + (meta[id]?.trending ? 1 : 0) + (meta[id]?.featured ? 1 : 0);
        return score(b.id) - score(a.id);
      });
  }
}

function toCardFromMatchedVariant(product: SeedProduct, query: ProductQuery): ProductCardModel | null {
  const variants = variantsFor(product.id);
  if (!variants.length) return null;

  const matched =
    variants.find((v) => {
      if (query.priceMin != null && v.selling_price < query.priceMin) return false;
      if (query.priceMax != null && v.selling_price > query.priceMax) return false;
      if (query.attributes) {
        for (const [key, values] of Object.entries(query.attributes)) {
          if (!values.length) continue;
          const raw = v.attributes[key];
          if (raw == null) return false;
          const formatted = formatAttrValue(key, raw);
          if (!values.includes(formatted) && !values.includes(String(raw))) return false;
        }
      }
      return true;
    }) ?? variants[0];

  const base = toCard(product);
  if (!base) return null;
  return {
    ...base,
    mrp: matched.mrp,
    price: matched.selling_price,
    image: matched.image,
    imageTint: matched.imageTint,
    stockQty: matched.stock_qty,
    defaultVariantId: matched.id,
    defaultVariantLabel: matched.variant_label,
    pills: Object.entries(matched.attributes)
      .slice(0, 3)
      .map(([k, v]) => formatAttrValue(k, v))
      .join(' · '),
  };
}


function variantsFor(productId: string) {
  return SEED_VARIANTS.filter((v) => v.product_id === productId);
}

function toCard(product: SeedProduct): ProductCardModel | null {
  const variants = variantsFor(product.id);
  if (!variants.length) return null;
  const primary = variants[0];
  const pills = Object.entries(primary.attributes)
    .slice(0, 3)
    .map(([k, v]) => {
      if (k.includes('capacity') || k.includes('litre')) return `${v}L`;
      if (k.includes('layer')) return `${v} Layers`;
      if (k.includes('volume')) return `${v}L`;
      if (k.includes('weight_kg')) return `${v}kg`;
      return String(v);
    })
    .join(' · ');

  return {
    id: product.id,
    brand: product.brand,
    title: product.title,
    categoryId: product.category_id,
    mrp: primary.mrp,
    price: primary.selling_price,
    image: primary.image,
    imageTint: primary.imageTint,
    badge: product.badge,
    hasVariants: variants.length > 1,
    pills: pills || undefined,
    stockQty: primary.stock_qty,
    defaultVariantId: primary.id,
    defaultVariantLabel: primary.variant_label,
  };
}

function descendantCategoryIds(rootId: string): string[] {
  const ids = [rootId];
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of SEED_CATEGORIES) {
      if (c.parent_id && ids.includes(c.parent_id) && !ids.includes(c.id)) {
        ids.push(c.id);
        changed = true;
      }
    }
  }
  return ids;
}

async function trySupabaseCategories(): Promise<CatalogCategory[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .order('sort_order');
  if (error || !data?.length) return null;
  return data.map((row) => {
    const local = SEED_CATEGORIES.find((c) => c.slug === row.slug);
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parent_id: row.parent_id,
      icon_url: row.icon_url,
      sort_order: row.sort_order,
      shortName: local?.shortName ?? row.name.split(' ')[0],
      image: local?.image ?? require('../../assets/images/placeholders/no-image.jpg'),
    } satisfies CatalogCategory;
  });
}

/** Live catalog from Supabase when seeded; falls back to local seed. */
async function trySupabaseProductCards(): Promise<ProductCardModel[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data?.length) return null;

  return data
    .map((row) => {
      const variants = (row.product_variants ?? []) as Array<{
        id: string;
        variant_label: string;
        mrp: number;
        selling_price: number;
        stock_qty: number;
        image_urls?: string[];
        attributes?: Record<string, string | number | boolean>;
      }>;
      if (!variants.length) return null;
      const primary = variants[0];
      const local = SEED_PRODUCTS.find((p) => p.slug === row.slug);
      const localVariant = local
        ? SEED_VARIANTS.find((v) => v.product_id === local.id)
        : undefined;
      return {
        id: row.id as string,
        brand: row.brand as string,
        title: row.title as string,
        categoryId: row.category_id as string,
        mrp: Number(primary.mrp),
        price: Number(primary.selling_price),
        image:
          localVariant?.image ??
          require('../../assets/images/placeholders/no-image.jpg'),
        imageTint: localVariant?.imageTint ?? '#E8F1F8',
        badge: (row.badge as ProductCardModel['badge']) ?? local?.badge,
        hasVariants: variants.length > 1,
        stockQty: Number(primary.stock_qty),
        defaultVariantId: primary.id,
        defaultVariantLabel: primary.variant_label,
      } satisfies ProductCardModel;
    })
    .filter(Boolean) as ProductCardModel[];
}

export const productsService = {
  async getTopCategories(): Promise<CatalogCategory[]> {
    const remote = await trySupabaseCategories();
    if (remote) return remote;
    return SEED_CATEGORIES.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  },

  async getSubcategories(parentId: string): Promise<CatalogCategory[]> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', parentId)
        .order('sort_order');
      if (data?.length) {
        return data.map((row) => {
          const local = SEED_CATEGORIES.find((c) => c.slug === row.slug);
          return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            parent_id: row.parent_id,
            icon_url: row.icon_url,
            sort_order: row.sort_order,
            shortName: local?.shortName ?? row.name.split(' ')[0],
            image: local?.image ?? require('../../assets/images/placeholders/no-image.jpg'),
          } satisfies CatalogCategory;
        });
      }
    }
    return SEED_CATEGORIES.filter((c) => c.parent_id === parentId).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
  },

  async getCategoryById(id: string): Promise<CatalogCategory | undefined> {
    return SEED_CATEGORIES.find((c) => c.id === id || c.slug === id);
  },

  async getHomeFeed(): Promise<{
    banners: ImageSourcePropType[];
    saleBanner: ImageSourcePropType;
    categories: CatalogCategory[];
    trending: ProductCardModel[];
    bestSellers: ProductCardModel[];
    featured: ProductCardModel[];
  }> {
    const categories = (await this.getTopCategories()).slice(0, 8);
    const remoteCards = await trySupabaseProductCards();
    const cards =
      remoteCards ??
      ((SEED_PRODUCTS.map(toCard).filter(Boolean) as ProductCardModel[]));
    const meta = Object.fromEntries(SEED_PRODUCTS.map((p) => [p.id, p]));

    return {
      banners: SEED_BANNERS,
      saleBanner: SEED_SALE_BANNER,
      categories,
      trending: remoteCards
        ? cards.slice(0, 8)
        : cards.filter((c) => meta[c.id]?.trending).slice(0, 8),
      bestSellers: remoteCards
        ? cards.slice(0, 8)
        : cards.filter((c) => meta[c.id]?.bestseller).slice(0, 8),
      featured: remoteCards
        ? cards.slice(0, 8)
        : cards.filter((c) => meta[c.id]?.featured).slice(0, 8),
    };
  },

  async getProductsByCategory(categoryId: string): Promise<ProductCardModel[]> {
    return this.queryProducts({ categoryId });
  },

  async queryProducts(query: ProductQuery = {}): Promise<ProductCardModel[]> {
    const paged = await this.queryProductsPaged(query);
    return paged.items;
  },

  async queryProductsPaged(query: ProductQuery = {}): Promise<PagedProducts> {
    let pool = SEED_PRODUCTS;
    if (query.categoryId) {
      const ids = descendantCategoryIds(query.categoryId);
      pool = pool.filter((p) => ids.includes(p.category_id));
    }

    const matched = pool
      .filter((p) => productMatchesQuery(p, query))
      .map((p) => toCardFromMatchedVariant(p, query))
      .filter(Boolean) as ProductCardModel[];

    const sorted = sortCards(matched, query.sort ?? 'popularity');
    const offset = query.offset ?? 0;
    const limit = query.limit ?? sorted.length;
    const items = sorted.slice(offset, offset + limit);
    return {
      items,
      total: sorted.length,
      hasMore: offset + items.length < sorted.length,
    };
  },

  async getFilterFacets(categoryId?: string, search?: string): Promise<FilterFacets> {
    let pool = SEED_PRODUCTS;
    if (categoryId) {
      const ids = descendantCategoryIds(categoryId);
      pool = pool.filter((p) => ids.includes(p.category_id));
    }
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      pool = pool.filter(
        (p) => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q),
      );
    }

    const variants = pool.flatMap((p) => variantsFor(p.id));
    const brands = [...new Set(pool.map((p) => p.brand))].sort();
    const prices = variants.map((v) => v.selling_price);
    const priceMin = prices.length ? Math.min(...prices) : 0;
    const priceMax = prices.length ? Math.max(...prices) : 0;

    const attrMap = new Map<string, Set<string>>();
    for (const v of variants) {
      for (const [key, value] of Object.entries(v.attributes)) {
        if (!attrMap.has(key)) attrMap.set(key, new Set());
        attrMap.get(key)!.add(formatAttrValue(key, value));
      }
    }

    const attributeKeys = [...attrMap.entries()]
      .map(([key, values]) => ({
        key,
        label: attrLabel(key),
        values: [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      }))
      .filter((a) => a.values.length > 1)
      .sort((a, b) => a.label.localeCompare(b.label));

    return { brands, priceMin, priceMax, attributeKeys };
  },

  async getProductDetail(productId: string): Promise<ProductDetailModel | null> {
    const product = SEED_PRODUCTS.find((p) => p.id === productId);
    if (!product) return null;
    const card = toCard(product);
    if (!card) return null;
    return {
      ...card,
      description: product.description,
      material: product.material,
      warrantyYears: product.warranty_years,
      features: product.features,
      variants: variantsFor(product.id),
    };
  },

  async getSimilarProducts(productId: string): Promise<ProductCardModel[]> {
    const product = SEED_PRODUCTS.find((p) => p.id === productId);
    if (!product) return [];
    return SEED_PRODUCTS.filter(
      (p) => p.category_id === product.category_id && p.id !== productId && p.brand !== product.brand,
    )
      .map(toCard)
      .filter(Boolean)
      .slice(0, 8) as ProductCardModel[];
  },

  async getAccessories(productId: string): Promise<ProductCardModel[]> {
    const ids = PRODUCT_ACCESSORIES[productId] ?? [];
    return ids
      .map((id) => SEED_PRODUCTS.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => toCard(p!))
      .filter(Boolean) as ProductCardModel[];
  },

  async searchProducts(query: string): Promise<ProductCardModel[]> {
    return this.queryProducts({ search: query, sort: 'popularity' });
  },

  async searchSuggest(query: string): Promise<string[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const titles = SEED_PRODUCTS.filter(
      (p) => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q),
    ).map((p) => p.title);
    return [...new Set(titles)].slice(0, 6);
  },

  /** Used by cart / older screens during migration */
  getSeedProduct(productId: string) {
    return SEED_PRODUCTS.find((p) => p.id === productId);
  },

  getSeedVariant(variantId: string) {
    return SEED_VARIANTS.find((v) => v.id === variantId);
  },

  listSeedCards(): ProductCardModel[] {
    return SEED_PRODUCTS.map(toCard).filter(Boolean) as ProductCardModel[];
  },
};
