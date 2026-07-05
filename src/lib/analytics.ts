declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
  item_variant?: string;
}

export interface TrackPurchaseOptions {
  transaction_id: string;
  value: number;
  currency?: string;
  tax?: number;
  shipping?: number;
  coupon?: string;
  affiliation?: string;
  items?: AnalyticsItem[];
}

export function trackAnalyticsEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

export function trackAddToCart(params: {
  currency?: string;
  value: number;
  items: AnalyticsItem[];
}) {
  trackAnalyticsEvent('add_to_cart', {
    currency: params.currency || 'TWD',
    value: params.value,
    items: params.items,
  });
}

export function trackBeginCheckout(params: {
  currency?: string;
  value: number;
  items: AnalyticsItem[];
  coupon?: string;
}) {
  trackAnalyticsEvent('begin_checkout', {
    currency: params.currency || 'TWD',
    value: params.value,
    coupon: params.coupon,
    items: params.items,
  });
}

export function trackPurchase(params: TrackPurchaseOptions) {
  trackAnalyticsEvent('purchase', {
    transaction_id: params.transaction_id,
    currency: params.currency || 'TWD',
    value: params.value,
    tax: params.tax ?? 0,
    shipping: params.shipping ?? 0,
    coupon: params.coupon,
    affiliation: params.affiliation || 'Nestobi',
    items: params.items || [],
  });
}
