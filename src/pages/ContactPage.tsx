import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Mail, Phone, Send, ChevronRight } from 'lucide-react';
import { isSupabaseContentEnabled, supabase } from '../lib/supabase';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';
import { breadcrumbSchema } from '../utils/schemaMarkup';
import { useLanguage } from '../contexts/LanguageContext';
import { shouldTranslateStaticPage, translateStaticPage, type TranslatableStaticPage } from '../lib/staticPageTranslation';

interface StaticPageData extends TranslatableStaticPage {}

interface SiteInfo {
  contact_email: string;
  contact_phone: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const { currentLanguage, t } = useLanguage();
  const [sourcePage, setSourcePage] = useState<StaticPageData | null>(null);
  const [page, setPage] = useState<StaticPageData | null>(null);
  const [siteInfo, setSiteInfo] = useState<SiteInfo>({ contact_email: '', contact_phone: '' });
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);

  useSEO({
    title: t('contact.seo.title', '聯絡我們'),
    description: t('contact.seo.description', '聯絡 Sonpin，無論是商品、訂單、合作或其他需求，都歡迎透過表單與我們聯繫。'),
    keywords: t('contact.seo.keywords', '聯絡我們,Sonpin,客服,合作洽詢'),
    schema: breadcrumbSchema([
      { name: t('common.home', '首頁'), url: window.location.origin },
      { name: t('contact.title', '聯絡我們'), url: `${window.location.origin}/contact` },
    ]),
  });

  useEffect(() => {
    const loadPage = async () => {
      if (!isSupabaseContentEnabled) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('static_pages')
          .select('*')
          .eq('slug', 'contact')
          .eq('is_published', true)
          .maybeSingle();
        if (data) {
          setSourcePage(data as StaticPageData);
          setPage(data as StaticPageData);
        }
      } catch {
        // Keep fallback text.
      } finally {
        setLoading(false);
      }
    };

    const loadSiteInfo = async () => {
      if (!isSupabaseContentEnabled) return;

      try {
        const { data } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'footer')
          .maybeSingle();
        if (data?.setting_value) {
          setSiteInfo({
            contact_email: data.setting_value.contact_email || '',
            contact_phone: data.setting_value.contact_phone || '',
          });
        }
      } catch {
        // Keep fallback text.
      }
    };

    void loadPage();
    void loadSiteInfo();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!sourcePage) return;
      if (!shouldTranslateStaticPage(currentLanguage)) {
        setPage(sourcePage);
        return;
      }

      setTranslating(true);
      try {
        const translated = await translateStaticPage(sourcePage, currentLanguage);
        setPage(translated as StaticPageData);
      } catch {
        setPage(sourcePage);
      } finally {
        setTranslating(false);
      }
    };

    void run();
  }, [currentLanguage, sourcePage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      setError(t('contact.validation.required', '請完整填寫必填欄位。'));
      return;
    }

    setError('');
    setSubmitting(true);

    if (!isSupabaseContentEnabled) {
      setError(t('contact.validation.disabled', '目前聯絡功能尚未啟用，請稍後再試或改用電子郵件聯繫。'));
      setSubmitting(false);
      return;
    }

    try {
      const { error: dbError } = await supabase.from('contact_inquiries').insert({
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: form.subject,
        message: form.message,
        status: 'pending',
      });
      if (dbError) throw dbError;

      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'contact',
          data: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            subject: form.subject,
            message: form.message,
          },
        }),
      }).catch(() => {});

      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      setError(t('contact.validation.failed', '送出失敗，請稍後再試。'));
    } finally {
      setSubmitting(false);
    }
  };

  const sections = page?.sections || [];
  const intro = sections.find((section) => section.type === 'intro');
  const infoSections = sections.filter((section) => section.type === 'section');

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf6ee]">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-[#2b221d] via-[#5f4636] to-[#8e6448] pt-32 pb-20 text-[#fffaf2]">
          <div className="container mx-auto px-6">
            <div className="flex items-center gap-2 text-xs text-[#eadfd1] tracking-[0.1em] mb-6">
              <Link to="/" className="hover:text-[#fffaf2] transition-colors">
                {t('common.home', '首頁')}
              </Link>
              <ChevronRight size={12} />
              <span className="text-[#f4ecdf]">{t('contact.title', '聯絡我們')}</span>
            </div>
            <p className="text-[#cfa87a] text-xs tracking-[0.3em] uppercase mb-3 font-medium">Contact Us</p>
            <h1 className="text-5xl md:text-6xl font-light tracking-wide mb-4">
              {loading ? t('contact.loading', '載入中') : (page?.title || t('contact.title', '聯絡我們'))}
            </h1>
            <p className="text-[#eadfd1] font-light max-w-2xl leading-relaxed text-base">
              {intro?.content || t('contact.description', '如果你有商品、訂單、合作或其他需求，歡迎透過表單或電子郵件聯絡我們。')}
            </p>
          </div>
        </section>

        <div className="container mx-auto px-6 py-20 max-w-6xl">
          <div className="grid md:grid-cols-5 gap-16">
            <div className="md:col-span-2 space-y-8">
              {translating && (
                <div className="inline-flex items-center rounded-full border border-[#eadfd1]/60 bg-[#fffaf2]/70 px-3 py-1 text-[11px] tracking-[0.18em] text-[#8e6448]">
                  {t('common.translating', '翻譯中')}
                </div>
              )}

              {siteInfo.contact_email && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#f4ecdf] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#8e6448]" />
                  </div>
                  <div>
                    <p className="text-xs tracking-widest text-[#9f8a7b] uppercase mb-1">{t('contact.email', '客服信箱')}</p>
                    <a href={`mailto:${siteInfo.contact_email}`} className="text-[#2b221d] hover:text-[#8e6448] transition-colors font-light">
                      {siteInfo.contact_email}
                    </a>
                  </div>
                </div>
              )}

              {siteInfo.contact_phone && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#f4ecdf] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-[#8e6448]" />
                  </div>
                  <div>
                    <p className="text-xs tracking-widest text-[#9f8a7b] uppercase mb-1">{t('contact.phone', '客服電話')}</p>
                    <a href={`tel:${siteInfo.contact_phone}`} className="text-[#2b221d] hover:text-[#8e6448] transition-colors font-light">
                      {siteInfo.contact_phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#f4ecdf] flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-[#8e6448]" />
                </div>
                <div>
                  <p className="text-xs tracking-widest text-[#9f8a7b] uppercase mb-1">{t('contact.hours', '營業時間')}</p>
                  <p className="text-[#2b221d] font-light">{t('contact.hours.weekdays', '週一至週五')}</p>
                  <p className="text-[#9f8a7b] font-light text-sm">09:00 - 18:00</p>
                </div>
              </div>

              {infoSections.length > 0 && (
                <div className="pt-4 border-t border-[#eadfd1] space-y-6">
                  {infoSections.map((section, i) => (
                    <div key={i}>
                      <h3 className="text-sm font-medium text-[#6d4f3d] mb-2">{section.title}</h3>
                      <p className="text-sm text-[#9f8a7b] font-light leading-relaxed whitespace-pre-line">
                        {section.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-3">
              {submitted ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#f4ecdf] flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-[#8e6448]" />
                  </div>
                  <h2 className="text-2xl font-light text-[#2b221d] mb-3">{t('contact.success.title', '已成功送出')}</h2>
                  <p className="text-[#9f8a7b] font-light leading-relaxed max-w-sm mb-8">
                    {t('contact.success.description', '我們已收到你的訊息，會盡快透過你提供的聯絡方式回覆。')}
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-sm text-[#8e6448] hover:underline font-light"
                  >
                    {t('contact.success.reset', '再次填寫')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs tracking-widest text-[#9f8a7b] uppercase mb-2">
                        {t('contact.form.name', '姓名')} <span className="text-[#a97a4f]">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder={t('contact.form.name.placeholder', '請輸入你的姓名')}
                        className="w-full px-4 py-3 border border-[#eadfd1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cfa87a] focus:border-transparent text-[#2b221d] placeholder-[#d8c9ba] font-light transition-all duration-200 bg-[#fffaf2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs tracking-widest text-[#9f8a7b] uppercase mb-2">
                        {t('contact.form.email', '電子郵件')} <span className="text-[#a97a4f]">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@email.com"
                        className="w-full px-4 py-3 border border-[#eadfd1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cfa87a] focus:border-transparent text-[#2b221d] placeholder-[#d8c9ba] font-light transition-all duration-200 bg-[#fffaf2]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs tracking-widest text-[#9f8a7b] uppercase mb-2">
                        {t('contact.form.phone', '聯絡電話')}
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+886 2 1234 5678"
                        className="w-full px-4 py-3 border border-[#eadfd1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cfa87a] focus:border-transparent text-[#2b221d] placeholder-[#d8c9ba] font-light transition-all duration-200 bg-[#fffaf2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs tracking-widest text-[#9f8a7b] uppercase mb-2">
                        {t('contact.form.subject', '主旨')} <span className="text-[#a97a4f]">*</span>
                      </label>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full px-4 py-3 border border-[#eadfd1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cfa87a] focus:border-transparent text-[#2b221d] font-light transition-all duration-200 bg-[#fffaf2]"
                      >
                        <option value="">{t('contact.form.subject.placeholder', '請選擇主旨')}</option>
                        <option value="product">{t('contact.form.subject.product', '商品諮詢')}</option>
                        <option value="order">{t('contact.form.subject.order', '訂單問題')}</option>
                        <option value="corporate">{t('contact.form.subject.corporate', '企業合作')}</option>
                        <option value="media">{t('contact.form.subject.media', '媒體聯繫')}</option>
                        <option value="other">{t('contact.form.subject.other', '其他')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest text-[#9f8a7b] uppercase mb-2">
                      {t('contact.form.message', '訊息內容')} <span className="text-[#a97a4f]">*</span>
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder={t('contact.form.message.placeholder', '請簡單描述你的需求，我們會盡快回覆。')}
                      rows={6}
                      className="w-full px-4 py-3 border border-[#eadfd1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cfa87a] focus:border-transparent text-[#2b221d] placeholder-[#d8c9ba] font-light transition-all duration-200 resize-none bg-[#fffaf2]"
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm font-light">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-3 px-8 py-4 bg-[#8e6448] text-[#fffaf2] rounded-full hover:bg-[#6d4f3d] transition-colors disabled:opacity-50 text-sm font-medium group"
                  >
                    <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    {submitting ? t('contact.form.sending', '送出中...') : t('contact.form.submit', '送出訊息')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
