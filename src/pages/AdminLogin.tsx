import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/admin/dashboard');
    } catch {
      setError('電子郵件或密碼錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <img src="/20260407_nestobi_logo.svg" alt="Nestobi" className="h-16 w-auto" />
          </div>
          <h1 className="mb-2 text-2xl font-medium text-charcoal">管理員登入</h1>
          <p className="text-charcoal/60">登入後台管理系統</p>
        </div>

        <div className="rounded-sm bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center rounded-sm border border-red-200 bg-red-50 p-4 text-red-800"
              >
                <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-charcoal">
                電子郵件
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full rounded-sm border border-charcoal/20 py-3 pl-11 pr-4 transition-colors focus:border-[#2C1F10] focus:outline-none"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-charcoal">
                密碼
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" size={20} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full rounded-sm border border-charcoal/20 py-3 pl-11 pr-4 transition-colors focus:border-[#2C1F10] focus:outline-none"
                  placeholder="請輸入密碼"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-[#C09A6A] py-3 font-medium text-white transition-all duration-300 hover:bg-[#8B6840] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-charcoal/60 transition-colors hover:text-[#2C1F10]">
              返回首頁
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
