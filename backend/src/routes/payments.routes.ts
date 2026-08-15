import { Router } from 'express';
import { z } from 'zod';
import { createRazorpayOrder, getRazorpayConfig, verifyRazorpaySignature } from '../config/razorpay';
import { AppError } from '../middleware/errorHandler.middleware';

export const paymentsRouter = Router();

paymentsRouter.post('/create-order', async (req, res, next) => {
  try {
    const body = z
      .object({
        amountRupees: z.number().positive(),
        receipt: z.string().min(1).max(40),
      })
      .parse(req.body);

    const amountPaise = Math.round(body.amountRupees * 100);
    const order = await createRazorpayOrder({
      amountPaise,
      receipt: body.receipt.slice(0, 40),
    });
    const { keyId, demo } = getRazorpayConfig();

    res.json({
      demo,
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post('/verify', (req, res, next) => {
  try {
    const body = z
      .object({
        razorpayOrderId: z.string().min(1),
        paymentId: z.string().min(1),
        signature: z.string().min(1),
      })
      .parse(req.body);

    const valid = verifyRazorpaySignature(body);
    if (!valid) {
      throw new AppError('PAYMENT_INVALID', 'Payment signature verification failed.', 400);
    }

    res.json({ valid: true, demo: getRazorpayConfig().demo });
  } catch (err) {
    next(err);
  }
});
