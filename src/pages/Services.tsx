import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hotel, ShoppingBag, Map, Languages, MessageCircle, BookMarked, ArrowRight } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

export default function Services() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const content = {
    eyebrow: pick('服務項目', 'Our Services', 'サービス', '서비스'),
    title: pick('用 Nestobi 讓旅程更輕鬆', 'Travel Better With Nestobi', 'Nestobiで旅をもっと快適に', 'Nestobi와 더 편한 여행'),
    subtitle: pick('住宿、選物、AI 行程規劃、翻譯與客服，一站完成。', 'Stays, shopping, AI itinerary planning, translation, and support in one place.', '宿泊・ショッピング・AI行程作成・翻訳・サポートを一か所で。', '숙박, 쇼핑, AI 일정 계획, 번역, 고객지원을 한 곳에서.'),
    services: [
      { icon: Hotel, name: pick('精選住宿', 'Curated Stays', '厳選宿泊', '큐레이션 숙소'), desc: pick('用實用篩選快速找到適合的房型。', 'Find the right room fast with practical filters.', '実用的な絞り込みで最適な客室をすぐに見つけます。', '실용적인 필터로 맞는 객실을 빠르게 찾습니다.'), link: '/rooms' },
      { icon: ShoppingBag, name: pick('旅行選物', 'Travel Shop', 'トラベルショップ', '트래블 샵'), desc: pick('嚴選咖啡、器具與旅行好物。', 'Coffee, tools, and travel picks from trusted brands.', '信頼できるブランドのコーヒーと旅のアイテムを厳選。', '신뢰할 수 있는 브랜드의 커피와 여행 아이템을 엄선.'), link: '/shop' },
      { icon: Map, name: pick('AI 行程規劃', 'AI Planner', 'AI行程プランナー', 'AI 일정 플래너'), desc: pick('依天數、預算與偏好產生客製行程。', 'Build custom routes by days, style, and budget.', '日数・予算・好みに合わせて行程を自動作成。', '일수, 예산, 취향에 맞춘 일정을 자동 생성합니다.'), link: '/ai/itinerary' },
      { icon: Languages, name: pick('AI 即時翻譯', 'AI Translate', 'AI翻訳', 'AI 번역'), desc: pick('旅行常用語即時翻譯。', 'Translate common travel messages instantly.', '旅行で使う表現をすぐに翻訳。', '여행에서 자주 쓰는 문장을 즉시 번역합니다.'), link: '/ai/translator' },
      { icon: MessageCircle, name: pick('AI 客服中心', 'AI Support', 'AIサポート', 'AI 고객센터'), desc: pick('24 小時協助訂房與平台使用。', 'Get booking and usage help around the clock.', '24時間、予約と使い方をサポート。', '24시간 예약 및 서비스 이용을 도와드립니다.'), link: '/ai/chat' },
      { icon: BookMarked, name: pick('旅人護照', 'Travel Passport', 'トラベルパスポート', '여행 패스포트'), desc: pick('保存旅遊足跡與偏好，加速下次規劃。', 'Save your trips and preferences for faster planning.', '旅の記録と好みを保存し、次回計画を素早く。', '여행 기록과 취향을 저장해 다음 계획을 더 빠르게.'), link: '/ai/passport' },
    ],
    cta: pick('前往服務', 'Explore Service', 'サービスを見る', '서비스 보기'),
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title={content.eyebrow}
        description={pick('探索 Nestobi 的住宿、選物、AI 規劃、翻譯與客服服務。', 'Explore Nestobi services including stays, travel shop, AI planner, translator and support.', 'Nestobiの宿泊・ショッピング・AI計画・翻訳・サポートを確認できます。', 'Nestobi의 숙박, 쇼핑, AI 계획, 번역, 고객지원을 확인하세요.')}
        keywords={pick('Nestobi, 服務, AI 行程規劃', 'Nestobi services, stays, AI planner', 'Nestobi, サービス, AI行程', 'Nestobi, 서비스, AI 일정')}
        pageType="list"
      />
      <Navigation />
      <section className="bg-gradient-to-b from-[#F0E4C8]/60 to-white py-20">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.p variants={fadeUp} className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#C09A6A]">{content.eyebrow}</motion.p>
            <motion.h1 variants={fadeUp} className="mb-4 font-serif text-4xl font-bold text-[#2C1F10] md:text-5xl">{content.title}</motion.h1>
            <motion.p variants={fadeUp} className="mx-auto max-w-2xl text-[#2C1F10]/70">{content.subtitle}</motion.p>
          </motion.div>
        </div>
      </section>
      <section className="py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.services.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.article key={item.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.4, delay: idx * 0.04 }} className="rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0E4C8] text-[#8B6840]"><Icon className="h-5 w-5" /></div>
                <h2 className="mb-2 text-xl font-semibold text-[#2C1F10]">{item.name}</h2>
                <p className="mb-5 text-sm leading-relaxed text-[#2C1F10]/70">{item.desc}</p>
                <Link to={item.link} className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B6840] hover:text-[#6f5333]">{content.cta}<ArrowRight className="h-4 w-4" /></Link>
              </motion.article>
            );
          })}
        </div>
      </section>
      <Footer />
    </div>
  );
}
