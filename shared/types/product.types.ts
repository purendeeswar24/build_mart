export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  icon_url?: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id: string;
  brand: string;
  title: string;
  slug: string;
  description?: string | null;
  material?: string | null;
  warranty_years?: number | null;
  features?: string[];
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_label: string;
  attributes: Record<string, string | number | boolean | null>;
  mrp: number;
  selling_price: number;
  stock_qty: number;
  sku: string;
  image_urls: string[];
}
