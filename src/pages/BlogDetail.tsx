import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Clock, ExternalLink } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';
import { loadBlogData, type LoadedBlogArticle, type BlogArticleCategoryMap } from '../lib/blog';
import type { BlogCategory } from '../data/blogContent';
import { useLanguage } from '../contexts/LanguageContext';
import { pickByLang } from '../lib/language';
import { shouldTranslateBlogContent, translateBlogData } from '../lib/blogTranslation';

const formatDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));

const stripBrandPrefix = (value: string) => value.replace(/^y\s*&\s*m Coffee\s+/i, '');

export default function BlogDetail() {
  const { slug } = useParams();
  const decodedSlug = slug ? decodeURIComponent(slug) : '';
  const { currentLanguage, t } = useLanguage();
  const [sourceCategories, setSourceCategories] = useState<BlogCategory[]>([]);
  const [sourceArticles, setSourceArticles] = useState<LoadedBlogArticle[]>([]);
  const [sourceCategoryMap, setSourceCategoryMap] = useState<BlogArticleCategoryMap>({});
  const [articles, setArticles] = useState<LoadedBlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);

  const article = articles.find((item) => item.slug === decodedSlug);
  const hasFeaturedImageInContent = Boolean(
    article?.featured_image && article.content.includes(article.featured_image),
  );
  const relatedArticles = useMemo(
    () =>
      article
        ? articles
            .filter((item) => item.slug !== article.slug && item.category_slug === article.category_slug)
            .slice(0, 3)
        : [],
    [article, articles],
  );
  const locale = pickByLang(currentLanguage, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');

  useSEO({
    title: article?.title || t('blog.title', '專欄文章'),
    description: article?.excerpt || t('blog.description', 'Sonpin 專欄文章'),
    ogImage: article?.featured_image,
    ogType: 'article',
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
      if (!sourceArticles.length) return;
      if (!shouldTranslateBlogContent(currentLanguage)) {
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
        setArticles(translated.articles);
      } catch {
        setArticles(sourceArticles);
      } finally {
        setTranslating(false);
      }
    };

    void run();
  }, [currentLanguage, sourceArticles, sourceCategories, sourceCategoryMap]);

  return (
    <div className="min-h-screen bg-[#fbf6ee] text-stone-800">
      <SiteHeader />

      <main className="pt-20">
        {loading ? (
          <div className="container mx-auto px-6 py-24">
            <div className="mx-auto max-w-4xl animate-pulse">
              <div className="mb-8 h-4 w-40 bg-stone-100" />
              <div className="mb-5 h-10 w-5/6 bg-stone-100" />
              <div className="mb-12 h-4 w-56 bg-stone-100" />
              <div className="aspect-[16/10] bg-stone-100" />
              <div className="mt-10 space-y-4">
                <div className="h-4 bg-stone-100" />
                <div className="h-4 bg-stone-100" />
                <div className="h-4 w-2/3 bg-stone-100" />
              </div>
            </div>
          </div>
        ) : !article ? (
          <div className="container mx-auto px-6 py-28 text-center">
            <p className="text-sm tracking-[0.18em] text-stone-400">
              {t('blog.detail.not_found', '找不到這篇文章。')}
            </p>
            <Link
              to="/blog"
              className="mt-6 inline-flex items-center gap-2 border-b border-stone-300 pb-1 text-xs font-medium tracking-[0.18em] text-stone-700 hover:border-amber-700 hover:text-amber-700"
            >
              {t('blog.detail.back_list', '返回文章列表')}
            </Link>
          </div>
        ) : (
          <>
            <article>
              <header className="border-b border-[#eadfd1] bg-[linear-gradient(135deg,#fbf6ee_0%,#f7efe5_45%,#fffaf2_100%)]">
                <div className="container mx-auto px-6 py-12 md:py-18">
                  <nav className="mb-9 flex flex-wrap items-center gap-2 text-xs tracking-[0.18em] text-stone-400">
                    <Link to="/" className="transition-colors hover:text-stone-700">
                      {t('common.home', '首頁')}
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <Link to="/blog" className="transition-colors hover:text-stone-700">
                      {t('blog.title', '專欄文章')}
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <Link
                      to={`/blog/categories/${encodeURIComponent(article.category_slug)}`}
                      className="transition-colors hover:text-stone-700"
                    >
                      {stripBrandPrefix(article.category_name)}
                    </Link>
                  </nav>

                  <div className="mx-auto max-w-5xl">
                    <Link
                      to="/blog"
                      className="mb-8 inline-flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-stone-500 transition-colors hover:text-amber-700"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      {t('blog.detail.back', '返回列表')}
                    </Link>
                    <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.36em] text-[#8e6448]/80">
                      {stripBrandPrefix(article.category_name)}
                    </p>
                    <h1 className="max-w-4xl text-3xl font-light leading-[1.45] tracking-[0.08em] text-stone-950 md:text-5xl">
                      {article.title}
                    </h1>
                    <div className="mt-7 flex flex-wrap items-center gap-4 text-xs tracking-[0.16em] text-stone-400">
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(article.published_at, locale)}
                      </span>
                      {article.source_url && (
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 transition-colors hover:text-[#8e6448]"
                        >
                          {t('blog.detail.source', '原始來源')}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </header>

              <div className="container mx-auto px-6 py-10 md:py-16">
                <div className="mx-auto max-w-4xl">
                  {translating && (
                    <div className="mb-4 inline-flex items-center rounded-full border border-[#eadfd1] bg-[#fffaf2]/80 px-3 py-1 text-[11px] tracking-[0.18em] text-[#8e6448]">
                      {t('common.translating', '翻譯中')}
                    </div>
                  )}

                  {article.featured_image && !hasFeaturedImageInContent && (
                    <div className="mb-12 overflow-hidden bg-stone-50">
                      <img
                        src={article.featured_image}
                        alt={article.title}
                        className="w-full object-cover"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                  )}

                  <div
                    className="ym-blog-content"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />
                </div>
              </div>
            </article>

            {relatedArticles.length > 0 && (
              <section className="border-t border-[#eadfd1] bg-[#f7f0e6]/60">
                <div className="container mx-auto px-6 py-12 md:py-16">
                  <div className="mb-8 flex items-end justify-between gap-6">
                    <div>
                      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.34em] text-[#8e6448]/80">
                        Related
                      </p>
                      <h2 className="text-2xl font-light tracking-[0.12em] text-stone-900">
                        {t('blog.detail.related', '相關文章')}
                      </h2>
                    </div>
                    <Link to="/blog" className="text-xs tracking-[0.18em] text-stone-500 transition-colors hover:text-stone-900">
                      {t('blog.detail.view_all', '查看全部')}
                    </Link>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">
                    {relatedArticles.map((item) => (
                      <Link
                        key={item.slug}
                        to={`/blog/posts/${item.slug}`}
                        className="group block overflow-hidden border border-stone-100 bg-white p-3 transition-all duration-500 hover:-translate-y-1 hover:border-stone-200 hover:shadow-[0_24px_58px_-26px_rgba(41,37,36,0.28)]"
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-stone-50">
                          <img
                            src={item.featured_image || '/LOGO-1.png'}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          />
                        </div>
                        <div className="p-3">
                          <p className="mb-2 text-[11px] tracking-[0.16em] text-stone-400">
                            {formatDate(item.published_at, locale)}
                          </p>
                          <h3 className="line-clamp-2 text-sm font-light leading-7 tracking-[0.08em] text-stone-900 group-hover:text-amber-800">
                            {item.title}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
