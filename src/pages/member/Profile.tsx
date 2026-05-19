import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, FileText, Globe, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const LANGUAGES = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const Profile: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [nationality, setNationality] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('zh-TW');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      setNationality(profile.nationality || '');
      setPreferredLanguage(profile.preferred_language || 'zh-TW');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await updateProfile({ display_name: displayName, phone, bio, nationality, preferred_language: preferredLanguage });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('儲存失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><User className="w-5 h-5 text-[#2C1F10]" />個人資料</h2>

        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">
            <CheckCircle className="w-4 h-4" />資料已成功儲存！
          </motion.div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><User className="w-4 h-4" />顯示名稱</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="請輸入名稱" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Phone className="w-4 h-4" />電話號碼</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09XX-XXX-XXX" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FileText className="w-4 h-4" />個人簡介</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="介紹一下自己..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10] resize-none" />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Globe className="w-4 h-4" />國籍</label>
              <input type="text" value={nationality} onChange={e => setNationality(e.target.value)} placeholder="Taiwan" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">偏好語言</label>
              <select value={preferredLanguage} onChange={e => setPreferredLanguage(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10] bg-white">
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="bg-[#C09A6A] hover:bg-[#8B6840] text-white font-semibold px-8 py-3 rounded-xl transition shadow-md disabled:opacity-60 flex items-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '儲存變更'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
