import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertCircle, Plane, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';

const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);
  const email = searchParams.get('email') || '';
  const t = {
    codeRequired: pick('請輸入完整的 6 碼驗證碼', 'Please enter the full 6-digit code.', '6桁の認証コードを入力してください。', '6자리 인증 코드를 입력하세요.'),
    sessionExpired: pick('驗證資料已過期，請重新註冊', 'Verification data expired. Please register again.', '認証情報の有効期限が切れました。再登録してください。', '인증 정보가 만료되었습니다. 다시 가입해주세요.'),
    emailMismatch: pick('電子郵件不一致，請重新註冊', 'Email mismatch. Please register again.', 'メールアドレスが一致しません。再登録してください。', '이메일이 일치하지 않습니다. 다시 가입해주세요.'),
    codeExpired: pick('驗證碼已過期（10 分鐘），請重新申請', 'Verification code expired (10 minutes). Please request again.', '認証コードの有効期限が切れました（10分）。再取得してください。', '인증 코드가 만료되었습니다(10분). 다시 요청해주세요.'),
    codeWrong: pick('驗證碼錯誤，請再試一次', 'Incorrect verification code. Please try again.', '認証コードが正しくありません。もう一度お試しください。', '인증 코드가 올바르지 않습니다. 다시 시도해주세요.'),
    alreadyRegistered: pick('此電子郵件已註冊，請直接登入', 'This email is already registered. Please sign in.', 'このメールはすでに登録されています。ログインしてください。', '이미 가입된 이메일입니다. 로그인해주세요.'),
    failed: pick('驗證失敗，請稍後再試', 'Verification failed. Please try again later.', '認証に失敗しました。しばらくしてから再試行してください。', '인증에 실패했습니다. 잠시 후 다시 시도해주세요.'),
    back: pick('返回', 'Back', '戻る', '뒤로'),
    home: pick('回首頁', 'Home', 'ホーム', '홈'),
    title: pick('電子郵件驗證', 'Email Verification', 'メール認証', '이메일 인증'),
    subtitlePrefix: pick('請輸入寄送到', 'Please enter the code sent to', '次に送信されたコードを入力してください', '다음으로 전송된 코드를 입력하세요'),
    subtitleSuffix: pick('的驗證碼', '', 'の認証コード', '인증 코드'),
    hint: pick('請輸入上一頁顯示的 6 碼驗證碼，有效期限 10 分鐘', 'Enter the 6-digit code shown in the previous step. Valid for 10 minutes.', '前ページに表示された6桁コードを入力してください。有効期限は10分です。', '이전 페이지의 6자리 코드를 입력하세요. 유효시간은 10분입니다.'),
    confirm: pick('確認驗證', 'Confirm Verification', '認証する', '인증 확인'),
    requestAgain: pick('重新取得驗證碼', 'Request code again', 'コードを再取得', '코드 다시 요청'),
    note: pick('驗證碼會顯示在上一頁黃色提示區。正式環境會自動寄送驗證信。', 'The code appears in the yellow panel on the previous page. In production, a verification email is sent automatically.', 'コードは前ページの黄色パネルに表示されます。本番環境では認証メールが自動送信されます。', '코드는 이전 페이지의 노란 패널에 표시됩니다. 운영 환경에서는 인증 이메일이 자동 발송됩니다.'),
  };

  const handleChange = (idx: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...code];
    updated[idx] = value.slice(-1);
    setCode(updated);
    if (value && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredCode = code.join('');
    if (enteredCode.length !== 6) { setError(t.codeRequired); return; }
    setLoading(true);
    setError('');
    try {
      const raw = sessionStorage.getItem('pending_verification');
      if (!raw) { setError(t.sessionExpired); setLoading(false); return; }
      const { email: storedEmail, otp, expiresAt, password, displayName } = JSON.parse(raw);

      if (storedEmail !== email) { setError(t.emailMismatch); setLoading(false); return; }
      if (Date.now() > expiresAt) {
        setError(t.codeExpired);
        sessionStorage.removeItem('pending_verification');
        setLoading(false);
        return;
      }
      if (enteredCode !== otp) { setError(t.codeWrong); setLoading(false); return; }

      await signUp(email, password, displayName);
      sessionStorage.removeItem('pending_verification');
      navigate('/member');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError(t.alreadyRegistered);
      } else {
        setError(t.failed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-travel-sky via-white to-travel-sky flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/auth/register')}
            className="flex items-center gap-2 text-gray-500 hover:text-[#2C1F10] transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">{t.back}</span>
          </button>
          <Link to="/" className="flex items-center gap-1.5 text-gray-500 hover:text-[#2C1F10] transition-colors text-sm font-medium">
            <Home className="w-4 h-4" />{t.home}
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-travel-teal rounded-2xl mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 mt-1">
            {t.subtitlePrefix} <strong className="text-gray-700">{email}</strong> {t.subtitleSuffix}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-danger rounded-lg p-3 mb-6 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <p className="text-center text-gray-500 mb-6 text-sm">{t.hint}</p>

          <div className="flex justify-center gap-2 mb-8" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#2C1F10] focus:ring-2 focus:ring-[#2C1F10]/20 transition"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full bg-[#C09A6A] hover:bg-[#8B6840] text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><ShieldCheck className="w-5 h-5" /> {t.confirm}</>
            }
          </button>

          <button
            onClick={() => navigate('/auth/register')}
            className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-[#2C1F10] transition-colors py-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t.requestAgain}
          </button>

          <div className="mt-5 p-3 bg-[#F0E4C8] rounded-lg border border-[#D5CDB8]">
            <div className="flex items-start gap-2">
              <Plane className="w-4 h-4 text-[#2C1F10] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#1A1208]">
                {t.note}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;


