import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, CheckCircle, Home, Mail, Plane } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ResetPassword() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const t = {
    back: isEn ? 'Back' : '返回上一頁',
    home: isEn ? 'Home' : '回首頁',
    title: isEn ? 'Reset Password' : '重設密碼',
    subtitle: isEn ? 'We will send a reset link to your email.' : '我們會把重設連結寄到您的電子郵件。',
    email: isEn ? 'Email' : '電子郵件',
    submit: isEn ? 'Send reset email' : '發送重設郵件',
    sent: isEn ? 'Email sent' : '郵件已送出',
    sentDesc: isEn ? 'Please check your inbox and follow the link.' : '請檢查您的信箱並依照連結完成重設。',
    login: isEn ? 'Back to login' : '返回登入',
    failed: isEn ? 'Failed to send reset email.' : '發送重設郵件失敗，請稍後再試。',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch {
      setError(t.failed);
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
          {success ? (
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">{t.sent}</h2>
              <p className="mb-6 text-sm text-gray-500">{t.sentDesc}</p>
              <Link to="/auth/login" className="font-medium text-[#2C1F10] hover:underline">
                {t.login}
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#C09A6A] py-3 font-semibold text-white transition hover:bg-[#8B6840] disabled:opacity-60"
                >
                  {loading ? '...' : t.submit}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
