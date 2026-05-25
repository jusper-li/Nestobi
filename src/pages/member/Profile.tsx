import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, FileText, Globe, Phone, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Profile: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const text = {
    title: isEn ? 'Profile' : '個人資料',
    saved: isEn ? 'Profile updated successfully' : '個人資料已更新',
    saveFailed: isEn ? 'Failed to save profile. Please try again.' : '儲存個人資料失敗，請稍後再試。',
    displayName: isEn ? 'Display name' : '顯示名稱',
    phone: isEn ? 'Phone' : '手機號碼',
    bio: isEn ? 'Bio' : '自我介紹',
    nationality: isEn ? 'Nationality' : '國籍',
    preferredLanguage: isEn ? 'Preferred language' : '偏好語言',
    save: isEn ? 'Save Changes' : '儲存變更',
    displayNamePlaceholder: isEn ? 'Enter your display name' : '請輸入顯示名稱',
    phonePlaceholder: '09XX-XXX-XXX',
    bioPlaceholder: isEn ? 'Tell us a little about yourself...' : '簡單介紹一下你自己...',
    nationalityPlaceholder: isEn ? 'e.g. Taiwan' : '例如：台灣',
  };

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
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
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
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-[#C09A6A] px-8 py-3 font-semibold text-white shadow-md transition hover:bg-[#8B6840] disabled:opacity-60">
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : text.save}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
