import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Coffee, Heart, Leaf, ChevronRight } from 'lucide-react';
import { isSupabaseContentEnabled, supabase } from '../lib/supabase';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';
import { breadcrumbSchema } from '../utils/schemaMarkup';
import { useLanguage } from '../contexts/LanguageContext';
import { shouldTranslateStaticPage, translateStaticPage, type TranslatableStaticPage } from '../lib/staticPageTranslation';

interface StaticPageData extends TranslatableStaticPage {}

const ICONS = [Coffee, Leaf, Award, Heart];

const FEATURE_ICONS = [
  { icon: Coffee, label: '精選烘焙', desc: '嚴選豆款與溫和烘焙，保留香氣與層次。' },
  { icon: Leaf, label: '友善選品', desc: '重視來源、風味與日常飲用的平衡。' },
  { icon: Award, label: '品質把關', desc: '從豆袋到禮盒包裝都維持一致標準。' },
  { icon: Heart, label: '用心服務', desc: '希望每一次送禮與日常飲用都剛剛好。' },
];

export default function AboutPage() {
  const { currentLanguage, t } = useLanguage();
  const [sourcePage, setSourcePage] = useState<StaticPageData | null>(null);
  const [page, setPage] = useState<StaticPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);

  useSEO({
    title: page?.title || t('about.seo.title', '關於我們'),
    description: page?.meta_description || t('about.seo.description', '了解 Sonpin 的品牌理念與選品故事。'),
    keywords: t('about.seo.keywords', '關於我們,Sonpin,品牌理念,咖啡選品'),
    schema: breadcrumbSchema([
      { name: t('common.home', '首頁'), url: window.location.origin },
      { name: t('about.breadcrumb', '關於我們'), url: `${window.location.origin}/about` },
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
          .eq('slug', 'about')
          .eq('is_published', true)
          .maybeSingle();
        if (data) {
          setSourcePage(data);
          setPage(data);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    void loadPage();
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
        setPage(translated);
      } catch {
        setPage(sourcePage);
      } finally {
        setTranslating(false);
      }
    };

    void run();
  }, [currentLanguage, sourcePage]);

  const formatContent = (content: string) =>
    content.split('\n').map((line, index, arr) => (
      <span key={index}>
        {line}
        {index < arr.length - 1 && <br />}
      </span>
    ));

  const sections = page?.sections || [];
  const intro = sections.find((section) => section.type === 'intro');
  const rest = sections.filter((section) => section.type !== 'intro');

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf6ee]">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative h-[60vh] min-h-[500px] bg-[#c7a08d] overflow-hidden">
          <img
            src="https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1600"
            alt={t('about.hero.alt', '關於我們')}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#2b221d]/10 via-[#2b221d]/30 to-[#2b221d]/60" />
          <div className="relative h-full flex flex-col justify-end pb-16 px-6 container mx-auto">
            <div className="flex items-center gap-2 text-xs text-[#eadfd1] tracking-[0.1em] mb-4">
              <Link to="/" className="hover:text-[#fffaf2] transition-colors">
                {t('common.home', '首頁')}
              </Link>
              <ChevronRight size={12} />
              <span className="text-[#eadfd1]">{t('about.breadcrumb', '關於我們')}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-light text-[#fffaf2] tracking-wide">
              {loading ? t('about.loading', '關於我們') : (page?.title || t('about.title', '關於我們'))}
            </h1>
            {page?.meta_description && (
              <p className="mt-4 text-[#eadfd1] max-w-2xl font-light text-base leading-relaxed">
                {page.meta_description}
              </p>
            )}
          </div>
        </section>

        {intro && (
          <section className="bg-[#f4ecdf] border-b border-[#eadfd1]">
            <div className="container mx-auto px-6 py-16 max-w-4xl">
              {translating && (
                <div className="mb-4 inline-flex items-center rounded-full border border-[#eadfd1] bg-[#fffaf2] px-3 py-1 text-[11px] tracking-[0.18em] text-[#8e6448]">
                  {t('common.translating', '翻譯中')}
                </div>
              )}
              <p className="text-lg md:text-xl font-light text-[#6d4f3d] leading-relaxed text-center">
                {intro.content}
              </p>
            </div>
          </section>
        )}

        <section className="container mx-auto px-6 py-20 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
            {FEATURE_ICONS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-center group">
                <div className="w-16 h-16 rounded-2xl bg-[#f4ecdf] border border-[#eadfd1] flex items-center justify-center mx-auto mb-4 group-hover:bg-[#eadfd1] transition-colors duration-300">
                  <Icon className="w-7 h-7 text-[#8e6448]" />
                </div>
                <h3 className="font-medium text-[#2b221d] mb-1">{t(`about.feature.${label}`, label)}</h3>
                <p className="text-sm text-[#9f8a7b] font-light leading-relaxed">
                  {t(`about.feature.${label}.desc`, desc)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-16">
            {rest.map((section, index) => {
              const Icon = ICONS[index % ICONS.length];
              return (
                <div
                  key={index}
                  className={`flex flex-col md:flex-row gap-12 items-start ${
                    index % 2 === 1 ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  <div className="md:w-1/3 flex-shrink-0">
                    <div className="bg-[#2b221d] rounded-3xl p-8 text-[#fffaf2] h-full min-h-[180px] flex flex-col justify-between">
                      <Icon className="w-8 h-8 text-[#f4ecdf] mb-4" />
                      <h2 className="text-2xl font-light">{section.title}</h2>
                    </div>
                  </div>
                  <div className="md:w-2/3 flex items-center">
                    <p className="text-[#6d4f3d] font-light leading-relaxed text-base whitespace-pre-line">
                      {formatContent(section.content)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-[#2b221d] text-[#fffaf2] py-20">
          <div className="container mx-auto px-6 text-center max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-light mb-6 tracking-wide">
              {t('about.cta.title', '一起認識更多 Sonpin')}
            </h2>
            <p className="text-[#eadfd1] font-light mb-10 leading-relaxed">
              {t(
                'about.cta.description',
                '我們希望把咖啡、禮盒與送禮體驗都維持在同一個溫柔且細緻的品牌節奏裡。',
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#a97a4f] text-[#fffaf2] rounded-full hover:bg-[#8e6448] transition-colors text-sm font-medium"
              >
                {t('about.cta.contact', '聯絡我們')}
                <ChevronRight size={16} />
              </Link>
              <Link
                to="/story"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[#6d4f3d] text-[#eadfd1] rounded-full hover:border-[#cfa87a] hover:text-[#cfa87a] transition-colors text-sm font-light"
              >
                {t('about.cta.story', '品牌故事')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
