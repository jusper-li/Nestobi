import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Cookie, Settings, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const CONSENT_VERSION = 1;
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
  version: number;
  decidedAt: string;
  preferences: CookiePreferences;
}

const REQUIRED_ONLY: CookiePreferences = {
  necessary: true,
  analytics: false,
  personalization: false,
  marketing: false,
};

const ALL_ALLOWED: CookiePreferences = {
  necessary: true,
  analytics: true,
  personalization: true,
  marketing: true,
};

const OPTIONS: Array<{
  id: OptionalCategory;
  title: string;
  description: string;
}> = [
  {
    id: 'analytics',
    title: '網站分析',
    description: '協助我們理解頁面瀏覽與功能使用狀況，用來改善版面與服務速度。',
  },
  {
    id: 'personalization',
    title: '個人化體驗',
    description: '記住偏好設定，例如語言、顯示方式與旅遊內容排序。',
  },
  {
    id: 'marketing',
    title: '行銷與再行銷',
    description: '用於衡量活動成效，並在取得同意後提供更相關的優惠與內容。',
  },
];

function readConsent(): CookieConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (parsed.version !== CONSENT_VERSION || !parsed.preferences?.necessary) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(preferences: CookiePreferences) {
  const record: CookieConsentRecord = {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    preferences: { ...preferences, necessary: true },
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));

  const cookieValue = encodeURIComponent(JSON.stringify(record));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${cookieValue}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;

  window.dispatchEvent(new CustomEvent('nestobi-cookie-consent', { detail: record }));
  return record;
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
        checked ? 'bg-[#2C1F10]' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:ring-2 hover:ring-[#C09A6A]/30'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(REQUIRED_ONLY);

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

  const enabledCount = useMemo(
    () => OPTIONS.filter(option => preferences[option.id]).length,
    [preferences],
  );

  const commit = (next: CookiePreferences) => {
    writeConsent(next);
    setPreferences(next);
    setVisible(false);
    setSettingsOpen(false);
  };

  const updateOption = (key: OptionalCategory) => {
    setPreferences(current => ({ ...current, [key]: !current[key] }));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6 sm:pb-6"
          role="region"
          aria-label="Cookie 授權同意"
        >
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-[#2C1F10]/10 bg-white shadow-2xl">
            <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#C09A6A]/15 text-[#8B6840]">
                    <Cookie size={22} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-[#2C1F10]">Cookie 授權同意</h2>
                    <p className="mt-2 text-sm leading-6 text-[#2C1F10]/70">
                      Nestobi 會使用必要 Cookie 維持登入、購物車與安全性。經你同意後，我們也會使用分析、個人化與行銷 Cookie 改善服務體驗。
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#2C1F10]/55">
                      <Link to="/cookies" className="font-semibold text-[#8B6840] transition hover:text-[#2C1F10]">
                        Cookie 政策
                      </Link>
                      <span>已選擇 {enabledCount} 項非必要類別</span>
                    </div>
                  </div>
                </div>

                {settingsOpen && (
                  <div className="mt-5 space-y-3">
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#2C1F10]/10 bg-[#FEF9EC] p-4">
                      <div>
                        <p className="font-semibold text-[#2C1F10]">必要 Cookie</p>
                        <p className="mt-1 text-sm leading-6 text-[#2C1F10]/62">維持網站安全、登入狀態、購物車與基本導覽，無法停用。</p>
                      </div>
                      <Toggle checked disabled />
                    </div>

                    {OPTIONS.map(option => (
                      <div key={option.id} className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 p-4">
                        <div>
                          <p className="font-semibold text-[#2C1F10]">{option.title}</p>
                          <p className="mt-1 text-sm leading-6 text-[#2C1F10]/62">{option.description}</p>
                        </div>
                        <Toggle checked={preferences[option.id]} onChange={() => updateOption(option.id)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-[#2C1F10]/10 bg-[#F8F4EA] p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2C1F10]">
                    <ShieldCheck size={17} className="text-[#8B6840]" />
                    你可以隨時在頁尾重新調整
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#2C1F10]/62">
                    拒絕非必要 Cookie 不會影響訂房、購物與會員功能。
                  </p>
                </div>

                <div className="space-y-2">
                  {settingsOpen ? (
                    <>
                      <button
                        type="button"
                        onClick={() => commit(preferences)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2C1F10] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#8B6840]"
                      >
                        <Check size={16} />
                        儲存偏好
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen(false)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2C1F10]/15 bg-white px-4 py-3 text-sm font-semibold text-[#2C1F10]/70 transition hover:text-[#2C1F10]"
                      >
                        <X size={16} />
                        返回
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => commit(ALL_ALLOWED)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2C1F10] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#8B6840]"
                      >
                        <Check size={16} />
                        接受全部
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2C1F10]/15 bg-white px-4 py-3 text-sm font-semibold text-[#2C1F10] transition hover:border-[#C09A6A]"
                      >
                        <Settings size={16} />
                        偏好設定
                      </button>
                      <button
                        type="button"
                        onClick={() => commit(REQUIRED_ONLY)}
                        className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2C1F10]/58 transition hover:bg-white/70 hover:text-[#2C1F10]"
                      >
                        拒絕非必要
                      </button>
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
