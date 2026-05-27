import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Home, Lock, Mail, Plane } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  clearLoginFailures,
  GENERIC_AUTH_ERROR_MESSAGE,
  getLoginRateLimit,
  LOGIN_RATE_LIMIT_MESSAGE,
  recordLoginFailure,
} from '../../lib/security';

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const copy: Record<
  UiLang,
  {
    back: string;
    home: string;
    welcome: string;
    subtitle: string;
    email: string;
    password: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    forgot: string;
    login: string;
    noAccount: string;
    register: string;
  }
> = {
  'zh-TW': {
    back: '返回上一頁',
    home: '回首頁',
    welcome: '歡迎回來',
    subtitle: '登入您的旅遊帳號',
    email: '電子郵件',
    password: '密碼',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: '請輸入密碼',
    forgot: '忘記密碼？',
    login: '登入',
    noAccount: '還沒有帳號？',
    register: '立即註冊',
  },
  en: {
    back: 'Back',
    home: 'Home',
    welcome: 'Welcome Back',
    subtitle: 'Sign in to your travel account',
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: 'Enter your password',
    forgot: 'Forgot password?',
    login: 'Login',
    noAccount: 'No account yet?',
    register: 'Sign up now',
  },
  ja: {
    back: '前のページへ',
    home: 'ホーム',
    welcome: 'おかえりなさい',
    subtitle: '旅行アカウントにログイン',
    email: 'メールアドレス',
    password: 'パスワード',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: 'パスワードを入力',
    forgot: 'パスワードをお忘れですか？',
    login: 'ログイン',
    noAccount: 'アカウントをお持ちでないですか？',
    register: '今すぐ登録',
  },
  ko: {
    back: '이전 페이지',
    home: '홈',
    welcome: '다시 오신 것을 환영합니다',
    subtitle: '여행 계정으로 로그인하세요',
    email: '이메일',
    password: '비밀번호',
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: '비밀번호를 입력하세요',
    forgot: '비밀번호를 잊으셨나요?',
    login: '로그인',
    noAccount: '아직 계정이 없으신가요?',
    register: '지금 가입하기',
  },
};

export default function Login() {
  const { lang } = useLanguage();
  const locale = (lang as UiLang) in copy ? (lang as UiLang) : 'zh-TW';
  const text = copy[locale];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectParam = new URLSearchParams(location.search).get('redirect');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    const rateLimit = getLoginRateLimit(normalizedEmail);
    if (rateLimit.blocked) {
      setError(LOGIN_RATE_LIMIT_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      await signIn(normalizedEmail, password);
      clearLoginFailures(normalizedEmail);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: authData } = await supabase
          .from('tbl_user_auth')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        const role = authData?.role ?? 'user';
        if (redirectParam) navigate(redirectParam, { replace: true });
        else if (role === 'superadmin') navigate('/superadmin', { replace: true });
        else if (role === 'admin') navigate('/admin', { replace: true });
        else if (role === 'vendor') navigate('/vendor', { replace: true });
        else navigate('/member', { replace: true });
      }
    } catch (err) {
      recordLoginFailure(normalizedEmail);
      setError(
        err instanceof Error && err.message === LOGIN_RATE_LIMIT_MESSAGE
          ? LOGIN_RATE_LIMIT_MESSAGE
          : GENERIC_AUTH_ERROR_MESSAGE,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F0E4C8] via-white to-[#F0E4C8] px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#2C1F10]"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            {text.back}
          </button>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[#2C1F10]"
          >
            <Home className="h-4 w-4" />
            {text.home}
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C09A6A] shadow-lg">
            <Plane className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{text.welcome}</h1>
          <p className="mt-1 text-gray-500">{text.subtitle}</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{text.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder={text.emailPlaceholder}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{text.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder={text.passwordPlaceholder}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-12 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/auth/reset-password" className="text-sm text-[#2C1F10] hover:underline">
                {text.forgot}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-[#C09A6A] py-3 font-semibold text-white transition hover:bg-[#8B6840] disabled:opacity-60"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                text.login
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {text.noAccount}{' '}
            <Link to="/auth/register" className="font-medium text-[#2C1F10] hover:underline">
              {text.register}
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

