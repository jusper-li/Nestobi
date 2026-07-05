import { normalizeLang, pickByLang, type SupportedLanguage } from './language';

export interface TranslatableStaticPageSection {
  type: string;
  title: string;
  content: string;
}

export interface TranslatableStaticPage {
  slug?: string;
  title: string;
  meta_description: string;
  sections: TranslatableStaticPageSection[];
  updated_at: string;
}

interface TranslateResponse {
  translation?: string;
}

const STATIC_PAGE_TRANSLATION_CACHE_KEY = 'ym-static-page-i18n-v1';

const hasHtml = (text: string) => /<\/?[a-z][\s\S]*>/i.test(text);

const hashText = (txt: string) => {
  let hash = 0;
  for (let i = 0; i < txt.length; i += 1) {
    hash = (hash << 5) - hash + txt.charCodeAt(i);
    hash |= 0;
  }
  return String(hash >>> 0);
};

const translateViaGoogle = async (
  sourceText: string,
  targetLanguage: SupportedLanguage,
  preserveHtml = false,
): Promise<string> => {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: targetLanguage,
    dt: 't',
    q: sourceText,
    format: preserveHtml ? 'html' : 'text',
  });

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  if (!response.ok) return sourceText;

  const data = (await response.json()) as any;

  const translatedSegments = Array.isArray(data?.[0]) ? data[0] : [];
  const translatedText = translatedSegments
    .map((segment) => segment?.[0] || '')
    .join('')
    .trim();
  return translatedText || sourceText;
};

const readCache = (): Record<string, TranslatableStaticPage> => {
  try {
    const raw = localStorage.getItem(STATIC_PAGE_TRANSLATION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TranslatableStaticPage>) : {};
  } catch {
    return {};
  }
};

const writeCache = (value: Record<string, TranslatableStaticPage>) => {
  try {
    localStorage.setItem(STATIC_PAGE_TRANSLATION_CACHE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const translateText = async (
  key: string,
  sourceText: string,
  targetLanguage: SupportedLanguage,
  preserveHtml = false,
): Promise<string> => {
  if (!sourceText.trim()) return sourceText;

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      targetLanguage,
      sourceText,
      preserveHtml,
    }),
  });

  if (!response.ok) {
    return translateViaGoogle(sourceText, targetLanguage, preserveHtml);
  }

  const data = (await response.json()) as TranslateResponse;
  const remoteTranslation = (data.translation || sourceText).trim();
  if (!remoteTranslation || remoteTranslation === sourceText) {
    return translateViaGoogle(sourceText, targetLanguage, preserveHtml);
  }
  return remoteTranslation;
};

export const shouldTranslateStaticPage = (lang: string) =>
  pickByLang(normalizeLang(lang), false, true, true, true);

export const translateStaticPage = async (
  page: TranslatableStaticPage,
  lang: string,
): Promise<TranslatableStaticPage> => {
  const normalizedLang = normalizeLang(lang);
  if (!shouldTranslateStaticPage(normalizedLang)) {
    return page;
  }

  const sourceHash = hashText(
    `${page.slug || ''}|${page.title}|${page.meta_description}|${page.sections
      .map((section) => `${section.type}|${section.title}|${section.content}`)
      .join('||')}`,
  );
  const cacheKey = `${page.slug || 'static'}:${normalizedLang}:${sourceHash}`;
  const cache = readCache();
  const cached = cache[cacheKey];
  if (cached) return cached;

  const [title, metaDescription, ...translatedSections] = await Promise.all([
    translateText(`${cacheKey}:title`, page.title, normalizedLang),
    translateText(`${cacheKey}:meta_description`, page.meta_description || page.title, normalizedLang),
    ...page.sections.flatMap((section, index) => [
      translateText(`${cacheKey}:section:${index}:title`, section.title, normalizedLang),
      translateText(
        `${cacheKey}:section:${index}:content`,
        section.content,
        normalizedLang,
        hasHtml(section.content),
      ),
    ]),
  ]);

  const sections = page.sections.map((section, index) => ({
    ...section,
    title: translatedSections[index * 2] || section.title,
    content: translatedSections[index * 2 + 1] || section.content,
  }));

  const translated: TranslatableStaticPage = {
    ...page,
    title: title || page.title,
    meta_description: metaDescription || page.meta_description || page.title,
    sections,
  };

  writeCache({ ...cache, [cacheKey]: translated });
  return translated;
};
