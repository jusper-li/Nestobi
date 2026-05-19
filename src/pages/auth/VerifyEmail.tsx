import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertCircle, Plane, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const email = searchParams.get('email') || '';

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
    if (enteredCode.length !== 6) { setError('請輸入完整的6位驗證碼。'); return; }
    setLoading(true);
    setError('');
    try {
      const raw = sessionStorage.getItem('pending_verification');
      if (!raw) { setError('驗證資料已過期，請重新填寫註冊資料。'); setLoading(false); return; }
      const { email: storedEmail, otp, expiresAt, password, displayName } = JSON.parse(raw);

      if (storedEmail !== email) { setError('Email 不符合，請重新註冊。'); setLoading(false); return; }
      if (Date.now() > expiresAt) {
        setError('驗證碼已過期（10分鐘），請重新申請。');
        sessionStorage.removeItem('pending_verification');
        setLoading(false);
        return;
      }
      if (enteredCode !== otp) { setError('驗證碼不正確，請重新輸入。'); setLoading(false); return; }

      await signUp(email, password, displayName);
      sessionStorage.removeItem('pending_verification');
      navigate('/member');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError('此 Email 已註冊，請直接登入。');
      } else {
        setError('驗證失敗，請稍後再試。');
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
            <span className="text-sm font-medium">返回上一頁</span>
          </button>
          <Link to="/" className="flex items-center gap-1.5 text-gray-500 hover:text-[#2C1F10] transition-colors text-sm font-medium">
            <Home className="w-4 h-4" />回首頁
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-travel-teal rounded-2xl mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">電子郵件驗證</h1>
          <p className="text-gray-500 mt-1">
            請輸入發送至 <strong className="text-gray-700">{email}</strong> 的驗證碼
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

          <p className="text-center text-gray-500 mb-6 text-sm">
            請輸入上一步畫面顯示的6位數驗證碼，10分鐘內有效
          </p>

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
              : <><ShieldCheck className="w-5 h-5" /> 確認驗證</>
            }
          </button>

          <button
            onClick={() => navigate('/auth/register')}
            className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-[#2C1F10] transition-colors py-2"
          >
            <RefreshCw className="w-4 h-4" />
            重新取得驗證碼
          </button>

          <div className="mt-5 p-3 bg-[#F0E4C8] rounded-lg border border-[#D5CDB8]">
            <div className="flex items-start gap-2">
              <Plane className="w-4 h-4 text-[#2C1F10] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#1A1208]">
                驗證碼顯示在上一個頁面的黃色區塊中。正式環境會自動發送 Email 通知。
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
