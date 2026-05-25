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

export default function Footer() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const t = {
    intro: isEn
      ? 'Nestobi brings stays, shopping, coffee stories, and AI travel tools into one calm flow for your next trip.'
      : 'Nestobi 把住宿、購物、咖啡旅誌與 AI 旅遊工具整合在一起，陪你把每趟旅行安排得更輕鬆。',
    services: isEn ? 'Services' : '服務入口',
    members: isEn ? 'Members' : '會員服務',
    contact: isEn ? 'Contact' : '聯絡我們',
    contactForm: isEn ? 'Contact Form' : '填寫聯絡表單',
    supportHours: isEn ? 'Support Hours' : '客服時間',
    workday: isEn ? 'Mon-Fri 09:00-18:00' : '週一至週五 09:00-18:00',
    aiHours: isEn ? 'AI support online 24/7' : 'AI 客服 24 小時線上',
    about: isEn ? 'About' : '關於我們',
    privacy: isEn ? 'Privacy' : '隱私政策',
    terms: isEn ? 'Terms' : '服務條款',
    cookies: isEn ? 'Cookie Policy' : 'Cookie 政策',
    antiFraud: isEn ? 'Anti-Fraud' : '防詐騙宣導',
    cookieSettings: isEn ? 'Cookie Settings' : 'Cookie 設定',
    vendorPortal: isEn ? 'Vendor Portal' : '廠商後台',
    superAdmin: isEn ? 'Super Admin' : '超級管理員',
  };

  const serviceLinks = [
    { to: '/stores', label: isEn ? 'Store Locator' : '門市據點', icon: MapPin },
    { to: '/rooms', label: isEn ? 'Stays' : '精選住宿', icon: Hotel },
    { to: '/shop', label: isEn ? 'Shop' : '旅行選物', icon: ShoppingBag },
    { to: '/ai/itinerary', label: isEn ? 'AI Planner' : 'AI 行程規劃', icon: Map },
    { to: '/ai/translator', label: isEn ? 'AI Translate' : 'AI 即時翻譯', icon: Languages },
    { to: '/ai/chat', label: isEn ? 'AI Support' : 'AI 客服中心', icon: MessageCircle },
    { to: '/ai/passport', label: isEn ? 'Travel Passport' : '旅人護照', icon: BookMarked },
    { to: '/blog', label: isEn ? 'Coffee Journal' : '咖啡旅誌', icon: Coffee },
    { to: '/faq', label: isEn ? 'FAQ' : '常見問題', icon: HelpCircle },
  ];

  const memberLinks = [
    { to: '/auth/register', label: isEn ? 'Join' : '加入會員' },
    { to: '/auth/login', label: isEn ? 'Login' : '會員登入' },
    { to: '/member', label: isEn ? 'Member Center' : '會員中心' },
    { to: '/member/orders', label: isEn ? 'My Orders' : '我的訂單' },
    { to: '/member/points', label: isEn ? 'My Points' : '點數回饋' },
    { to: '/member/preferences', label: isEn ? 'Preferences' : '偏好設定' },
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
