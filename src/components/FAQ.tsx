import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: pick('這個平台怎麼使用？', 'How does this platform work?', 'このプラットフォームの使い方は？', '이 플랫폼은 어떻게 사용하나요?'),
      answer: pick(
        '先選住宿、商品或文章，再用 AI 工具協助整理選項，最後完成訂房或結帳。',
        'Choose stays, products, or articles first. Then use AI tools to refine options and complete booking or checkout.',
        'まず宿泊・商品・記事を選び、AIツールで絞り込み、最後に予約または購入します。',
        '숙소/상품/콘텐츠를 먼저 고르고 AI 도구로 정리한 뒤 예약 또는 결제를 완료합니다.'
      ),
    },
    {
      question: pick('可以同時訂房與購物嗎？', 'Can I book and shop in one account?', '1つのアカウントで予約と購入はできますか？', '한 계정으로 예약과 쇼핑을 함께 할 수 있나요?'),
      answer: pick(
        '可以，同一帳號可整合訂房、訂單、點數與個人偏好。',
        'Yes. One account links your bookings, orders, points, and profile preferences.',
        'はい。1つのアカウントで予約・注文・ポイント・設定をまとめて管理できます。',
        '네. 하나의 계정으로 예약, 주문, 포인트, 설정을 통합 관리할 수 있습니다.'
      ),
    },
    {
      question: pick('AI 翻譯每次都會重跑嗎？', 'Will AI translation run every time?', 'AI翻訳は毎回実行されますか？', 'AI 번역은 매번 다시 실행되나요?'),
      answer: pick(
        '不會，翻譯結果會寫入快取/資料庫，下次直接讀取，避免重複耗費。',
        'No. Translated content is cached/saved and reused next time.',
        'いいえ。翻訳結果はキャッシュ/DBに保存され、次回は再利用されます。',
        '아니요. 번역 결과는 캐시/DB에 저장되어 다음부터 재사용됩니다.'
      ),
    },
    {
      question: pick('如果資料載入較慢怎麼辦？', 'What if data loading is slow?', '読み込みが遅い場合は？', '데이터 로딩이 느리면 어떻게 되나요?'),
      answer: pick(
        '介面會優先顯示快取或快照內容，並在背景持續同步最新資料。',
        'The UI shows cached/snapshot content first and continues syncing in the background.',
        'まずキャッシュ/スナップショットを表示し、バックグラウンドで最新データを同期します。',
        '먼저 캐시/스냅샷을 표시하고 백그라운드에서 최신 데이터를 동기화합니다.'
      ),
    },
    {
      question: pick('翻譯內容可以後續修正嗎？', 'Can I edit translated content later?', '翻訳内容は後で修正できますか？', '번역 내용을 나중에 수정할 수 있나요?'),
      answer: pick(
        '可以，後台可調整翻譯文字，之後前台會讀取你修正後的版本。',
        'Yes. Admin pages can adjust translated text, and future reads use the edited version.',
        'はい。管理画面で翻訳文を修正でき、以後は修正版が表示されます。',
        '네. 관리자에서 번역 문구를 수정하면 이후 수정본이 표시됩니다.'
      ),
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-cream px-6 py-24 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-serif text-4xl text-charcoal lg:text-5xl">{pick('常見問題', 'FAQ', 'よくある質問', '자주 묻는 질문')}</h2>
          <p className="text-lg text-charcoal/70">{pick('快速了解平台常見使用問題。', 'Quick answers for common questions.', 'よくある質問にすぐ答えます。', '자주 묻는 질문에 빠르게 답변합니다.')}</p>
        </div>

        <div className="space-y-0">
          {faqs.map((faq, index) => (
            <div key={index} className="last:border-b-0 border-b border-charcoal/10">
              <button onClick={() => toggleFAQ(index)} className="w-full rounded-sm px-4 py-6 text-left transition-colors hover:bg-white/50">
                <span className="flex items-center justify-between">
                  <span className="pr-8 text-lg font-medium text-charcoal">{faq.question}</span>
                  <ChevronDown className={`flex-shrink-0 text-[#2C1F10] transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} size={24} />
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

