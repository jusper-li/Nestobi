import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import {
  COOKIE_CONSENT_APPLIED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  getCookieConsent,
} from '../lib/cookieConsent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const DEFAULT_MEASUREMENT_ID = 'G-9JDDRD8P1X';
const NESTOBI_COOKIE_CONSENT_EVENT = 'nestobi-cookie-consent';
const NESTOBI_COOKIE_CONSENT_STORAGE_KEY = 'nestobi:cookie-consent:v1';
const GA_SCRIPT_ID_PREFIX = 'ga-script';

function ensureGtagBootstrap(measurementId: string) {
  if (typeof window === 'undefined' || !measurementId) return false;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtagShim(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }

  const scriptId = `${GA_SCRIPT_ID_PREFIX}-${measurementId}`;
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!existing) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.id = scriptId;
    script.dataset.gaId = measurementId;
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });
    window.gtag('config', measurementId, {
      send_page_view: false,
      anonymize_ip: true,
    });
  }

  return true;
}

function readCookieConsentAnalyticsEnabled() {
  if (typeof window === 'undefined') return false;

  const legacy = getCookieConsent();
  if (legacy) return Boolean(legacy.analytics);

  try {
    const raw = window.localStorage.getItem(NESTOBI_COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw) as { preferences?: { analytics?: boolean } };
    return Boolean(parsed.preferences?.analytics);
  } catch {
    return false;
  }
}

function trackPageView(measurementId: string, path: string, title: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('config', measurementId, {
    page_path: path,
    page_title: title,
    send_page_view: false,
    anonymize_ip: true,
  });
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

export default function GoogleAnalytics() {
  const location = useLocation();
  const { settings } = useSiteSettings();
  const measurementId = useMemo(
    () => settings.ga_measurement_id?.trim() || import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || DEFAULT_MEASUREMENT_ID,
    [settings.ga_measurement_id],
  );
  const enabledRef = useRef(false);
  const lastTrackedPathRef = useRef('');
  const lastMeasurementIdRef = useRef('');

  useEffect(() => {
    if (!measurementId) return;

    if (lastMeasurementIdRef.current && lastMeasurementIdRef.current !== measurementId) {
      lastTrackedPathRef.current = '';
    }
    lastMeasurementIdRef.current = measurementId;

    const syncConsent = () => {
      const enabled = readCookieConsentAnalyticsEnabled();
      enabledRef.current = enabled;

      if (!ensureGtagBootstrap(measurementId)) return;
      if (typeof window.gtag === 'function' && enabled) {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          functionality_storage: 'granted',
          security_storage: 'granted',
        });
      }

      if (!enabled) return;
      const path = `${location.pathname}${location.search}${location.hash}`;
      if (lastTrackedPathRef.current === path) return;

      trackPageView(measurementId, path, document.title);
      lastTrackedPathRef.current = path;
    };

    syncConsent();

    const onApplied = () => {
      syncConsent();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== COOKIE_CONSENT_STORAGE_KEY && event.key !== NESTOBI_COOKIE_CONSENT_STORAGE_KEY) return;
      syncConsent();
    };

    window.addEventListener(COOKIE_CONSENT_APPLIED_EVENT, onApplied);
    window.addEventListener(NESTOBI_COOKIE_CONSENT_EVENT, onApplied);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_APPLIED_EVENT, onApplied);
      window.removeEventListener(NESTOBI_COOKIE_CONSENT_EVENT, onApplied);
      window.removeEventListener('storage', onStorage);
    };
  }, [measurementId, location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!measurementId || !enabledRef.current) return;
    if (!ensureGtagBootstrap(measurementId)) return;

    const path = `${location.pathname}${location.search}${location.hash}`;
    if (lastTrackedPathRef.current === path) return;

    trackPageView(measurementId, path, document.title);
    lastTrackedPathRef.current = path;
  }, [measurementId, location.hash, location.pathname, location.search]);

  return null;
}
