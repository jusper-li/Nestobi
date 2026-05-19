import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, ArrowLeft, Calendar, Tag, User, ChevronRight, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BLOG_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { sanitizeHtml } from '../../lib/security';

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
}

const BlogDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (data) {
        setPost(data);
        const { data: relData } = await supabase
          .from('blog_posts')
          .select('id, title, slug, cover_image_url, published_at, category')
          .eq('status', 'published')
          .eq('category', data.category)
          .neq('slug', slug)
          .limit(3);
        setRelated(relData || []);
      }
      setLoading(false);
    };
    if (slug) fetchPost();
  }, [slug]);

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  const jsonLd = post ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    image: post.cover_image_url,
    author: { '@type': 'Person', name: post.author_name },
    publisher: { '@type': 'Organization', name: 'Nestobi 旅遊平台' },
    datePublished: post.published_at,
    dateModified: post.updated_at,
    inLanguage: 'zh-TW',
    keywords: post.tags?.join(', '),
    articleSection: post.category,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://nestobi.com.tw/blog/${post.slug}`,
    },
  } : undefined;

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-amber-700 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">找不到此文章</h2>
        <Link to="/blog" className="inline-flex items-center gap-2 bg-amber-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-800 transition">
          <ArrowLeft className="w-4 h-4" />返回部落格
        </Link>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {jsonLd && (
        <SEOHead
          title={post.title}
          description={post.meta_description || post.excerpt}
          keywords={post.tags?.join(', ')}
          ogImage={post.cover_image_url}
          ogType="article"
          jsonLd={jsonLd as Record<string, unknown>}
        />
      )}
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <Link to="/blog" className="flex items-center gap-1 hover:text-amber-700 transition-colors">
            <Coffee className="w-3.5 h-3.5" />咖啡旅行家
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="hover:text-amber-700 cursor-pointer transition-colors">{post.category}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-700 font-medium truncate max-w-[200px]">{post.title}</span>
        </nav>

        <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100">
            <div className="relative h-72 md:h-[440px]">
              <img
                src={post.cover_image_url || BLOG_FALLBACK_IMAGE}
                alt={post.title}
                onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <span className="bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4 inline-block">{post.category}</span>
                <h1 className="text-2xl md:text-4xl font-serif font-bold leading-tight">{post.title}</h1>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b border-gray-100 mb-8">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />{post.author_name}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />{formatDate(post.published_at)}
                </div>
                {post.tags?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tag className="w-4 h-4" />
                    {post.tags.map(tag => (
                      <span key={tag} className="bg-amber-50 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-medium">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {post.excerpt && (
                <p className="text-lg text-gray-600 leading-relaxed mb-8 font-medium border-l-4 border-amber-400 pl-5 italic">
                  {post.excerpt}
                </p>
              )}

              <div
                className="prose prose-gray prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:shadow-md prose-blockquote:border-amber-400 prose-blockquote:text-gray-600"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
              />

              <div className="mt-12 pt-6 border-t border-gray-100">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />返回咖啡旅行家
                </Link>
              </div>
            </div>
          </div>
        </motion.article>

        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-5">更多相關文章</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((rel, i) => (
                <motion.div key={rel.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Link to={`/blog/${rel.slug}`} className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                    <div className="h-36 overflow-hidden">
                      <img
                        src={rel.cover_image_url || BLOG_FALLBACK_IMAGE}
                        alt={rel.title}
                        onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <span className="text-xs text-amber-700 font-medium">{rel.category}</span>
                      <h3 className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2 group-hover:text-amber-700 transition-colors">{rel.title}</h3>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(rel.published_at)}</p>
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
