import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Calendar, ChevronRight, Coffee, Tag, User } from 'lucide-react';
import { BLOG_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { sanitizeHtml } from '../../lib/security';
import { useLanguage } from '../../contexts/LanguageContext';
import { localeByLang, normalizeLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { translateBlogPostsFromCacheOnly, translateBlogPostsOnDemand } from '../../lib/contentTranslations';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  author_name: string;
  tags: string[];
  category: string;
  meta_description: string;
  published_at: string;
  updated_at: string;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string;
  published_at: string;
  category: string;
  excerpt?: string;
  content?: string;
  author_name?: string;
  tags?: string[];
}

const BlogDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const locale = normalizedLang;
  const dateLocale = localeByLang(normalizedLang);
  const t4 = (zh: string, en: string, ja: string, ko: string) =>
    locale === 'ja' ? ja : locale === 'ko' ? ko : locale === 'en' ? en : zh;

  const t = {
    blogHome: t4('咖啡旅行家', 'Coffee Traveler', 'コーヒートラベラー', '커피 트래블러'),
    notFoundTitle: t4('找不到文章', 'Article not found', '記事が見つかりません', '글을 찾을 수 없습니다'),
    backToBlog: t4('返回咖啡旅誌', 'Back to Blog', 'ブログ一覧へ戻る', '블로그로 돌아가기'),
    related: t4('相關文章', 'Related Articles', '関連記事', '관련 글'),
  };

  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [displayPost, setDisplayPost] = useState<BlogPost | null>(null);
  const [displayRelated, setDisplayRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      const { data } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
      if (data) {
        setPost(data as BlogPost);
        const { data: relData } = await supabase
          .from('blog_posts')
          .select('id,title,slug,cover_image_url,published_at,category,excerpt,content,author_name,tags')
          .eq('status', 'published')
          .eq('category', (data as BlogPost).category)
          .neq('slug', slug)
          .limit(3);
        setRelated((relData || []) as RelatedPost[]);
      }
      setLoading(false);
    };
    if (slug) void fetchPost();
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    if (!post || normalizedLang === 'zh-TW') {
      setDisplayPost(post);
      return () => {
        cancelled = true;
      };
    }
    setDisplayPost(post);
    translateBlogPostsFromCacheOnly([post], normalizedLang).then(rows => {
      if (!cancelled && rows[0]) setDisplayPost(rows[0] as BlogPost);
    }).catch(() => {});
    translateBlogPostsOnDemand([post], normalizedLang).then(rows => {
      if (!cancelled && rows[0]) setDisplayPost(rows[0] as BlogPost);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [post, normalizedLang]);

  useEffect(() => {
    let cancelled = false;
    if (!related.length || normalizedLang === 'zh-TW') {
      setDisplayRelated(related);
      return () => {
        cancelled = true;
      };
    }
    setDisplayRelated(related);
    translateBlogPostsFromCacheOnly(related as unknown as BlogPost[], normalizedLang).then(rows => {
      if (!cancelled) setDisplayRelated(rows as unknown as RelatedPost[]);
    }).catch(() => {});
    translateBlogPostsOnDemand(related as unknown as BlogPost[], normalizedLang).then(rows => {
      if (!cancelled) setDisplayRelated(rows as unknown as RelatedPost[]);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [related, normalizedLang]);

  const viewPost = displayPost || post;
  const viewRelated = displayRelated.length ? displayRelated : related;

  const formatDate = (iso: string) =>
    iso
      ? new Date(iso).toLocaleDateString(dateLocale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

  const jsonLd = viewPost
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: viewPost.title,
        description: viewPost.meta_description || viewPost.excerpt,
        image: viewPost.cover_image_url,
        author: { '@type': 'Person', name: viewPost.author_name },
        publisher: { '@type': 'Organization', name: 'Nestobi' },
        datePublished: viewPost.published_at,
        dateModified: viewPost.updated_at,
        inLanguage: normalizedLang,
        keywords: viewPost.tags?.join(', '),
        articleSection: viewPost.category,
        mainEntityOfPage: { '@type': 'WebPage', '@id': `https://nestobi.netlify.app/blog/${viewPost.slug}` },
      }
    : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex justify-center py-32">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-700 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!viewPost) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h2 className="mb-2 text-xl font-semibold text-gray-700">{t.notFoundTitle}</h2>
          <Link to="/blog" className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-6 py-3 font-semibold text-white transition hover:bg-amber-800">
            <ArrowLeft className="h-4 w-4" />
            {t.backToBlog}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {jsonLd && (
        <SEOHead
          title={viewPost.title}
          description={viewPost.meta_description || viewPost.excerpt}
          keywords={viewPost.tags?.join(', ')}
          ogImage={viewPost.cover_image_url}
          ogType="article"
          jsonLd={jsonLd as Record<string, unknown>}
        />
      )}
      <Navigation />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-400">
          <Link to="/blog" className="flex items-center gap-1 transition-colors hover:text-amber-700">
            <Coffee className="h-3.5 w-3.5" />
            {t.blogHome}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="cursor-pointer transition-colors hover:text-amber-700">{viewPost.category}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="max-w-[200px] truncate font-medium text-gray-700">{viewPost.title}</span>
        </nav>

        <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-md">
            <div className="relative h-72 md:h-[440px]">
              <img src={viewPost.cover_image_url || BLOG_FALLBACK_IMAGE} alt={viewPost.title} onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <span className="mb-4 inline-block rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">{viewPost.category}</span>
                <h1 className="font-serif text-2xl font-bold leading-tight md:text-4xl">{viewPost.title}</h1>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-gray-100 pb-6 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {viewPost.author_name}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(viewPost.published_at)}
                </div>
                {viewPost.tags?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Tag className="h-4 w-4" />
                    {viewPost.tags.map(tag => (
                      <span key={tag} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {viewPost.excerpt && <p className="mb-8 border-l-4 border-amber-400 pl-5 text-lg font-medium italic leading-relaxed text-gray-600">{viewPost.excerpt}</p>}

              <div
                className="prose prose-gray prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:shadow-md prose-blockquote:border-amber-400 prose-blockquote:text-gray-600"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewPost.content) }}
              />

              <div className="mt-12 border-t border-gray-100 pt-6">
                <Link to="/blog" className="inline-flex items-center gap-2 font-medium text-amber-700 transition-colors hover:text-amber-800">
                  <ArrowLeft className="h-4 w-4" />
                  {t.backToBlog}
                </Link>
              </div>
            </div>
          </div>
        </motion.article>

        {viewRelated.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-5 text-xl font-bold text-gray-900">{t.related}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {viewRelated.map((rel, i) => (
                <motion.div key={rel.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Link to={`/blog/${rel.slug}`} className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
                    <div className="h-36 overflow-hidden">
                      <img src={rel.cover_image_url || BLOG_FALLBACK_IMAGE} alt={rel.title} onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                    <div className="p-4">
                      <span className="text-xs font-medium text-amber-700">{rel.category}</span>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900 transition-colors group-hover:text-amber-700">{rel.title}</h3>
                      <p className="mt-2 text-xs text-gray-400">{formatDate(rel.published_at)}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BlogDetail;
