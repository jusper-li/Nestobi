import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Home, Lock, Mail, Plane, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { generateOTP } from '../../lib/utils';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

export default function Register() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const t = {
    back: isEn ? 'Back' : '返回上一頁',
    home: isEn ? 'Home' : '回首頁',
    title: isEn ? 'Create Account' : '建立帳號',
    subtitle: isEn ? 'Join Nestobi and start your travel plan' : '加入 Nestobi，開始你的旅程規劃',
    name: isEn ? 'Display Name' : '顯示名稱',
    email: isEn ? 'Email' : '電子郵件',
    password: isEn ? 'Password' : '密碼',
    confirm: isEn ? 'Confirm Password' : '確認密碼',
    submit: isEn ? 'Send Verification Code' : '發送驗證碼',
    haveAccount: isEn ? 'Already have an account?' : '已經有帳號？',
    login: isEn ? 'Login now' : '立即登入',
    pwMismatch: isEn ? 'Passwords do not match.' : '兩次輸入的密碼不一致。',
    pwLength: isEn ? 'Password must be at least 6 characters.' : '密碼至少需要 6 個字元。',
    failed: isEn ? 'Failed to send verification email.' : '驗證信發送失敗，請稍後再試。',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError(t.pwMismatch);
    if (password.length < 6) return setError(t.pwLength);

    setLoading(true);
    try {
      const otp = generateOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      sessionStorage.setItem(
        'pending_verification',
        JSON.stringify({ email, otp, expiresAt, password, displayName }),
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ type: 'verification', to: email, data: { otp, displayName } }),
      });

      navigate(`/auth/verify?email=${encodeURIComponent(email)}`);
    } catch {
      setError(t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F0E4C8] via-white to-[#F0E4C8] px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#2C1F10]"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            {t.back}
          </button>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[#2C1F10]"
          >
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
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm font-medium text-gray-700">
              {t.name}
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                />
              </div>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t.email}
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                />
              </div>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t.password}
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t.confirm}
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#C09A6A] py-3 font-semibold text-white transition hover:bg-[#8B6840] disabled:opacity-60"
            >
              {loading ? '...' : t.submit}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            {t.haveAccount}{' '}
            <Link to="/auth/login" className="font-medium text-[#2C1F10] hover:underline">
              {t.login}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
