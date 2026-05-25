import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, HelpCircle, MessageCircle, ArrowRight } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

export default function FAQPage() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const t = {
    title: isEn ? 'Frequently Asked Questions' : '常見問題',
    subtitle: isEn ? 'Find quick answers for booking, shopping, AI tools, and member services.' : '快速找到關於訂房、購物、AI 功能與會員服務的解答。',
    search: isEn ? 'Search questions...' : '搜尋問題...',
    all: isEn ? 'All' : '全部',
    empty: isEn ? 'No matching FAQ found' : '找不到符合條件的問題',
    clear: isEn ? 'Clear search' : '清除搜尋',
    ctaTitle: isEn ? 'Need more help?' : '還有其他問題？',
    ctaDesc: isEn ? 'Use AI support or contact us directly.' : '可以直接使用 AI 客服，或透過聯絡表單與我們聯繫。',
    ctaAI: isEn ? 'AI Support' : 'AI 客服',
    ctaContact: isEn ? 'Contact Us' : '聯絡我們',
  };

  useEffect(() => {
    supabase
      .from('faqs')
      .select('id, question, answer, category, sort_order')
      .eq('is_published', true)
      .order('category')
      .order('sort_order')
      .then(({ data }) => {
        setFaqs((data || []) as FAQ[]);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => Array.from(new Set(faqs.map(f => f.category))), [faqs]);

  const filtered = useMemo(() => {
    let list = faqs;
    if (activeCat !== 'all') list = list.filter(f => f.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    }
    return list;
  }, [faqs, activeCat, search]);

  const grouped = useMemo(() => {
    const map: Record<string, FAQ[]> = {};
    for (const faq of filtered) {
      if (!map[faq.category]) map[faq.category] = [];
      map[faq.category].push(faq);
    }
    return map;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={t.title}
        description={t.subtitle}
        keywords={isEn ? 'FAQ, booking, shopping, AI support, Nestobi' : '常見問題, 訂房, 購物, AI客服, Nestobi'}
        pageType="faq"
      />
      <Navigation />

      <section className="bg-gradient-to-b from-[#F0E4C8]/50 to-white py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="mb-4 font-serif text-4xl font-bold text-[#2C1F10] md:text-5xl">{t.title}</h1>
          <p className="mx-auto mb-8 max-w-2xl text-[#2C1F10]/65">{t.subtitle}</p>
          <div className="relative mx-auto max-w-lg">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.search}
              className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm focus:border-[#C09A6A] focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/20"
            />
          </div>
        </div>
      </section>

      <section className="sticky top-16 z-30 border-b border-gray-100 bg-white/90 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4">
          <button
            onClick={() => setActiveCat('all')}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${activeCat === 'all' ? 'border-[#2C1F10] bg-[#2C1F10] text-white' : 'border-gray-200 bg-white text-gray-600'}`}
          >
            {t.all} ({faqs.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${activeCat === cat ? 'border-[#2C1F10] bg-[#2C1F10] text-white' : 'border-gray-200 bg-white text-gray-600'}`}
            >
              {cat} ({faqs.filter(f => f.category === cat).length})
            </button>
          ))}
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C09A6A] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <HelpCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">{t.empty}</p>
              {search && <button onClick={() => setSearch('')} className="mt-3 text-sm font-medium text-[#C09A6A] hover:underline">{t.clear}</button>}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([category, items]) => (
                <motion.div key={category} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <h2 className="mb-4 text-lg font-bold text-[#2C1F10]">{category}</h2>
                  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    {items.map(faq => (
                      <div key={faq.id} className="border-b border-gray-100 last:border-b-0">
                        <button
                          onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50"
                        >
                          <span className="text-sm font-medium text-[#2C1F10]">{faq.question}</span>
                          <ChevronDown className={`h-5 w-5 text-[#C09A6A] transition-transform ${openId === faq.id ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence initial={false}>
                          {openId === faq.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 text-sm leading-relaxed text-gray-600">{faq.answer}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#F5F5F3] py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <MessageCircle className="mx-auto mb-4 h-10 w-10 text-[#C09A6A]" />
          <h2 className="mb-3 text-2xl font-serif font-bold text-[#2C1F10]">{t.ctaTitle}</h2>
          <p className="mb-6 text-sm text-gray-500">{t.ctaDesc}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/ai/chat" className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#8B6840]">
              <MessageCircle className="h-4 w-4" />{t.ctaAI}
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-[#2C1F10] hover:border-[#C09A6A]/40">
              {t.ctaContact}<ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
