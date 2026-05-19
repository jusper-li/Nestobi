import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Plane, AlertCircle, ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  clearLoginFailures,
  GENERIC_AUTH_ERROR_MESSAGE,
  getLoginRateLimit,
  LOGIN_RATE_LIMIT_MESSAGE,
  recordLoginFailure,
} from '../../lib/security';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, user, signOut, role, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectParam = new URLSearchParams(location.search).get('redirect');

  const isRestrictedRedirect = redirectParam &&
    (redirectParam.startsWith('/vendor') || redirectParam.startsWith('/admin') || redirectParam.startsWith('/superadmin'));

  const restrictedLabel =
    redirectParam?.startsWith('/superadmin') ? '超級管理員' :
    redirectParam?.startsWith('/admin') ? '管理員' :
    '廠商';

  const handleSignOutAndRelogin = async () => {
    await signOut();
  };

  const currentRolePath =
    role === 'superadmin' ? '/superadmin' :
    role === 'admin' ? '/admin' :
    role === 'vendor' ? '/vendor' :
    '/member';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: authData } = await supabase
          .from('tbl_user_auth')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        const role = authData?.role ?? 'user';
        if (redirectParam) {
          navigate(redirectParam, { replace: true });
        } else if (role === 'superadmin') {
          navigate('/superadmin', { replace: true });
        } else if (role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (role === 'vendor') {
          navigate('/vendor', { replace: true });
        } else {
          navigate('/member', { replace: true });
        }
      }
    } catch (err) {
      recordLoginFailure(normalizedEmail);
      setError(err instanceof Error && err.message === LOGIN_RATE_LIMIT_MESSAGE ? LOGIN_RATE_LIMIT_MESSAGE : GENERIC_AUTH_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0E4C8] via-white to-[#F0E4C8] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-[#2C1F10] transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">返回上一頁</span>
          </button>
          <Link to="/" className="flex items-center gap-1.5 text-gray-500 hover:text-[#2C1F10] transition-colors text-sm font-medium">
            <Home className="w-4 h-4" />回首頁
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C09A6A] rounded-2xl mb-4 shadow-lg">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">歡迎回來</h1>
          <p className="text-gray-500 mt-1">登入您的旅遊帳號</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {user && isRestrictedRedirect && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mb-6 text-sm"
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-medium mb-1">需要{restrictedLabel}帳號</p>
                <p className="text-amber-700">此頁面需要{restrictedLabel}權限。請使用具有對應權限的帳號登入，或
                  <button onClick={handleSignOutAndRelogin} className="underline font-medium ml-1 hover:text-amber-900">
                    登出目前帳號
                  </button>
                  。
                </p>
              </div>
            </motion.div>
          )}

          {user && !isRestrictedRedirect && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
            >
              <p className="font-semibold">目前瀏覽器已有登入中的帳號</p>
              <p className="mt-1 text-amber-700">
                {profile?.display_name || user.email}。為避免混用管理權限，請選擇繼續使用目前帳號，或先登出再登入其他帳號。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate(currentRolePath, { replace: true })} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-800">
                  繼續使用目前帳號
                </button>
                <button type="button" onClick={handleSignOutAndRelogin} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100">
                  登出後重新登入
                </button>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="請輸入密碼"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10] focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/auth/reset-password" className="text-sm text-[#2C1F10] hover:underline">忘記密碼？</Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C09A6A] hover:bg-[#8B6840] text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '登入'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            還沒有帳號？{' '}
            <Link to="/auth/register" className="text-[#2C1F10] font-medium hover:underline">立即註冊</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
