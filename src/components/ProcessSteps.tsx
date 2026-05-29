import { Globe, Key, Search, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

export default function ProcessSteps() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const steps = [
    {
      icon: Search,
      title: pick('告訴我們你的需求', 'Tell Us Your Plan', '希望を入力', '원하는 조건 입력'),
      description: pick(
        '輸入目的地、日期、預算與旅遊偏好，系統會先整理合適選項。',
        'Input destination, dates, budget, and travel style. We gather suitable options first.',
        '目的地・日程・予算・好みを入力すると、最適な候補を整理します。',
        '목적지, 일정, 예산, 취향을 입력하면 적합한 후보를 먼저 정리합니다.'
      ),
    },
    {
      icon: Sparkles,
      title: pick('AI 精準篩選', 'AI Refines Options', 'AIで最適化', 'AI 맞춤 추천'),
      description: pick(
        'AI 會比對房型、價格區間與商品標籤，給你更乾淨的推薦。',
        'AI compares room types, price ranges, and product tags for cleaner recommendations.',
        'AIが客室タイプ・価格帯・商品タグを比較し、より最適な提案を行います。',
        'AI가 객실 유형, 가격대, 상품 태그를 비교해 더 정교하게 추천합니다.'
      ),
    },
    {
      icon: Key,
      title: pick('完成訂房與結帳', 'Book and Checkout', '予約と購入を完了', '예약 및 결제 완료'),
      description: pick(
        '在同一流程中完成訂房與購物，狀態與訂單紀錄清楚可追蹤。',
        'Complete booking and shopping in one flow with clear status and records.',
        '予約と購入を1つの流れで完了でき、状態と履歴を明確に確認できます。',
        '하나의 흐름에서 예약과 쇼핑을 마치고 상태 및 기록을 명확히 확인할 수 있습니다.'
      ),
    },
    {
      icon: Globe,
      title: pick('旅途中持續支援', 'Travel with Support', '旅の途中もサポート', '여행 중에도 지원'),
      description: pick(
        '旅途中可隨時使用 AI 行程與客服工具，讓決策更即時。',
        'Use AI itinerary and support tools anytime during your trip.',
        '旅行中もAI旅程・サポート機能をいつでも利用できます。',
        '여행 중에도 AI 일정과 고객지원을 언제든 사용할 수 있습니다.'
      ),
    },
  ];

  return (
    <section className="bg-white px-6 py-24 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-serif text-4xl text-charcoal lg:text-5xl">{pick('使用流程', 'How It Works', 'ご利用の流れ', '이용 방법')}</h2>
          <p className="mx-auto max-w-2xl text-lg text-charcoal/70">
            {pick('從規劃到下單，四個步驟完成你的旅行安排。', 'From planning to booking, complete your trip in four clear steps.', '計画から予約まで、4つのステップで完了します。', '계획부터 예약까지 4단계로 빠르게 완료하세요.')}
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

