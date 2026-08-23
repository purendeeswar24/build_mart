import { getPool, isDatabaseConfigured, query, queryOne } from '../config/db';
import {
  CATALOG_CATEGORIES,
  CATALOG_PRODUCTS,
  CATALOG_VARIANTS,
  SERVICEABLE_PINCODES,
} from './catalogSeed';

export async function seedIfEmpty(force = false): Promise<{ seeded: boolean; reason: string }> {
  if (!isDatabaseConfigured()) {
    return { seeded: false, reason: 'DATABASE_URL missing' };
  }

  const existing = await queryOne<{ count: string }>('select count(*)::text as count from categories');
  if (!force && existing && Number(existing.count) > 0) {
    return { seeded: false, reason: `already has ${existing.count} categories` };
  }

  const client = await getPool().connect();
  try {
    await client.query('begin');

    for (const c of CATALOG_CATEGORIES) {
      await client.query(
        `insert into categories (id, name, slug, parent_id, short_name, sort_order)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do update set
           name = excluded.name,
           slug = excluded.slug,
           parent_id = excluded.parent_id,
           short_name = excluded.short_name,
           sort_order = excluded.sort_order`,
        [c.id, c.name, c.slug, c.parent_id, c.short_name, c.sort_order],
      );
    }

    for (const p of CATALOG_PRODUCTS) {
      await client.query(
        `insert into products (
           id, category_id, brand, title, slug, description, material,
           warranty_years, features, badge, trending, bestseller, featured
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (id) do update set
           category_id = excluded.category_id,
           brand = excluded.brand,
           title = excluded.title,
           slug = excluded.slug,
           description = excluded.description,
           material = excluded.material,
           warranty_years = excluded.warranty_years,
           features = excluded.features,
           badge = excluded.badge,
           trending = excluded.trending,
           bestseller = excluded.bestseller,
           featured = excluded.featured`,
        [
          p.id,
          p.category_id,
          p.brand,
          p.title,
          p.slug,
          p.description,
          p.material ?? null,
          p.warranty_years ?? null,
          p.features,
          p.badge ?? null,
          !!p.trending,
          !!p.bestseller,
          !!p.featured,
        ],
      );
    }

    for (const v of CATALOG_VARIANTS) {
      await client.query(
        `insert into product_variants (
           id, product_id, variant_label, attributes, mrp, selling_price,
           stock_qty, sku, image_tint
         ) values ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9)
         on conflict (id) do update set
           variant_label = excluded.variant_label,
           attributes = excluded.attributes,
           mrp = excluded.mrp,
           selling_price = excluded.selling_price,
           sku = excluded.sku,
           image_tint = excluded.image_tint`,
        [
          v.id,
          v.product_id,
          v.variant_label,
          JSON.stringify(v.attributes),
          v.mrp,
          v.selling_price,
          v.stock_qty,
          v.sku,
          v.image_tint,
        ],
      );
    }

    for (const pin of SERVICEABLE_PINCODES) {
      await client.query(
        `insert into serviceable_pincodes (pincode, city, is_active, eta_minutes, cod_eligible)
         values ($1,$2,$3,$4,$5)
         on conflict (pincode) do update set
           city = excluded.city,
           is_active = excluded.is_active,
           eta_minutes = excluded.eta_minutes,
           cod_eligible = excluded.cod_eligible`,
        [pin.pincode, pin.city, pin.is_active, pin.eta_minutes, pin.cod_eligible],
      );
    }

    await client.query('commit');
    return {
      seeded: true,
      reason: `${CATALOG_CATEGORIES.length} categories, ${CATALOG_PRODUCTS.length} products, ${CATALOG_VARIANTS.length} variants`,
    };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedIfEmpty(process.argv.includes('--force'))
    .then((result) => {
      console.log(`Seed ${result.seeded ? 'applied' : 'skipped'}: ${result.reason}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
