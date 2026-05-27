import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, FileText, Globe, Phone, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const copy: Record<UiLang, Record<string, string>> = {
  'zh-TW': {
    title: '個人資料',
    saved: '個人資料更新成功',
    saveFailed: '儲存個人資料失敗，請稍後再試。',
    displayName: '顯示名稱',
    phone: '手機號碼',
    bio: '自我介紹',
    nationality: '國籍',
    preferredLanguage: '偏好語言',
    save: '儲存變更',
    displayNamePlaceholder: '請輸入顯示名稱',
    phonePlaceholder: '09XX-XXX-XXX',
    bioPlaceholder: '簡單介紹一下你自己...',
    nationalityPlaceholder: '例如：台灣',
    zhTw: '繁體中文',
    en: 'English',
    ja: '日本語',
    ko: '한국어',
  },
  en: {
    title: 'Profile',
    saved: 'Profile updated successfully',
    saveFailed: 'Failed to save profile. Please try again.',
    displayName: 'Display name',
    phone: 'Phone',
    bio: 'Bio',
    nationality: 'Nationality',
    preferredLanguage: 'Preferred language',
    save: 'Save changes',
    displayNamePlaceholder: 'Enter your display name',
    phonePlaceholder: '09XX-XXX-XXX',
    bioPlaceholder: 'Tell us a little about yourself...',
    nationalityPlaceholder: 'e.g. Taiwan',
    zhTw: 'Traditional Chinese',
    en: 'English',
    ja: 'Japanese',
    ko: 'Korean',
  },
  ja: {
    title: 'プロフィール',
    saved: 'プロフィールを更新しました',
    saveFailed: 'プロフィールの保存に失敗しました。しばらくしてから再度お試しください。',
    displayName: '表示名',
    phone: '電話番号',
    bio: '自己紹介',
    nationality: '国籍',
    preferredLanguage: '希望言語',
    save: '変更を保存',
    displayNamePlaceholder: '表示名を入力してください',
    phonePlaceholder: '09XX-XXX-XXX',
    bioPlaceholder: '自己紹介を入力してください...',
    nationalityPlaceholder: '例：台湾',
    zhTw: '繁體中文',
    en: 'English',
    ja: '日本語',
    ko: '한국어',
  },
  ko: {
    title: '프로필',
    saved: '프로필이 성공적으로 저장되었습니다',
    saveFailed: '프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    displayName: '표시 이름',
    phone: '휴대폰 번호',
    bio: '자기소개',
    nationality: '국적',
    preferredLanguage: '선호 언어',
    save: '변경 저장',
    displayNamePlaceholder: '표시 이름을 입력하세요',
    phonePlaceholder: '09XX-XXX-XXX',
    bioPlaceholder: '자기소개를 입력해 주세요...',
    nationalityPlaceholder: '예: 대만',
    zhTw: '繁體中文',
    en: 'English',
    ja: '日本語',
    ko: '한국어',
  },
};

const Profile: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const { lang } = useLanguage();
  const locale = (lang === 'ja' || lang === 'ko' || lang === 'en' ? lang : 'zh-TW') as UiLang;
  const text = copy[locale];

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [nationality, setNationality] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('zh-TW');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
    </div>
  );
};

export default Profile;
