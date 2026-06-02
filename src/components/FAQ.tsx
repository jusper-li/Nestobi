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
      question: pick('這個平台怎麼用？', 'How does this platform work?', 'このプラットフォームはどう使いますか？', '이 플랫폼은 어떻게 사용하나요?'),
      answer: pick(
        '先選住宿、商品或文章，再使用 AI 工具協助篩選與整理，最後完成預訂、購物或瀏覽。',
        'Choose stays, products, or articles first. Then use the AI tools to help refine results and complete booking or checkout.',
        'まず宿泊・商品・記事を選び、AIツールで絞り込みや整理を行ってから、予約・購入・閲覧を進めます。',
        '먼저 숙소, 상품 또는 글을 선택한 뒤 AI 도구로 결과를 정리하고 예약, 구매, 탐색을 진행합니다.',
      ),
    },
    {
      question: pick('會自動翻譯嗎？', 'Will content translate automatically?', '自動で翻訳されますか？', '자동 번역되나요?'),
      answer: pick(
        '會。系統會依語系讀取翻譯內容，若尚未有快取，會先顯示原文並在背景補齊。',
        'Yes. The system reads translated content by language. If cache is not ready, it shows the source text first and fills the rest in the background.',
        'はい。言語ごとに翻訳済みコンテンツを読み込み、キャッシュが未準備なら原文を先に表示してバックグラウンドで補完します。',
        '네. 언어별 번역된 콘텐츠를 읽어오며 캐시가 준비되지 않으면 원문을 먼저 표시하고 백그라운드에서 채웁니다.',
      ),
    },
    {
      question: pick('我可以在同一帳號內使用訂房與購物嗎？', 'Can I use booking and shopping with the same account?', '同じアカウントで宿泊予約と買い物を利用できますか？', '같은 계정으로 숙박 예약과 쇼핑을 함께 사용할 수 있나요?'),
      answer: pick(
        '可以。你的訂房、購物、點數與個人偏好都會綁在同一帳號。',
        'Yes. Your bookings, orders, points, and profile preferences are all tied to one account.',
        'はい。予約、購入、ポイント、プロフィール設定はすべて同じアカウントに紐づきます。',
        '네. 예약, 주문, 포인트, 프로필 설정이 모두 하나의 계정에 연결됩니다.',
      ),
    },
    {
      question: pick('AI 客服可以幫我什麼？', 'What can AI support help with?', 'AIサポートは何を手伝えますか？', 'AI 지원은 무엇을 도와주나요?'),
      answer: pick(
        '可以協助訂房流程、商品查詢、會員功能說明與常見問題整理。',
        'It can help with bookings, product questions, member features, and common FAQs.',
        '宿泊予約、商品検索、会員機能の案内、よくある質問の整理をサポートします。',
        '숙박 예약, 상품 문의, 회원 기능 안내, 자주 묻는 질문 정리를 도와줍니다.',
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
          <h2 className="mb-4 font-serif text-4xl text-charcoal lg:text-5xl">
            {pick('常見問題', 'FAQ', 'よくある質問', '자주 묻는 질문')}
          </h2>
          <p className="text-lg text-charcoal/70">
            {pick('快速查看訂房、購物、AI 工具與會員功能的常見解答。', 'Quick answers for booking, shopping, AI tools, and member services.', '予約・ショッピング・AI機能・会員サービスの質問をすぐ確認できます。', '예약, 쇼핑, AI 기능, 회원 서비스 관련 답변을 빠르게 확인하세요.')}
          </p>
        </div>

        <div className="space-y-0">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-charcoal/10 last:border-b-0">
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
