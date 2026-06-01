import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, DollarSign, Eye, EyeOff, Globe, Lock, Settings, Sun } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

interface Prefs {
  notifications_email: boolean;
  notifications_sms: boolean;
  theme: string;
  currency: string;
  language: string;
}

interface PreferenceRow extends Prefs {
  id: string;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const DEFAULT_PREFS: Prefs = {
  notifications_email: true,
  notifications_sms: false,
  theme: 'light',
  currency: 'TWD',
  language: 'zh-TW',
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[#C09A6A]' : 'bg-gray-300'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const Preferences: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const text = {
    genericError: pick('發生錯誤，請稍後再試。', 'Something went wrong. Please try again.', '問題が発生しました。しばらくしてから再試行してください。', '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'),
    title: pick('偏好設定', 'Preferences', '設定', '환경설정'),
    saved: pick('偏好設定已儲存', 'Preferences saved successfully', '設定を保存しました', '설정을 저장했습니다'),
    notifications: pick('通知設定', 'Notifications', '通知設定', '알림 설정'),
    emailNoti: pick('Email 通知', 'Email notifications', 'メール通知', '이메일 알림'),
    emailHint: pick('接收訂房與訂單更新通知', 'Receive booking and order updates via email', '予約と注文の更新を受け取る', '예약 및 주문 업데이트 알림 수신'),
    smsNoti: pick('簡訊通知', 'SMS notifications', 'SMS通知', 'SMS 알림'),
    smsHint: pick('接收重要提醒簡訊', 'Receive important notices by SMS', '重要なお知らせをSMSで受け取る', '중요 알림을 SMS로 수신'),
    appearance: pick('外觀', 'Appearance', '外観', '외관'),
    theme: pick('主題', 'Theme', 'テーマ', '테마'),
    light: pick('淺色', 'Light', 'ライト', '라이트'),
    dark: pick('深色', 'Dark', 'ダーク', '다크'),
    languageCurrency: pick('語言與幣別', 'Language & Currency', '言語と通貨', '언어 및 통화'),
    language: pick('語言', 'Language', '言語', '언어'),
    currency: pick('貨幣', 'Currency', '通貨', '통화'),
    save: pick('儲存設定', 'Save preferences', '設定を保存', '설정 저장'),
    passwordSection: pick('修改密碼', 'Change Password', 'パスワード変更', '비밀번호 변경'),
    passwordSaved: pick('密碼已更新', 'Password updated successfully', 'パスワードを更新しました', '비밀번호를 업데이트했습니다'),
    currentPassword: pick('目前密碼', 'Current password', '現在のパスワード', '현재 비밀번호'),
    newPassword: pick('新密碼', 'New password', '新しいパスワード', '새 비밀번호'),
    confirmPassword: pick('確認新密碼', 'Confirm new password', '新しいパスワード（確認）', '새 비밀번호 확인'),
    currentPlaceholder: pick('請輸入目前密碼', 'Enter current password', '現在のパスワードを入力', '현재 비밀번호를 입력하세요'),
    newPlaceholder: pick('至少 6 個字元', 'At least 6 characters', '6文字以上', '최소 6자 이상'),
    confirmPlaceholder: pick('請再次輸入新密碼', 'Re-enter new password', '新しいパスワードを再入力', '새 비밀번호를 다시 입력하세요'),
    updatePassword: pick('更新密碼', 'Update password', 'パスワードを更新', '비밀번호 업데이트'),
    shortPassword: pick('密碼至少需要 6 個字元', 'Password must be at least 6 characters', 'パスワードは6文字以上で入力してください', '비밀번호는 최소 6자 이상이어야 합니다'),
    mismatchPassword: pick('新密碼與確認密碼不一致', 'Passwords do not match', '新しいパスワードが一致しません', '새 비밀번호가 일치하지 않습니다'),
    wrongCurrentPassword: pick('目前密碼錯誤', 'Current password is incorrect', '現在のパスワードが正しくありません', '현재 비밀번호가 올바르지 않습니다'),
    zhTw: pick('繁體中文', 'Traditional Chinese', '繁體中文', '번체 중국어'),
    en: 'English',
    ja: '日本語',
    ko: '한국어',
    twd: pick('新台幣 (TWD)', 'New Taiwan Dollar (TWD)', 'ニュー台湾ドル (TWD)', '신 타이완 달러 (TWD)'),
    usd: pick('美元 (USD)', 'US Dollar (USD)', '米ドル (USD)', '미국 달러 (USD)'),
    jpy: pick('日圓 (JPY)', 'Japanese Yen (JPY)', '日本円 (JPY)', '일본 엔 (JPY)'),
  };

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

    if (newPw.length < 6) {
      setPwError(text.shortPassword);
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(text.mismatchPassword);
      return;
    }

    setPwLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPw,
      });
      if (signInErr) {
        setPwError(text.wrongCurrentPassword);
        setPwLoading(false);
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (error) {
      setPwError(getErrorMessage(error, text.genericError));
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <Settings className="h-5 w-5 text-gray-600" />
        {text.title}
      </h2>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          <CheckCircle className="h-4 w-4" />
          {text.saved}
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
            <Bell className="h-4 w-4 text-[#2C1F10]" />
            {text.notifications}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{text.emailNoti}</p>
                <p className="text-xs text-gray-500">{text.emailHint}</p>
              </div>
              <Toggle checked={prefs.notifications_email} onChange={v => setPreference('notifications_email', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{text.smsNoti}</p>
                <p className="text-xs text-gray-500">{text.smsHint}</p>
              </div>
              <Toggle checked={prefs.notifications_sms} onChange={v => setPreference('notifications_sms', v)} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
            <Sun className="h-4 w-4 text-[#2C1F10]" />
            {text.appearance}
          </h3>
          <label className="mb-1 block text-sm font-medium text-gray-700">{text.theme}</label>
          <select
            value={prefs.theme}
            onChange={e => setPreference('theme', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
          >
            <option value="light">{text.light}</option>
            <option value="dark">{text.dark}</option>
          </select>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
            <DollarSign className="h-4 w-4 text-[#2C1F10]" />
            {text.languageCurrency}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700">
                <Globe className="h-4 w-4" />
                {text.language}
              </label>
              <select
                value={prefs.language}
                onChange={e => setPreference('language', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              >
                <option value="zh-TW">{text.zhTw}</option>
                <option value="en">{text.en}</option>
                <option value="ja">{text.ja}</option>
                <option value="ko">{text.ko}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{text.currency}</label>
              <select
                value={prefs.currency}
                onChange={e => setPreference('currency', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              >
                <option value="TWD">{text.twd}</option>
                <option value="USD">{text.usd}</option>
                <option value="JPY">{text.jpy}</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#C09A6A] px-8 py-3 font-semibold text-white shadow-md transition hover:bg-[#8B6840] disabled:opacity-60"
        >
          {saving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : text.save}
        </button>
      </form>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
          <Lock className="h-4 w-4 text-[#2C1F10]" />
          {text.passwordSection}
        </h3>
        {pwSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            {text.passwordSaved}
          </motion.div>
        )}
        {pwError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pwError}</div>}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{text.currentPassword}</label>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                required
                placeholder={text.currentPlaceholder}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{text.newPassword}</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required
                  placeholder={text.newPlaceholder}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{text.confirmPassword}</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                placeholder={text.confirmPlaceholder}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 rounded-xl bg-[#2C1F10] px-8 py-3 font-semibold text-white shadow-md transition hover:bg-[#1A1208] disabled:opacity-60"
          >
            {pwLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : text.updatePassword}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Preferences;

