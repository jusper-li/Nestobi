import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Home, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import {
  clearLoginFailures,
  GENERIC_AUTH_ERROR_MESSAGE,
  getLoginRateLimit,
  LOGIN_RATE_LIMIT_MESSAGE,
  recordLoginFailure,
} from '../../lib/security';

function roleHome(role: string) {
  if (role === 'superadmin') return '/superadmin';
  if (role === 'admin') return '/admin';
  if (role === 'vendor') return '/vendor';
  return '/member';
}

function roleCanAccessRedirect(role: string, redirect: string) {
  if (!redirect.startsWith('/')) return false;
  if (redirect.startsWith('//')) return false;
  if (redirect.startsWith('/superadmin')) return role === 'superadmin';
  if (redirect.startsWith('/admin')) return role === 'admin' || role === 'superadmin';
  if (redirect.startsWith('/vendor')) return role === 'vendor' || role === 'admin' || role === 'superadmin';
  return true;
}

export default function Login() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const text = {
    back: pick('返回上一頁', 'Back', '戻る', '뒤로'),
    home: pick('回首頁', 'Home', 'ホーム', '홈'),
    welcome: pick('歡迎回來', 'Welcome Back', 'おかえりなさい', '다시 오신 것을 환영합니다'),
    subtitle: pick('登入您的旅遊帳號', 'Sign in to your travel account', '旅行アカウントにログイン', '여행 계정으로 로그인'),
    email: pick('電子郵件', 'Email', 'メール', '이메일'),
    password: pick('密碼', 'Password', 'パスワード', '비밀번호'),
    emailPlaceholder: 'your@email.com',
    passwordPlaceholder: pick('請輸入密碼', 'Enter your password', 'パスワードを入力', '비밀번호를 입력하세요'),
    forgot: pick('忘記密碼？', 'Forgot password?', 'パスワードをお忘れですか？', '비밀번호를 잊으셨나요?'),
    login: pick('登入', 'Login', 'ログイン', '로그인'),
    noAccount: pick('還沒有帳號？', "Don't have an account?", 'アカウントをお持ちでないですか？', '아직 계정이 없으신가요?'),
    register: pick('立即註冊', 'Sign up now', '今すぐ登録', '지금 가입하기'),
  };

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
        const { data: authData } = await supabase.from('tbl_user_auth').select('role').eq('user_id', user.id).maybeSingle();
        const role = authData?.role ?? 'user';

        if (redirectParam && roleCanAccessRedirect(role, redirectParam)) navigate(redirectParam, { replace: true });
        else navigate(roleHome(role), { replace: true });
      }
    } catch (err) {
      recordLoginFailure(normalizedEmail);
      setError(err instanceof Error && err.message === LOGIN_RATE_LIMIT_MESSAGE ? LOGIN_RATE_LIMIT_MESSAGE : GENERIC_AUTH_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0E4C8] via-white to-[#F0E4C8] px-4 py-6 sm:flex sm:items-center sm:justify-center">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#2C1F10]">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            {text.back}
          </button>
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-[#2C1F10]">
            <Home className="h-4 w-4" />
            {text.home}
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C09A6A] p-2 shadow-lg">
            <img
              src="/assets/ruoshui-jinhe-logo.png"
              alt="若水金禾"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{text.welcome}</h1>
          <p className="mt-1 text-gray-500">{text.subtitle}</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
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
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/auth/reset-password" className="text-sm text-[#2C1F10] hover:underline">
                {text.forgot}
              </Link>
            </div>

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center rounded-xl bg-[#C09A6A] py-3 font-semibold text-white transition hover:bg-[#8B6840] disabled:opacity-60">
              {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : text.login}
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
