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

/** Event names shared by the storefront and GA4 custom reports. */
export const GA_EVENTS = {
  pageView: 'page_view',
  viewItem: 'view_item',
  addToCart: 'add_to_cart',
  beginCheckout: 'begin_checkout',
  addPaymentInfo: 'add_payment_info',
  purchase: 'purchase',
  login: 'login',
  signUp: 'sign_up',
  lineBindOpen: 'line_bind_open_link',
  lineBindStart: 'line_bind_start',
  lineBindSuccess: 'line_bind_success',
  lineBindFailure: 'line_bind_failure',
} as const;

export function trackAnalyticsEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

export function trackAddToCart(params: {
  currency?: string;
  value: number;
  items: AnalyticsItem[];
}) {
  trackAnalyticsEvent(GA_EVENTS.addToCart, {
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
  trackAnalyticsEvent(GA_EVENTS.beginCheckout, {
    currency: params.currency || 'TWD',
    value: params.value,
    coupon: params.coupon,
    items: params.items,
  });
}

export function trackPurchase(params: TrackPurchaseOptions) {
  trackAnalyticsEvent(GA_EVENTS.purchase, {
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

export function trackViewItem(item: AnalyticsItem, value = item.price, currency = 'TWD') {
  trackAnalyticsEvent(GA_EVENTS.viewItem, {
    currency,
    value,
    items: [item],
  });
}
