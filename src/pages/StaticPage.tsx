import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { STATIC_PAGE_FALLBACKS } from '../lib/staticPageFallbacks';
import { sanitizeHtml } from '../lib/security';

interface PageData {
  title: string;
  content: string;
  meta_description: string;
  updated_at: string;
}

const VALID_SLUGS = ['about', 'privacy', 'terms', 'cookies', 'anti-fraud'];

const StaticPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace('/', '');
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setNotFound(false);
      if (!VALID_SLUGS.includes(slug)) { setNotFound(true); setLoading(false); return; }

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
    new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      {page && (
        <SEOHead
          title={page.title}
          description={page.meta_description || page.title}
          keywords={`${page.title}, Nestobi 旅遊平台`}
          ogType="article"
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: page.title,
            description: page.meta_description || page.title,
            publisher: { '@type': 'Organization', name: 'Nestobi 旅遊平台' },
            dateModified: page.updated_at,
            inLanguage: 'zh-TW',
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
          返回
        </button>

        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {notFound && !loading && (
          <div className="text-center py-24">
            <p className="text-gray-400 text-lg">找不到此頁面</p>
          </div>
        )}

        {page && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
              {page.updated_at && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-8">
                  <Clock className="w-3.5 h-3.5" />
                  最後更新：{formatDate(page.updated_at)}
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
