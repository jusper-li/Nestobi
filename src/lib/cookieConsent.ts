export type CookieConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface CookieConsentInput {
  necessary?: true;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsentPreferences {
  version: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    ymCookieConsent?: CookieConsentPreferences;
  }
}

export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_STORAGE_KEY = 'ym-cookie-consent-v1';
export const COOKIE_CONSENT_OPEN_EVENT = 'ym-cookie-consent-open';
export const COOKIE_CONSENT_UPDATED_EVENT = 'ym-cookie-consent-updated';
export const COOKIE_CONSENT_APPLIED_EVENT = 'ym-cookie-consent-applied';

const hasBrowser = () => typeof window !== 'undefined';

const normalizeConsent = (preferences: CookieConsentInput): CookieConsentPreferences => ({
  version: COOKIE_CONSENT_VERSION,
  necessary: true,
  analytics: Boolean(preferences.analytics),
  marketing: Boolean(preferences.marketing),
  updatedAt: new Date().toISOString(),
});

export const getCookieConsent = (): CookieConsentPreferences | null => {
  if (!hasBrowser()) return null;

  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<CookieConsentPreferences>;
    if (parsed.version !== COOKIE_CONSENT_VERSION || parsed.necessary !== true) {
      return null;
    }

    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
};

export const applyCookieConsent = (preferences: CookieConsentPreferences) => {
  if (!hasBrowser()) return;

  window.ymCookieConsent = preferences;

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: preferences.analytics ? 'granted' : 'denied',
      ad_storage: preferences.marketing ? 'granted' : 'denied',
      ad_user_data: preferences.marketing ? 'granted' : 'denied',
      ad_personalization: preferences.marketing ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });
  }

  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_APPLIED_EVENT, { detail: preferences }));
};

export const saveCookieConsent = (preferences: CookieConsentInput) => {
  const normalized = normalizeConsent(preferences);

  if (hasBrowser()) {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(normalized));
    applyCookieConsent(normalized);
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT, { detail: normalized }));
  }

  return normalized;
};

export const openCookieConsentSettings = () => {
  if (!hasBrowser()) return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT));
};
