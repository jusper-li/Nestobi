import { useEffect, useRef } from 'react';
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

function ensureGtagBootstrap(measurementId: string) {
  if (typeof window === 'undefined' || !measurementId) return false;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtagShim(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[data-ga-id="${measurementId}"]`);
  if (!existing) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.gaId = measurementId;
    document.head.appendChild(script);
  }

  return true;
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
  const measurementId = settings.ga_measurement_id?.trim() || import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || DEFAULT_MEASUREMENT_ID;
  const enabledRef = useRef(false);
  const lastTrackedPathRef = useRef('');
  const lastMeasurementIdRef = useRef('');

  useEffect(() => {
    if (!measurementId) return;

    if (lastMeasurementIdRef.current && lastMeasurementIdRef.current !== measurementId) {
      lastTrackedPathRef.current = '';
    }
    lastMeasurementIdRef.current = measurementId;

    const maybeEnable = () => {
      const consent = getCookieConsent();
      const enabled = Boolean(consent?.analytics);
      enabledRef.current = enabled;

      if (!enabled) return;

      if (!ensureGtagBootstrap(measurementId)) return;

      const path = `${location.pathname}${location.search}${location.hash}`;
      if (lastTrackedPathRef.current === path) return;

      trackPageView(measurementId, path, document.title);
      lastTrackedPathRef.current = path;
    };

    maybeEnable();

    const onApplied = () => {
      maybeEnable();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== COOKIE_CONSENT_STORAGE_KEY) return;
      maybeEnable();
    };

    window.addEventListener(COOKIE_CONSENT_APPLIED_EVENT, onApplied);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_APPLIED_EVENT, onApplied);
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
