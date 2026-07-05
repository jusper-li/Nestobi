import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: 'website' | 'product' | 'article';
  canonical?: string;
  robots?: string;
  schema?: object | object[];
  noSuffix?: boolean;
}

const SITE_NAME = 'Sonpin';
const SCHEMA_ID = 'json-ld-schema';

function getMeta(selector: string): HTMLMetaElement | null {
  return document.querySelector(selector);
}

function ensureMeta(selector: string, createAttr: [string, string]): HTMLMetaElement {
  let el = getMeta(selector) as HTMLMetaElement;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(createAttr[0], createAttr[1]);
    document.head.appendChild(el);
  }
  return el;
}

function setMetaContent(selector: string, createAttr: [string, string], content: string) {
  ensureMeta(selector, createAttr).setAttribute('content', content);
}

function ensureLink(rel: string): HTMLLinkElement {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  return el;
}

export function useSEO({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonical,
  robots = 'index, follow',
  schema,
  noSuffix = false,
}: SEOProps) {
  useEffect(() => {
    const fullTitle = title
      ? noSuffix
        ? title
        : `${title} | ${SITE_NAME}`
      : SITE_NAME;

    document.title = fullTitle;

    setMetaContent('meta[name="robots"]', ['name', 'robots'], robots);
    setMetaContent('meta[property="og:type"]', ['property', 'og:type'], ogType);
    setMetaContent('meta[property="og:site_name"]', ['property', 'og:site_name'], SITE_NAME);
    setMetaContent('meta[property="og:locale"]', ['property', 'og:locale'], 'zh_TW');
    setMetaContent('meta[name="twitter:card"]', ['name', 'twitter:card'], 'summary_large_image');
    setMetaContent('meta[name="twitter:site"]', ['name', 'twitter:site'], '@youandmecoffee');

    setMetaContent('meta[property="og:title"]', ['property', 'og:title'], fullTitle);
    setMetaContent('meta[name="twitter:title"]', ['name', 'twitter:title'], fullTitle);

    if (description) {
      setMetaContent('meta[name="description"]', ['name', 'description'], description);
      setMetaContent('meta[property="og:description"]', ['property', 'og:description'], description);
      setMetaContent('meta[name="twitter:description"]', ['name', 'twitter:description'], description);
    }

    if (keywords) {
      setMetaContent('meta[name="keywords"]', ['name', 'keywords'], keywords);
    }

    const resolvedUrl = canonical || window.location.href;
    setMetaContent('meta[property="og:url"]', ['property', 'og:url'], resolvedUrl);
    ensureLink('canonical').href = resolvedUrl;

    if (ogImage) {
      setMetaContent('meta[property="og:image"]', ['property', 'og:image'], ogImage);
      setMetaContent('meta[property="og:image:width"]', ['property', 'og:image:width'], '1200');
      setMetaContent('meta[property="og:image:height"]', ['property', 'og:image:height'], '630');
      setMetaContent('meta[name="twitter:image"]', ['name', 'twitter:image'], ogImage);
    }

    let schemaEl = document.getElementById(SCHEMA_ID) as HTMLScriptElement | null;
    if (schema) {
      if (!schemaEl) {
        schemaEl = document.createElement('script');
        schemaEl.type = 'application/ld+json';
        schemaEl.id = SCHEMA_ID;
        document.head.appendChild(schemaEl);
      }
      const schemas = Array.isArray(schema) ? schema : [schema];
      schemaEl.textContent = schemas.length === 1
        ? JSON.stringify(schemas[0])
        : JSON.stringify({ '@context': 'https://schema.org', '@graph': schemas });
    } else if (schemaEl) {
      schemaEl.remove();
    }

    return () => {
      const el = document.getElementById(SCHEMA_ID);
      if (el) el.remove();
    };
  }, [title, description, keywords, ogImage, ogType, canonical, robots, noSuffix]);
}
