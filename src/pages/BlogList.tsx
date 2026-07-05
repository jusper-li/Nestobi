import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';
import { loadBlogData, type LoadedBlogArticle } from '../lib/blog';
import type { BlogArticleCategoryMap } from '../lib/blog';
import type { BlogCategory } from '../data/blogContent';
import { useLanguage } from '../contexts/LanguageContext';
import { pickByLang } from '../lib/language';
import { shouldTranslateBlogContent, translateBlogData } from '../lib/blogTranslation';

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));

const stripBrandPrefix = (value: string) => value.replace(/^y\s*&\s*m Coffee\s+/i, '');

export default function BlogList() {
  const { categorySlug } = useParams();
  const activeSlug = categorySlug ? decodeURIComponent(categorySlug) : '';
  const { currentLanguage, t } = useLanguage();
  const [sourceCategories, setSourceCategories] = useState<BlogCategory[]>([]);
  const [sourceArticles, setSourceArticles] = useState<LoadedBlogArticle[]>([]);
  const [sourceCategoryMap, setSourceCategoryMap] = useState<BlogArticleCategoryMap>({});
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [articles, setArticles] = useState<LoadedBlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [search, setSearch] = useState('');

  const activeCategory = categories.find((category) => category.slug === activeSlug);
  const locale = pickByLang(currentLanguage, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');

  useSEO({
    title: activeCategory?.name || t('blog.title', '專欄文章'),
    description: activeCategory?.description || t('blog.description', '閱讀 Sonpin 的最新文章與品牌故事。'),
    keywords: t('blog.keywords', 'Sonpin,專欄文章,品牌故事,咖啡資訊,風味筆記'),
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const data = await loadBlogData({ publishedOnly: true });
      if (cancelled) return;
      setSourceCategories(data.categories);
      setSourceArticles(data.articles);
      setSourceCategoryMap(data.categoryMap);
      setCategories(data.categories);
      setArticles(data.articles);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!sourceArticles.length && !sourceCategories.length) return;
      if (!shouldTranslateBlogContent(currentLanguage)) {
        setCategories(sourceCategories);
        setArticles(sourceArticles);
        return;
      }

      setTranslating(true);
      try {
        const translated = await translateBlogData(
          {
            categories: sourceCategories,
            articles: sourceArticles,
            categoryMap: sourceCategoryMap,
          },
          currentLanguage,
        );
        setCategories(translated.categories);
        setArticles(translated.articles);
      } catch {
        setCategories(sourceCategories);
        setArticles(sourceArticles);
      } finally {
        setTranslating(false);
      }
    };

    void run();
  }, [currentLanguage, sourceArticles, sourceCategories, sourceCategoryMap]);

  const visibleArticles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesCategory = activeSlug ? article.category_slug === activeSlug : true;
      const matchesSearch = query
        ? `${article.title} ${article.excerpt} ${article.category_name}`.toLowerCase().includes(query)
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [activeSlug, articles, search]);

  const countForCategory = (slug: string) =>
    articles.filter((article) => article.category_slug === slug).length;

  return (
    <div className="min-h-screen bg-[#fbf6ee] text-stone-800">
      <SiteHeader />

      <main className="pt-20">
        <section className="border-b border-[#eadfd1] bg-[linear-gradient(135deg,#fbf6ee_0%,#f7efe5_44%,#fffaf2_100%)]">
          <div className="container mx-auto px-6 py-16 md:py-24">
            <nav className="mb-8 flex items-center gap-2 text-xs tracking-[0.18em] text-stone-400">
              <Link to="/" className="transition-colors hover:text-stone-700">
                {t('common.home', '首頁')}
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-stone-700">{t('blog.title', '專欄文章')}</span>
            </nav>

            <div className="grid gap-10 md:grid-cols-[1fr_360px] md:items-end">
              <div>
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.36em] text-[#8e6448]/80">
                  Journal
                </p>
                <h1 className="max-w-3xl text-4xl font-light leading-tight tracking-[0.16em] text-stone-900 md:text-6xl">
                  {activeCategory?.name || t('blog.heading', 'Sonpin 專欄文章')}
                </h1>
                <div className="mt-7 h-px w-14 bg-[#cfa87a]/70" />
                <p className="mt-7 max-w-2xl text-sm font-light leading-8 text-stone-500">
                  {activeCategory?.description || t('blog.subheading', '閱讀品牌最新消息、咖啡知識與風味故事。')}
                </p>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-300" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('blog.search', '搜尋文章')}
                  className="w-full border border-[#d8c8b6] bg-[#fffaf2]/90 py-3.5 pl-11 pr-4 text-sm text-stone-700 outline-none transition-all placeholder:text-stone-300 focus:border-[#a97a4f] focus:bg-white focus:ring-4 focus:ring-[#d8bda4]/40"
                />
              </div>
            </div>

            {translating && (
              <div className="mt-6 inline-flex items-center rounded-full border border-[#eadfd1] bg-[#fffaf2]/80 px-3 py-1 text-[11px] tracking-[0.18em] text-[#8e6448]">
                {t('common.translating', '翻譯中')}
              </div>
            )}
          </div>
        </section>

        <section className="container mx-auto px-6 py-10 md:py-14">
          <div className="mb-9 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <Link
              to="/blog"
              className={`flex-shrink-0 border px-4 py-2 text-xs font-medium tracking-[0.16em] transition-all ${
                !activeSlug
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 text-stone-500 hover:border-stone-700 hover:text-stone-900'
              }`}
            >
              {t('blog.all', '全部')}
              <span className="ml-2 opacity-60">{articles.length}</span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/blog/categories/${encodeURIComponent(category.slug)}`}
                className={`flex-shrink-0 border px-4 py-2 text-xs font-medium tracking-[0.16em] transition-all ${
                  activeSlug === category.slug
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 text-stone-500 hover:border-stone-700 hover:text-stone-900'
                }`}
              >
                {stripBrandPrefix(category.name)}
                <span className="ml-2 opacity-60">{countForCategory(category.slug)}</span>
              </Link>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="animate-pulse border border-stone-100 bg-white">
                  <div className="aspect-[4/3] bg-stone-100" />
                  <div className="space-y-4 p-5">
                    <div className="h-3 w-24 bg-stone-100" />
                    <div className="h-5 w-5/6 bg-stone-100" />
                    <div className="h-3 w-full bg-stone-100" />
                    <div className="h-3 w-2/3 bg-stone-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : visibleArticles.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-sm tracking-[0.16em] text-stone-400">{t('blog.empty', '目前沒有可顯示的文章。')}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleArticles.map((article, index) => (
                <article
                  key={article.slug}
                  className="group overflow-hidden border border-stone-100 bg-white transition-all duration-500 hover:-translate-y-1 hover:border-stone-200 hover:shadow-[0_26px_70px_-24px_rgba(41,37,36,0.26)]"
                >
                  <Link to={`/blog/posts/${article.slug}`} className="block overflow-hidden p-4 pb-0">
                    <div className="aspect-[4/3] overflow-hidden bg-stone-50">
                      <img
                        src={article.featured_image || '/LOGO-1.png'}
                        alt={article.title}
                        loading={index < 4 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        onError={(event) => {
                          event.currentTarget.src = '/LOGO-1.png';
                        }}
                      />
                    </div>
                  </Link>

                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between gap-3 text-[11px] tracking-[0.18em] text-stone-400">
                      <Link
                        to={`/blog/categories/${encodeURIComponent(article.category_slug)}`}
                        className="uppercase transition-colors hover:text-amber-700"
                      >
                        {stripBrandPrefix(article.category_name)}
                      </Link>
                      <span>{formatDate(article.published_at, locale)}</span>
                    </div>
                    <Link to={`/blog/posts/${article.slug}`}>
                      <h2 className="min-h-[3.5rem] text-lg font-light leading-relaxed tracking-[0.06em] text-stone-900 transition-colors group-hover:text-amber-800 line-clamp-2">
                        {article.title}
                      </h2>
                    </Link>
                    <p className="mt-4 line-clamp-3 text-sm font-light leading-7 text-stone-500">
                      {article.excerpt}
                    </p>
                    <Link
                      to={`/blog/posts/${article.slug}`}
                      className="mt-6 inline-flex items-center gap-2 border-b border-stone-300 pb-1 text-xs font-medium tracking-[0.2em] text-stone-700 transition-colors hover:border-amber-600 hover:text-amber-700"
                    >
                      {t('blog.read', '閱讀文章')}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
