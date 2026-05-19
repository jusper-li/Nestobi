import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: '什麼是分權持有？',
      answer:
        '分權持有允許多人共享高價值資產的所有權。每位業主購買代表物業一定百分比的股份，獲得使用物業和受益於其增值的權利。這種模式使奢華房地產變得觸手可及，同時提供專業管理和無憂持有。',
    },
    {
      question: '排程如何運作？',
      answer:
        '業主可以透過我們直觀的線上平台預訂住宿。排程基於公平分配系統，考慮股份持有百分比和預訂歷史。旺季在所有業主之間公平分配，確保每個人都能在理想時段使用物業。',
    },
    {
      question: '股份價格包含哪些費用？',
      answer:
        '您的股份價格包括物業管理、定期維護、保險、公用事業、房產稅以及我們的禮賓服務。沒有隱藏費用或意外開支。我們處理所有營運方面的事務，讓您只需享受您的物業。',
    },
    {
      question: '我可以出售我的股份嗎？',
      answer:
        '是的，股份可以轉讓。我們提供二級市場，業主可以在此列出待售股份。Kessaku 擁有優先購買權，以維持我們業主社群的品質。轉讓流程由我們的法律團隊簡化處理所有文件。',
    },
    {
      question: '物業如何被選中？',
      answer:
        '我們的收購團隊根據建築意義、地點吸引力、投資潛力和狀況評估物業。我們與知名建築師和歷史學家合作，識別具有獨特性格的物業。每個物業在加入我們的投資組合之前都經過嚴格的盡職調查。',
    },
    {
      question: '如果物業需要大修怎麼辦？',
      answer:
        '所有物業都維持資本改善的儲備金。重大維修由我們的物業團隊管理，費用由集體儲備金覆蓋。業主會被告知任何重大工程，但營運負擔和協調完全由 Kessaku 承擔。',
    },
    {
      question: '這是一個好的投資嗎？',
      answer:
        '雖然我們無法保證回報，但我們的物業是根據其獨特的建築價值和優越地點而被選中的，具有隨時間增值的潛力。從歷史上看，位於理想地點且維護良好的獨特物業表現出強勁的增值。然而，分權持有應首先被視為生活方式投資。',
    },
    {
      question: 'Kessaku 與分時度假有何不同？',
      answer:
        '與分時度假不同，您擁有物業的實際股權，有增值的潛力。您可以出售股份、傳給繼承人或用作抵押品。我們的物業是精心策劃的建築瑰寶，而非通用度假單位。您可以訪問我們投資組合中的多個物業，而不僅僅是一個地點。',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 px-6 lg:px-12 bg-cream">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-serif text-charcoal mb-4">
            常見問題
          </h2>
          <p className="text-lg text-charcoal/70">
            關於分權持有您需要知道的一切
          </p>
        </div>

        <div className="space-y-0">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-b border-charcoal/10 last:border-b-0"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full py-6 flex items-center justify-between text-left hover:bg-white/50 transition-colors px-4 rounded-sm"
              >
                <span className="text-lg font-medium text-charcoal pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`text-[#2C1F10] flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  size={24}
                />
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
                    <div className="px-4 pb-6 text-charcoal/70 leading-relaxed">
                      {faq.answer}
                    </div>
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
