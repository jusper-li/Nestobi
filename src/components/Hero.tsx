import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

export default function Hero() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const text = {
    title1: isEn ? 'Travel, Coffee,' : '旅行、咖啡、選物',
    title2: isEn ? 'Curated in One Place' : '一次整理到位',
    subtitle: isEn
      ? 'From stays and coffee picks to AI planning, Nestobi helps you organize every journey with less effort.'
      : '從精選住宿、咖啡選物到 AI 行程規劃，Nestobi 幫你把每次出發整理得更輕鬆。',
    cta: isEn ? 'Start Exploring' : '開始探索',
    aria: isEn ? 'Scroll to explore' : '向下捲動探索',
  };

  const scrollToExplore = () => {
    const element = document.getElementById('explore');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
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
