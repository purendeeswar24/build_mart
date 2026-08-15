type AnalyticsPayload = Record<string, string | number | boolean | undefined | null>;

type AnalyticsEvent = {
  name: string;
  props?: AnalyticsPayload;
  at: string;
};

const buffer: AnalyticsEvent[] = [];
const MAX = 200;

/**
 * Lightweight analytics — buffers events locally.
 * Swap `flush` to Amplitude / PostHog / Expo when keys are configured.
 */
export const analytics = {
  track(name: string, props?: AnalyticsPayload) {
    const row: AnalyticsEvent = { name, props, at: new Date().toISOString() };
    buffer.unshift(row);
    if (buffer.length > MAX) buffer.pop();
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[analytics]', name, props ?? {});
    }
  },

  screen(screenName: string, props?: AnalyticsPayload) {
    this.track('screen_view', { screen: screenName, ...props });
  },

  addToCart(productId: string, qty = 1) {
    this.track('add_to_cart', { productId, qty });
  },

  purchase(orderId: string, total: number, method: string) {
    this.track('purchase', { orderId, total, method });
  },

  recent(limit = 20) {
    return buffer.slice(0, limit);
  },
};
