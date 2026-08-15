import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.middleware';
import { verifyRazorpaySignature } from '../config/razorpay';
import {
  confirmPaidOrder,
  listOrders,
  placeOrder,
} from '../services/orders.service';

export const ordersRouter = Router();

const placeSchema = z.object({
  userId: z.string().min(1),
  addressId: z.string().min(1),
  addressLabel: z.string().optional(),
  pincode: z.string().optional(),
  city: z.string().optional(),
  etaMinutes: z.number().optional(),
  paymentMethod: z.enum(['upi', 'card', 'cod']),
  subtotal: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  total: z.number().nonnegative(),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        variantId: z.string().min(1),
        variantLabel: z.string().optional(),
        title: z.string().optional(),
        quantity: z.number().int().positive(),
        priceAtPurchase: z.number().nonnegative(),
      }),
    )
    .min(1),
});

ordersRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const orders = await listOrders(userId);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

ordersRouter.post('/', async (req, res, next) => {
  try {
    const body = placeSchema.parse(req.body);
    const order = await placeOrder(req.auth!.sub, body);
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});

ordersRouter.post('/:id/confirm-payment', async (req, res, next) => {
  try {
    const body = z
      .object({
        paymentId: z.string().min(1),
        razorpayOrderId: z.string().optional(),
        signature: z.string().optional(),
      })
      .parse(req.body);

    if (!req.params.id) throw new AppError('BAD_REQUEST', 'Missing order id', 400);

    if (body.razorpayOrderId && body.signature) {
      const ok = verifyRazorpaySignature({
        razorpayOrderId: body.razorpayOrderId,
        paymentId: body.paymentId,
        signature: body.signature,
      });
      if (!ok) {
        throw new AppError('PAYMENT_INVALID', 'Payment signature verification failed.', 400);
      }
    }

    const order = await confirmPaidOrder(
      req.auth!.sub,
      req.params.id,
      body.paymentId,
      body.razorpayOrderId,
    );
    res.json({ order });
  } catch (err) {
    next(err);
  }
});
