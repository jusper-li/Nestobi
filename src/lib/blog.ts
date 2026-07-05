import { BLOG_ARTICLES, BLOG_CATEGORIES, type BlogArticle, type BlogCategory } from '../data/blogContent';
import { isMissingSupabaseTableError, isSupabaseContentEnabled, isSupabaseNetworkError, supabase } from './supabase';

export const BLOG_CATEGORY_SETTING_KEY = 'blog_categories';
export const BLOG_ARTICLE_CATEGORY_SETTING_KEY = 'blog_article_categories';

export interface LoadedBlogArticle extends BlogArticle {
  id?: string;
  created_at?: string;
  updated_at?: string;
}

interface DbArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  views: number | null;
  created_at?: string;
  updated_at?: string;
}

export type BlogArticleCategoryMap = Record<string, string>;

const withRequestTimeout = <T,>(request: PromiseLike<T>, ms = 6000) =>
  Promise.race([
    request,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Request timed out')), ms);
    }),
  ]);

export const normalizeBlogSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

const parseCategories = (value: unknown): BlogCategory[] => {
  const items = Array.isArray(value) ? value : [];
  const parsed = items.reduce<BlogCategory[]>((acc, item, index) => {
    const category = item as Partial<BlogCategory>;
    const name = typeof category.name === 'string' ? category.name.trim() : '';
    const slug = typeof category.slug === 'string' ? category.slug.trim() : normalizeBlogSlug(name);

    if (!name || !slug) return acc;

    acc.push({
      name,
      slug,
      description: typeof category.description === 'string' ? category.description : '',
      sort_order: Number.isFinite(category.sort_order) ? Number(category.sort_order) : index + 1,
      is_active: category.is_active !== false,
      source_url: typeof category.source_url === 'string' ? category.source_url : undefined,
    });

    return acc;
  }, []);

  return parsed.length ? parsed : BLOG_CATEGORIES;
};

const parseCategoryMap = (value: unknown): BlogArticleCategoryMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<BlogArticleCategoryMap>((acc, [slug, categorySlug]) => {
    if (typeof categorySlug === 'string' && slug.trim() && categorySlug.trim()) {
      acc[slug] = categorySlug;
    }
    return acc;
  }, {});
};

const sortCategories = (categories: BlogCategory[]) =>
  [...categories]
    .filter((category) => category.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order);

const localCategoryMap = BLOG_ARTICLES.reduce<BlogArticleCategoryMap>((acc, article) => {
  acc[article.slug] = article.category_slug;
  return acc;
}, {});

const mergeDbArticles = (
  dbArticles: DbArticle[],
  categories: BlogCategory[],
  categoryMap: BlogArticleCategoryMap,
  publishedOnly: boolean,
): LoadedBlogArticle[] => {
  const categoriesBySlug = new Map(categories.map((category) => [category.slug, category]));
  const localBySlug = new Map(BLOG_ARTICLES.map((article) => [article.slug, article]));
  const merged = new Map<string, LoadedBlogArticle>(
    BLOG_ARTICLES
      .filter((article) => !publishedOnly || article.status === 'published')
      .map((article) => [
        article.slug,
        {
          ...article,
          category_slug: categoryMap[article.slug] || article.category_slug,
          category_name: categoriesBySlug.get(categoryMap[article.slug] || article.category_slug)?.name || article.category_name,
        },
      ]),
  );

  dbArticles.forEach((article, index) => {
    if (publishedOnly && article.status !== 'published') return;

    const local = localBySlug.get(article.slug);
    const categorySlug = categoryMap[article.slug] || local?.category_slug || categories[0]?.slug || '';
    const category = categoriesBySlug.get(categorySlug);

    merged.set(article.slug, {
      title: article.title || local?.title || '',
      slug: article.slug,
      excerpt: article.excerpt || local?.excerpt || '',
      content: article.content || local?.content || '',
      featured_image: article.featured_image || local?.featured_image || '',
      status: article.status || local?.status || 'draft',
      published_at: article.published_at || local?.published_at || article.created_at || new Date().toISOString(),
      category_slug: categorySlug,
      category_name: category?.name || local?.category_name || '',
      source_url: local?.source_url || '',
      sort_order: local?.sort_order || 1000 + index,
      views: article.views || 0,
      id: article.id,
      created_at: article.created_at,
      updated_at: article.updated_at,
    });
  });

  return Array.from(merged.values()).sort((a, b) => {
    const dateDiff = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.sort_order - b.sort_order;
  });
};

export const loadBlogData = async (options: { publishedOnly?: boolean } = {}) => {
  const publishedOnly = options.publishedOnly ?? true;

  if (!isSupabaseContentEnabled) {
    const categories = sortCategories(BLOG_CATEGORIES);
    return {
      categories,
      categoryMap: localCategoryMap,
      articles: mergeDbArticles([], categories, localCategoryMap, publishedOnly),
      fromSupabase: false,
    };
  }

  try {
    const [{ data: settingsData, error: settingsError }, { data: articlesData, error: articlesError }] = await Promise.all([
      withRequestTimeout(
        supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [BLOG_CATEGORY_SETTING_KEY, BLOG_ARTICLE_CATEGORY_SETTING_KEY]),
      ),
      withRequestTimeout(
        supabase
          .from('articles')
          .select('id, title, slug, content, excerpt, featured_image, status, published_at, views, created_at, updated_at')
          .order('published_at', { ascending: false, nullsFirst: false }),
      ),
    ]);

    if (settingsError && !isMissingSupabaseTableError(settingsError)) throw settingsError;
    if (articlesError && !isMissingSupabaseTableError(articlesError)) throw articlesError;

    const settings = new Map((settingsData || []).map((row) => [row.setting_key, row.setting_value]));
    const categories = sortCategories(parseCategories(settings.get(BLOG_CATEGORY_SETTING_KEY)));
    const categoryMap = {
      ...localCategoryMap,
      ...parseCategoryMap(settings.get(BLOG_ARTICLE_CATEGORY_SETTING_KEY)),
    };

    return {
      categories,
      categoryMap,
      articles: mergeDbArticles((articlesData || []) as DbArticle[], categories, categoryMap, publishedOnly),
      fromSupabase: true,
    };
  } catch (error) {
    if (!isMissingSupabaseTableError(error) && !isSupabaseNetworkError(error)) {
      console.warn('Using bundled blog content:', error);
    }

    const categories = sortCategories(BLOG_CATEGORIES);
    return {
      categories,
      categoryMap: localCategoryMap,
      articles: mergeDbArticles([], categories, localCategoryMap, publishedOnly),
      fromSupabase: false,
    };
  }
};

export const upsertBlogSetting = async (settingKey: string, settingValue: unknown) => {
  const { error } = await supabase
    .from('site_settings')
    .upsert(
      {
        setting_key: settingKey,
        setting_value: settingValue,
      },
      { onConflict: 'setting_key' },
    );

  if (error) throw error;
};

export const saveBlogCategories = (categories: BlogCategory[]) =>
  upsertBlogSetting(BLOG_CATEGORY_SETTING_KEY, categories);

export const saveBlogArticleCategoryMap = (categoryMap: BlogArticleCategoryMap) =>
  upsertBlogSetting(BLOG_ARTICLE_CATEGORY_SETTING_KEY, categoryMap);
