import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, CheckCircle, Home, Mail, Plane } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

export default function ResetPassword() {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const t = {
    back: pick('返回', 'Back', '戻る', '뒤로'),
    home: pick('回首頁', 'Home', 'ホーム', '홈'),
    title: pick('重設密碼', 'Reset Password', 'パスワード再設定', '비밀번호 재설정'),
    subtitle: pick('我們會把重設連結寄到你的電子郵件', 'We will send a reset link to your email.', '再設定リンクをメールで送信します。', '재설정 링크를 이메일로 보내드립니다.'),
    email: pick('電子郵件', 'Email', 'メール', '이메일'),
    submit: pick('發送重設信', 'Send reset email', '再設定メール送信', '재설정 메일 보내기'),
    sent: pick('郵件已送出', 'Email sent', 'メールを送信しました', '이메일을 보냈습니다'),
    sentDesc: pick('請到信箱收信，並依照連結完成重設', 'Please check your inbox and follow the link.', '受信箱を確認し、リンクから再設定してください。', '받은편지함에서 링크를 눌러 재설정을 완료하세요.'),
    login: pick('返回登入', 'Back to login', 'ログインへ戻る', '로그인으로 돌아가기'),
    failed: pick('發送重設信失敗，請稍後再試', 'Failed to send reset email.', '再設定メール送信に失敗しました。', '재설정 메일 전송에 실패했습니다.'),
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


