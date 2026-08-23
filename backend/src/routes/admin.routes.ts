import { Router } from 'express';
import { z } from 'zod';
import { isDatabaseConfigured } from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { getDashboardStats, listAdminProducts, listAllOrders } from '../services/admin.service';
import {
  createProduct,
  deleteProduct,
  listCategories,
  updateListing,
} from '../services/catalog.service';
import {
  adminDeleteJob,
  adminListJobs,
  adminUpdateJob,
  awardBid,
  getJob,
  listMessages,
  postMessage,
} from '../services/bidding.service';

export const adminRouter = Router();

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new AppError('DB_NOT_CONFIGURED', 'Database is not configured.', 503);
  }
}

const listingStatus = z.enum(['on_sale', 'limited', 'out_of_stock', 'hidden']);

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    requireDb();
    const stats = await getDashboardStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/products', async (_req, res, next) => {
  try {
    requireDb();
    const products = await listAdminProducts();
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/categories', async (_req, res, next) => {
  try {
    requireDb();
    const categories = await listCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/products', async (req, res, next) => {
  try {
    requireDb();
    const body = z
      .object({
        categoryId: z.string().min(1),
        brand: z.string().min(1),
        title: z.string().min(2),
        description: z.string().optional(),
        material: z.string().optional(),
        warrantyYears: z.number().int().nonnegative().optional(),
        badge: z.string().optional(),
        listingStatus: listingStatus.default('on_sale'),
        variantLabel: z.string().min(1),
        mrp: z.number().positive(),
        sellingPrice: z.number().positive(),
        stockQty: z.number().int().nonnegative(),
        sku: z.string().optional(),
        imageUrl: z.string().optional(),
      })
      .parse(req.body);
    if (body.sellingPrice > body.mrp) {
      throw new AppError('BAD_REQUEST', 'Selling price cannot be higher than MRP.', 400);
    }
    const created = await createProduct(body);
    res.status(201).json({ ok: true, ...created });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/products/:productId', async (req, res, next) => {
  try {
    requireDb();
    const body = z
      .object({
        variantId: z.string().min(1),
        listingStatus: listingStatus.optional(),
        stockQty: z.number().int().nonnegative().optional(),
        mrp: z.number().positive().optional(),
        sellingPrice: z.number().positive().optional(),
      })
      .parse(req.body);
    if (body.sellingPrice != null && body.mrp != null && body.sellingPrice > body.mrp) {
      throw new AppError('BAD_REQUEST', 'Selling price cannot be higher than MRP.', 400);
    }
    await updateListing({ productId: req.params.productId, ...body });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/products/:productId', async (req, res, next) => {
  try {
    requireDb();
    await deleteProduct(req.params.productId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/hire', async (_req, res, next) => {
  try {
    requireDb();
    const jobs = await adminListJobs();
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/hire/:id', async (req, res, next) => {
  try {
    requireDb();
    const job = await getJob(req.params.id, req.auth?.sub, 'admin');
    const thread =
      job.status === 'awarded' && req.auth?.sub
        ? await listMessages(req.params.id, req.auth.sub, 'admin')
        : { messages: [], note: '' };
    res.json({ job, ...thread });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/hire/:id/messages', async (req, res, next) => {
  try {
    requireDb();
    if (!req.auth?.sub) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);
    const body = z.object({ body: z.string().min(1).max(2000) }).parse(req.body);
    res.status(201).json(await postMessage(req.params.id, req.auth.sub, body.body, 'admin'));
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/hire/:id', async (req, res, next) => {
  try {
    requireDb();
    const body = z
      .object({
        status: z.enum(['open', 'closed', 'awarded', 'cancelled']).optional(),
        title: z.string().min(6).optional(),
        description: z.string().min(12).optional(),
        biddingEndsAt: z.string().optional(),
      })
      .parse(req.body);
    const job = await adminUpdateJob(req.params.id, body);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/hire/:id/award', async (req, res, next) => {
  try {
    requireDb();
    const body = z.object({ bidId: z.string().min(1) }).parse(req.body);
    const job = await awardBid(req.auth?.sub ?? 'admin', req.params.id, body.bidId, 'admin');
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/hire/:id', async (req, res, next) => {
  try {
    requireDb();
    await adminDeleteJob(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/orders', async (_req, res, next) => {
  try {
    requireDb();
    const orders = await listAllOrders();
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});
