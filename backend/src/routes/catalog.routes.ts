import { Router } from 'express';
import { isDatabaseConfigured } from '../config/db';
import { AppError } from '../middleware/errorHandler.middleware';
import { getCategory, getProduct, listCategories, listProducts } from '../services/catalog.service';

export const catalogRouter = Router();

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new AppError('DB_NOT_CONFIGURED', 'Database is not configured.', 503);
  }
}

catalogRouter.get('/categories', async (req, res, next) => {
  try {
    requireDb();
    const topOnly = req.query.top === '1' || req.query.top === 'true';
    const parentId = typeof req.query.parentId === 'string' ? req.query.parentId : undefined;
    const categories = await listCategories({ topOnly, parentId });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/categories/:id', async (req, res, next) => {
  try {
    requireDb();
    const category = await getCategory(req.params.id);
    if (!category) throw new AppError('NOT_FOUND', 'Category not found.', 404);
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products', async (_req, res, next) => {
  try {
    requireDb();
    const products = await listProducts();
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/:id', async (req, res, next) => {
  try {
    requireDb();
    const product = await getProduct(req.params.id);
    if (!product) throw new AppError('NOT_FOUND', 'Product not found.', 404);
    res.json({ product });
  } catch (err) {
    next(err);
  }
});
