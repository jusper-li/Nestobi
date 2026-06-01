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
import { callAI } from '../lib/openai';
import { localeByLang, normalizeLang, pickByLang } from '../lib/i18n';

interface PageData {
  title: string;
  content: string;
  meta_description: string;
  updated_at: string;
}

const VALID_SLUGS = ['about', 'privacy', 'terms', 'cookies', 'anti-fraud'];
const STATIC_I18N_CACHE_KEY = 'nestobi-static-page-i18n-v1';

const hashText = (txt: string) => {
  let h = 0;
  for (let i = 0; i < txt.length; i += 1) {
    h = (h << 5) - h + txt.charCodeAt(i);
    h |= 0;
  }
  return String(h >>> 0);
};

const readStaticI18nCache = (): Record<string, PageData> => {
  try {
    const raw = localStorage.getItem(STATIC_I18N_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PageData>) : {};
  } catch {
    return {};
  }
};

const writeStaticI18nCache = (value: Record<string, PageData>) => {
  try {
    localStorage.setItem(STATIC_I18N_CACHE_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const StaticPage: React.FC = () => {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const shouldTranslate = pickByLang(normalizedLang, '0', '1', '1', '1') === '1';
  const targetLocale = localeByLang(normalizedLang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const location = useLocation();
  const navigate = useNavigate();
  const slug = location.pathname.replace('/', '');
  const [page, setPage] = useState<PageData | null>(null);
  const [sourcePage, setSourcePage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const ui = useMemo(
    () => ({
      back: pick('返回', 'Back', '戻る', '뒤로'),
      updated: pick('最後更新：', 'Updated:', '最終更新：', '최종 업데이트:'),
      notFound: pick('找不到此頁面', 'Page not found', 'ページが見つかりません', '페이지를 찾을 수 없습니다'),
      translating: pick('頁面翻譯中...', 'Translating page...', 'ページ翻訳中...', '페이지 번역 중...'),
    }),
    [normalizedLang]
  );

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

      const fallback = STATIC_PAGE_FALLBACKS[slug];
      const finalPage = (!error && data) || fallback || null;
      if (!finalPage) {
        setNotFound(true);
      } else {
        const casted = finalPage as PageData;
        setSourcePage(casted);
        setPage(casted);
      }
      setLoading(false);
    };

    void fetchPage();
  }, [slug, location.pathname]);

  useEffect(() => {
    const run = async () => {
      if (!sourcePage) return;
      if (!VALID_SLUGS.includes(slug)) return;
      if (!shouldTranslate) {
        setPage(sourcePage);
        return;
      }

      const sourceHash = hashText(`${sourcePage.title}|${sourcePage.meta_description}|${sourcePage.content}`);
      const cacheKey = `${slug}:${normalizedLang}:${sourceHash}`;
      const localCache = readStaticI18nCache();
      const cached = localCache[cacheKey];
      if (cached) {
        setPage(cached);
        return;
      }

      setTranslating(true);
      try {
        const [title, description, content] = await Promise.all([
          callAI<string>('translate', { text: sourcePage.title, sourceLang: 'zh-TW', targetLang: normalizedLang, language: normalizedLang }),
          callAI<string>('translate', { text: sourcePage.meta_description || sourcePage.title, sourceLang: 'zh-TW', targetLang: normalizedLang, language: normalizedLang }),
          callAI<string>('translate', {
            text: `Translate the following HTML into ${normalizedLang}. Keep all HTML tags/attributes unchanged and only translate visible text content:\n\n${sourcePage.content}`,
            sourceLang: 'zh-TW',
            targetLang: normalizedLang,
            language: normalizedLang,
          }),
        ]);

        const translated: PageData = {
          title: (title || sourcePage.title).trim(),
          meta_description: (description || sourcePage.meta_description || sourcePage.title).trim(),
          content: (content || sourcePage.content).trim(),
          updated_at: sourcePage.updated_at,
        };

        writeStaticI18nCache({ ...localCache, [cacheKey]: translated });
        setPage(translated);
      } catch {
        setPage(sourcePage);
      } finally {
        setTranslating(false);
      }
    };

    void run();
  }, [sourcePage, slug, normalizedLang, shouldTranslate]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(targetLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

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
            inLanguage: normalizedLang,
          }}
        />
      )}

      <Navigation />

      <div className="mx-auto max-w-3xl px-4 py-12">
        <button onClick={() => navigate(-1)} className="group mb-8 flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-[#2C1F10]">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          {ui.back}
        </button>

        {loading && (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
          </div>
        )}

        {notFound && !loading && (
          <div className="py-24 text-center">
            <p className="text-lg text-gray-400">{ui.notFound}</p>
          </div>
        )}

        {page && !loading && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm md:p-12">
              {translating && <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">{ui.translating}</div>}
              {page.updated_at && (
                <div className="mb-8 flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
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
