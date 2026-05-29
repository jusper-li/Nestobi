import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Cookie, Settings, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang } from '../lib/i18n';

const STORAGE_KEY = 'nestobi:cookie-consent:v1';
const COOKIE_NAME = 'nestobi_cookie_consent';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
type OptionalCategory = 'analytics' | 'personalization' | 'marketing';

interface CookiePreferences {
  necessary: true;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
}
interface CookieConsentRecord {
  version: 1;
  decidedAt: string;
  preferences: CookiePreferences;
}

const REQUIRED_ONLY: CookiePreferences = { necessary: true, analytics: false, personalization: false, marketing: false };
const ALL_ALLOWED: CookiePreferences = { necessary: true, analytics: true, personalization: true, marketing: true };

function readConsent(): CookieConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsentRecord;
  } catch {
    return null;
  }
}
function writeConsent(preferences: CookiePreferences) {
  const record: CookieConsentRecord = { version: 1, decidedAt: new Date().toISOString(), preferences };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(record))}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent('nestobi-cookie-consent', { detail: record }));
}

const Toggle = ({ checked, disabled, onClick }: { checked: boolean; disabled?: boolean; onClick?: () => void }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`relative inline-flex h-6 w-11 items-center rounded-full ${checked ? 'bg-[#2C1F10]' : 'bg-gray-300'} ${disabled ? 'opacity-70' : ''}`}
  >
    <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export default function CookieConsent() {
  const { lang } = useLanguage();
  const n = normalizeLang(lang);
  const locale = n === 'zh-TW' ? 'zh' : n;
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(REQUIRED_ONLY);

  const t = useMemo(() => {
    if (locale === 'en') {
      return {
        title: 'Cookie Consent', desc: 'Nestobi uses cookies for login, cart, and security. With your consent, we also use analytics, personalization, and marketing cookies.',
        policy: 'Cookie Policy', selected: 'Selected', suffix: 'optional categories',
        necessary: 'Necessary Cookies', necessaryDesc: 'Required for site security and core features. Cannot be disabled.',
        analytics: 'Analytics', analyticsDesc: 'Helps us improve page and feature performance.',
        personalization: 'Personalization', personalizationDesc: 'Remembers language and display preferences.',
        marketing: 'Marketing', marketingDesc: 'Shows more relevant promotions with your consent.',
        canChange: 'You can change this anytime in the footer', save: 'Save Preferences', back: 'Back',
        acceptAll: 'Accept All', prefs: 'Preferences', reject: 'Reject Optional',
      };
    }
    if (locale === 'ja') {
      return {
        title: 'Cookie同意設定', desc: 'Nestobiはログイン・カート・安全性のためにCookieを使用します。同意後、分析・個人化・マーケティングCookieも利用します。',
        policy: 'Cookieポリシー', selected: '選択済み', suffix: '任意カテゴリ',
        necessary: '必須Cookie', necessaryDesc: 'サイト安全性と基本機能に必要です。無効化できません。',
        analytics: '分析', analyticsDesc: 'ページと機能の改善に利用します。',
        personalization: 'パーソナライズ', personalizationDesc: '言語や表示設定を記憶します。',
        marketing: 'マーケティング', marketingDesc: '同意後に関連性の高い情報を表示します。',
        canChange: 'フッターからいつでも変更できます', save: '設定を保存', back: '戻る',
        acceptAll: 'すべて許可', prefs: '設定', reject: '任意を拒否',
      };
    }
    if (locale === 'ko') {
      return {
        title: '쿠키 동의 설정', desc: 'Nestobi는 로그인, 장바구니, 보안을 위해 쿠키를 사용합니다. 동의 시 분석/개인화/마케팅 쿠키도 사용합니다.',
        policy: '쿠키 정책', selected: '선택됨', suffix: '선택 항목',
        necessary: '필수 쿠키', necessaryDesc: '사이트 보안과 기본 기능에 필요하며 비활성화할 수 없습니다.',
        analytics: '분석', analyticsDesc: '페이지 및 기능 개선에 사용됩니다.',
        personalization: '개인화', personalizationDesc: '언어 및 표시 설정을 기억합니다.',
        marketing: '마케팅', marketingDesc: '동의 시 더 관련성 높은 혜택을 제공합니다.',
        canChange: '푸터에서 언제든 변경할 수 있습니다', save: '설정 저장', back: '뒤로',
        acceptAll: '모두 허용', prefs: '환경설정', reject: '선택 쿠키 거부',
      };
    }
    return {
      title: 'Cookie 授權同意', desc: 'Nestobi 會使用必要 Cookie 維持登入、購物車與安全性。經您同意，我們也會使用分析、個人化與行銷 Cookie。',
      policy: 'Cookie 政策', selected: '已選擇', suffix: '項非必要類別',
      necessary: '必要 Cookie', necessaryDesc: '維持網站安全與基本功能所需，無法停用。',
      analytics: '網站分析', analyticsDesc: '協助改善頁面與功能體驗。',
      personalization: '個人化體驗', personalizationDesc: '記住語言與顯示偏好設定。',
      marketing: '行銷與再行銷', marketingDesc: '在同意後提供更相關的內容與優惠。',
      canChange: '你可以隨時在頁尾重新調整', save: '儲存偏好', back: '返回',
      acceptAll: '接受全部', prefs: '偏好設定', reject: '拒絕非必要',
    };
  }, [locale]);

  useEffect(() => {
    const existing = readConsent();
    if (existing) {
      setPreferences(existing.preferences);
      window.dispatchEvent(new CustomEvent('nestobi-cookie-consent', { detail: existing }));
    } else {
      setVisible(true);
    }
    const openSettings = () => {
      const latest = readConsent();
      setPreferences(latest?.preferences || REQUIRED_ONLY);
      setVisible(true);
      setSettingsOpen(true);
    };
    window.addEventListener('nestobi:open-cookie-settings', openSettings);
    return () => window.removeEventListener('nestobi:open-cookie-settings', openSettings);
  }, []);

  const enabled = [preferences.analytics, preferences.personalization, preferences.marketing].filter(Boolean).length;

  const commit = (next: CookiePreferences) => {
    writeConsent(next);
    setPreferences(next);
    setVisible(false);
    setSettingsOpen(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#2C1F10]/10 bg-white shadow-2xl">
            <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C09A6A]/15 text-[#8B6840]"><Cookie size={22} /></div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-[#2C1F10]">{t.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#2C1F10]/70">{t.desc}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#2C1F10]/55">
                      <Link to="/cookies" className="font-semibold text-[#8B6840] transition hover:text-[#2C1F10]">{t.policy}</Link>
                      <span>{t.selected} {enabled} {t.suffix}</span>
                    </div>
                  </div>
                </div>

                {settingsOpen && (
                  <div className="mt-5 space-y-3">
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#2C1F10]/10 bg-[#FEF9EC] p-4">
                      <div><p className="font-semibold text-[#2C1F10]">{t.necessary}</p><p className="mt-1 text-sm text-[#2C1F10]/62">{t.necessaryDesc}</p></div>
                      <Toggle checked disabled />
                    </div>
                    {(['analytics', 'personalization', 'marketing'] as OptionalCategory[]).map((key) => (
                      <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 p-4">
                        <div>
                          <p className="font-semibold text-[#2C1F10]">{t[key]}</p>
                          <p className="mt-1 text-sm text-[#2C1F10]/62">{t[`${key}Desc` as keyof typeof t]}</p>
                        </div>
                        <Toggle checked={preferences[key]} onClick={() => setPreferences(v => ({ ...v, [key]: !v[key] }))} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-[#2C1F10]/10 bg-[#F8F4EA] p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2C1F10]"><ShieldCheck size={17} className="text-[#8B6840]" />{t.canChange}</div>
                </div>
                <div className="space-y-2">
                  {settingsOpen ? (
                    <>
                      <button type="button" onClick={() => commit(preferences)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2C1F10] px-4 py-3 text-sm font-semibold text-white"><Check size={16} />{t.save}</button>
                      <button type="button" onClick={() => setSettingsOpen(false)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2C1F10]/15 bg-white px-4 py-3 text-sm font-semibold text-[#2C1F10]/70"><X size={16} />{t.back}</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => commit(ALL_ALLOWED)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2C1F10] px-4 py-3 text-sm font-semibold text-white"><Check size={16} />{t.acceptAll}</button>
                      <button type="button" onClick={() => setSettingsOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2C1F10]/15 bg-white px-4 py-3 text-sm font-semibold text-[#2C1F10]"><Settings size={16} />{t.prefs}</button>
                      <button type="button" onClick={() => commit(REQUIRED_ONLY)} className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2C1F10]/58">{t.reject}</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
