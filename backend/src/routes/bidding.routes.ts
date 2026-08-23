import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.middleware';
import { isDatabaseConfigured } from '../config/db';
import {
  HIRE_CATEGORIES,
  awardBid,
  createJob,
  getJob,
  listEndingSoon,
  listJobs,
  listMessages,
  listMine,
  placeBid,
  postMessage,
  shortlistBid,
} from '../services/bidding.service';

export const biddingRouter = Router();

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new AppError('DB_NOT_CONFIGURED', 'Database is not configured.', 503);
  }
}

biddingRouter.get('/', async (req, res, next) => {
  try {
    requireDb();
    const jobs = await listJobs(req.auth?.sub);
    res.json({ jobs, categories: HIRE_CATEGORIES });
  } catch (err) {
    next(err);
  }
});

biddingRouter.get('/ending-soon', async (req, res, next) => {
  try {
    requireDb();
    const jobs = await listEndingSoon(req.auth?.sub);
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

biddingRouter.get('/mine', async (req, res, next) => {
  try {
    requireDb();
    if (!req.auth?.sub) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);
    res.json(await listMine(req.auth.sub));
  } catch (err) {
    next(err);
  }
});

biddingRouter.get('/:id', async (req, res, next) => {
  try {
    requireDb();
    const job = await getJob(req.params.id, req.auth?.sub, req.auth?.role);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

biddingRouter.post('/', async (req, res, next) => {
  try {
    requireDb();
    if (!req.auth?.sub) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);
    const body = z
      .object({
        category: z.enum(HIRE_CATEGORIES),
        title: z.string().min(6),
        description: z.string().min(12),
        city: z.string().optional(),
        pincode: z.string().optional(),
        daysOpen: z.number().int().min(1).max(14).optional(),
        ownerEstimate: z.number().positive().optional(),
      })
      .parse(req.body);
    const job = await createJob(req.auth.sub, body);
    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
});

biddingRouter.post('/:id/bids', async (req, res, next) => {
  try {
    requireDb();
    if (!req.auth?.sub) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);
    const body = z
      .object({
        amount: z.number().positive(),
        message: z.string().optional(),
        daysToComplete: z.number().int().positive().optional(),
      })
      .parse(req.body);
    const job = await placeBid(req.auth.sub, req.params.id, body);
    res.status(201).json({ job });
  } catch (err) {
    next(err);
  }
});

biddingRouter.post('/:id/shortlist', async (req, res, next) => {
  try {
    requireDb();
    if (!req.auth?.sub) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);
    const body = z.object({ bidId: z.string().min(1) }).parse(req.body);
    const job = await shortlistBid(req.auth.sub, req.params.id, body.bidId, req.auth.role);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

biddingRouter.get('/:id/messages', async (req, res, next) => {
  try {
    requireDb();
    if (!req.auth?.sub) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);
    res.json(await listMessages(req.params.id, req.auth.sub, req.auth.role));
  } catch (err) {
    next(err);
  }
});

biddingRouter.post('/:id/messages', async (req, res, next) => {
  try {
    requireDb();
    if (!req.auth?.sub) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);
    const body = z.object({ body: z.string().min(1).max(2000) }).parse(req.body);
    res.status(201).json(await postMessage(req.params.id, req.auth.sub, body.body, req.auth.role));
  } catch (err) {
    next(err);
  }
});

biddingRouter.post('/:id/award', async (req, res, next) => {
  try {
    requireDb();
    if (!req.auth?.sub) throw new AppError('UNAUTHORIZED', 'Sign in required.', 401);
    const body = z.object({ bidId: z.string().min(1) }).parse(req.body);
    const job = await awardBid(req.auth.sub, req.params.id, body.bidId, req.auth.role);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});
