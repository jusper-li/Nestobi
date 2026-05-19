import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Clock, Send, CheckCircle, AlertCircle, MapPin, MessageSquare } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';

const SEND_EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

const contactInfo = [
  { icon: Phone, label: '客服電話', value: '0800-123-456', sub: '週一至週五 09:00–18:00' },
  { icon: Mail, label: '電子郵件', value: 'service@travel.com.tw', sub: '24小時內回覆' },
  { icon: Clock, label: 'AI 客服', value: '24 小時全天候', sub: '即時線上協助' },
  { icon: MapPin, label: '公司地址', value: '台北市信義區', sub: '旅遊平台總部' },
];

const subjectOptions = [
  '訂房相關問題',
  '訂單或退款問題',
  '帳號與會員問題',
  '商品相關問題',
  'AI功能問題',
  '廠商合作洽詢',
  '其他問題',
];

const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: 'contact',
          to: 'service@travel.com.tw',
          data: { name, email, subject, message },
        }),
      });
      if (!res.ok) throw new Error('Send failed');
      setSuccess(true);
    } catch {
      setError('發送失敗，請稍後再試或直接致電客服。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead title="聯絡我們" description="聯繫 Nestobi 旅遊平台客服團隊，我們隨時為您解答疑問與提供協助。" keywords="聯絡我們, 客服, 旅遊諮詢" pageType="default" breadcrumbs={[{name:'首頁',url:'/'},{name:'聯絡我們',url:'/contact'}]} />
      <Navigation />

      <div className="bg-[#F0E4C8] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C09A6A]/20 rounded-2xl mb-6">
              <MessageSquare className="w-8 h-8 text-[#2C1F10]" />
            </div>
            <h1 className="text-4xl font-bold text-[#2C1F10] mb-3">聯絡我們</h1>
            <p className="text-[#2C1F10]/70 text-lg">有任何問題或建議？我們很樂意為您服務</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {contactInfo.map(({ icon: Icon, label, value, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl shadow-sm p-6 text-center border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-3">
                <Icon className="w-6 h-6 text-[#2C1F10]" />
              </div>
              <div className="text-xs font-medium text-gray-400 mb-1">{label}</div>
              <div className="font-semibold text-gray-900 text-sm">{value}</div>
              <div className="text-xs text-gray-400 mt-1">{sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">發送訊息</h2>
            <p className="text-gray-500 text-sm mb-8">填寫以下表單，我們將在 24 小時內回覆您。</p>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">訊息已送出！</h3>
                <p className="text-gray-500">感謝您的來信，我們將於 24 小時內回覆至 <strong>{email}</strong>。</p>
                <button
                  onClick={() => { setSuccess(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
                  className="mt-6 text-[#2C1F10] font-medium hover:underline text-sm"
                >
                  再次發送
                </button>
              </motion.div>
            ) : (
              <>
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
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder="您的姓名"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10] focus:border-transparent transition text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10] focus:border-transparent transition text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">主旨</label>
                    <select
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10] focus:border-transparent transition text-sm bg-white"
                    >
                      <option value="">請選擇問題類別</option>
                      {subjectOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">訊息內容</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                      rows={5}
                      placeholder="請詳細描述您的問題或建議..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10] focus:border-transparent transition text-sm resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#C09A6A] hover:bg-[#8B6840] text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><Send className="w-4 h-4" /> 發送訊息</>
                    }
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
