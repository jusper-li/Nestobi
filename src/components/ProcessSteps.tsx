import { Globe, Key, Search, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useLanguage } from '../contexts/LanguageContext';

export default function ProcessSteps() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const steps = [
    {
      icon: Search,
      title: isEn ? 'Tell Us Your Plan' : '告訴我們你的需求',
      description: isEn
        ? 'Input destination, dates, budget, and travel style. We gather the right stays and picks for you.'
        : '輸入目的地、日期、預算與旅行風格，系統會快速整理適合你的住宿與選物。',
    },
    {
      icon: Sparkles,
      title: isEn ? 'AI Refines Options' : 'AI 智慧整理',
      description: isEn
        ? 'AI compares room types, price ranges, and product tags to produce cleaner recommendations.'
        : 'AI 會比對房型、價位與商品標籤，讓推薦結果更精準、可直接行動。',
    },
    {
      icon: Key,
      title: isEn ? 'Book and Checkout' : '快速訂房與下單',
      description: isEn
        ? 'Complete booking and shopping in one flow, with clear status and order records.'
        : '在同一流程完成訂房與購物，訂單狀態與紀錄一目了然。',
    },
    {
      icon: Globe,
      title: isEn ? 'Travel with Support' : '旅途中持續支援',
      description: isEn
        ? 'Use AI itinerary and support tools anytime during your trip for smoother decisions.'
        : '旅程中隨時可用 AI 行程與客服工具，臨時調整也能快速完成。',
    },
  ];

  return (
    <section className="bg-white px-6 py-24 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-serif text-4xl text-charcoal lg:text-5xl">
            {isEn ? 'How It Works' : '平台運作方式'}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-charcoal/70">
            {isEn ? 'From planning to booking, complete your trip in a clear 4-step flow.' : '從靈感到下單，四個步驟完成你的旅行安排。'}
          </p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div key={index} variants={fadeInUp} className="group relative">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#C09A6A]/10 transition-all duration-300 group-hover:bg-[#C09A6A]/20">
                      <Icon className="text-[#2C1F10]" size={32} />
                    </div>
                    <div className="absolute -right-2 -top-2 mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#C09A6A]">
                      <span className="text-sm font-medium text-cream">{index + 1}</span>
                    </div>
                  </div>

                  <h3 className="mb-4 font-serif text-xl text-charcoal">{step.title}</h3>
                  <p className="leading-relaxed text-charcoal/70">{step.description}</p>
                </div>

                {index < steps.length - 1 && <div className="absolute -right-4 top-10 hidden h-0.5 w-8 bg-[#C09A6A]/30 lg:block" />}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
