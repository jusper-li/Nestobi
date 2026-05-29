import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Clock, Send, CheckCircle, AlertCircle, MapPin, MessageSquare } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

const SEND_EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

const Contact: React.FC = () => {
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);
  const isEn = normalizedLang === 'en';

  const t = {
    title: pick('聯絡我們', 'Contact Us', 'お問い合わせ', '문의하기'),
    subtitle: pick('有任何問題嗎？我們很樂意協助你。', 'Have questions? We are here to help.', 'ご質問があればお気軽にどうぞ。', '문의사항이 있으시면 언제든지 도와드릴게요.'),
    seoDesc: pick('聯絡 Nestobi 客服，取得訂房、購物、旅遊與 AI 功能協助。', 'Contact Nestobi support for travel, booking, shopping, or AI feature help.', 'Nestobi サポートへ連絡して、宿泊・買い物・旅行・AI 機能のサポートを受けられます。', 'Nestobi 고객센터로 연락해 숙박, 쇼핑, 여행, AI 기능 지원을 받을 수 있습니다.'),
    phoneLabel: pick('客服電話', 'Support Phone', 'サポート電話', '고객센터 전화'),
    emailLabel: pick('客服信箱', 'Email', 'メール', '이메일'),
    aiLabel: pick('AI 客服', 'AI Support', 'AI サポート', 'AI 고객지원'),
    officeLabel: pick('辦公地點', 'Office', 'オフィス所在地', '오피스 위치'),
    weekdays: pick('週一至週五 09:00-18:00', 'Mon-Fri 09:00-18:00', '月-金 09:00-18:00', '월-금 09:00-18:00'),
    online: pick('24 小時線上', '24/7 online', '24時間オンライン', '24시간 온라인'),
    aiOnline: pick('AI 客服 24 小時', 'AI support 24/7', 'AI サポート 24時間', 'AI 고객지원 24시간'),
    instantReply: pick('即時多語系回覆', 'Instant multilingual replies', '多言語で即時返信', '다국어 즉시 응답'),
    officeValue: pick('台北，台灣', 'Taipei, Taiwan', '台北・台湾', '타이베이, 대만'),
    officeSub: pick('Nestobi 總部', 'Nestobi HQ', 'Nestobi 本部', 'Nestobi 본사'),
    formTitle: pick('傳送訊息給我們', 'Send us a message', 'メッセージを送る', '메시지 보내기'),
    formHint: pick('我們通常會在 24 小時內回覆。', 'We usually reply within 24 hours.', '通常24時間以内に返信します。', '보통 24시간 이내에 답변드립니다.'),
    sent: pick('訊息已送出', 'Message sent', '送信完了', '메시지를 보냈습니다'),
    sentHint: pick('我們會回覆到', 'We will respond to', '次のメールに返信します', '다음 이메일로 답변드릴게요'),
    sendAnother: pick('再傳一則訊息', 'Send another message', '別のメッセージを送る', '다른 메시지 보내기'),
    name: pick('姓名', 'Name', 'お名前', '이름'),
    email: pick('電子郵件', 'Email', 'メール', '이메일'),
    subject: pick('主旨', 'Subject', '件名', '제목'),
    message: pick('訊息內容', 'Message', 'メッセージ内容', '메시지 내용'),
    pickSubject: pick('請選擇主旨', 'Select a subject', '件名を選択', '제목을 선택하세요'),
    send: pick('送出訊息', 'Send Message', '送信する', '메시지 보내기'),
    failed: pick('訊息送出失敗，請稍後再試。', 'Failed to send message. Please try again.', '送信に失敗しました。しばらくしてから再試行してください。', '메시지 전송에 실패했습니다. 잠시 후 다시 시도해주세요.'),
  };

  const contactInfo = [
    { icon: Phone, label: t.phoneLabel, value: '0800-123-456', sub: t.weekdays },
    { icon: Mail, label: t.emailLabel, value: 'service@nestobi.com.tw', sub: t.online },
    { icon: Clock, label: t.aiLabel, value: t.aiOnline, sub: t.instantReply },
    { icon: MapPin, label: t.officeLabel, value: t.officeValue, sub: t.officeSub },
  ];

  const subjectOptions = [
    pick('訂房問題', 'Booking Question', '宿泊に関する質問', '숙박 관련 문의'),
    pick('訂單與付款', 'Order & Payment', '注文と支払い', '주문 및 결제'),
    pick('帳號問題', 'Account Issue', 'アカウント問題', '계정 문제'),
    pick('商品問題', 'Product Question', '商品に関する質問', '상품 문의'),
    pick('AI 功能問題', 'AI Feature', 'AI機能', 'AI 기능 문의'),
    pick('商務合作', 'Business Cooperation', 'ビジネス提携', '비즈니스 제휴'),
    pick('其他', 'Other', 'その他', '기타'),
  ];

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
      <SEOHead title={t.title} description={t.seoDesc} keywords={isEn ? 'contact, support, nestobi' : '聯絡我們, 客服, 旅遊平台'} pageType="default" />
      <Navigation />
      <div className="bg-[#F0E4C8] py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C09A6A]/20"><MessageSquare className="h-8 w-8 text-[#2C1F10]" /></div>
            <h1 className="mb-3 text-4xl font-bold text-[#2C1F10]">{t.title}</h1>
            <p className="text-lg text-[#2C1F10]/70">{t.subtitle}</p>
          </motion.div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {contactInfo.map(({ icon: Icon, label, value, sub }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50"><Icon className="h-6 w-6 text-[#2C1F10]" /></div>
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
                <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100"><CheckCircle className="h-10 w-10 text-green-600" /></div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">{t.sent}</h3>
                <p className="text-gray-500">{t.sentHint} <strong>{email}</strong></p>
                <button onClick={() => { setSuccess(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }} className="mt-6 text-sm font-medium text-[#2C1F10] hover:underline">{t.sendAnother}</button>
              </motion.div>
            ) : (
              <>
                {error && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</motion.div>}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="mb-1 block text-sm font-medium text-gray-700">{t.name}</label><input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder={t.name} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" /></div>
                    <div><label className="mb-1 block text-sm font-medium text-gray-700">{t.email}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" /></div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t.subject}</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]">
                      <option value="">{t.pickSubject}</option>
                      {subjectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div><label className="mb-1 block text-sm font-medium text-gray-700">{t.message}</label><textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} placeholder={t.message} className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" /></div>
                  <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C09A6A] py-3 font-semibold text-white transition hover:bg-[#8B6840] disabled:opacity-60">{loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><Send className="h-4 w-4" /> {t.send}</>}</button>
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
