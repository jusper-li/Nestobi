import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Home, Lock, Plane } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const CONFIRM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password-confirm`;

const NewPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const t = {
    invalidLink: isEn ? 'Invalid reset link. Please request a new one.' : '重設連結無效，請重新申請。',
    mismatch: isEn ? 'Passwords do not match.' : '兩次輸入的密碼不一致。',
    tooShort: isEn ? 'Password must be at least 6 characters.' : '密碼至少需要 6 個字元。',
    expired: isEn
      ? 'Reset link is invalid or expired. Please request a new one.'
      : '重設連結已失效或過期，請重新申請。',
    userNotFound: isEn ? 'Account not found. Please check your email.' : '找不到帳號，請確認您的電子郵件。',
    resetFailed: isEn ? 'Password reset failed. Please try again later.' : '密碼重設失敗，請稍後再試。',
    genericError: isEn ? 'Something went wrong. Please try again later.' : '系統發生錯誤，請稍後再試。',
    resetDone: isEn ? 'Password Updated' : '密碼已更新',
    resetDoneDesc: isEn
      ? 'Your password has been updated. Please sign in with your new password.'
      : '您的密碼已更新，請使用新密碼登入。',
    toLogin: isEn ? 'Go to Login' : '前往登入',
    backLogin: isEn ? 'Back to Login' : '返回登入',
    home: isEn ? 'Home' : '回首頁',
    title: isEn ? 'Set New Password' : '設定新密碼',
    subtitle: isEn ? 'Please enter your new password' : '請輸入您的新密碼',
    retry: isEn ? 'Request Again' : '重新申請',
    newPassword: isEn ? 'New Password' : '新密碼',
    confirmPassword: isEn ? 'Confirm New Password' : '確認新密碼',
    newPlaceholder: isEn ? 'At least 6 characters' : '至少 6 個字元',
    confirmPlaceholder: isEn ? 'Enter new password again' : '再次輸入新密碼',
    submit: isEn ? 'Confirm Reset Password' : '確認重設密碼',
  };

  useEffect(() => {
    if (!token) setError(t.invalidLink);
  }, [token, t.invalidLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t.mismatch);
      return;
    }
    if (password.length < 6) {
      setError(t.tooShort);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(CONFIRM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgMap: Record<string, string> = {
          'Invalid or expired token': t.expired,
          'Token has expired': t.expired,
          'User not found': t.userNotFound,
        };
        setError(msgMap[data.error] || t.resetFailed);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t.genericError);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F0E4C8] via-white to-[#F0E4C8] px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="rounded-2xl bg-white p-10 shadow-xl">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-gray-900">{t.resetDone}</h2>
            <p className="mb-8 text-gray-500">{t.resetDoneDesc}</p>
            <button
              onClick={() => navigate('/auth/login')}
              className="w-full rounded-xl bg-[#C09A6A] py-3 font-semibold text-white transition hover:bg-[#8B6840]"
            >
              {t.toLogin}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F0E4C8] via-white to-[#F0E4C8] px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate('/auth/login')} className="group flex items-center gap-2 text-gray-500 transition-colors hover:text-[#2C1F10]">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            <span className="text-sm font-medium">{t.backLogin}</span>
          </button>
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-[#2C1F10]">
            <Home className="h-4 w-4" />
            {t.home}
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C09A6A] shadow-lg">
            <Plane className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="mt-1 text-gray-500">{t.subtitle}</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
              {!token && (
                <Link to="/auth/reset-password" className="ml-1 font-medium underline">
                  {t.retry}
                </Link>
              )}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.newPassword}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={!token}
                  placeholder={t.newPlaceholder}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-12 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10] disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.confirmPassword}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  disabled={!token}
                  placeholder={t.confirmPlaceholder}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10] disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C09A6A] py-3 font-semibold text-white shadow-md transition-all duration-200 hover:bg-[#8B6840] hover:shadow-lg disabled:opacity-60"
            >
              {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t.submit}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default NewPassword;
