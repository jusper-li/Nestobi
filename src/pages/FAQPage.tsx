import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Search, HelpCircle, Hotel, ShoppingBag,
  Bot, Users, Phone, CreditCard, MessageCircle, ArrowRight
} from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { supabase } from '../lib/supabase';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  '訂房服務': Hotel,
  '旅遊購物': ShoppingBag,
  'AI 功能': Bot,
  '會員服務': Users,
  '聯絡與支援': Phone,
  '付款與安全': CreditCard,
};

const CATEGORY_COLORS: Record<string, string> = {
  '訂房服務': 'bg-[#F0E4C8] text-[#2C1F10]',
  '旅遊購物': 'bg-teal-50 text-teal-700',
  'AI 功能': 'bg-emerald-50 text-emerald-700',
  '會員服務': 'bg-amber-50 text-amber-700',
  '聯絡與支援': 'bg-sky-50 text-sky-700',
  '付款與安全': 'bg-orange-50 text-orange-700',
};

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

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

  const categories = useMemo(() => {
    const cats = Array.from(new Set(faqs.map(f => f.category)));
    return cats;
  }, [faqs]);

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

  const faqJsonLd = useMemo(() => {
    if (faqs.length === 0) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    };
  }, [faqs]);

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="常見問題"
        description="Nestobi 旅遊平台常見問題與解答。訂房、購物、AI 功能、會員服務、付款安全等相關問題一次解決。"
        keywords="常見問題, FAQ, 訂房問題, 旅遊購物, AI功能, 會員服務, Nestobi"
        pageType="faq"
        breadcrumbs={[{ name: '首頁', url: '/' }, { name: '常見問題', url: '/faq' }]}
        jsonLd={faqJsonLd as Record<string, unknown>}
      />
      <Navigation />

      {/* Hero */}
      <section className="relative py-16 md:py-24 bg-gradient-to-b from-[#F0E4C8]/50 to-white overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#C09A6A]/5 rounded-full -translate-y-1/2 -translate-x-1/3" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[#C09A6A] mb-4">FAQ</span>
            <h1
              className="text-3xl md:text-5xl font-serif font-bold text-[#2C1F10] mb-5"
              style={{ letterSpacing: '-0.025em' }}
            >
              常見問題
            </h1>
            <div className="w-10 h-[2px] bg-[#C09A6A] mx-auto mb-6" />
            <p className="text-[#2C1F10]/60 text-base md:text-lg leading-relaxed mb-8">
              找不到答案？歡迎隨時透過 <Link to="/ai/chat" className="text-[#C09A6A] font-medium hover:underline">AI 客服</Link> 或 <Link to="/contact" className="text-[#C09A6A] font-medium hover:underline">聯絡表單</Link> 與我們聯繫。
            </p>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-lg mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜尋問題..."
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/30 focus:border-[#C09A6A] shadow-sm bg-white"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3">
        <div className="max-w-4xl mx-auto px-4 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCat('all')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition ${activeCat === 'all' ? 'bg-[#2C1F10] text-white border-[#2C1F10]' : 'bg-white border-gray-200 text-gray-600 hover:border-[#C09A6A]/40'}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            全部 ({faqs.length})
          </button>
          {categories.map(cat => {
            const Icon = CATEGORY_ICONS[cat] || HelpCircle;
            const count = faqs.filter(f => f.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition ${activeCat === cat ? 'bg-[#2C1F10] text-white border-[#2C1F10]' : 'bg-white border-gray-200 text-gray-600 hover:border-[#C09A6A]/40'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#C09A6A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">沒有找到符合的問題</p>
              {search && (
                <button onClick={() => setSearch('')} className="mt-3 text-sm text-[#C09A6A] font-medium hover:underline">
                  清除搜尋
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(grouped).map(([category, items]) => {
                const Icon = CATEGORY_ICONS[category] || HelpCircle;
                const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-600';
                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <h2 className="text-lg font-bold text-[#2C1F10]">{category}</h2>
                      <span className="text-xs text-gray-400">{items.length} 個問題</span>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
                      {items.map(faq => (
                        <div key={faq.id}>
                          <button
                            onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                            className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-gray-50/60 transition-colors gap-4"
                          >
                            <span className="font-medium text-[#2C1F10] text-sm leading-relaxed pr-2">
                              {search ? highlightText(faq.question, search) : faq.question}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-[#C09A6A] flex-shrink-0 transition-transform duration-300 ${openId === faq.id ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <AnimatePresence initial={false}>
                            {openId === faq.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">
                                  {search ? highlightText(faq.answer, search) : faq.answer}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#F5F5F3]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <MessageCircle className="w-10 h-10 text-[#C09A6A] mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-bold text-[#2C1F10] mb-3">還有其他問題嗎？</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              我們的 AI 客服全天候為您服務，也可以透過聯絡表單或客服電話與我們聯繫。
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/ai/chat"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#C09A6A] text-white text-sm font-semibold rounded-xl hover:bg-[#8B6840] transition shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />AI 客服
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-[#2C1F10] text-sm font-semibold rounded-xl border border-gray-200 hover:border-[#C09A6A]/40 transition"
              >
                聯絡表單
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200/60 text-inherit rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}
