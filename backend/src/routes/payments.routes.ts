import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import {
  createRazorpayOrder,
  getRazorpayConfig,
  isWebhookConfigured,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../config/razorpay';
import { AppError } from '../middleware/errorHandler.middleware';
import { confirmPaidByRazorpayOrder } from '../services/orders.service';

export const paymentsRouter = Router();

paymentsRouter.post('/create-order', async (req, res, next) => {
  try {
    const body = z
      .object({
        amountRupees: z.number().positive().max(500_000),
        receipt: z.string().min(1).max(40),
      })
      .parse(req.body);

    const amountPaise = Math.round(body.amountRupees * 100);
    let order: Awaited<ReturnType<typeof createRazorpayOrder>>;
    try {
      order = await createRazorpayOrder({
        amountPaise,
        receipt: body.receipt.slice(0, 40),
      });
    } catch {
      throw new AppError('PAYMENT_FAILED', 'Could not start payment. Try again.', 502);
    }
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

/** Unauthenticated Razorpay webhook — mount with express.raw() before json parser. */
export async function paymentsWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!isWebhookConfigured()) {
      throw new AppError('NOT_CONFIGURED', 'Webhook secret is not set.', 503);
    }
    const signature = req.headers['x-razorpay-signature'];
    if (typeof signature !== 'string') {
      throw new AppError('PAYMENT_INVALID', 'Missing webhook signature.', 400);
    }
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    if (!verifyWebhookSignature(raw, signature)) {
      throw new AppError('PAYMENT_INVALID', 'Invalid webhook signature.', 400);
    }

    const event = JSON.parse(raw) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    };
    const payment = event.payload?.payment?.entity;
    if (
      (event.event === 'payment.captured' || event.event === 'order.paid') &&
      payment?.order_id &&
      payment?.id
    ) {
      await confirmPaidByRazorpayOrder(payment.order_id, payment.id);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
