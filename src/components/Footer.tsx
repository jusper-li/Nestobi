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
import { normalizeLang, pickByLang } from '../lib/i18n';

type Locale = 'zh-TW' | 'en' | 'ja' | 'ko';

const pick = (locale: Locale, zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

export default function Footer() {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as Locale;

  const t = {
    intro: pick(
      locale,
      'Nestobi 根本在旅行整合住宿、旅遊選物、咖啡旅誌與 AI 旅遊工具，陪你把出發前後的小事整理好。',
      'Nestobi brings stays, shopping, coffee stories, and AI travel tools into one calm flow for your next trip.',
      'Nestobi は宿泊・旅の買い物・コーヒージャーナル・AI 旅行ツールを一つにまとめ、旅の前後をスムーズにします。',
      'Nestobi는 숙소, 쇼핑, 커피 콘텐츠, AI 여행 도구를 하나의 흐름으로 제공합니다.',
    ),
    services: pick(locale, '服務入口', 'Services', 'サービス', '서비스'),
    members: pick(locale, '會員服務', 'Members', '会員サービス', '회원 서비스'),
    contact: pick(locale, '聯絡我們', 'Contact', 'お問い合わせ', '문의하기'),
    contactForm: pick(locale, '填寫聯絡表單', 'Contact Form', 'お問い合わせフォーム', '문의 양식'),
    supportHours: pick(locale, '客服時間', 'Support Hours', 'サポート時間', '고객지원 시간'),
    workday: pick(locale, '週一至週五 09:00-18:00', 'Mon-Fri 09:00-18:00', '平日 09:00-18:00', '평일 09:00-18:00'),
    aiHours: pick(locale, 'AI 客服 24 小時線上', 'AI support online 24/7', 'AI サポート 24時間対応', 'AI 지원 24시간'),
    about: pick(locale, '關於我們', 'About', '会社紹介', '회사 소개'),
    privacy: pick(locale, '隱私政策', 'Privacy', 'プライバシーポリシー', '개인정보처리방침'),
    terms: pick(locale, '服務條款', 'Terms', '利用規約', '이용약관'),
    cookies: pick(locale, 'Cookie 政策', 'Cookie Policy', 'Cookie ポリシー', '쿠키 정책'),
    antiFraud: pick(locale, '防詐騙宣導', 'Anti-Fraud', '不正防止', '사기 방지 안내'),
    cookieSettings: pick(locale, 'Cookie 設定', 'Cookie Settings', 'Cookie 設定', '쿠키 설정'),
    vendorPortal: pick(locale, '廠商後台', 'Vendor Portal', 'ベンダーポータル', '판매자 포털'),
    superAdmin: pick(locale, '超級管理', 'Super Admin', 'スーパー管理', '슈퍼 관리자'),
  } as const;

  const serviceLinks = [
    { to: '/stores', label: pick(locale, '門市據點', 'Store Locator', '店舗一覧', '매장 위치'), icon: MapPin },
    { to: '/rooms', label: pick(locale, '精選住宿', 'Stays', '宿泊', '숙소'), icon: Hotel },
    { to: '/shop', label: pick(locale, '旅遊選物', 'Shop', 'ショップ', '쇼핑'), icon: ShoppingBag },
    { to: '/ai/itinerary', label: pick(locale, 'AI 行程規劃', 'AI Planner', 'AI 旅程プランナー', 'AI 일정 플래너'), icon: Map },
    { to: '/ai/translator', label: pick(locale, 'AI 即時翻譯', 'AI Translate', 'AI 翻訳', 'AI 번역'), icon: Languages },
    { to: '/ai/chat', label: pick(locale, 'AI 客服中心', 'AI Support', 'AI サポート', 'AI 고객지원'), icon: MessageCircle },
    { to: '/ai/passport', label: pick(locale, '旅人護照', 'Travel Passport', 'トラベルパスポート', '여행 패스포트'), icon: BookMarked },
    { to: '/blog', label: pick(locale, '咖啡旅誌', 'Coffee Journal', 'コーヒージャーナル', '커피 저널'), icon: Coffee },
    { to: '/faq', label: pick(locale, '常見問題', 'FAQ', 'よくある質問', '자주 묻는 질문'), icon: HelpCircle },
  ];

  const memberLinks = [
    { to: '/auth/register', label: pick(locale, '加入會員', 'Join', '会員登録', '회원가입') },
    { to: '/auth/login', label: pick(locale, '會員登入', 'Login', 'ログイン', '로그인') },
    { to: '/member', label: pick(locale, '會員中心', 'Member Center', '会員センター', '회원 센터') },
    { to: '/member/orders', label: pick(locale, '我的訂單', 'My Orders', '注文一覧', '내 주문') },
    { to: '/member/points', label: pick(locale, '點數回饋', 'My Points', 'ポイント', '포인트') },
    { to: '/member/preferences', label: pick(locale, '偏好設定', 'Preferences', '設定', '환경설정') },
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
                <a
                  key={index}
                  href="#"
                  aria-label={index === 0 ? 'Facebook' : 'Instagram'}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C09A6A]/20 transition hover:bg-[#C09A6A] hover:text-white"
                >
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
                  <Link to={to} className="text-[#2C1F10]/70 transition hover:text-[#2C1F10]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-[#2C1F10]/50">{t.contact}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-[#2C1F10]/70">
                <Phone size={14} />
                <span>0800-123-456</span>
              </li>
              <li className="flex items-center gap-2 text-[#2C1F10]/70">
                <Mail size={14} />
                <span>service@nestobi.com.tw</span>
              </li>
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
              <Link to="/about" className="transition hover:text-[#2C1F10]">
                {t.about}
              </Link>
              <Link to="/privacy" className="transition hover:text-[#2C1F10]">
                {t.privacy}
              </Link>
              <Link to="/terms" className="transition hover:text-[#2C1F10]">
                {t.terms}
              </Link>
              <Link to="/cookies" className="transition hover:text-[#2C1F10]">
                {t.cookies}
              </Link>
              <Link to="/anti-fraud" className="transition hover:text-[#2C1F10]">
                {t.antiFraud}
              </Link>
              <button type="button" onClick={openCookieSettings} className="transition hover:text-[#2C1F10]">
                {t.cookieSettings}
              </button>
              <div className="ml-1 flex items-center gap-2 border-l border-[#2C1F10]/15 pl-4">
                <Link
                  to="/vendor"
                  title={t.vendorPortal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C1F10]/5 text-[#2C1F10]/40 transition hover:bg-[#C09A6A]/30 hover:text-[#2C1F10]"
                >
                  <ShieldCheck size={15} />
                </Link>
                <Link
                  to="/superadmin"
                  title={t.superAdmin}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2C1F10]/5 text-[#2C1F10]/40 transition hover:bg-[#C09A6A]/30 hover:text-[#2C1F10]"
                >
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
