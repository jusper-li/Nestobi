import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Cookie, Settings, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

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
  const normalizedLang = normalizeLang(lang);
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(REQUIRED_ONLY);

  const t = useMemo(() => ({
    title: t4('Cookie 授權同意', 'Cookie Consent', 'Cookie 同意設定', '쿠키 동의 설정'),
    desc: t4(
      'Nestobi 會使用必要 Cookie 維持登入、購物車與安全性。經你同意後，我們也會使用分析、個人化與行銷 Cookie 改善服務體驗。',
      'Nestobi uses essential cookies for login, cart, and security. With your consent, we also use analytics, personalization, and marketing cookies.',
      'Nestobi はログイン・カート・安全性のために必須 Cookie を使用します。同意後は分析・パーソナライズ・マーケティング Cookie も利用します。',
      'Nestobi는 로그인, 장바구니, 보안을 위해 필수 쿠키를 사용합니다. 동의 시 분석, 개인화, 마케팅 쿠키도 사용합니다.',
    ),
    policy: t4('Cookie 政策', 'Cookie Policy', 'Cookie ポリシー', '쿠키 정책'),
    selected: t4('已選擇', 'Selected', '選択済み', '선택됨'),
    suffix: t4('項非必要類別', 'optional categories', '項目の任意カテゴリ', '개 선택 카테고리'),
    necessary: t4('必要 Cookie', 'Necessary Cookies', '必須 Cookie', '필수 쿠키'),
    necessaryDesc: t4('維持網站安全、登入狀態、購物車與基本導覽，無法停用。', 'Required for security and core features. Cannot be disabled.', 'セキュリティと基本機能に必要で、無効化できません。', '보안과 핵심 기능에 필요하며 비활성화할 수 없습니다.'),
    analytics: t4('網站分析', 'Analytics', '分析', '분석'),
    analyticsDesc: t4('協助我們理解頁面瀏覽與功能使用狀況，用來改善版面與服務速度。', 'Helps us improve performance and usability.', '表示速度や使いやすさの改善に使います。', '성능과 사용성을 개선하는 데 사용됩니다.'),
    personalization: t4('個人化體驗', 'Personalization', 'パーソナライズ', '개인화'),
    personalizationDesc: t4('記住偏好設定，例如語言、顯示方式與旅遊內容排序。', 'Remembers language and display preferences.', '言語や表示設定などの好みを記憶します。', '언어/표시 선호를 기억합니다.'),
    marketing: t4('行銷與再行銷', 'Marketing', 'マーケティング', '마케팅'),
    marketingDesc: t4('用於衡量活動成效，並在取得同意後提供更相關的優惠與內容。', 'Used to measure campaigns and show relevant offers.', '効果測定と関連性の高い提案に使用します。', '캠페인 측정 및 관련 혜택 노출에 사용됩니다.'),
    canChange: t4('你可以隨時在頁尾重新調整', 'You can change this anytime in the footer', 'フッターからいつでも変更できます', '푸터에서 언제든 변경할 수 있습니다'),
    save: t4('儲存偏好', 'Save Preferences', '設定を保存', '설정 저장'),
    back: t4('返回', 'Back', '戻る', '뒤로'),
    acceptAll: t4('全部接受', 'Accept All', 'すべて許可', '모두 허용'),
    prefs: t4('Cookie 設定', 'Preferences', 'Cookie 設定', '쿠키 설정'),
    reject: t4('拒絕非必要', 'Reject Optional', '任意項目を拒否', '선택 쿠키 거부'),
  }), [t4]);

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
                        <div><p className="font-semibold text-[#2C1F10]">{t[key]}</p><p className="mt-1 text-sm text-[#2C1F10]/62">{t[`${key}Desc` as keyof typeof t]}</p></div>
                        <Toggle checked={preferences[key]} onClick={() => setPreferences(v => ({ ...v, [key]: !v[key] }))} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-between gap-3 border-t border-[#2C1F10]/10 bg-[#F8F4EA] p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2C1F10]"><ShieldCheck size={17} className="text-[#8B6840]" />{t.canChange}</div>
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
