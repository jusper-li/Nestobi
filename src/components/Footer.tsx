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
      'Nestobi ????????????????????????????????????????????????????????',
      'Nestobi organizes the information, and Genbon Travel turns it into an experience. Different roles, one shared goal: making every journey easier to start and easier to remember.',
      'Nestobi ????????????????????????????????????????????????????????????',
      'Nestobi? ??? ????, ?????? ??? ??? ????. ??? ???? ??? ? ?? ???? ? ?? ???? ???? ?? ????.',
    ),
    services: footerText('footer-services-heading', 'title', pick(locale, '??', 'Services', '????', '???')),
    members: pick(locale, '??', 'Members', '????', '??'),
    contact: pick(locale, '????', 'Contact', '??????', '????'),
    contactForm: pick(locale, '????', 'Contact Form', '??????????', '?? ??'),
    supportHours: pick(locale, '????', 'Support Hours', '??????', '?? ?? ??'),
    workday: pick(locale, '????? 09:00-18:00', 'Mon-Fri 09:00-18:00', '??? 09:00-18:00', '?~? 09:00-18:00'),
    aiHours: pick(locale, 'AI ?? 24 ??', 'AI support 24/7', 'AI ???? 24??', 'AI ???? 24??'),
    phone: pick(locale, '????', 'Support Phone', '??????', '???? ??'),
    email: pick(locale, '????', 'Email', '???', '???'),
    about: pick(locale, '????', 'About', '????', '?? ??'),
    privacy: pick(locale, '????', 'Privacy', '??????', '????????'),
    terms: pick(locale, '????', 'Terms', '????', '????'),
    cookies: pick(locale, 'Cookie ??', 'Cookie Policy', 'Cookie ????', '?? ??'),
    antiFraud: pick(locale, '?????', 'Anti-Fraud', '??????', '?? ?? ??'),
    cookieSettings: pick(locale, 'Cookie ??', 'Cookie Settings', 'Cookie ??', '?? ??'),
    vendorPortal: pick(locale, '????', 'Vendor Portal', '???????', '??? ??'),
    superAdmin: pick(locale, '?????', 'Super Admin', '???????', '?? ???'),
    social: pick(locale, '??', 'Social', 'SNS', '??'),
  } as const;

  const serviceLinks = [
    { to: '/rooms', label: footerText('footer-services-rooms', 'title', pick(locale, 'Nestobi ??', 'Nestobi Stays', 'Nestobi ??', 'Nestobi ??')), icon: Hotel },
    { to: '/shop', label: footerText('footer-services-shop', 'title', pick(locale, '???????', 'Genbon Travel Shop', '?????????', '????? ?')), icon: ShoppingBag },
    { to: '/stores', label: footerText('footer-services-stores', 'title', pick(locale, '????????', 'Genbon Travel Cafes', '????????', '????? ??')), icon: MapPin },
    { to: '/blog', label: footerText('footer-services-blog', 'title', pick(locale, '?????', 'Coffee Traveler', '?????????', '?? ????')), icon: FileText },
    { to: '/faq', label: pick(locale, '????', 'FAQ', 'FAQ', '?? ?? ??'), icon: HelpCircle },
    { to: '/ai/chat', label: pick(locale, 'AI ??', 'AI Support', 'AI ????', 'AI ????'), icon: MessageCircle },
    { to: '/ai/itinerary', label: pick(locale, 'AI ??', 'AI Planner', 'AI Planner', 'AI ???'), icon: Map },
    { to: '/ai/coffee-quiz', label: pick(locale, 'AI ???', 'AI Coffee Finder', 'AI Coffee Finder', 'AI ?? ??'), icon: Coffee },
    { to: '/ai/translator', label: pick(locale, 'AI ??', 'AI Translate', 'AI ??', 'AI ??'), icon: Languages },
    { to: '/ai/passport', label: pick(locale, '????', 'Travel Passport', '???????', '?? ????'), icon: BookMarked },
  ] as const;

  const memberLinks = [
    { to: '/member', label: pick(locale, '會員中心', 'Member Center', '会員センター', '회원센터'), icon: LayoutDashboard },
    { to: '/member/bookings', label: pick(locale, '我的訂房', 'My Bookings', '予約履歴', '내 숙박'), icon: Hotel },
    { to: '/member/orders', label: pick(locale, '我的訂單', 'My Orders', '注文履歴', '내 주문'), icon: History },
    { to: '/member/purchases', label: pick(locale, '消費紀錄', 'Purchase Records', '購入履歴', '소비 내역'), icon: Receipt },
    { to: '/member/points', label: pick(locale, '我的點數', 'My Points', 'ポイント', '포인트'), icon: Map },
    { to: '/member/profile', label: pick(locale, '個人資料', 'Profile', 'プロフィール', '프로필'), icon: User },
    { to: '/member/preferences', label: pick(locale, '偏好設定', 'Preferences', '設定', '설정'), icon: Settings },
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
    {
      icon: Phone,
      label: t.phone,
      value: settings.contact_phone || '02-27565663',
      sub: t.workday,
    },
    {
      icon: Mail,
      label: t.email,
      value: settings.contact_email || 'service@dlalshop.com',
      sub: t.aiHours,
    },
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
            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#2C1F10]/50">{t.social}</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[#2C1F10]/10 bg-white/50 px-3 py-1.5 text-xs font-medium text-[#2C1F10]/70 transition hover:border-[#C09A6A]/40 hover:bg-white hover:text-[#2C1F10]"
                  >
                    {label}
                  </a>
                ))}
              </div>
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
              <Link to="/anti-fraud" className="transition hover:text-[#2C1F10]">
                {t.antiFraud}
              </Link>
              <Link to="/cookies" className="transition hover:text-[#2C1F10]">
                {t.cookies}
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
