import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Facebook,
  FileText,
  Hotel,
  Instagram,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Twitter,
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
    contact: pick(locale, '聯絡我們', 'Contact', 'お問い合わせ', '문의하기'),
    contactForm: pick(locale, '聯絡表單', 'Contact Form', 'お問い合わせフォーム', '문의 양식'),
    supportHours: pick(locale, '服務時間', 'Support Hours', 'サポート時間', '운영 시간'),
    workday: pick(locale, '週一至週五 09:00-18:00', 'Mon-Fri 09:00-18:00', '月〜金 09:00-18:00', '월~금 09:00-18:00'),
    aiHours: pick(locale, 'AI 客服 24 小時', 'AI support 24/7', 'AIサポート 24時間', 'AI 상담 24시간'),
    companyInfo: pick(locale, '公司資訊', 'Company Info', '会社情報', '회사 정보'),
    taxId: pick(locale, '統一編號', 'Tax ID', '法人番号', '사업자등록번호'),
    headquarters: pick(locale, '總部地址', 'HQ Address', '本社住所', '본사 주소'),
    about: pick(locale, '關於我們', 'About', '私たちについて', '회사 소개'),
    privacy: pick(locale, '隱私權政策', 'Privacy Policy', 'プライバシーポリシー', '개인정보처리방침'),
    terms: pick(locale, '服務條款', 'Terms of Service', '利用規約', '이용약관'),
    antiFraud: pick(locale, '防詐騙專區', 'Anti-Fraud', '詐欺防止', '사기 방지'),
    cookieSettings: pick(locale, 'Cookie 設定', 'Cookie Settings', 'Cookie 設定', '쿠키 설정'),
  } as const;

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

  const policyLinks = [
    { to: '/about', label: t.about },
    { to: '/privacy', label: t.privacy },
    { to: '/terms', label: t.terms },
    { to: '/anti-fraud', label: t.antiFraud },
    { to: '/cookies', label: t.cookieSettings },
  ] as const;

  const adminLinks = [
    { to: '/vendor', label: 'Vendor Portal', icon: LayoutDashboard },
    { to: '/superadmin', label: 'Super Admin', icon: ShieldCheck },
  ] as const;

  const brandLogos = [
    { src: '/assets/ruoshui-jinhe-logo.png', alt: '若水金禾', className: 'h-12 w-auto' },
    { src: '/genbon-travel-logo.png', alt: '根本在旅行', className: 'h-12 w-auto' },
    { src: '/20260407_nestobi_logo.svg', alt: 'Nestobi', className: 'h-14 w-auto' },
  ] as const;

  return (
    <footer className="bg-[#F0E4C8] text-[#2C1F10]">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              {brandLogos.map((logo) => (
                <img key={logo.alt} src={logo.src} alt={logo.alt} className={`${logo.className} object-contain`} />
              ))}
            </div>
            <p className="mb-5 max-w-2xl text-sm leading-7 text-[#2C1F10]/70">{t.intro}</p>
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

          <div className="space-y-6">
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-[#2C1F10]/50">{t.contact}</h4>
              <div className="space-y-3 text-sm">
                <div className="text-[#2C1F10]/70">
                  <div className="mb-1 flex items-center gap-2">
                    <Phone size={14} />
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2C1F10]/50">
                      {pick(locale, '客服電話', 'Support Phone', 'サポート電話', '고객센터 전화')}
                    </span>
                  </div>
                  <div className="font-medium text-[#2C1F10]">{settings.contact_phone || '02-27565663'}</div>
                  <div className="mt-0.5 text-xs leading-5 text-[#2C1F10]/60">{t.workday}</div>
                </div>

                <div className="text-[#2C1F10]/70">
                  <div className="mb-1 flex items-center gap-2">
                    <Mail size={14} />
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2C1F10]/50">
                      {pick(locale, '客服信箱', 'Support Email', 'サポートメール', '고객센터 이메일')}
                    </span>
                  </div>
                  <div className="font-medium text-[#2C1F10]">{settings.contact_email || 'service@dlalshop.com'}</div>
                  <div className="mt-0.5 text-xs leading-5 text-[#2C1F10]/60">{t.aiHours}</div>
                </div>

                <div className="text-[#2C1F10]/70">
                  <div className="mb-1 flex items-center gap-2">
                    <MapPin size={14} />
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2C1F10]/50">{t.companyInfo}</span>
                  </div>
                  <div className="font-medium text-[#2C1F10]">{settings.company_name || '若水金禾餐飲股份有限公司'}</div>
                  <div className="mt-0.5 text-xs leading-5 text-[#2C1F10]/60">
                    {t.taxId}：{settings.company_no || '83122492'} / {t.headquarters}：{settings.headquarters_address || '台北市信義區忠孝東路四段553巷22弄4-1號'}
                  </div>
                </div>

                <Link to="/contact" className="inline-flex items-center gap-2 text-[#2C1F10]/70 transition hover:text-[#2C1F10]">
                  <FileText size={14} />
                  <span>{t.contactForm}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#2C1F10]/10 pt-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#2C1F10]/75">
              {policyLinks.map(({ to, label }) => (
                <Link key={to} to={to} className="transition hover:text-[#2C1F10]">
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-[#2C1F10]/55">
              <p>© {new Date().getFullYear()} 若水金禾 - 根本在旅行 / Nestobi</p>
              <div className="flex items-center gap-2">
                {adminLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    aria-label={label}
                    title={label}
                    className="flex h-6 w-6 items-center justify-center text-[#2C1F10]/55 transition hover:text-[#2C1F10]"
                  >
                    <Icon size={14} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
