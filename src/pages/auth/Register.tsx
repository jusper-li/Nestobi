import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Home, Lock, Mail, Plane, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { generateOTP } from '../../lib/utils';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

export default function Register() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const t = {
    back: pick('返回', 'Back', '戻る', '뒤로'),
    home: pick('回首頁', 'Home', 'ホーム', '홈'),
    title: pick('建立帳號', 'Create Account', 'アカウント作成', '계정 만들기'),
    subtitle: pick('加入 Nestobi，開始你的旅遊規劃', 'Join Nestobi and start your travel plan', 'Nestobiに参加して旅の計画を始めましょう', 'Nestobi에 가입하고 여행 계획을 시작하세요'),
    name: pick('顯示名稱', 'Display Name', '表示名', '표시 이름'),
    email: pick('電子郵件', 'Email', 'メール', '이메일'),
    password: pick('密碼', 'Password', 'パスワード', '비밀번호'),
    confirm: pick('確認密碼', 'Confirm Password', 'パスワード確認', '비밀번호 확인'),
    submit: pick('發送驗證碼', 'Send Verification Code', '認証コード送信', '인증 코드 보내기'),
    haveAccount: pick('已經有帳號？', 'Already have an account?', 'すでにアカウントがありますか？', '이미 계정이 있으신가요?'),
    login: pick('立即登入', 'Login now', '今すぐログイン', '지금 로그인'),
    pwMismatch: pick('兩次密碼不一致', 'Passwords do not match.', 'パスワードが一致しません。', '비밀번호가 일치하지 않습니다.'),
    pwLength: pick('密碼至少需要 6 個字元', 'Password must be at least 6 characters.', 'パスワードは6文字以上必要です。', '비밀번호는 최소 6자 이상이어야 합니다.'),
    failed: pick('發送驗證信失敗，請稍後再試', 'Failed to send verification email.', '認証メールの送信に失敗しました。', '인증 메일 전송에 실패했습니다.'),
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

      const res = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ type: 'verification', to: email, data: { otp, displayName, lang: normalizedLang } }),
      });

      if (!res.ok) {
        sessionStorage.removeItem('pending_verification');
        throw new Error('send failed');
      }

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


