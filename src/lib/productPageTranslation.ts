import { normalizeLang, pickByLang, type SupportedLanguage } from './language';
import type {
  ExtractedProductPageDocument,
  ProductPageBlock,
  ProductPageDocument,
} from './productPageCards';

interface TranslateResponse {
  translation?: string;
}

const PRODUCT_PAGE_TRANSLATION_CACHE_KEY = 'ym-product-page-i18n-v2';

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

const readCache = (): Record<string, ExtractedProductPageDocument> => {
  try {
    const raw = localStorage.getItem(PRODUCT_PAGE_TRANSLATION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ExtractedProductPageDocument>) : {};
  } catch {
    return {};
  }
};

const writeCache = (value: Record<string, ExtractedProductPageDocument>) => {
  try {
    localStorage.setItem(PRODUCT_PAGE_TRANSLATION_CACHE_KEY, JSON.stringify(value));
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

export const shouldTranslateProductPage = (lang: string) =>
  pickByLang(normalizeLang(lang), false, true, true, true);

const translateBlock = async (
  cacheKey: string,
  block: ProductPageBlock,
  targetLanguage: SupportedLanguage,
): Promise<ProductPageBlock> => {
  const [title, body, badge, buttonText, translatedHighlights] = await Promise.all([
    translateText(`${cacheKey}:title`, block.title, targetLanguage),
    translateText(`${cacheKey}:body`, block.body, targetLanguage, hasHtml(block.body)),
    block.badge ? translateText(`${cacheKey}:badge`, block.badge, targetLanguage) : Promise.resolve(''),
    block.buttonText ? translateText(`${cacheKey}:buttonText`, block.buttonText, targetLanguage) : Promise.resolve(''),
    Promise.all((block.highlights || []).map((highlight, index) =>
      translateText(`${cacheKey}:highlight:${index}`, highlight, targetLanguage),
    )),
  ]);

  return {
    ...block,
    title: title || block.title,
    body: body || block.body,
    badge: block.badge ? (badge || block.badge) : block.badge,
    buttonText: block.buttonText ? (buttonText || block.buttonText) : block.buttonText,
    highlights: translatedHighlights.length > 0 ? translatedHighlights : block.highlights,
  };
};

const translateDocument = async (
  document: ProductPageDocument,
  targetLanguage: SupportedLanguage,
  cacheKey: string,
): Promise<ProductPageDocument> => {
  const translatedBlocks = await Promise.all(
    document.blocks.map((block, index) => translateBlock(`${cacheKey}:block:${index}`, block, targetLanguage)),
  );

  return {
    ...document,
    blocks: translatedBlocks,
  };
};

export const translateProductPageContent = async (
  content: ExtractedProductPageDocument,
  lang: string,
): Promise<ExtractedProductPageDocument> => {
  const normalizedLang = normalizeLang(lang);
  if (!shouldTranslateProductPage(normalizedLang)) {
    return content;
  }

  const sourceHash = hashText(
    `${content.document ? JSON.stringify(content.document) : ''}|${content.fallbackHtml || ''}`,
  );
  const cacheKey = `product:${normalizedLang}:${sourceHash}`;
  const cache = readCache();
  const cached = cache[cacheKey];
  if (cached) return cached;

  const [document, fallbackHtml] = await Promise.all([
    content.document ? translateDocument(content.document, normalizedLang, `${cacheKey}:document`) : Promise.resolve(null),
    content.fallbackHtml
      ? translateText(`${cacheKey}:fallbackHtml`, content.fallbackHtml, normalizedLang, true)
      : Promise.resolve(''),
  ]);

  const translated: ExtractedProductPageDocument = {
    document,
    fallbackHtml: fallbackHtml || content.fallbackHtml,
  };

  const isSameDocument =
    JSON.stringify(translated.document) === JSON.stringify(content.document) &&
    translated.fallbackHtml === content.fallbackHtml;

  if (!isSameDocument) {
    writeCache({ ...cache, [cacheKey]: translated });
  }
  return translated;
};
