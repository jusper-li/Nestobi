import { normalizeLang, pickByLang } from './i18n';

export type LocaleMap = {
  zh: string;
  en: string;
  ja: string;
  ko: string;
};

export type FaqTranslationEntry = {
  category: LocaleMap;
  question: LocaleMap;
  answer: LocaleMap;
};

type FaqSource = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

const FAQ_TRANSLATIONS: Record<string, FaqTranslationEntry> = {
  '494ac865-abcf-471c-94e9-5bf99a9ecdb1': {
    category: {
      zh: 'AI 功能',
      en: 'AI Features',
      ja: 'AI 機能',
      ko: 'AI 기능',
    },
    question: {
      zh: 'AI 行程規劃如何使用？',
      en: 'How do I use AI itinerary planning?',
      ja: 'AI旅程プランナーはどう使いますか？',
      ko: 'AI 일정 계획은 어떻게 사용하나요?',
    },
    answer: {
      zh: '前往「AI 行程規劃」頁面，輸入目的地、旅遊日期、人數及興趣偏好，AI 將自動產生每日行程建議，包含景點、餐廳及交通方式。您可儲存、編輯或分享行程。',
      en: 'Go to the AI Itinerary Planner page and enter your destination, travel dates, number of travelers, and interests. AI will automatically generate daily itinerary suggestions, including attractions, restaurants, and transportation. You can save, edit, or share the plan.',
      ja: '「AI旅程プランナー」ページで、目的地・旅行日程・人数・興味を入力すると、AIが観光スポット、レストラン、移動手段を含む日ごとの行程案を自動生成します。行程は保存、編集、共有できます。',
      ko: '「AI 일정 계획」 페이지에서 목적지, 여행 날짜, 인원수, 관심사를 입력하면 AI가 관광지, 식당, 이동 수단을 포함한 일별 일정 제안을 자동으로 생성합니다. 일정은 저장, 수정, 공유할 수 있습니다.',
    },
  },
  '2164d98e-40de-4085-9185-94b50bba7a24': {
    category: {
      zh: 'AI 功能',
      en: 'AI Features',
      ja: 'AI 機能',
      ko: 'AI 기능',
    },
    question: {
      zh: 'AI 翻譯支援哪些語言？',
      en: 'What languages does AI translation support?',
      ja: 'AI翻訳はどの言語に対応していますか？',
      ko: 'AI 번역은 어떤 언어를 지원하나요?',
    },
    answer: {
      zh: '目前支援中文、英文、日文、韓文等 30 種主要語言的即時互譯，涵蓋旅遊常用場景如問路、點餐、購物等。',
      en: 'We currently support real-time translation across 30 major languages, including Chinese, English, Japanese, and Korean, covering common travel scenarios such as asking for directions, ordering food, and shopping.',
      ja: '現在は中国語・英語・日本語・韓国語を含む30以上の主要言語のリアルタイム相互翻訳に対応しており、道案内、注文、買い物など旅行でよく使う場面をカバーしています。',
      ko: '현재 중국어, 영어, 일본어, 한국어를 포함한 30개 주요 언어의 실시간 상호 번역을 지원하며, 길 묻기, 주문, 쇼핑 등 여행에서 자주 쓰는 상황을 포함합니다.',
    },
  },
  '98d5c8f2-57e7-4bcf-b0ca-c576b3d2f99c': {
    category: {
      zh: 'AI 功能',
      en: 'AI Features',
      ja: 'AI 機能',
      ko: 'AI 기능',
    },
    question: {
      zh: 'AI 客服的服務時間？',
      en: 'What are the AI support hours?',
      ja: 'AIサポートの対応時間は？',
      ko: 'AI 고객지원 운영시간은 언제인가요?',
    },
    answer: {
      zh: 'AI 客服全年 24 小時不間斷提供服務，可即時回答訂房、購物、行程規劃等旅遊相關問題。若需人工客服，服務時間為週一至週五 09:00-18:00。',
      en: 'AI support is available 24/7 and can answer travel-related questions about bookings, shopping, and itinerary planning. If you need a human agent, support is available Monday to Friday from 09:00 to 18:00.',
      ja: 'AIサポートは年中無休・24時間対応で、宿泊予約、ショッピング、旅程計画などの旅行関連の質問に即時回答します。有人対応が必要な場合は、月〜金の09:00〜18:00にご利用いただけます。',
      ko: 'AI 고객지원은 연중무휴 24시간 운영되며, 예약, 쇼핑, 일정 계획 등 여행 관련 질문에 즉시 답변합니다. 사람이 응대하는 고객센터는 월요일부터 금요일 09:00-18:00에 운영됩니다.',
    },
  },
  'd0154728-21f0-4bc6-af76-f751161971b6': {
    category: {
      zh: 'AI 功能',
      en: 'AI Features',
      ja: 'AI 機能',
      ko: 'AI 기능',
    },
    question: {
      zh: '什麼是旅遊護照？',
      en: 'What is Travel Passport?',
      ja: 'トラベルパスポートとは何ですか？',
      ko: '트래블 패스포트란 무엇인가요?',
    },
    answer: {
      zh: '旅遊護照是專屬的旅行紀錄功能，可記錄您走過的每一個景點、美食、購物地點，像蓋印章一樣累積旅遊回憶。您可以從行程規劃中自動匯入，也可手動新增足跡。',
      en: 'Travel Passport is a dedicated travel log feature that records every destination, food stop, and shopping place you visit, helping you build memories like collecting stamps. You can import trips automatically from your itineraries or add footprints manually.',
      ja: 'トラベルパスポートは専用の旅行記録機能で、訪れた観光地、グルメ、ショッピングスポットをスタンプのように記録して旅の思い出を残せます。行程から自動取り込みも、手動追加もできます。',
      ko: '트래블 패스포트는 방문한 관광지, 맛집, 쇼핑 장소를 스탬프처럼 기록해 여행 추억을 쌓을 수 있는 전용 여행 기록 기능입니다. 일정에서 자동으로 가져오거나 직접 발자국을 추가할 수 있습니다.',
    },
  },
  'fafaa0bf-1f4e-4d91-b6ec-fda48dc2341b': {
    category: {
      zh: '付款與安全',
      en: 'Payment & Security',
      ja: '支払いと安全',
      ko: '결제 및 보안',
    },
    question: {
      zh: '付款方式有哪些？',
      en: 'What payment methods are available?',
      ja: '利用できる支払い方法は？',
      ko: '어떤 결제 수단을 이용할 수 있나요?',
    },
    answer: {
      zh: '目前支援信用卡（Visa、Mastercard、JCB）、銀行轉帳及旅遊點數折抵。部分商品支援貨到付款。',
      en: 'We currently support credit cards (Visa, Mastercard, JCB), bank transfers, and travel points redemption. Some items also support cash on delivery.',
      ja: '現在、クレジットカード（Visa、Mastercard、JCB）、銀行振込、トラベルポイントの利用に対応しています。一部の商品は代金引換もご利用いただけます。',
      ko: '현재 신용카드(Visa, Mastercard, JCB), 은행 송금, 여행 포인트 차감 결제를 지원합니다. 일부 상품은 착불 결제도 가능합니다.',
    },
  },
  'b1c47da2-dc74-49e9-a014-ad573af4246c': {
    category: {
      zh: '付款與安全',
      en: 'Payment & Security',
      ja: '支払いと安全',
      ko: '결제 및 보안',
    },
    question: {
      zh: '交易安全嗎？',
      en: 'Is checkout secure?',
      ja: '決済は安全ですか？',
      ko: '거래는 안전한가요?',
    },
    answer: {
      zh: '所有交易均採用 SSL 256-bit 銀行級加密傳輸，信用卡資訊不經過我們的伺服器，由第三方支付平台直接處理，確保您的資金安全。',
      en: 'All transactions use SSL 256-bit bank-level encryption. Your credit card information does not pass through our servers and is processed directly by a third-party payment platform to keep your funds safe.',
      ja: 'すべての取引は SSL 256-bit の銀行レベル暗号化で送信されます。クレジットカード情報は当社のサーバーを通らず、第三者の決済プラットフォームで直接処理されるため、安全にご利用いただけます。',
      ko: '모든 거래는 SSL 256비트 은행급 암호화로 전송됩니다. 신용카드 정보는 당사 서버를 거치지 않고 제3자 결제 플랫폼에서 직접 처리되어 자금을 안전하게 보호합니다.',
    },
  },
  'a20fe7dc-ad28-4a05-a7fe-7cd069efb41c': {
    category: {
      zh: '旅遊購物',
      en: 'Shopping',
      ja: 'ショッピング',
      ko: '여행 쇼핑',
    },
    question: {
      zh: '旅遊商城的商品多久可以收到？',
      en: 'How long does delivery take for shop items?',
      ja: '旅行商城の商品はどのくらいで届きますか？',
      ko: '여행 상점 상품은 얼마나 걸려서 도착하나요?',
    },
    answer: {
      zh: '一般商品於付款完成後 1-3 個工作天出貨，配送約 1-2 天到達。特殊商品或預購品會於頁面標示預計出貨時間。',
      en: 'Regular items are shipped within 1–3 business days after payment, and delivery usually takes 1–2 more days. Special items or pre-orders will show the estimated shipping time on the product page.',
      ja: '通常商品はお支払い完了後1〜3営業日以内に発送され、配送にはさらに1〜2日かかります。特別商品や予約商品は、商品ページに出荷予定日が表示されます。',
      ko: '일반 상품은 결제 완료 후 1~3영업일 내 발송되며, 배송은 보통 1~2일 정도 소요됩니다. 특수 상품이나 예약 상품은 페이지에 예상 출고 시점이 표시됩니다.',
    },
  },
  '07319b7b-39bc-4f0b-8f85-9fb5b0f14d7a': {
    category: {
      zh: '旅遊購物',
      en: 'Shopping',
      ja: 'ショッピング',
      ko: '여행 쇼핑',
    },
    question: {
      zh: '商品可以退換貨嗎？',
      en: 'Can I return or exchange products?',
      ja: '商品は返品・交換できますか？',
      ko: '상품을 반품·교환할 수 있나요?',
    },
    answer: {
      zh: '未拆封商品可於收到後 7 日內申請退換貨，請至會員中心 > 我的訂單提交退貨申請。已使用或客製化商品恕不退換。',
      en: 'Unopened items can be returned or exchanged within 7 days after delivery. Please go to Member Center > My Orders to submit a return request. Used or customized products are not eligible for return or exchange.',
      ja: '未開封の商品は受け取り後7日以内であれば返品・交換の申請が可能です。会員センター > マイ注文から返品申請を行ってください。使用済みまたはカスタム商品は返品・交換の対象外です。',
      ko: '미개봉 상품은 수령 후 7일 이내에 반품·교환 신청이 가능합니다. 회원센터 > 내 주문에서 반품 신청을 해주세요. 사용했거나 맞춤 제작된 상품은 반품·교환이 불가합니다.',
    },
  },
  'e86e0f8b-661f-4d90-aa04-18df3ec5298a': {
    category: {
      zh: '會員服務',
      en: 'Member Services',
      ja: '会員サービス',
      ko: '회원 서비스',
    },
    question: {
      zh: '如何累積及使用點數？',
      en: 'How do I earn and use points?',
      ja: 'ポイントはどのように貯めて使えますか？',
      ko: '포인트는 어떻게 적립하고 사용하나요?',
    },
    answer: {
      zh: '每次訂房或商城消費皆可累積旅遊點數（消費金額 1% 回饋），點數可於下次訂房或購物時折抵使用，1 點 = 1 元。',
      en: 'You earn travel points every time you book a room or shop on the site (1% back on the spending amount). Points can be used to offset future bookings or purchases. 1 point = NT$1.',
      ja: '宿泊予約やショップでのご利用ごとにトラベルポイントが貯まります（ご利用金額の1%還元）。ポイントは次回の予約や買い物で1ポイント=1元として利用できます。',
      ko: '객실 예약이나 쇼핑 시마다 여행 포인트가 적립됩니다(사용 금액의 1% 적립). 포인트는 다음 예약이나 구매 시 차감하여 사용할 수 있으며, 1포인트 = 1원입니다.',
    },
  },
  'a9d68d6d-3400-4321-89c3-76b53eaf4374': {
    category: {
      zh: '會員服務',
      en: 'Member Services',
      ja: '会員サービス',
      ko: '회원 서비스',
    },
    question: {
      zh: '忘記密碼怎麼辦？',
      en: 'What should I do if I forgot my password?',
      ja: 'パスワードを忘れた場合は？',
      ko: '비밀번호를 잊었을 때는 어떻게 하나요?',
    },
    answer: {
      zh: '在登入頁面點選「忘記密碼」，輸入註冊信箱後系統將寄送密碼重設連結，依照指示即可設定新密碼。',
      en: 'On the login page, click “Forgot password,” enter your registered email, and we will send a password reset link. Follow the instructions to set a new password.',
      ja: 'ログインページで「パスワードを忘れた場合」をクリックし、登録メールアドレスを入力すると、パスワード再設定リンクが送信されます。案内に従って新しいパスワードを設定してください。',
      ko: '로그인 페이지에서 “비밀번호를 잊으셨나요?”를 클릭하고 등록된 이메일을 입력하면 비밀번호 재설정 링크가 전송됩니다. 안내에 따라 새 비밀번호를 설정하세요.',
    },
  },
  'cb0e3ff6-e094-466a-b943-fb43cd2f4e2d': {
    category: {
      zh: '聯絡與支援',
      en: 'Contact & Support',
      ja: 'お問い合わせとサポート',
      ko: '문의 및 지원',
    },
    question: {
      zh: '如何聯繫客服？',
      en: 'How can I contact support?',
      ja: 'サポートへの問い合わせ方法は？',
      ko: '고객지원은 어떻게 연락하나요?',
    },
    answer: {
      zh: '您可以透過以下方式聯繫我們：AI 客服（24小時）、客服電話 02-27565663（週一至週五 09:00-18:00）、線上聯絡表單，或寄信至 service@dlalshop.com。',
      en: 'You can contact us through AI support (24/7), phone at 02-27565663 (Monday to Friday, 09:00–18:00), the online contact form, or by email at service@dlalshop.com.',
      ja: 'AIサポート（24時間）、電話 02-27565663（月〜金 09:00〜18:00）、オンラインお問い合わせフォーム、または service@dlalshop.com までメールでご連絡ください。',
      ko: 'AI 고객지원(24시간), 고객센터 02-27565663(월~금 09:00~18:00), 온라인 문의 양식 또는 service@dlalshop.com로 이메일을 보내 연락하실 수 있습니다.',
    },
  },
  '45233766-48d7-4ebe-90f2-3b06deaaddb9': {
    category: {
      zh: '訂房服務',
      en: 'Booking',
      ja: '宿泊予約',
      ko: '예약 서비스',
    },
    question: {
      zh: '如何訂房？',
      en: 'How do I book a room?',
      ja: '宿泊予約はどうすればいいですか？',
      ko: '객실은 어떻게 예약하나요?',
    },
    answer: {
      zh: '在「住宿訂房」頁面瀏覽精選房間，選擇入住及退房日期、人數後，點選「立即預訂」即可完成訂房。訂房確認信將即時寄至您的信箱。',
      en: 'Browse the featured rooms on the Stays page, choose your check-in and check-out dates and guest count, then click “Book Now” to complete your reservation. A confirmation email will be sent to your inbox right away.',
      ja: '「宿泊予約」ページでおすすめの部屋を見て、チェックイン・チェックアウト日と人数を選び、「今すぐ予約」をクリックすると予約が完了します。予約確認メールはすぐに送信されます。',
      ko: '「숙소 예약」 페이지에서 추천 객실을 둘러본 뒤 체크인/체크아웃 날짜와 인원을 선택하고 “즉시 예약”을 누르면 예약이 완료됩니다. 예약 확인 메일이 즉시 발송됩니다.',
    },
  },
  'df5babb1-b648-4ec6-b983-46b901550b12': {
    category: {
      zh: '訂房服務',
      en: 'Booking',
      ja: '宿泊予約',
      ko: '예약 서비스',
    },
    question: {
      zh: '可以免費取消訂房嗎？',
      en: 'Can I cancel for free?',
      ja: '無料でキャンセルできますか？',
      ko: '무료 취소가 가능한가요?',
    },
    answer: {
      zh: '大部分住宿提供入住前 3 天免費取消。各住宿取消政策略有不同，請於訂房頁面確認細節。',
      en: 'Most properties offer free cancellation up to 3 days before check-in. Cancellation policies vary by property, so please check the details on the booking page.',
      ja: '多くの宿泊施設では、チェックイン3日前まで無料キャンセルが可能です。施設ごとにキャンセルポリシーが異なるため、予約ページで詳細をご確認ください。',
      ko: '대부분의 숙소는 체크인 3일 전까지 무료 취소를 제공합니다. 숙소별 취소 정책이 다르므로 예약 페이지에서 세부 내용을 확인해주세요.',
    },
  },
  'eaf51ad5-7e12-48e9-81ce-61c1f537ada9': {
    category: {
      zh: '訂房服務',
      en: 'Booking',
      ja: '宿泊予約',
      ko: '예약 서비스',
    },
    question: {
      zh: '訂房後如何修改日期或人數？',
      en: 'How can I change dates or guests after booking?',
      ja: '予約後に日付や人数を変更するには？',
      ko: '예약 후 날짜나 인원은 어떻게 변경하나요?',
    },
    answer: {
      zh: '登入會員中心 > 我的訂房，找到訂單後點選「修改」。若已超過可修改期限，請聯繫客服協助。',
      en: 'Log in to Member Center > My Bookings, find your order, and click “Modify.” If the change window has already passed, please contact support for help.',
      ja: '会員センター > マイ予約にログインし、該当の予約を見つけて「変更」をクリックしてください。変更可能期限を過ぎている場合は、サポートまでご連絡ください。',
      ko: '회원센터 > 내 예약에 로그인한 뒤 해당 예약을 찾아 “수정”을 클릭하세요. 수정 가능 기간이 지난 경우 고객지원에 문의해 주세요.',
    },
  },
};

export type LocalizedFaqRow = FaqSource;

export function localizeFaqRow<T extends FaqSource>(row: T, lang: string): T {
  const normalizedLang = normalizeLang(lang);
  const entry = FAQ_TRANSLATIONS[row.id];

  if (!entry) {
    return row;
  }

  return {
    ...row,
    category: pickByLang(normalizedLang, entry.category.zh, entry.category.en, entry.category.ja, entry.category.ko),
    question: pickByLang(normalizedLang, entry.question.zh, entry.question.en, entry.question.ja, entry.question.ko),
    answer: pickByLang(normalizedLang, entry.answer.zh, entry.answer.en, entry.answer.ja, entry.answer.ko),
  };
}

export function localizeFaqRows<T extends FaqSource>(rows: T[], lang: string): T[] {
  return rows.map(row => localizeFaqRow(row, lang));
}

export function getFeaturedFaqPrompts(lang: string, limit = 4) {
  const normalizedLang = normalizeLang(lang);
  return Object.entries(FAQ_TRANSLATIONS)
    .slice(0, limit)
    .map(([id, entry]) => ({
      id,
      category: pickByLang(normalizedLang, entry.category.zh, entry.category.en, entry.category.ja, entry.category.ko),
      question: pickByLang(normalizedLang, entry.question.zh, entry.question.en, entry.question.ja, entry.question.ko),
    }));
}
