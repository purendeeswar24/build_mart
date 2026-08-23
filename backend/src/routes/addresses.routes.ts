import { Router } from 'express';
import { z } from 'zod';
import { isDatabaseConfigured, query, queryOne } from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { ensureDefaultAddresses } from '../services/users.service';

export const addressesRouter = Router();

addressesRouter.get('/', async (req, res, next) => {
  try {
    if (!isDatabaseConfigured()) {
      res.json({ addresses: [] });
      return;
    }
    await ensureDefaultAddresses(req.auth!.sub);
    const addresses = await query(
      `select id, label, full_address, pincode, city, latitude, longitude, is_default
       from addresses where user_id = $1 order by is_default desc, created_at desc`,
      [req.auth!.sub],
    );
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
});

addressesRouter.post('/', async (req, res, next) => {
  try {
    if (!isDatabaseConfigured()) {
      throw new AppError('DB_NOT_CONFIGURED', 'Database is not configured.', 503);
    }
    const body = z
      .object({
        id: z.string().optional(),
        label: z.string().min(1),
        fullAddress: z.string().min(3),
        pincode: z.string().min(6),
        city: z.string().min(2),
        isDefault: z.boolean().optional(),
        latitude: z.coerce.number().optional(),
        longitude: z.coerce.number().optional(),
      })
      .parse(req.body);

    const id = body.id ?? `addr-${req.auth!.sub}-${Date.now()}`;
    if (body.id) {
      const existing = await queryOne<{ user_id: string }>('select user_id from addresses where id = $1', [body.id]);
      if (existing && existing.user_id !== req.auth!.sub) {
        throw new AppError('FORBIDDEN', 'You cannot change another account address.', 403);
      }
    }
    if (body.isDefault) {
      await query('update addresses set is_default = false where user_id = $1', [req.auth!.sub]);
    }
    await query(
      `insert into addresses (id, user_id, label, full_address, pincode, city, is_default, latitude, longitude)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do update set
         label = excluded.label,
         full_address = excluded.full_address,
         pincode = excluded.pincode,
         city = excluded.city,
         is_default = excluded.is_default,
         latitude = excluded.latitude,
         longitude = excluded.longitude
       where addresses.user_id = excluded.user_id`,
      [
        id,
        req.auth!.sub,
        body.label,
        body.fullAddress,
        body.pincode,
        body.city,
        !!body.isDefault,
        body.latitude ?? null,
        body.longitude ?? null,
      ],
    );
    const addresses = await query(
      `select id, label, full_address, pincode, city, latitude, longitude, is_default
       from addresses where user_id = $1 order by is_default desc, created_at desc`,
      [req.auth!.sub],
    );
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
});
