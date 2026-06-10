import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Clock, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { useLanguage } from '../contexts/LanguageContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

const SEND_EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

export default function Contact() {
  const { lang } = useLanguage();
  const { settings } = useSiteSettings();
  const normalizedLang = normalizeLang(lang);
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const t = {
    title: t4('聯絡我們', 'Contact Us', 'お問い合わせ', '문의하기'),
    subtitle: t4(
      '有任何問題都可以和我們聯繫，我們會盡快回覆。',
      'Have questions? We are here to help.',
      'ご不明な点があればお気軽にお問い合わせください。',
      '궁금한 점이 있으면 언제든지 문의해 주세요.',
    ),
    seoDesc: t4(
      '聯絡 Nestobi 取得住宿、購物、文章與 AI 服務協助。',
      'Contact Nestobi support for travel, booking, shopping, or AI feature help.',
      '宿泊、商品、記事、AI サービスについて Nestobi にお問い合わせください。',
      '숙박, 상품, 아티클, AI 서비스 관련해서 Nestobi에 문의하세요.',
    ),
    seoKeywords: t4('聯絡我們, 支援, Nestobi', 'contact, support, nestobi', 'お問い合わせ, サポート, Nestobi', '문의, 고객지원, Nestobi'),
    phoneLabel: t4('客服電話', 'Support Phone', 'サポート電話', '고객센터 전화'),
    emailLabel: t4('客服信箱', 'Email', 'メール', '이메일'),
    aiLabel: t4('AI 客服', 'AI Support', 'AI サポート', 'AI 고객지원'),
    officeLabel: t4('公司資訊', 'Company Info', '会社情報', '회사 정보'),
    weekdays: t4('週一至週五 09:00-18:00', 'Mon-Fri 09:00-18:00', '月〜金 09:00〜18:00', '월~금 09:00~18:00'),
    online: t4('24 小時線上', '24/7 online', '24時間オンライン', '24시간 온라인'),
    aiOnline: t4('AI 客服 24 小時', 'AI support 24/7', 'AI サポート 24 時間', 'AI 고객지원 24시간'),
    instantReply: t4('多語系即時回覆', 'Instant multilingual replies', '多言語で即時返信', '다국어 즉시 응답'),
    formTitle: t4('傳送訊息給我們', 'Send us a message', 'メッセージを送る', '메시지 보내기'),
    formHint: t4('我們通常會在 24 小時內回覆。', 'We usually reply within 24 hours.', '通常 24 時間以内に返信します。', '보통 24시간 내에 답변드립니다.'),
    sent: t4('訊息已送出', 'Message sent', '送信しました', '메시지가 전송되었습니다'),
    sentHint: t4('我們會回覆到', 'We will respond to', '返信先', '답변을 보낼 주소'),
    sendAnother: t4('再傳送一則訊息', 'Send another message', '別のメッセージを送る', '다시 보내기'),
    name: t4('姓名', 'Name', 'お名前', '이름'),
    email: t4('電子郵件', 'Email', 'メール', '이메일'),
    subject: t4('主旨', 'Subject', '件名', '제목'),
    message: t4('訊息內容', 'Message', '内容', '내용'),
    pickSubject: t4('請選擇主旨', 'Select a subject', '件名を選択', '제목을 선택하세요'),
    send: t4('送出訊息', 'Send Message', '送信', '보내기'),
    failed: t4('送出失敗，請稍後再試。', 'Failed to send message. Please try again.', '送信に失敗しました。もう一度お試しください。', '전송에 실패했습니다. 다시 시도해 주세요.'),
  };

  const subjectOptions = [
    t4('訂房問題', 'Booking Question', '宿泊予約について', '숙박 예약 문의'),
    t4('訂單與付款', 'Order & Payment', '注文と支払い', '주문 및 결제'),
    t4('帳號問題', 'Account Issue', 'アカウントの問題', '계정 문제'),
    t4('商品問題', 'Product Question', '商品について', '상품 문의'),
    t4('AI 功能', 'AI Feature', 'AI 機能', 'AI 기능'),
    t4('商務合作', 'Business Cooperation', 'ビジネス提携', '비즈니스 협업'),
    t4('其他', 'Other', 'その他', '기타'),
  ];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const contactInfo = [
    {
      icon: Phone,
      label: t.phoneLabel,
      value: settings.contact_phone || '02-27565663',
      sub: t.weekdays,
    },
    {
      icon: Mail,
      label: t.emailLabel,
      value: settings.contact_email || 'service@dlalshop.com',
      sub: t.online,
    },
    {
      icon: Clock,
      label: t.aiLabel,
      value: t.aiOnline,
      sub: t.instantReply,
    },
    {
      icon: MapPin,
      label: t.officeLabel,
      value: settings.company_name || '若水金禾餐飲股份有限公司',
      sub: `${settings.company_no || '83122492'} · ${settings.headquarters_address || '台北市信義區忠孝東路四段553巷22弄4-1號'}`,
    },
  ];

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
          to: settings.contact_email || 'service@dlalshop.com',
          data: { name, email, subject, message },
        }),
      });
      if (!res.ok) throw new Error('send failed');
      setSuccess(true);
    } catch {
      setError(t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead title={t.title} description={t.seoDesc} keywords={t.seoKeywords} pageType="default" />
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
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
          >
            <h2 className="mb-2 text-2xl font-bold text-gray-900">{t.formTitle}</h2>
            <p className="mb-8 text-sm text-gray-500">{t.formHint}</p>

            {success ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">{t.sent}</h3>
                <p className="text-gray-500">
                  {t.sentHint} <strong>{email}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setName('');
                    setEmail('');
                    setSubject('');
                    setMessage('');
                  }}
                  className="mt-6 text-sm font-medium text-[#2C1F10] hover:underline"
                >
                  {t.sendAnother}
                </button>
              </motion.div>
            ) : (
              <>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
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
                      {subjectOptions.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
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
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> {t.send}
                      </>
                    )}
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
}
