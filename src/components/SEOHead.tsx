import { useEffect } from 'react';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

interface SEOHeadProps {
  title: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
  breadcrumbs?: { name: string; url: string }[];
  pageType?: 'home' | 'product' | 'article' | 'place' | 'list' | 'faq' | 'default';
}

function upsertMeta(attr: string, attrVal: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${attrVal}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function absoluteUrl(value: string) {
  try {
    return new URL(value, window.location.origin).href;
  } catch {
    return value;
  }
}

function imageMimeType(value: string) {
  const path = value.split('?')[0].toLowerCase();
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function upsertJsonLd(schemas: Record<string, unknown>[]) {
  const id = 'nestobi-page-jsonld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.setAttribute('type', 'application/ld+json');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  canonical,
  jsonLd,
  noindex = false,
  breadcrumbs,
  pageType = 'default',
}) => {
  const { settings } = useSiteSettings();

  useEffect(() => {
    const siteName = settings.site_name;
    const defaultDesc = settings.site_description;
    const defaultImage = settings.og_image_url;
    const defaultKeywords = settings.meta_keywords;

    const isHome = pageType === 'home';
    const fullTitle = isHome ? `${siteName} — ${settings.site_slogan}` : `${title} — ${siteName}`;
    document.title = fullTitle;

    const resolvedDesc = description || defaultDesc;
    const resolvedKeywords = keywords || defaultKeywords;
    const resolvedImage = absoluteUrl(ogImage || defaultImage);
    const resolvedUrl = canonical ? absoluteUrl(canonical) : window.location.href;
    const resolvedOgTitle = ogTitle || fullTitle;
    const resolvedOgDesc = ogDescription || resolvedDesc;

    // Standard meta
    upsertMeta('name', 'description', resolvedDesc);
    upsertMeta('name', 'keywords', resolvedKeywords);
    upsertMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
    upsertMeta('name', 'author', siteName);

    // Open Graph
    upsertMeta('property', 'og:title', resolvedOgTitle);
    upsertMeta('property', 'og:description', resolvedOgDesc);
    upsertMeta('property', 'og:image', resolvedImage);
    upsertMeta('property', 'og:image:secure_url', resolvedImage);
    upsertMeta('property', 'og:image:type', imageMimeType(resolvedImage));
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:url', resolvedUrl);
    upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('property', 'og:locale', 'zh_TW');

    // Twitter Cards
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', resolvedOgTitle);
    upsertMeta('name', 'twitter:description', resolvedOgDesc);
    upsertMeta('name', 'twitter:image', resolvedImage);
    const socialX = settings.social_x || settings.social_twitter;
    if (socialX) {
      upsertMeta('name', 'twitter:site', socialX);
    }

    // Canonical
    upsertLink('canonical', resolvedUrl);

    // AI-friendly meta tags
    upsertMeta('name', 'ai:site_name', siteName);
    upsertMeta('name', 'ai:description', settings.ai_site_summary || resolvedDesc);
    upsertMeta('name', 'ai:page_type', pageType);
    upsertMeta('name', 'ai:language', 'zh-TW');
    upsertMeta('name', 'application-name', siteName);

    // JSON-LD schemas
    const schemas: Record<string, unknown>[] = [];

    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      schemas.push(...arr);
    }

    // Breadcrumb JSON-LD
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((bc, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: bc.name,
          item: bc.url,
        })),
      });
    }

    // WebPage JSON-LD for every page
    schemas.push({
      '@context': 'https://schema.org',
      '@type': pageType === 'article' ? 'Article' : pageType === 'product' ? 'ProductPage' : pageType === 'faq' ? 'FAQPage' : 'WebPage',
      name: fullTitle,
      description: resolvedDesc,
      url: resolvedUrl,
      inLanguage: 'zh-TW',
      isPartOf: { '@type': 'WebSite', name: siteName, url: window.location.origin },
      ...(resolvedImage ? { image: resolvedImage } : {}),
    });

    if (schemas.length > 0) upsertJsonLd(schemas);
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogType, canonical, jsonLd, noindex, breadcrumbs, pageType, settings]);

  return null;
};

export default SEOHead;
