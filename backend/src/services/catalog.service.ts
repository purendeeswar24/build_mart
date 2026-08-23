import { query, queryOne } from '../config/db';

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon_url: string | null;
  short_name: string | null;
  sort_order: number;
};

export type ProductRow = {
  id: string;
  category_id: string;
  brand: string;
  title: string;
  slug: string;
  description: string | null;
  material: string | null;
  warranty_years: number | null;
  features: string[];
  badge: string | null;
  trending: boolean;
  bestseller: boolean;
  featured: boolean;
  listing_status?: string;
  is_active?: boolean;
};

export type VariantRow = {
  id: string;
  product_id: string;
  variant_label: string;
  attributes: Record<string, string | number | boolean>;
  mrp: string | number;
  selling_price: string | number;
  stock_qty: number;
  sku: string;
  image_urls: string[];
  image_tint: string | null;
};

export async function listCategories(opts?: {
  topOnly?: boolean;
  parentId?: string;
}): Promise<CategoryRow[]> {
  if (opts?.parentId) {
    return query<CategoryRow>(
      `select id, name, slug, parent_id, icon_url, short_name, sort_order
       from categories where parent_id = $1 order by sort_order, name`,
      [opts.parentId],
    );
  }
  if (opts?.topOnly) {
    return query<CategoryRow>(
      `select id, name, slug, parent_id, icon_url, short_name, sort_order
       from categories where parent_id is null order by sort_order, name`,
    );
  }
  return query<CategoryRow>(
    `select id, name, slug, parent_id, icon_url, short_name, sort_order
     from categories order by sort_order, name`,
  );
}

export async function getCategory(id: string): Promise<CategoryRow | null> {
  return queryOne<CategoryRow>(
    `select id, name, slug, parent_id, icon_url, short_name, sort_order
     from categories where id = $1 or slug = $1`,
    [id],
  );
}

export async function listProducts(): Promise<Array<ProductRow & { variants: VariantRow[] }>> {
  const products = await query<ProductRow>(
    `select id, category_id, brand, title, slug, description, material, warranty_years,
            features, badge, trending, bestseller, featured, listing_status, is_active
     from products
     where coalesce(is_active, true) = true
       and coalesce(listing_status, 'on_sale') <> 'hidden'
     order by created_at desc`,
  );
  const variants = await query<VariantRow>(
    `select id, product_id, variant_label, attributes, mrp, selling_price, stock_qty, sku, image_urls, image_tint
     from product_variants`,
  );
  const byProduct = new Map<string, VariantRow[]>();
  for (const v of variants) {
    const list = byProduct.get(v.product_id) ?? [];
    list.push(v);
    byProduct.set(v.product_id, list);
  }
  return products.map((p) => ({ ...p, variants: byProduct.get(p.id) ?? [] }));
}

export async function getProduct(id: string): Promise<(ProductRow & { variants: VariantRow[] }) | null> {
  const product = await queryOne<ProductRow>(
    `select id, category_id, brand, title, slug, description, material, warranty_years,
            features, badge, trending, bestseller, featured, listing_status, is_active
     from products
     where (id = $1 or slug = $1)
       and coalesce(listing_status, 'on_sale') <> 'hidden'`,
    [id],
  );
  if (!product) return null;
  const variants = await query<VariantRow>(
    `select id, product_id, variant_label, attributes, mrp, selling_price, stock_qty, sku, image_urls, image_tint
     from product_variants where product_id = $1`,
    [product.id],
  );
  return { ...product, variants };
}

export async function listInventory() {
  return query<{
    sku: string;
    name: string;
    brand: string;
    stock: number;
    product_id: string;
    variant_id: string;
    category_id: string;
    category_name: string;
    mrp: string | number;
    selling_price: string | number;
    variant_label: string;
    listing_status: string;
    image_url: string | null;
    slug: string;
  }>(
    `select
       v.sku,
       p.title as name,
       p.brand,
       v.stock_qty as stock,
       p.id as product_id,
       v.id as variant_id,
       p.category_id,
       c.name as category_name,
       v.mrp,
       v.selling_price,
       v.variant_label,
       coalesce(p.listing_status, 'on_sale') as listing_status,
       coalesce(v.image_urls[1], null) as image_url,
       p.slug
     from product_variants v
     join products p on p.id = v.product_id
     join categories c on c.id = p.category_id
     order by p.created_at desc, p.title`,
  );
}

export type ListingStatus = 'on_sale' | 'limited' | 'out_of_stock' | 'hidden';

export type CreateProductInput = {
  categoryId: string;
  brand: string;
  title: string;
  description?: string;
  material?: string;
  warrantyYears?: number;
  badge?: string;
  listingStatus: ListingStatus;
  variantLabel: string;
  mrp: number;
  sellingPrice: number;
  stockQty: number;
  sku?: string;
  imageUrl?: string;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export async function createProduct(input: CreateProductInput) {
  const category = await getCategory(input.categoryId);
  if (!category) throw new Error('Category not found');

  const baseSlug = slugify(`${input.brand} ${input.title}`) || `item-${Date.now()}`;
  let slug = baseSlug;
  let n = 1;
  while (await queryOne('select id from products where slug = $1', [slug])) {
    slug = `${baseSlug}-${++n}`;
  }

  const productId = `p-${Date.now().toString(36)}`;
  const variantId = `v-${Date.now().toString(36)}`;
  const sku =
    input.sku?.trim() ||
    `${input.brand.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const status = input.listingStatus;
  const stock = status === 'out_of_stock' ? 0 : Math.max(0, input.stockQty);
  const imageUrls = input.imageUrl?.trim() ? [input.imageUrl.trim()] : [];

  await query(
    `insert into products (
       id, category_id, brand, title, slug, description, material, warranty_years,
       features, badge, listing_status, is_active
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      productId,
      category.id,
      input.brand.trim(),
      input.title.trim(),
      slug,
      input.description?.trim() || null,
      input.material?.trim() || null,
      input.warrantyYears ?? null,
      [],
      input.badge || null,
      status,
      status !== 'hidden',
    ],
  );

  await query(
    `insert into product_variants (
       id, product_id, variant_label, attributes, mrp, selling_price, stock_qty, sku, image_urls
     ) values ($1,$2,$3,'{}'::jsonb,$4,$5,$6,$7,$8)`,
    [variantId, productId, input.variantLabel.trim() || 'Standard', input.mrp, input.sellingPrice, stock, sku, imageUrls],
  );

  return { productId, variantId, sku, slug };
}

export async function updateListing(input: {
  productId: string;
  variantId: string;
  listingStatus?: ListingStatus;
  stockQty?: number;
  mrp?: number;
  sellingPrice?: number;
}) {
  if (input.listingStatus) {
    await query(
      `update products
       set listing_status = $2, is_active = $3
       where id = $1`,
      [input.productId, input.listingStatus, input.listingStatus !== 'hidden'],
    );
  }
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (input.stockQty != null) {
    const qty = input.listingStatus === 'out_of_stock' ? 0 : input.stockQty;
    sets.push(`stock_qty = $${i++}`);
    params.push(qty);
  } else if (input.listingStatus === 'out_of_stock') {
    sets.push(`stock_qty = $${i++}`);
    params.push(0);
  }
  if (input.mrp != null) {
    sets.push(`mrp = $${i++}`);
    params.push(input.mrp);
  }
  if (input.sellingPrice != null) {
    sets.push(`selling_price = $${i++}`);
    params.push(input.sellingPrice);
  }
  if (sets.length) {
    params.push(input.variantId);
    await query(`update product_variants set ${sets.join(', ')} where id = $${i}`, params);
  }
}

export async function deleteProduct(productId: string) {
  const row = await queryOne<{ id: string }>('select id from products where id = $1', [productId]);
  if (!row) throw new Error('Product not found');
  await query('delete from products where id = $1', [productId]);
}
