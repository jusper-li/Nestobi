import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, Sun, DollarSign, Globe, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Prefs { notifications_email: boolean; notifications_sms: boolean; theme: string; currency: string; language: string; }
interface PreferenceRow extends Prefs { id: string; }

const DEFAULT_PREFS: Prefs = { notifications_email: true, notifications_sms: false, theme: 'light', currency: 'TWD', language: 'zh-TW' };

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return '操作失敗，請稍後再試';
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button type="button" onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[#C09A6A]' : 'bg-gray-300'}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const Preferences: React.FC = () => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [prefId, setPrefId] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPw.length < 6) { setPwError('新密碼至少需要 6 個字元'); return; }
    if (newPw !== confirmPw) { setPwError('兩次輸入的密碼不一致'); return; }
    setPwLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPw,
      });
      if (signInErr) { setPwError('目前密碼不正確'); setPwLoading(false); return; }
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).limit(1);
      const row = data?.[0] as PreferenceRow | undefined;
      if (row) {
        setPrefs({
          notifications_email: row.notifications_email,
          notifications_sms: row.notifications_sms,
          theme: row.theme,
          currency: row.currency,
          language: row.language,
        });
        setPrefId(row.id);
      }
      setLoading(false);
    };
    fetchPrefs();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (prefId) {
        await supabase.from('user_preferences').update(prefs).eq('id', prefId);
      } else {
        const { data } = await supabase.from('user_preferences').insert({ user_id: user!.id, ...prefs }).select().single();
        if (data) setPrefId(data.id);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const setPreference = <K extends keyof Prefs>(key: K, value: Prefs[K]) => setPrefs(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-600" />偏好設定</h2>
      {success && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          <CheckCircle className="w-4 h-4" />設定已儲存！
        </motion.div>
      )}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-[#2C1F10]" />通知設定</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-gray-900 text-sm">電子郵件通知</p><p className="text-xs text-gray-500">接收訂單及促銷通知</p></div>
              <Toggle checked={prefs.notifications_email} onChange={v => setPreference('notifications_email', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-gray-900 text-sm">簡訊通知</p><p className="text-xs text-gray-500">接收重要訂單更新</p></div>
              <Toggle checked={prefs.notifications_sms} onChange={v => setPreference('notifications_sms', v)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Sun className="w-4 h-4 text-[#2C1F10]" />外觀</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主題</label>
            <select value={prefs.theme} onChange={e => setPreference('theme', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2C1F10]">
              <option value="light">淺色模式</option>
              <option value="dark">深色模式</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-[#2C1F10]" />語言與貨幣</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Globe className="w-4 h-4" />語言</label>
              <select value={prefs.language} onChange={e => setPreference('language', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2C1F10]">
                <option value="zh-TW">繁體中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">貨幣</label>
              <select value={prefs.currency} onChange={e => setPreference('currency', e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2C1F10]">
                <option value="TWD">新台幣 (TWD)</option>
                <option value="USD">美元 (USD)</option>
                <option value="JPY">日圓 (JPY)</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="bg-[#C09A6A] hover:bg-[#8B6840] text-white font-semibold px-8 py-3 rounded-xl transition shadow-md disabled:opacity-60 flex items-center gap-2">
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '儲存設定'}
        </button>
      </form>

      {/* Change Password */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-[#2C1F10]" />變更密碼</h3>
        {pwSuccess && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">
            <CheckCircle className="w-4 h-4" />密碼已成功更新！
          </motion.div>
        )}
        {pwError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{pwError}</div>}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目前密碼</label>
            <div className="relative">
              <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} required placeholder="輸入目前密碼" className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
              <div className="relative">
                <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} required placeholder="至少 6 個字元" className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required placeholder="再次輸入新密碼" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
            </div>
          </div>
          <button type="submit" disabled={pwLoading} className="bg-[#2C1F10] hover:bg-[#1A1208] text-white font-semibold px-8 py-3 rounded-xl transition shadow-md disabled:opacity-60 flex items-center gap-2">
            {pwLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '更新密碼'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Preferences;
