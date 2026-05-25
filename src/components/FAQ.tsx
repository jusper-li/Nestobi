import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: isEn ? 'How does this platform work?' : '這個平台怎麼使用？',
      answer: isEn
        ? 'Choose stays, products, or articles first. Then use AI tools to refine options and complete booking or checkout.'
        : '你可以先瀏覽住宿、商品或旅誌，再用 AI 工具做篩選與整理，最後完成訂房或下單。',
    },
    {
      question: isEn ? 'Can I book and shop in one account?' : '可以用同一帳號完成訂房與購物嗎？',
      answer: isEn
        ? 'Yes. One account links your bookings, orders, points, and profile preferences.'
        : '可以。單一帳號可同步管理訂房、訂單、點數與個人偏好。',
    },
    {
      question: isEn ? 'Will AI translation run every time?' : 'AI 翻譯每次都會重新執行嗎？',
      answer: isEn
        ? 'No. The system writes translated content into cache/database and reuses it next time.'
        : '不會。翻譯結果會寫入快取/資料庫，下次直接調用，避免重複消耗。',
    },
    {
      question: isEn ? 'What if data loading is slow?' : '如果資料載入變慢怎麼辦？',
      answer: isEn
        ? 'The UI can show snapshot/cached content first and continue syncing in the background.'
        : '前台會先顯示快照或快取資料，並在背景同步最新內容。',
    },
    {
      question: isEn ? 'Can I edit translated content later?' : '翻譯內容可以後續修正嗎？',
      answer: isEn
        ? 'Yes. Admin pages can adjust translated text so future reads use your edited version.'
        : '可以。後台可直接調整翻譯內容，後續會優先使用修正版。',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-cream px-6 py-24 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-serif text-4xl text-charcoal lg:text-5xl">
            {isEn ? 'FAQ' : '常見問題'}
          </h2>
          <p className="text-lg text-charcoal/70">
            {isEn ? 'Quick answers for the most common questions.' : '快速查看最常被問到的問題。'}
          </p>
        </div>

        <div className="space-y-0">
          {faqs.map((faq, index) => (
            <div key={index} className="last:border-b-0 border-b border-charcoal/10">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full rounded-sm px-4 py-6 text-left transition-colors hover:bg-white/50"
              >
                <span className="flex items-center justify-between">
                  <span className="pr-8 text-lg font-medium text-charcoal">{faq.question}</span>
                  <ChevronDown
                    className={`flex-shrink-0 text-[#2C1F10] transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
                    size={24}
                  />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-6 leading-relaxed text-charcoal/70">{faq.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
