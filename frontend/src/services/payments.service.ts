import { Alert, Platform } from 'react-native';
import { apiClient } from './apiClient';
import { isRazorpayPublicConfigured } from '../config/runtime';

export type CheckoutSession = {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  description: string;
};

export type PaymentResult =
  | { status: 'success'; paymentId: string; signature: string }
  | { status: 'failed'; reason: string }
  | { status: 'cancelled' };

/**
 * Payments:
 * - Always creates Razorpay order via backend when API is up
 * - Checkout UI is Alert-based until native Razorpay SDK is added to a custom Expo client
 * - Signature is always verified on the backend (never trust the client alone)
 */
export const paymentsService = {
  async createSession(input: {
    orderId: string;
    amountRupees: number;
    description?: string;
    razorpayOrderId?: string;
  }): Promise<CheckoutSession> {
    try {
      const res = await apiClient.post<{
        demo: boolean;
        keyId: string;
        orderId: string;
        amount: number;
        currency: string;
      }>('/api/v1/payments/create-order', {
        amountRupees: input.amountRupees,
        receipt: input.orderId,
      });

      return {
        orderId: input.orderId,
        razorpayOrderId: input.razorpayOrderId ?? res.orderId,
        amountPaise: res.amount,
        currency: res.currency,
        keyId: res.keyId,
        description: input.description ?? `BuildMart order ${input.orderId}`,
      };
    } catch {
      return {
        orderId: input.orderId,
        razorpayOrderId: input.razorpayOrderId ?? `order_demo_${Date.now()}`,
        amountPaise: Math.round(input.amountRupees * 100),
        currency: 'INR',
        keyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_demo',
        description: input.description ?? `BuildMart order ${input.orderId}`,
      };
    }
  },

  openCheckout(session: CheckoutSession, opts?: { forceFail?: boolean }): Promise<PaymentResult> {
    return new Promise((resolve) => {
      if (opts?.forceFail) {
        resolve({ status: 'failed', reason: 'Demo failure (test card declined)' });
        return;
      }

      const amount = (session.amountPaise / 100).toFixed(0);
      const liveHint = isRazorpayPublicConfigured()
        ? '\n(Live key configured — wire react-native-razorpay for native sheet)'
        : '\n(Demo mode)';

      Alert.alert(
        'Razorpay checkout',
        `Pay ₹${amount} for ${session.description}\nKey: ${session.keyId}\nPlatform: ${Platform.OS}${liveHint}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve({ status: 'cancelled' }),
          },
          {
            text: 'Fail payment',
            style: 'destructive',
            onPress: () =>
              resolve({ status: 'failed', reason: 'Payment failed (test declined)' }),
          },
          {
            text: 'Pay success',
            onPress: () =>
              resolve({
                status: 'success',
                paymentId: `pay_${Date.now()}`,
                signature: `demo_${session.razorpayOrderId}`,
              }),
          },
        ],
      );
    });
  },

  async verifyOnServer(payload: {
    razorpayOrderId: string;
    paymentId: string;
    signature: string;
  }): Promise<boolean> {
    try {
      const res = await apiClient.post<{ valid: boolean }>('/api/v1/payments/verify', payload);
      return !!res.valid;
    } catch {
      return false;
    }
  },
};
