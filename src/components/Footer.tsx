import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  Coffee,
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
    journeyEyebrow: pick(locale, '下一段旅程', 'Your next journey', '次の旅へ', '다음 여행'),
    journeyTitle: pick(locale, '從想去的地方，開始規劃。', 'Start with somewhere you want to go.', '行きたい場所から、旅を始めよう。', '가고 싶은 곳에서 여행을 시작하세요.'),
    journeyDesc: pick(locale, '找住宿、挑旅途用品，或先讀一篇在地故事。', 'Find a stay, pick up travel goods, or begin with a local story.', '宿を探し、旅の道具を選び、まずは土地の物語を読んでみましょう。', '숙소를 찾고 여행 용품을 고르거나 지역 이야기부터 읽어보세요.'),
    stays: pick(locale, '探索住宿', 'Explore stays', '宿を探す', '숙소 찾기'),
    shop: pick(locale, '逛旅行商城', 'Shop travel goods', '旅の買い物', '여행 상품 보기'),
    journal: pick(locale, '閱讀旅誌', 'Read the journal', '旅の記事を読む', '여행 이야기 읽기'),
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

  const journeyLinks = [
    { to: '/rooms', label: t.stays, eyebrow: 'STAY', icon: Hotel },
    { to: '/shop', label: t.shop, eyebrow: 'SHOP', icon: ShoppingBag },
    { to: '/blog', label: t.journal, eyebrow: 'JOURNAL', icon: Coffee },
  ] as const;

  return (
    <footer className="overflow-hidden bg-[#17130F] text-stone-100">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(192,154,106,0.22),transparent_42%)]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end lg:px-12 lg:py-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">{t.journeyEyebrow}</p>
            <h2 className="mt-3 max-w-xl font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              {footerText('footer-journey-title', 'title', t.journeyTitle)}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-stone-300 sm:text-base">{t.journeyDesc}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {journeyLinks.map(({ to, label, eyebrow, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex min-h-32 flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition hover:-translate-y-1 hover:border-amber-300/40 hover:bg-white/[0.1]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[0.18em] text-stone-400">{eyebrow}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-amber-200 transition group-hover:bg-amber-300 group-hover:text-stone-950"><Icon size={17} /></span>
                </div>
                <span className="mt-6 flex items-end justify-between gap-3 font-semibold text-white">
                  {label}
                  <ArrowUpRight size={17} className="shrink-0 text-stone-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-300" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-7 flex flex-wrap items-center gap-5 rounded-3xl bg-white/[0.04] p-5">
              {brandLogos.map((logo) => (
                <span key={logo.alt} className="flex min-h-16 min-w-28 flex-1 items-center justify-center rounded-2xl bg-[#F7F1E8] px-4">
                  <img src={logo.src} alt={logo.alt} className={`${logo.className} max-w-full object-contain`} />
                </span>
              ))}
            </div>
            <p className="mb-6 max-w-2xl text-sm leading-7 text-stone-400">{t.intro}</p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-stone-300 transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-amber-300 hover:text-stone-950"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{t.contact}</h4>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-stone-300">
                  <div className="mb-1 flex items-center gap-2">
                    <Phone size={14} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">
                      {pick(locale, '客服電話', 'Support Phone', 'サポート電話', '고객센터 전화')}
                    </span>
                  </div>
                  <div className="font-medium text-white">{settings.contact_phone || '02-27565663'}</div>
                  <div className="mt-1 text-xs leading-5 text-stone-500">{t.workday}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-stone-300">
                  <div className="mb-1 flex items-center gap-2">
                    <Mail size={14} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">
                      {pick(locale, '客服信箱', 'Support Email', 'サポートメール', '고객센터 이메일')}
                    </span>
                  </div>
                  <div className="break-all font-medium text-white">{settings.contact_email || 'service@dlalshop.com'}</div>
                  <div className="mt-1 text-xs leading-5 text-stone-500">{t.aiHours}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-stone-300 sm:col-span-2">
                  <div className="mb-1 flex items-center gap-2">
                    <MapPin size={14} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">{t.companyInfo}</span>
                  </div>
                  <div className="font-medium text-white">{settings.company_name || '若水金禾餐飲股份有限公司'}</div>
                  <div className="mt-1 text-xs leading-5 text-stone-500">
                    {t.taxId}：{settings.company_no || '83122492'} / {t.headquarters}：{settings.headquarters_address || '台北市信義區忠孝東路四段553巷22弄4-1號'}
                  </div>
                </div>

                <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-stone-300 transition hover:border-amber-300/40 hover:text-amber-200 sm:col-span-2 sm:justify-self-start">
                  <FileText size={14} />
                  <span>{t.contactForm}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-stone-400">
              {policyLinks.map(({ to, label }) => (
                <Link key={to} to={to} className="transition hover:text-amber-200">
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
              <p>© {new Date().getFullYear()} 若水金禾 - 根本在旅行 / Nestobi</p>
              <div className="flex items-center gap-2">
                {adminLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    aria-label={label}
                    title={label}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 transition hover:border-amber-300/40 hover:text-amber-200"
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
