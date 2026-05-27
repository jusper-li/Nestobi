import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { STATIC_PAGE_FALLBACKS } from '../lib/staticPageFallbacks';
import { sanitizeHtml } from '../lib/security';
import { useLanguage } from '../contexts/LanguageContext';

interface PageData {
  title: string;
  content: string;
  meta_description: string;
  updated_at: string;
}

const VALID_SLUGS = ['about', 'privacy', 'terms', 'cookies', 'anti-fraud'];

const StaticPage: React.FC = () => {
  const { lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace('/', '');
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const ui = useMemo(() => ({
    back: lang === 'en' ? 'Back' : lang === 'ja' ? '戻る' : lang === 'ko' ? '뒤로' : '返回',
    updated: lang === 'en' ? 'Updated:' : lang === 'ja' ? '最終更新:' : lang === 'ko' ? '최종 업데이트:' : '最後更新：',
    notFound: lang === 'en' ? 'Page not found' : lang === 'ja' ? 'ページが見つかりません' : lang === 'ko' ? '페이지를 찾을 수 없습니다' : '找不到頁面',
  }), [lang]);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setNotFound(false);
      if (!VALID_SLUGS.includes(slug)) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('static_pages')
        .select('title, content, meta_description, updated_at')
        .eq('slug', slug)
        .maybeSingle();

      if (error || !data) {
        const fallback = STATIC_PAGE_FALLBACKS[slug];
        if (fallback) setPage(fallback);
        else setNotFound(true);
      } else {
        setPage(data);
      }
      setLoading(false);
    };

    fetchPage();
  }, [slug, location.pathname]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(
      lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : lang === 'en' ? 'en-US' : 'zh-TW',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {page && (
        <SEOHead
          title={page.title}
          description={page.meta_description || page.title}
          keywords={`${page.title}, Nestobi`}
          ogType="article"
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: page.title,
            description: page.meta_description || page.title,
            publisher: { '@type': 'Organization', name: 'Nestobi' },
            dateModified: page.updated_at,
            inLanguage: lang,
          }}
        />
      )}
      <Navigation />

      <div className="max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-[#2C1F10] mb-8 transition-colors group text-sm"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {ui.back}
        </button>

        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {notFound && !loading && (
          <div className="text-center py-24">
            <p className="text-gray-400 text-lg">{ui.notFound}</p>
          </div>
        )}

        {page && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
              {page.updated_at && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-8">
                  <Clock className="w-3.5 h-3.5" />
                  {ui.updated} {formatDate(page.updated_at)}
                </div>
              )}
              <div
                className="prose prose-gray prose-headings:font-bold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
              />
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default StaticPage;
