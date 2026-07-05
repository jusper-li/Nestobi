import { useEffect, useState } from 'react';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type LoginStep = 'email' | 'code';

const parseRateLimitSeconds = (message: string) => {
  const match = message.match(/RATE_LIMIT:(\d+)/);
  return match ? Number(match[1]) : 0;
};

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<LoginStep>('email');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { requestLoginCode, verifyLoginCode } = useAuth();

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const formatError = (message: string) => {
    const retrySeconds = parseRateLimitSeconds(message);
    if (retrySeconds > 0) return t('admin.login.error.rateLimit', `請稍候 ${retrySeconds} 秒後再重送驗證碼`);
    if (message.startsWith('OTP_422:')) return t('admin.login.error.otp422', '驗證碼格式不正確，請重新輸入後再試。');
    if (message.includes('Email not confirmed')) return t('admin.login.error.emailNotConfirmed', '請先完成信箱驗證後再登入。');
    if (message.includes('Token has expired')) return t('admin.login.error.tokenExpired', '驗證碼已過期，請重新發送。');
    if (message.includes('Invalid')) return t('admin.login.error.invalidCode', '驗證碼錯誤，請重新輸入。');
    if (message.includes('rate limit') || message.includes('Too Many Requests')) return t('admin.login.error.tooManyRequests', '發送過於頻繁，請稍後再試。');
    if (message.includes('User not found')) return t('admin.login.error.userNotFound', '找不到此管理員帳號。');
    return message || t('admin.login.error.default', '登入失敗，請稍後再試。');
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      await requestLoginCode(email);
      setCode('');
      setStep('code');
      setCooldownSeconds(60);
      setNotice(t('admin.login.notice.sent', '驗證碼已寄出，請到信箱輸入 6 碼驗證碼。'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.login.error.sendFailed', '無法發送驗證碼');
      const retrySeconds = parseRateLimitSeconds(message);
      if (retrySeconds > 0) setCooldownSeconds(retrySeconds);
      setError(formatError(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      await verifyLoginCode(email, code);
    } catch (err) {
      setError(formatError(err instanceof Error ? err.message : t('admin.login.error.verifyFailed', '驗證失敗')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fbf6ee_0%,#f7efe4_50%,#efe0d1_100%)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#eadfd1] bg-[#fffaf2] p-8 shadow-[0_24px_60px_rgba(61,43,31,0.12)]">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#2b221d] shadow-lg">
              <ShieldCheck className="h-8 w-8 text-[#fffaf2]" />
            </div>
            <h1 className="text-3xl font-bold text-stone-800">{t('admin.login.title', '後台管理登入')}</h1>
            <p className="mt-2 leading-relaxed text-stone-500">{t('admin.login.description', '使用管理員信箱收取驗證碼登入，不使用密碼。')}</p>
          </div>

          {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">{error}</div>}
          {notice && <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-700">{notice}</div>}

          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('admin.login.email', '管理員信箱')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#d8c8b6] bg-[#fffaf2] py-3 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-[#a97a4f]"
                    placeholder="admin@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || cooldownSeconds > 0}
                className="w-full rounded-lg bg-[#2b221d] py-3 font-medium text-[#fffaf2] transition-colors hover:bg-[#5b4637] disabled:cursor-not-allowed disabled:bg-[#d9c9b7]"
              >
                {isSubmitting
                  ? t('admin.login.sending', '發送中...')
                  : cooldownSeconds > 0
                    ? t('admin.login.retryIn', `請稍候 ${cooldownSeconds}s`)
                    : t('admin.login.sendCode', '發送驗證碼')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('admin.login.code', '驗證碼')}</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-lg border border-[#d8c8b6] bg-[#fffaf2] py-3 pl-10 pr-4 text-center text-lg tracking-[0.35em] focus:border-transparent focus:ring-2 focus:ring-[#a97a4f]"
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {t('admin.login.sentTo', '已寄送到')} {email}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || code.length !== 6}
                className="w-full rounded-lg bg-[#2b221d] py-3 font-medium text-[#fffaf2] transition-colors hover:bg-[#5b4637] disabled:cursor-not-allowed disabled:bg-[#d9c9b7]"
              >
                {isSubmitting ? t('admin.login.verifying', '驗證中...') : t('admin.login.enter', '登入後台')}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={isSubmitting || cooldownSeconds > 0}
                  className="rounded-lg border border-[#d8c8b6] py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-[#f7efe5] disabled:text-stone-300"
                >
                  {cooldownSeconds > 0 ? t('admin.login.resendIn', `重送 ${cooldownSeconds}s`) : t('admin.login.resend', '重送驗證碼')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setNotice('');
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="rounded-lg border border-[#d8c8b6] py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-[#f7efe5] disabled:text-stone-300"
                >
                  {t('admin.login.back', '返回信箱')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
