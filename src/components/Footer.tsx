import { Link } from 'react-router-dom';
import {
  BookMarked,
  Coffee,
  Facebook,
  FileText,
  HelpCircle,
  Hotel,
  Instagram,
  Languages,
  Mail,
  Map,
  MapPin,
  MessageCircle,
  Phone,
  Settings,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang } from '../lib/i18n';

type Locale = 'zh-TW' | 'en' | 'ja' | 'ko';

export default function Footer() {
  const { lang } = useLanguage();
  const locale: Locale = normalizeLang(lang) as Locale;

  const copy = {
    'zh-TW': {
      intro: 'Nestobi 把住宿、旅行選物、咖啡旅誌與 AI 旅遊工具整合在一起，陪你把出發前後大小事都安排好。',
      services: '服務入口',
      members: '會員服務',
      contact: '聯絡我們',
      contactForm: '填寫聯絡表單',
      supportHours: '客服時間',
      workday: '週一至週五 09:00-18:00',
      aiHours: 'AI 客服 24 小時線上',
      about: '關於我們',
      privacy: '隱私政策',
      terms: '服務條款',
      cookies: 'Cookie 政策',
      antiFraud: '防詐騙宣導',
      cookieSettings: 'Cookie 設定',
      vendorPortal: '廠商後台',
      superAdmin: '超級管理',
    },
    en: {
      intro: 'Nestobi brings stays, shopping, coffee stories, and AI travel tools into one calm flow for your next trip.',
      services: 'Services',
      members: 'Members',
      contact: 'Contact',
      contactForm: 'Contact Form',
      supportHours: 'Support Hours',
      workday: 'Mon-Fri 09:00-18:00',
      aiHours: 'AI support online 24/7',
      about: 'About',
      privacy: 'Privacy',
      terms: 'Terms',
      cookies: 'Cookie Policy',
      antiFraud: 'Anti-Fraud',
      cookieSettings: 'Cookie Settings',
      vendorPortal: 'Vendor Portal',
      superAdmin: 'Super Admin',
    },
    ja: {
      intro: 'Nestobiは宿泊・ショッピング・コーヒー記事・AI旅行ツールをひとつの流れで提供します。',
      services: 'サービス',
      members: '会員サービス',
      contact: 'お問い合わせ',
      contactForm: 'お問い合わせフォーム',
      supportHours: 'サポート時間',
      workday: '平日 09:00-18:00',
      aiHours: 'AIサポート 24時間対応',
      about: '会社情報',
      privacy: 'プライバシー',
      terms: '利用規約',
      cookies: 'Cookieポリシー',
      antiFraud: '不正防止',
      cookieSettings: 'Cookie設定',
      vendorPortal: '出店者ポータル',
      superAdmin: 'スーパー管理',
    },
    ko: {
      intro: 'Nestobi는 숙소, 쇼핑, 커피 콘텐츠, AI 여행 도구를 하나의 흐름으로 제공합니다.',
      services: '서비스',
      members: '회원 서비스',
      contact: '문의하기',
      contactForm: '문의 양식',
      supportHours: '고객지원 시간',
      workday: '평일 09:00-18:00',
      aiHours: 'AI 지원 24시간',
      about: '회사 소개',
      privacy: '개인정보처리방침',
      terms: '이용약관',
      cookies: '쿠키 정책',
      antiFraud: '사기 방지',
      cookieSettings: '쿠키 설정',
      vendorPortal: '판매자 포털',
      superAdmin: '슈퍼 관리자',
    },
  } as const;

  const t = copy[locale];

  const serviceLinks = [
    { to: '/stores', label: locale === 'ja' ? '店舗一覧' : locale === 'ko' ? '매장 안내' : locale === 'en' ? 'Store Locator' : '門市據點', icon: MapPin },
    { to: '/rooms', label: locale === 'ja' ? '宿泊' : locale === 'ko' ? '숙소' : locale === 'en' ? 'Stays' : '精選住宿', icon: Hotel },
    { to: '/shop', label: locale === 'ja' ? 'ショップ' : locale === 'ko' ? '쇼핑' : locale === 'en' ? 'Shop' : '旅行選物', icon: ShoppingBag },
    { to: '/ai/itinerary', label: locale === 'ja' ? 'AI旅程プラン' : locale === 'ko' ? 'AI 일정 플래너' : locale === 'en' ? 'AI Planner' : 'AI 行程規劃', icon: Map },
    { to: '/ai/translator', label: locale === 'ja' ? 'AI翻訳' : locale === 'ko' ? 'AI 번역' : locale === 'en' ? 'AI Translate' : 'AI 即時翻譯', icon: Languages },
    { to: '/ai/chat', label: locale === 'ja' ? 'AIサポート' : locale === 'ko' ? 'AI 고객지원' : locale === 'en' ? 'AI Support' : 'AI 客服中心', icon: MessageCircle },
    { to: '/ai/passport', label: locale === 'ja' ? 'トラベルパスポート' : locale === 'ko' ? '여행 패스포트' : locale === 'en' ? 'Travel Passport' : '旅人護照', icon: BookMarked },
    { to: '/blog', label: locale === 'ja' ? 'コーヒージャーナル' : locale === 'ko' ? '커피 저널' : locale === 'en' ? 'Coffee Journal' : '咖啡旅誌', icon: Coffee },
    { to: '/faq', label: locale === 'ja' ? 'よくある質問' : locale === 'ko' ? '자주 묻는 질문' : 'FAQ', icon: HelpCircle },
  ];

  const memberLinks = [
    { to: '/auth/register', label: locale === 'ja' ? '会員登録' : locale === 'ko' ? '회원가입' : locale === 'en' ? 'Join' : '加入會員' },
    { to: '/auth/login', label: locale === 'ja' ? 'ログイン' : locale === 'ko' ? '로그인' : locale === 'en' ? 'Login' : '會員登入' },
    { to: '/member', label: locale === 'ja' ? '会員センター' : locale === 'ko' ? '회원 센터' : locale === 'en' ? 'Member Center' : '會員中心' },
    { to: '/member/orders', label: locale === 'ja' ? '注文一覧' : locale === 'ko' ? '내 주문' : locale === 'en' ? 'My Orders' : '我的訂單' },
    { to: '/member/points', label: locale === 'ja' ? 'ポイント' : locale === 'ko' ? '포인트' : locale === 'en' ? 'My Points' : '點數回饋' },
    { to: '/member/preferences', label: locale === 'ja' ? '設定' : locale === 'ko' ? '환경설정' : locale === 'en' ? 'Preferences' : '偏好設定' },
  ];

  const openCookieSettings = () => {
    window.dispatchEvent(new Event('nestobi:open-cookie-settings'));
  };

  return (
    <footer className="bg-[#F0E4C8] text-[#2C1F10]">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-12">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <img src="/20260407_nestobi_logo.svg" alt="Nestobi" className="mb-5 h-14 w-auto" />
            <p className="mb-5 text-sm leading-7 text-[#2C1F10]/70">{t.intro}</p>
            <div className="flex gap-3">
              {[Facebook, Instagram].map((Icon, index) => (
                <a key={index} href="#" aria-label={index === 0 ? 'Facebook' : 'Instagram'} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C09A6A]/20 transition hover:bg-[#C09A6A] hover:text-white">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-[#2C1F10]/50">{t.services}</h4>
            <ul className="space-y-2.5 text-sm">
              {serviceLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="flex items-center gap-2 text-[#2C1F10]/70 transition hover:text-[#2C1F10]">
                    <Icon size={14} />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-[#2C1F10]/50">{t.members}</h4>
            <ul className="space-y-2.5 text-sm">
              {memberLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-[#2C1F10]/70 transition hover:text-[#2C1F10]">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-[#2C1F10]/50">{t.contact}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-[#2C1F10]/70"><Phone size={14} /><span>0800-123-456</span></li>
              <li className="flex items-center gap-2 text-[#2C1F10]/70"><Mail size={14} /><span>service@nestobi.com.tw</span></li>
              <li>
                <Link to="/contact" className="inline-flex items-center gap-2 text-[#2C1F10]/70 transition hover:text-[#2C1F10]">
                  <FileText size={14} />
                  <span>{t.contactForm}</span>
                </Link>
              </li>
            </ul>
            <div className="mt-5 text-sm text-[#2C1F10]/70">
              <p className="mb-2 text-xs font-semibold text-[#2C1F10]/50">{t.supportHours}</p>
              <p>{t.workday}</p>
              <p>{t.aiHours}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#2C1F10]/15 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-[#2C1F10]/50 md:flex-row">
            <p>&copy; 2026 Nestobi. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link to="/about" className="transition hover:text-[#2C1F10]">{t.about}</Link>
              <Link to="/privacy" className="transition hover:text-[#2C1F10]">{t.privacy}</Link>
              <Link to="/terms" className="transition hover:text-[#2C1F10]">{t.terms}</Link>
              <Link to="/cookies" className="transition hover:text-[#2C1F10]">{t.cookies}</Link>
              <Link to="/anti-fraud" className="transition hover:text-[#2C1F10]">{t.antiFraud}</Link>
              <button type="button" onClick={openCookieSettings} className="transition hover:text-[#2C1F10]">{t.cookieSettings}</button>
              <div className="ml-1 flex items-center gap-2 border-l border-[#2C1F10]/15 pl-4">
                <Link to="/vendor" title={t.vendorPortal} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C1F10]/5 text-[#2C1F10]/40 transition hover:bg-[#C09A6A]/30 hover:text-[#2C1F10]">
                  <ShieldCheck size={15} />
                </Link>
                <Link to="/superadmin" title={t.superAdmin} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C1F10]/5 text-[#2C1F10]/40 transition hover:bg-[#C09A6A]/30 hover:text-[#2C1F10]">
                  <Settings size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
