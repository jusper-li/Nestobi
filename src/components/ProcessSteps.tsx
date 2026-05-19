import { Search, Sparkles, Key, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '../lib/animations';

export default function ProcessSteps() {
  const steps = [
    {
      icon: Search,
      title: '精選物業',
      description:
        '我們的專家團隊環遊世界，發掘具有卓越建築價值、歷史意義和投資潛力的物業。',
    },
    {
      icon: Sparkles,
      title: '修復與重塑',
      description:
        '每個物業都經過知名建築師和設計師的精心修復，在保留遺產的同時增添現代奢華設施。',
    },
    {
      icon: Key,
      title: '輕鬆持有',
      description:
        '我們處理從物業管理到維護、保險和公用事業的一切事務。只需享受您的投資，無需任何營運負擔。',
    },
    {
      icon: Globe,
      title: '全球通行',
      description:
        '透過直觀的平台預訂我們整個投資組合中的住宿。在體驗多個目的地的同時建立多元化的房地產投資組合。',
    },
  ];

  return (
    <section className="py-24 px-6 lg:px-12 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-serif text-charcoal mb-4">
            我們的流程
          </h2>
          <p className="text-lg text-charcoal/70 max-w-2xl mx-auto">
            從發現到持有，我們確保每一步都卓越出眾
          </p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="relative group"
              >
                <div className="text-center">
                  <div className="mb-6 relative">
                    <div className="w-20 h-20 bg-[#C09A6A]/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-[#C09A6A]/20 transition-all duration-300">
                      <Icon className="text-[#2C1F10]" size={32} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#C09A6A] rounded-full flex items-center justify-center mx-auto">
                      <span className="text-cream text-sm font-medium">{index + 1}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-serif text-charcoal mb-4">
                    {step.title}
                  </h3>
                  <p className="text-charcoal/70 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 -right-4 w-8 h-0.5 bg-[#C09A6A]/30" />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
