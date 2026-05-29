import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

export default function Hero() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const text = {
    title1: pick('旅行與咖啡', 'Travel and Coffee', '旅とコーヒー', '여행과 커피'),
    title2: pick('一次整合', 'Curated in One Place', 'ひとつに集約', '한곳에 큐레이션'),
    subtitle: pick(
      '從住宿、選物到 AI 規劃，Nestobi 幫你用更少心力完成每趟旅程。',
      'From stays and picks to AI planning, Nestobi helps you complete every journey with less effort.',
      '宿泊・セレクト・AI計画まで、Nestobiが旅をもっと簡単にします。',
      '숙소, 셀렉트 상품, AI 일정까지 Nestobi가 여행을 더 쉽게 만들어줍니다.'
    ),
    cta: pick('開始探索', 'Start Exploring', '探索を始める', '탐색 시작'),
    aria: pick('往下探索', 'Scroll to explore', '下へスクロール', '아래로 스크롤'),
  };

  const scrollToExplore = () => {
    const element = document.getElementById('explore');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative flex h-screen items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1920')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/50 to-charcoal/70" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-6 font-serif text-5xl leading-tight text-cream md:text-6xl lg:text-7xl"
        >
          {text.title1}
          <br />
          {text.title2}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-cream/90 md:text-xl"
        >
          {text.subtitle}
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-sm bg-[#2C1F10] px-10 py-4 font-medium text-cream shadow-lg transition-colors duration-300 hover:bg-cream hover:text-charcoal"
        >
          {text.cta}
        </motion.button>
      </div>

      <button
        onClick={scrollToExplore}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-cream/80 transition-colors hover:text-cream"
        aria-label={text.aria}
      >
        <ChevronDown size={32} />
      </button>
    </section>
  );
}

