import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Coffee, FileText, Globe, Phone, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const COFFEE_PROFILE_META = {
  bright_explorer: {
    zh: '明亮探索型',
    en: 'Bright Explorer',
    ja: '明るい探究型',
    ko: '밝은 탐색형',
    summary: {
      zh: '喜歡果香、清爽酸質與多層次風味，適合從淺焙精品豆開始探索。',
      en: 'You enjoy fruity notes, bright acidity, and layered flavors. A great starting point for light-roast specialty beans.',
      ja: 'フルーティーさ、爽やかな酸味、複雑な風味を好みます。浅煎りのスペシャルティ豆から始めるのに向いています。',
      ko: '과일향, 산뜻한 산미, 다층적인 풍미를 선호합니다. 라이트 로스트 스페셜티 원두로 탐색을 시작하기 좋습니다.',
    },
  },
  balanced_daily: {
    zh: '日常平衡型',
    en: 'Balanced Daily',
    ja: 'バランス日常型',
    ko: '균형형 데일리',
    summary: {
      zh: '喜歡穩定、順口、每天都能喝的平衡風味，適合中焙與均衡口感。',
      en: 'You prefer a stable, smooth cup that works every day, with a balanced medium-roast profile.',
      ja: '安定感があり、毎日飲みやすいバランスのよい風味が好みです。中煎りの豆が向いています。',
      ko: '안정적이고 부드러워 매일 마시기 좋은 균형 잡힌 풍미를 선호합니다. 미디엄 로스트가 잘 맞습니다.',
    },
  },
  sweet_smooth: {
    zh: '柔順甜感型',
    en: 'Sweet Smooth',
    ja: 'やさしい甘さ型',
    ko: '부드러운 단맛형',
    summary: {
      zh: '偏好柔和、甜感明顯、口感圓潤的咖啡，適合中淺焙與風味清晰的豆子。',
      en: 'You like soft, sweet, and round cups. Medium-light roasts with clear flavor notes are a great match.',
      ja: 'やわらかく、甘さと丸みのある味わいが好みです。中浅煎りで風味が明瞭な豆が合います。',
      ko: '부드럽고 달콤하며 둥근 질감의 커피를 좋아합니다. 미디엄 라이트 로스트가 잘 어울립니다.',
    },
  },
  bold_classic: {
    zh: '濃郁厚實型',
    en: 'Bold Classic',
    ja: 'しっかり濃厚型',
    ko: '진하고 묵직한 타입',
    summary: {
      zh: '喜歡厚實、苦甜明顯、存在感強的咖啡，適合深焙與濃縮或奶咖基底。',
      en: 'You enjoy a fuller-bodied, bolder cup with strong presence. Great for dark roasts, espresso, or milk drinks.',
      ja: '厚みがあり、苦味と甘さがしっかりした存在感のあるコーヒーが好みです。深煎りやエスプレッソ向きです。',
      ko: '묵직하고 진하며 존재감 있는 커피를 선호합니다. 다크 로스트, 에스프레소, 밀크 베이스 음료에 잘 맞습니다.',
    },
  },
} as const;

function getCoffeeProfileLabel(key: string, locale: UiLang, fallback: string) {
  const meta = COFFEE_PROFILE_META[key as keyof typeof COFFEE_PROFILE_META];
  if (!meta) return fallback;
  return meta[locale] || meta.zh || fallback;
}

function getCoffeeProfileSummary(key: string, locale: UiLang, fallback: string) {
  const meta = COFFEE_PROFILE_META[key as keyof typeof COFFEE_PROFILE_META];
  if (!meta) return fallback;
  return meta.summary[locale] || meta.summary.zh || fallback;
}

function getCoffeeScoreLabel(key: string, locale: UiLang) {
  const labels: Record<string, Record<UiLang, string>> = {
    bright_explorer: {
      'zh-TW': '明亮探索型',
      en: 'Bright Explorer',
      ja: '明るい探究型',
      ko: '밝은 탐색형',
    },
    balanced_daily: {
      'zh-TW': '日常平衡型',
      en: 'Balanced Daily',
      ja: 'バランス日常型',
      ko: '균형형 데일리',
    },
    sweet_smooth: {
      'zh-TW': '柔順甜感型',
      en: 'Sweet Smooth',
      ja: 'やさしい甘さ型',
      ko: '부드러운 단맛형',
    },
    bold_classic: {
      'zh-TW': '濃郁厚實型',
      en: 'Bold Classic',
      ja: 'しっかり濃厚型',
      ko: '진하고 묵직한 타입',
    },
  };

  return labels[key]?.[locale] || key.replace(/_/g, ' ');
}

const Profile: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const text = {
    title: pick('個人資料', 'Profile', 'プロフィール', '프로필'),
    saved: pick('個人資料已儲存', 'Profile updated successfully', 'プロフィールを保存しました', '프로필이 저장되었습니다'),
    saveFailed: pick(
      '儲存個人資料失敗，請稍後再試',
      'Failed to save profile. Please try again.',
      'プロフィールの保存に失敗しました。後でもう一度お試しください。',
      '프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'
    ),
    displayName: pick('顯示名稱', 'Display name', '表示名', '표시 이름'),
    phone: pick('手機號碼', 'Phone', '電話番号', '휴대폰 번호'),
    bio: pick('自我介紹', 'Bio', '自己紹介', '자기소개'),
    nationality: pick('國籍', 'Nationality', '国籍', '국적'),
    preferredLanguage: pick('偏好語言', 'Preferred language', '言語設定', '선호 언어'),
    save: pick('儲存變更', 'Save changes', '変更を保存', '변경 저장'),
    displayNamePlaceholder: pick('請輸入顯示名稱', 'Enter your display name', '表示名を入力', '표시 이름을 입력하세요'),
    phonePlaceholder: '09XX-XXX-XXX',
    bioPlaceholder: pick('簡單介紹一下你自己...', 'Tell us a little about yourself...', '自己紹介を入力してください...', '자기소개를 입력하세요...'),
    nationalityPlaceholder: pick('例如：台灣', 'e.g. Taiwan', '例：台湾', '예: 대만'),
    zhTw: pick('繁體中文', 'Traditional Chinese', '繁體中文', '번체 중국어'),
    en: 'English',
    ja: '日本語',
    ko: '한국어',
  };

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [nationality, setNationality] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('zh-TW');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const coffeeProfile = profile?.coffee_profile_label
    ? {
        key: profile.coffee_profile_key || '',
        label: getCoffeeProfileLabel(profile.coffee_profile_key || '', locale, profile.coffee_profile_label),
        summary: getCoffeeProfileSummary(profile.coffee_profile_key || '', locale, profile.coffee_profile_summary || ''),
        scores: profile.coffee_profile_scores || {},
      }
    : null;

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name || '');
    setPhone(profile.phone || '');
    setBio(profile.bio || '');
    setNationality(profile.nationality || '');
    setPreferredLanguage(profile.preferred_language || 'zh-TW');
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await updateProfile({
        display_name: displayName,
        phone,
        bio,
        nationality,
        preferred_language: preferredLanguage,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError(text.saveFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900">
          <User className="h-5 w-5 text-[#2C1F10]" />
          {text.title}
        </h2>

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            {text.saved}
          </motion.div>
        )}

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                <User className="h-4 w-4" />
                {text.displayName}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={text.displayNamePlaceholder}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                <Phone className="h-4 w-4" />
                {text.phone}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={text.phonePlaceholder}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
              <FileText className="h-4 w-4" />
              {text.bio}
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              placeholder={text.bioPlaceholder}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                <Globe className="h-4 w-4" />
                {text.nationality}
              </label>
              <input
                type="text"
                value={nationality}
                onChange={e => setNationality(e.target.value)}
                placeholder={text.nationalityPlaceholder}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{text.preferredLanguage}</label>
              <select
                value={preferredLanguage}
                onChange={e => setPreferredLanguage(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              >
                <option value="zh-TW">{text.zhTw}</option>
                <option value="en">{text.en}</option>
                <option value="ja">{text.ja}</option>
                <option value="ko">{text.ko}</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-[#C09A6A] px-8 py-3 font-semibold text-white shadow-md transition hover:bg-[#8B6840] disabled:opacity-60"
          >
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : text.save}
          </button>
        </form>
      </div>

      {coffeeProfile && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <Coffee className="h-5 w-5 text-[#2C1F10]" />
            {pick('咖啡偏好輪廓', 'Coffee profile', 'コーヒープロファイル', '커피 성향')}
          </h3>

          <div className="rounded-2xl border border-[#eadfce] bg-gradient-to-br from-[#fff9f0] to-white p-4">
            <p className="text-base font-bold text-[#3b2a19]">{coffeeProfile.label}</p>
            {coffeeProfile.summary && <p className="mt-2 text-sm leading-7 text-gray-700">{coffeeProfile.summary}</p>}
            {coffeeProfile.key && <p className="mt-3 text-xs text-gray-400">Key: {coffeeProfile.key}</p>}

            {coffeeProfile.scores && Object.keys(coffeeProfile.scores).length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {Object.entries(coffeeProfile.scores).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-[#f0e6d6] bg-white px-3 py-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between gap-2">
                      <span>{getCoffeeScoreLabel(key, locale)}</span>
                      <span className="font-semibold text-[#8a5a22]">{String(value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;


