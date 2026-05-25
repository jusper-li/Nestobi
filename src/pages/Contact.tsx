import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Clock, Send, CheckCircle, AlertCircle, MapPin, MessageSquare } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { useLanguage } from '../contexts/LanguageContext';

const SEND_EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

const Contact: React.FC = () => {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const t = {
    title: isEn ? 'Contact Us' : '聯絡我們',
    subtitle: isEn ? 'Have questions? We are here to help.' : '有任何問題，歡迎隨時與我們聯繫。',
    seoDesc: isEn ? 'Contact Nestobi support for travel, booking, shopping, or AI feature help.' : '聯繫 Nestobi 旅遊平台客服團隊，我們隨時為您解答疑問與提供協助。',
    phoneLabel: isEn ? 'Support Phone' : '客服電話',
    emailLabel: isEn ? 'Email' : '電子郵件',
    aiLabel: isEn ? 'AI Support' : 'AI 客服',
    officeLabel: isEn ? 'Office' : '辦公地址',
    weekdays: isEn ? 'Mon-Fri 09:00-18:00' : '週一至週五 09:00-18:00',
    online: isEn ? '24/7 online' : '24 小時線上',
    aiOnline: isEn ? 'AI support 24/7' : 'AI 客服 24 小時',
    formTitle: isEn ? 'Send us a message' : '發送訊息給我們',
    formHint: isEn ? 'We usually reply within 24 hours.' : '我們通常會在 24 小時內回覆你。',
    sent: isEn ? 'Message sent' : '訊息已送出',
    sentHint: isEn ? 'We will respond to' : '我們會回覆到',
    sendAnother: isEn ? 'Send another message' : '再送一則訊息',
    name: isEn ? 'Name' : '姓名',
    email: isEn ? 'Email' : '電子郵件',
    subject: isEn ? 'Subject' : '主旨',
    message: isEn ? 'Message' : '內容',
    pickSubject: isEn ? 'Select a subject' : '請選擇主旨',
    send: isEn ? 'Send Message' : '發送訊息',
    failed: isEn ? 'Failed to send message. Please try again.' : '訊息送出失敗，請稍後再試。',
  };

  const contactInfo = [
    { icon: Phone, label: t.phoneLabel, value: '0800-123-456', sub: t.weekdays },
    { icon: Mail, label: t.emailLabel, value: 'service@nestobi.com.tw', sub: t.online },
    { icon: Clock, label: t.aiLabel, value: t.aiOnline, sub: isEn ? 'Instant multilingual replies' : '即時多語回覆' },
    { icon: MapPin, label: t.officeLabel, value: isEn ? 'Taipei, Taiwan' : '台北市信義區', sub: isEn ? 'Nestobi HQ' : 'Nestobi 總部' },
  ];

  const subjectOptions = isEn
    ? ['Booking Question', 'Order & Payment', 'Account Issue', 'Product Question', 'AI Feature', 'Business Cooperation', 'Other']
    : ['訂房相關問題', '訂單與付款問題', '帳號與登入問題', '商品相關問題', 'AI 功能問題', '商務合作需求', '其他問題'];

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
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: 'contact',
          to: 'service@nestobi.com.tw',
          data: { name, email, subject, message },
        }),
      });
      if (!res.ok) throw new Error('Send failed');
      setSuccess(true);
    } catch {
      setError(t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead title={t.title} description={t.seoDesc} keywords={isEn ? 'contact, support, nestobi' : '聯絡我們, 客服, 旅遊諮詢'} pageType="default" />
      <Navigation />

      <div className="bg-[#F0E4C8] py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C09A6A]/20">
              <MessageSquare className="h-8 w-8 text-[#2C1F10]" />
            </div>
            <h1 className="mb-3 text-4xl font-bold text-[#2C1F10]">{t.title}</h1>
            <p className="text-lg text-[#2C1F10]/70">{t.subtitle}</p>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {contactInfo.map(({ icon: Icon, label, value, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm"
            >
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <Icon className="h-6 w-6 text-[#2C1F10]" />
              </div>
              <div className="mb-1 text-xs font-medium text-gray-400">{label}</div>
              <div className="text-sm font-semibold text-gray-900">{value}</div>
              <div className="mt-1 text-xs text-gray-400">{sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">{t.formTitle}</h2>
            <p className="mb-8 text-sm text-gray-500">{t.formHint}</p>

            {success ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">{t.sent}</h3>
                <p className="text-gray-500">{t.sentHint} <strong>{email}</strong></p>
                <button
                  onClick={() => { setSuccess(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}
                  className="mt-6 text-sm font-medium text-[#2C1F10] hover:underline"
                >
                  {t.sendAnother}
                </button>
              </motion.div>
            ) : (
              <>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">{t.name}</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        placeholder={t.name}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">{t.email}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        placeholder="your@email.com"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t.subject}</label>
                    <select
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                    >
                      <option value="">{t.pickSubject}</option>
                      {subjectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t.message}</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                      rows={5}
                      placeholder={t.message}
                      className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C09A6A] py-3 font-semibold text-white transition hover:bg-[#8B6840] disabled:opacity-60"
                  >
                    {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><Send className="h-4 w-4" /> {t.send}</>}
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
