import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  BookMarked,
  Coffee,
  Facebook,
  FileText,
  HelpCircle,
  Hotel,
  Instagram,
  Languages,
  History,
  Mail,
  Map,
  MapPin,
  MessageCircle,
  Music2,
  LayoutDashboard,
  Phone,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Twitter,
  User,
  Youtube,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { normalizeLang, pickByLang } from '../lib/i18n';
import { fetchSiteContentBlocks, getBlockText, indexBlocks, type SiteContentBlock } from '../lib/siteContent';

type Locale = 'zh-TW' | 'en' | 'ja' | 'ko';

const pick = (locale: Locale, zh: string, en: string, ja: string, ko: string) =>
  pickByLang(locale, zh, en, ja, ko);

export default function Footer() {
  const { lang } = useLanguage();
  const { settings } = useSiteSettings();
  const locale = normalizeLang(lang) as Locale;
  const [footerBlocks, setFooterBlocks] = useState<SiteContentBlock[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchSiteContentBlocks('footer')
      .then(blocks => {
        if (!cancelled) setFooterBlocks(blocks);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const footerMap = useMemo(() => indexBlocks(footerBlocks), [footerBlocks]);
  const footerText = (key: string, field: 'title' | 'subtitle' | 'body' | 'cta_label', fallback: string) =>
    getBlockText(footerMap[key], locale, field) || fallback;

  const t = {
    intro: pick(
      locale,
      'Nestobi 負責把資訊整理好，根本在旅行則把體驗落地。兩個品牌分工不同，卻共同指向同一件事：讓旅程更容易開始，也更值得記住。',
      'Nestobi organizes the information, and Genbon Travel turns it into an experience. Different roles, one shared goal: making every journey easier to start and easier to remember.',
      'Nestobi が情報を整理し、根本在旅行が体験を形にします。役割は違っても、旅をもっと始めやすく、もっと記憶に残るものにするという目的は同じです。',
      'Nestobi는 정보를 정리하고, 근본에서 여행은 그 경험을 현실로 만듭니다. 역할은 다르지만 여행을 더 쉽게 시작하고 더 오래 기억하게 한다는 목표는 같습니다.',
    ),
    services: footerText('footer-services-heading', 'title', pick(locale, '服務', 'Services', 'サービス', '서비스')),
    members: pick(locale, '會員', 'Members', '会員', '회원'),
    contact: pick(locale, '聯絡我們', 'Contact', 'お問い合わせ', '문의하기'),
    contactForm: pick(locale, '聯絡表單', 'Contact Form', 'お問い合わせフォーム', '문의 양식'),
    supportHours: pick(locale, '服務時間', 'Support Hours', 'サポート時間', '운영 시간'),
    workday: pick(locale, '週一至週五 09:00-18:00', 'Mon-Fri 09:00-18:00', '月〜金 09:00-18:00', '월~금 09:00-18:00'),
    aiHours: pick(locale, 'AI 客服 24 小時', 'AI support 24/7', 'AIサポート 24時間', 'AI 상담 24시간'),
    phone: pick(locale, '客服電話', 'Support Phone', '電話', '전화'),
    email: pick(locale, '客服信箱', 'Email', 'メール', '이메일'),
    about: pick(locale, '關於我們', 'About', '私たちについて', '회사 소개'),
    privacy: pick(locale, '隱私權政策', 'Privacy', 'プライバシー', '개인정보처리방침'),
    terms: pick(locale, '服務條款', 'Terms', '利用規約', '이용약관'),
    cookies: pick(locale, 'Cookie 政策', 'Cookie Policy', 'Cookie ポリシー', '쿠키 정책'),
    antiFraud: pick(locale, '防詐騙專區', 'Anti-Fraud', '詐欺防止', '사기 방지'),
    cookieSettings: pick(locale, 'Cookie 設定', 'Cookie Settings', 'Cookie 設定', '쿠키 설정'),
    vendorPortal: pick(locale, '廠商後台', 'Vendor Portal', '出店者管理', '공급사 포털'),
    superAdmin: pick(locale, '超級管理員', 'Super Admin', 'スーパー管理者', '최고 관리자'),
    social: pick(locale, '社群', 'Social', 'SNS', '소셜'),
  } as const;

  const serviceLinks = [
    { to: '/rooms', label: footerText('footer-services-rooms', 'title', pick(locale, 'Nestobi 住宿', 'Nestobi Stays', 'Nestobi 宿泊', 'Nestobi 숙소')), icon: Hotel },
    { to: '/shop', label: footerText('footer-services-shop', 'title', pick(locale, '根本在旅行商城', 'Genbon Travel Shop', '根本在旅行ショップ', '근본에서 여행 스토어')), icon: ShoppingBag },
    { to: '/stores', label: footerText('footer-services-stores', 'title', pick(locale, '根本在旅行咖啡廳', 'Genbon Travel Cafes', '根本在旅行カフェ', '근본에서 여행 카페')), icon: MapPin },
    { to: '/blog', label: footerText('footer-services-blog', 'title', pick(locale, '咖啡旅行家', 'Coffee Traveler', 'コーヒートラベラー', '커피 여행가')), icon: FileText },
    { to: '/faq', label: pick(locale, '常見問題', 'FAQ', 'FAQ', '자주 묻는 질문'), icon: HelpCircle },
    { to: '/ai/chat', label: pick(locale, 'AI 客服', 'AI Support', 'AIサポート', 'AI 상담'), icon: MessageCircle },
    { to: '/ai/itinerary', label: pick(locale, 'AI 導遊', 'AI Planner', 'AI 旅程', 'AI 여행'), icon: Map },
    { to: '/ai/coffee-quiz', label: pick(locale, 'AI 尋豆師', 'AI Coffee Finder', 'AI コーヒーファインダー', 'AI 원두 찾기'), icon: Coffee },
    { to: '/ai/translator', label: pick(locale, 'AI 翻譯', 'AI Translate', 'AI 翻訳', 'AI 번역'), icon: Languages },
    { to: '/ai/passport', label: pick(locale, '旅遊護照', 'Travel Passport', 'トラベルパスポート', '여행 패스포트'), icon: BookMarked },
  ] as const;

  const memberLinks = [
    { to: '/member', label: pick(locale, '會員中心', 'Member Center', '会員中心', '회원센터'), icon: LayoutDashboard },
    { to: '/member/bookings', label: pick(locale, '我的訂房', 'My Bookings', '予約一覧', '내 예약'), icon: Hotel },
    { to: '/member/orders', label: pick(locale, '我的訂單', 'My Orders', '注文一覧', '내 주문'), icon: History },
    { to: '/member/purchases', label: pick(locale, '消費紀錄', 'Purchase Records', '購入履歴', '구매 내역'), icon: Receipt },
    { to: '/member/points', label: pick(locale, '我的點數', 'My Points', 'ポイント', '내 포인트'), icon: Map },
    { to: '/member/profile', label: pick(locale, '個人資料', 'Profile', 'プロフィール', '프로필'), icon: User },
    { to: '/member/preferences', label: pick(locale, '偏好設定', 'Preferences', '設定', '환경설정'), icon: Settings },
  ] as const;

  const socialLinks = [
    settings.social_facebook && { href: settings.social_facebook, label: 'Facebook', icon: Facebook },
    settings.social_instagram && { href: settings.social_instagram, label: 'Instagram', icon: Instagram },
    settings.social_line && { href: settings.social_line, label: 'LINE', icon: MessageCircle },
    settings.social_youtube && { href: settings.social_youtube, label: 'YouTube', icon: Youtube },
    (settings.social_x || settings.social_twitter) && {
      href: settings.social_x || settings.social_twitter,
      label: 'X',
      icon: Twitter,
    },
    settings.social_tiktok && { href: settings.social_tiktok, label: 'TikTok', icon: Music2 },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: LucideIcon }>;

  const contactItems = [
    { icon: Phone, label: t.phone, value: settings.contact_phone || '02-27565663', sub: t.workday },
    { icon: Mail, label: t.email, value: settings.contact_email || 'service@dlalshop.com', sub: t.aiHours },
    {
      icon: MapPin,
      label: pick(locale, '公司資訊', 'Company Info', '会社情報', '회사 정보'),
      value: settings.company_name || '若水金禾餐飲股份有限公司',
      sub: `${pick(locale, '統一編號', 'Tax ID', '法人番号', '사업자등록번호')}：${settings.company_no || '83122492'} / ${pick(locale, '總部地址', 'HQ Address', '本社住所', '본사 주소')}：${settings.headquarters_address || '台北市信義區忠孝東路四段553巷22弄4-1號'}`,
    },
  ] as const;

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
            <div className="flex flex-wrap gap-3">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
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
              {memberLinks.map(({ to, label, icon: Icon }) => (
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
            <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-[#2C1F10]/50">{t.contact}</h4>
            <ul className="space-y-3 text-sm">
              {contactItems.map(({ icon: Icon, label, value, sub }) => (
                <li key={`${label}-${value}`} className="text-[#2C1F10]/70">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon size={14} />
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2C1F10]/50">{label}</span>
                  </div>
                  <div className="font-medium text-[#2C1F10]">{value}</div>
                  <div className="mt-0.5 text-xs leading-5 text-[#2C1F10]/60">{sub}</div>
                </li>
              ))}
              <li>
                <Link to="/contact" className="inline-flex items-center gap-2 text-[#2C1F10]/70 transition hover:text-[#2C1F10]">
                  <FileText size={14} />
                  <span>{t.contactForm}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[#2C1F10]/10 pt-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-[#2C1F10]/50">{t.supportHours}</h4>
              <div className="space-y-1 text-sm text-[#2C1F10]/70">
                <p>{t.workday}</p>
                <p>{t.aiHours}</p>
                <p>02-27565663</p>
                <p>service@dlalshop.com</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[320px]">
              <Link to="/about" className="rounded-xl border border-[#2C1F10]/10 bg-white/60 px-4 py-3 text-center font-medium text-[#2C1F10]/80 transition hover:bg-white">
                {t.about}
              </Link>
              <Link to="/privacy-policy" className="rounded-xl border border-[#2C1F10]/10 bg-white/60 px-4 py-3 text-center font-medium text-[#2C1F10]/80 transition hover:bg-white">
                {t.privacy}
              </Link>
              <Link to="/terms" className="rounded-xl border border-[#2C1F10]/10 bg-white/60 px-4 py-3 text-center font-medium text-[#2C1F10]/80 transition hover:bg-white">
                {t.terms}
              </Link>
              <Link to="/anti-fraud" className="rounded-xl border border-[#2C1F10]/10 bg-white/60 px-4 py-3 text-center font-medium text-[#2C1F10]/80 transition hover:bg-white">
                {t.antiFraud}
              </Link>
              <button type="button" onClick={openCookieSettings} className="rounded-xl border border-[#2C1F10]/10 bg-white/60 px-4 py-3 text-center font-medium text-[#2C1F10]/80 transition hover:bg-white">
                {t.cookieSettings}
              </button>
              <Link to="/vendor" className="rounded-xl border border-[#2C1F10]/10 bg-white/60 px-4 py-3 text-center font-medium text-[#2C1F10]/80 transition hover:bg-white">
                {t.vendorPortal}
              </Link>
              <Link to="/superadmin" className="col-span-2 rounded-xl border border-[#2C1F10]/10 bg-white/60 px-4 py-3 text-center font-medium text-[#2C1F10]/80 transition hover:bg-white">
                {t.superAdmin}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#2C1F10]/10 bg-[#E7D9B5] px-6 py-4 text-center text-xs text-[#2C1F10]/55">
        <p>© {new Date().getFullYear()} Nestobi / 根本在旅行</p>
      </div>
    </footer>
  );
}
