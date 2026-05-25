import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hotel, ShoppingBag, Map, Languages, MessageCircle, BookMarked, ArrowRight } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { useLanguage } from '../contexts/LanguageContext';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function Services() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const content = {
    eyebrow: isEn ? 'Our Services' : '服務總覽',
    title: isEn ? 'Travel Better With Nestobi' : '讓每段旅程更輕鬆',
    subtitle: isEn
      ? 'Stays, shopping, AI itinerary planning, translation, and support in one place.'
      : '住宿、選物、AI 行程、即時翻譯與客服，一站整合。',
    services: [
      {
        icon: Hotel,
        name: isEn ? 'Curated Stays' : '精選住宿',
        desc: isEn ? 'Find the right room fast with practical filters.' : '用實用篩選快速找到合適房型。',
        link: '/rooms',
      },
      {
        icon: ShoppingBag,
        name: isEn ? 'Travel Shop' : '旅行選物',
        desc: isEn ? 'Coffee, tools, and travel picks from trusted brands.' : '集結咖啡、器具與旅途好物。',
        link: '/shop',
      },
      {
        icon: Map,
        name: isEn ? 'AI Planner' : 'AI 行程規劃',
        desc: isEn ? 'Build custom routes by days, style, and budget.' : '依天數、風格與預算快速生成路線。',
        link: '/ai/itinerary',
      },
      {
        icon: Languages,
        name: isEn ? 'AI Translate' : 'AI 即時翻譯',
        desc: isEn ? 'Translate common travel messages instantly.' : '即時翻譯旅途中常用語句。',
        link: '/ai/translator',
      },
      {
        icon: MessageCircle,
        name: isEn ? 'AI Support' : 'AI 客服',
        desc: isEn ? 'Get booking and usage help around the clock.' : '24 小時協助訂房與使用問題。',
        link: '/ai/chat',
      },
      {
        icon: BookMarked,
        name: isEn ? 'Travel Passport' : '旅人護照',
        desc: isEn ? 'Save your trips and preferences for faster planning.' : '記錄旅程與偏好，下次規劃更快。',
        link: '/ai/passport',
      },
    ],
    cta: isEn ? 'Explore Service' : '查看服務',
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={isEn ? 'Services' : '服務總覽'}
        description={
          isEn
            ? 'Explore Nestobi services including stays, travel shop, AI planner, translator and support.'
            : '探索 Nestobi 的住宿、選物、AI 行程、翻譯與客服服務。'
        }
        keywords={isEn ? 'Nestobi services, stays, AI planner' : 'Nestobi, 旅遊服務, AI 行程規劃'}
        pageType="list"
      />
      <Navigation />

      <section className="bg-gradient-to-b from-[#F0E4C8]/60 to-white py-20">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.p variants={fadeUp} className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#C09A6A]">
              {content.eyebrow}
            </motion.p>
            <motion.h1 variants={fadeUp} className="mb-4 font-serif text-4xl font-bold text-[#2C1F10] md:text-5xl">
              {content.title}
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto max-w-2xl text-[#2C1F10]/70">
              {content.subtitle}
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.services.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
                className="rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E4C8] text-[#8B6840]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-[#2C1F10]">{item.name}</h2>
                <p className="mb-5 text-sm leading-relaxed text-[#2C1F10]/70">{item.desc}</p>
                <Link to={item.link} className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B6840] hover:text-[#6f5333]">
                  {content.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.article>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
