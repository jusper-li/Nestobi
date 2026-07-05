import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Coffee, Eye, EyeOff, KeyRound, Lock, Mail, User } from 'lucide-react';
import { useMemberAuth } from '../contexts/MemberAuthContext';
import { supabase } from '../lib/supabase';

type TabType = 'login' | 'register' | 'verify' | 'forgot';
const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_STORAGE_PREFIX = 'member-verification-resend:';

export default function MemberAuth() {
  const [tab, setTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const { signIn, signUp, user, isLoading } = useMemberAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) navigate('/member/profile');
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pendingVerificationEmail) return;

    try {
      const saved = window.localStorage.getItem(
        `${RESEND_STORAGE_PREFIX}${pendingVerificationEmail.trim().toLowerCase()}`
      );
      if (!saved) return;

      const savedUntil = Number(saved);
      if (Number.isFinite(savedUntil) && savedUntil > Date.now()) {
        setResendCooldownUntil(savedUntil);
      }
    } catch {
      // Ignore storage errors and fall back to in-memory cooldown.
    }
  }, [pendingVerificationEmail]);

  const resendSecondsLeft = Math.max(0, Math.ceil((resendCooldownUntil - now) / 1000));

  const startResendCooldown = (targetEmail: string) => {
    const cooldownUntil = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    setResendCooldownUntil(cooldownUntil);

    try {
      window.localStorage.setItem(
        `${RESEND_STORAGE_PREFIX}${targetEmail.trim().toLowerCase()}`,
        String(cooldownUntil)
      );
    } catch {
      // Ignore storage errors.
    }
  };

  const resetState = () => {
    setError('');
    setSuccessMsg('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setForgotEmail('');
    setForgotSent(false);
    setPendingVerificationEmail('');
    setVerificationCode('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchTab = (nextTab: TabType) => {
    setTab(nextTab);
    resetState();
  };

  const formatAuthError = (err: unknown, fallback: string) => {
    const authError = err as { code?: string; message?: string; status?: number } | null;
    const code = String(authError?.code || '').toLowerCase();
    const message = String(authError?.message || '');

    if (code === 'email_not_confirmed' || message.includes('Email not confirmed')) {
      return '請先完成信箱驗證。';
    }
    if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) {
      return '登入失敗，請確認電子郵件與密碼。';
    }
    if (code === 'email_address_invalid') {
      return '電子郵件格式不正確。';
    }
    if (code === 'too_many_requests' || authError?.status === 429) {
      return '嘗試次數過多，請稍後再試。';
    }
    if (code === 'signup_disabled' || code === 'email_provider_disabled') {
      return '目前暫不開放會員註冊。';
    }
    return fallback;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim()) {
      setError('請輸入電子郵件與密碼。');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await signIn(trimmedEmail, password);
      navigate('/member/profile');
    } catch (err) {
      setError(formatAuthError(err, '登入失敗，請稍後再試。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致。');
      return;
    }

    if (password.length < 6) {
      setError('密碼至少需要 6 個字元。');
      return;
    }

    if (!displayName.trim()) {
      setError('請輸入會員名稱。');
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    setIsSubmitting(true);
    try {
      const { session } = await signUp(trimmedEmail, password, trimmedName);

      if (session) {
        setSuccessMsg('註冊成功，正在前往會員頁面。');
        window.setTimeout(() => navigate('/member/profile'), 1200);
        return;
      }

      setPendingVerificationEmail(trimmedEmail);
      setVerificationCode('');
      startResendCooldown(trimmedEmail);
      setSuccessMsg('請輸入寄到信箱的 6 位驗證碼。');
      setTab('verify');
    } catch (err) {
      const message = String(err instanceof Error ? err.message : '');
      const code = String((err as { code?: string } | null)?.code || '').toLowerCase();
      if (code === 'email_exists' || message.includes('already registered') || message.includes('already been registered')) {
        setError('這個電子郵件已經註冊過了。');
      } else {
        setError(formatAuthError(err, '註冊失敗，請稍後再試。'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = pendingVerificationEmail.trim() || email.trim();
    const token = verificationCode.trim();

    if (!targetEmail) {
      setError('請先輸入電子郵件。');
      return;
    }

    if (token.length !== 6) {
      setError('請輸入 6 位驗證碼。');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      setPendingVerificationEmail('');
      setVerificationCode('');
      setSuccessMsg('驗證完成，正在前往會員頁面。');
      window.setTimeout(() => navigate('/member/profile'), 800);
    } catch (err) {
      setError(formatAuthError(err, '驗證失敗，請重新輸入驗證碼。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = pendingVerificationEmail.trim() || email.trim();
    if (!targetEmail) {
      setError('請先輸入電子郵件。');
      return;
    }

    if (resendSecondsLeft > 0) {
      setError(`請在 ${resendSecondsLeft} 秒後再重寄。`);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
      });
      if (resendError) throw resendError;
      setPendingVerificationEmail(targetEmail);
      setVerificationCode('');
      startResendCooldown(targetEmail);
      setSuccessMsg('驗證碼已重新寄出，請查看信箱。');
    } catch (err) {
      setError(formatAuthError(err, '重寄驗證碼失敗，請稍後再試。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedForgotEmail = forgotEmail.trim();
    if (!trimmedForgotEmail) {
      setError('請先輸入電子郵件。');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedForgotEmail, {
        redirectTo: `${window.location.origin}/member/reset`,
      });
      if (resetError) throw resetError;
      setForgotSent(true);
    } catch (err) {
      setError(formatAuthError(err, '寄送密碼重設信失敗，請稍後再試。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbf6ee]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
      </div>
    );
  }

  const tabTitle =
    tab === 'login' ? '登入' : tab === 'register' ? '加入會員' : tab === 'verify' ? '輸入驗證碼' : '忘記密碼';

  const tabSubtitle =
    tab === 'login'
      ? '登入後可查看訂單、收藏與個人資料。'
      : tab === 'register'
        ? '註冊後即可快速結帳並管理會員資料。'
        : tab === 'verify'
          ? '請輸入寄到信箱的 6 位驗證碼。'
          : '輸入電子郵件後，我們會寄出密碼重設連結。';

  return (
    <div className="flex min-h-screen bg-[#fbf6ee]">
      <div className="relative hidden overflow-hidden bg-[#c7a08d] lg:flex lg:w-1/2">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: 'url(https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2b221d]/70 via-[#5b4637]/50 to-[#d8bda4]/30" />
        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          <Link to="/" className="inline-block">
            <img src="/LOGO-1.png" alt="Sonpin" className="h-20 brightness-0 invert opacity-90" />
          </Link>

          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px w-10 bg-[#eadfd1]" />
              <Coffee className="h-5 w-5 text-[#f3e6d3]" />
            </div>
            <h2 className="mb-4 text-4xl font-light leading-snug text-[#fffaf2]">
              歡迎回來，慢慢享受一杯咖啡的時間
              <br />
              <span className="text-amber-300">登入後，收藏與訂單都在這裡</span>
            </h2>
            <p className="max-w-xs text-sm font-light leading-relaxed text-[#f7efe5]">
              登入會員後可查看最新訂單、會員資料與購物紀錄，也可以更快完成結帳與重複購買。
            </p>
          </div>

          <div className="flex items-center gap-8 text-xs uppercase tracking-widest text-[#eadfd1]">
            <span>Premium Coffee</span>
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            <span>Since 2020</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Link to="/">
            <img src="/LOGO-1.png" alt="Sonpin" className="h-10" />
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-800">
            <ArrowLeft className="h-4 w-4" />
            返回首頁
          </Link>
        </div>

        <div className="hidden items-center justify-end px-10 py-6 lg:flex">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-800">
            <ArrowLeft className="h-4 w-4" />
            返回首頁
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="mb-1.5 text-2xl font-semibold text-stone-800">{tabTitle}</h1>
              <p className="text-sm text-stone-500">{tabSubtitle}</p>
            </div>

            {tab !== 'forgot' && (
              <div className="mb-8 flex rounded-xl bg-stone-200/60 p-1">
                <button
                  onClick={() => switchTab('login')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
                    tab === 'login' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  登入
                </button>
                <button
                  onClick={() => switchTab('register')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
                    tab === 'register' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  加入會員
                </button>
              </div>
            )}

            {error && <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

            {successMsg && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#e1c7b4] bg-[#f3e6d3] px-4 py-3 text-sm text-[#8e6448]">
                <Coffee className="h-4 w-4 flex-shrink-0" />
                {successMsg}
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-600">電子郵件</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full rounded-xl border border-[#e1d4c6] bg-[#fffaf2] py-3 pl-10 pr-4 text-sm text-stone-800 placeholder-stone-300 transition-all focus:border-[#a97a4f] focus:outline-none focus:ring-2 focus:ring-[#d8bda4]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-600">密碼</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="請輸入密碼"
                      required
                      className="w-full rounded-xl border border-[#e1d4c6] bg-[#fffaf2] py-3 pl-10 pr-11 text-sm text-stone-800 placeholder-stone-300 transition-all focus:border-[#a97a4f] focus:outline-none focus:ring-2 focus:ring-[#d8bda4]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => switchTab('forgot')} className="text-xs text-stone-400 transition-colors hover:text-[#8e6448]">
                    忘記密碼？
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2b221d] py-3 text-sm font-medium text-[#fffaf2] transition-all hover:bg-[#5b4637] active:bg-[#433226] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : '登入'}
                </button>

                <p className="text-center text-sm text-stone-500">
                  還沒有帳號？{' '}
                  <button type="button" onClick={() => switchTab('register')} className="font-medium text-[#8e6448] transition-colors hover:text-[#6d4f3d]">
                    立即註冊
                  </button>
                </p>
              </form>
            ) : tab === 'register' ? (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-600">會員名稱</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="請輸入會員名稱"
                      required
                      className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 placeholder-stone-300 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-600">電子郵件</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 placeholder-stone-300 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-600">密碼</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="至少 6 個字元"
                      required
                      className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-11 text-sm text-stone-800 placeholder-stone-300 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-600">確認密碼</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次輸入密碼"
                      required
                      className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-11 text-sm text-stone-800 placeholder-stone-300 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-700 py-3 text-sm font-medium text-white transition-all hover:bg-stone-600 active:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : '註冊會員'}
                </button>

                <p className="text-center text-sm text-stone-500">
                  已經有帳號？{' '}
                  <button type="button" onClick={() => switchTab('login')} className="font-medium text-amber-700 transition-colors hover:text-amber-600">
                    前往登入
                  </button>
                </p>
              </form>
            ) : tab === 'verify' ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-[#e1d4c6] bg-white px-4 py-4 text-sm leading-relaxed text-stone-600">
                  我們已寄出 6 位驗證碼到 <strong className="text-stone-800">{pendingVerificationEmail || email}</strong>。
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-600">驗證碼</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-center text-lg tracking-[0.35em] text-stone-800 placeholder-stone-300 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || verificationCode.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-700 py-3 text-sm font-medium text-white transition-all hover:bg-stone-600 active:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : '驗證並登入'}
                  </button>
                </form>

                <div className="flex items-center justify-between gap-3 text-sm text-stone-500">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isSubmitting || resendSecondsLeft > 0}
                    className="font-medium text-amber-700 transition-colors hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resendSecondsLeft > 0 ? `重寄驗證碼（${resendSecondsLeft}s）` : '重寄驗證碼'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    className="font-medium text-stone-500 transition-colors hover:text-stone-700"
                  >
                    返回登入
                  </button>
                </div>
              </div>
            ) : forgotSent ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-amber-100 bg-amber-50">
                  <Mail className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-stone-800">重設信已寄出</h3>
                <p className="mb-6 text-sm leading-relaxed text-stone-500">
                  我們已寄送密碼重設連結到 <strong>{forgotEmail}</strong>，請前往信箱查看。
                </p>
                <button type="button" onClick={() => switchTab('login')} className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-600">
                  返回登入
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-600">電子郵件</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 placeholder-stone-300 transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-700 py-3 text-sm font-medium text-white transition-all hover:bg-stone-600 active:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      寄送重設連結
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-stone-500">
                  想起密碼了嗎？{' '}
                  <button type="button" onClick={() => switchTab('login')} className="font-medium text-amber-700 transition-colors hover:text-amber-600">
                    返回登入
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
