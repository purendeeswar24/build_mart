import { Router } from 'express';
import { z } from 'zod';
import { isDatabaseConfigured, query, queryOne } from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';

export const wishlistRouter = Router();

wishlistRouter.get('/', async (req, res, next) => {
  try {
    if (!isDatabaseConfigured()) {
      res.json({ items: [] });
      return;
    }
    const items = await query(
      `select product_id, variant_id, created_at
       from wishlist_items where user_id = $1 order by created_at desc`,
      [req.auth!.sub],
    );
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

wishlistRouter.post('/', async (req, res, next) => {
  try {
    if (!isDatabaseConfigured()) {
      throw new AppError('DB_NOT_CONFIGURED', 'Database is not configured.', 503);
    }
    const body = z
      .object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
      })
      .parse(req.body);

    const existing = await queryOne<{ product_id: string }>(
      'select product_id from wishlist_items where user_id = $1 and product_id = $2',
      [req.auth!.sub, body.productId],
    );
    if (existing) {
      await query('delete from wishlist_items where user_id = $1 and product_id = $2', [
        req.auth!.sub,
        body.productId,
      ]);
      res.json({ saved: false });
      return;
    }
    await query(
      `insert into wishlist_items (user_id, product_id, variant_id)
       values ($1, $2, $3)`,
      [req.auth!.sub, body.productId, body.variantId ?? null],
    );
    res.json({ saved: true });
  } catch (err) {
    next(err);
  }
});
