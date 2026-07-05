import type { BlogCategory } from '../data/blogContent';
import type { BlogArticleCategoryMap, LoadedBlogArticle } from './blog';
import { normalizeLang, pickByLang, type SupportedLanguage } from './language';

export interface TranslatableBlogData {
  categories: BlogCategory[];
  articles: LoadedBlogArticle[];
  categoryMap: BlogArticleCategoryMap;
}

interface TranslateResponse {
  translation?: string;
}

const BLOG_TRANSLATION_CACHE_KEY = 'ym-blog-i18n-v1';

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

const readCache = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(BLOG_TRANSLATION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const writeCache = (value: Record<string, string>) => {
  try {
    localStorage.setItem(BLOG_TRANSLATION_CACHE_KEY, JSON.stringify(value));
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

const translateHtmlContent = async (
  keyPrefix: string,
  html: string,
  targetLanguage: SupportedLanguage,
): Promise<string> => {
  if (!html.trim()) return html;
  if (typeof document === 'undefined') {
    return html;
  }

  const template = document.createElement('template');
  template.innerHTML = html;

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    if (textNode.textContent && textNode.textContent.trim()) {
      textNodes.push(textNode);
    }
    current = walker.nextNode();
  }

  const translated = await Promise.all(
    textNodes.map((node, index) =>
      translateText(`${keyPrefix}:html:${index}`, node.textContent || '', targetLanguage, true),
    ),
  );

  textNodes.forEach((node, index) => {
    node.textContent = translated[index] || node.textContent || '';
  });

  return template.innerHTML;
};

export const shouldTranslateBlogContent = (lang: string) =>
  pickByLang(normalizeLang(lang), false, true, true, true);

export const translateBlogData = async (
  data: TranslatableBlogData,
  lang: string,
): Promise<TranslatableBlogData> => {
  const normalizedLang = normalizeLang(lang);
  if (!shouldTranslateBlogContent(normalizedLang)) {
    return data;
  }

  const sourceHash = hashText(
    [
      data.categories
        .map((category) => `${category.slug}|${category.name}|${category.description}|${category.sort_order}|${category.is_active ? 1 : 0}`)
        .join('||'),
      data.articles
        .map((article) => `${article.slug}|${article.title}|${article.excerpt}|${article.content}|${article.category_slug}|${article.category_name}`)
        .join('||'),
    ].join('::'),
  );

  const cacheKey = `blog:${normalizedLang}:${sourceHash}`;
  const cache = readCache();
  const cached = cache[cacheKey];
  if (cached) {
    try {
      return JSON.parse(cached) as TranslatableBlogData;
    } catch {
      // ignore malformed cache entries
    }
  }

  const translatedCategories = await Promise.all(
    data.categories.map(async (category, index) => {
      const categoryKey = `${cacheKey}:category:${index}`;
      const [name, description] = await Promise.all([
        translateText(`${categoryKey}:name`, category.name, normalizedLang),
        translateText(`${categoryKey}:description`, category.description || category.name, normalizedLang),
      ]);

      return {
        ...category,
        name: name || category.name,
        description: description || category.description || category.name,
      };
    }),
  );

  const translatedCategoriesBySlug = new Map(translatedCategories.map((category) => [category.slug, category]));

  const translatedArticles = await Promise.all(
    data.articles.map(async (article, index) => {
      const articleKey = `${cacheKey}:article:${index}`;
      const [title, excerpt, content] = await Promise.all([
        translateText(`${articleKey}:title`, article.title, normalizedLang),
        translateText(`${articleKey}:excerpt`, article.excerpt || article.title, normalizedLang),
        translateHtmlContent(`${articleKey}:content`, article.content, normalizedLang),
      ]);
      const category = translatedCategoriesBySlug.get(article.category_slug);

      return {
        ...article,
        title: title || article.title,
        excerpt: excerpt || article.excerpt || article.title,
        content: content || article.content,
        category_name: category?.name || article.category_name,
      };
    }),
  );

  const translated: TranslatableBlogData = {
    categories: translatedCategories,
    articles: translatedArticles,
    categoryMap: data.categoryMap,
  };

  writeCache({ ...cache, [cacheKey]: JSON.stringify(translated) });
  return translated;
};
