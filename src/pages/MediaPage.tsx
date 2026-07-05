import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';
import { breadcrumbSchema } from '../utils/schemaMarkup';
import { getMediaArticlesByGroup, getMediaGroup } from '../data/mediaContent';

const defaultGroupSlug = '79';

export default function MediaPage() {
  const { categorySlug } = useParams();
  const { pathname } = useLocation();
  const isVideoPage = categorySlug === '78' || pathname.replace(/\/+$/, '') === '/media/78';
  const groupSlug = isVideoPage ? '78' : defaultGroupSlug;
  const group = getMediaGroup(groupSlug) || getMediaGroup(defaultGroupSlug);
  const articles = getMediaArticlesByGroup(groupSlug);

  useSEO({
    title: group?.title || '相關報導',
    description: `${group?.title || '相關報導'} - 淞品土雞專賣店`,
    keywords: '相關報導, 報章雜誌, 影音報導, 淞品, Sonpin',
    schema: breadcrumbSchema([
      { name: '首頁', url: window.location.origin },
      { name: group?.title || '相關報導', url: `${window.location.origin}${isVideoPage ? '/media/78' : '/media'}` },
    ]),
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf6ee] text-stone-800">
      <SiteHeader />

      <main className="flex-1 pt-20">
        <section className="border-b border-[#eadfd1] bg-[linear-gradient(135deg,#fbf6ee_0%,#f7efe5_44%,#fffaf2_100%)]">
          <div className="container mx-auto px-6 py-16 md:py-24">
            <nav className="mb-8 flex items-center gap-2 text-xs tracking-[0.18em] text-stone-400">
              <Link to="/" className="transition-colors hover:text-stone-700">
                首頁
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-stone-700">{group?.title || '相關報導'}</span>
            </nav>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.36em] text-[#8e6448]/80">
              {group?.label || 'Media'}
            </p>
            <h1 className="max-w-3xl text-4xl font-light leading-tight tracking-[0.16em] text-stone-900 md:text-6xl">
              {group?.title || '相關報導'}
            </h1>
          </div>
        </section>

        <section className="container mx-auto px-6 py-14">
          <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
            <Link
              to="/media"
              className={`flex-shrink-0 border px-4 py-2 text-xs tracking-[0.16em] transition-all ${
                !isVideoPage
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 text-stone-500 hover:border-stone-700 hover:text-stone-900'
              }`}
            >
              報章雜誌
            </Link>
            <Link
              to="/media/78"
              className={`flex-shrink-0 border px-4 py-2 text-xs tracking-[0.16em] transition-all ${
                isVideoPage
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 text-stone-500 hover:border-stone-700 hover:text-stone-900'
              }`}
            >
              影音報導
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => {
              const cardImage = article.featuredImage || article.galleryImages[0] || '/sonpin-images/153285188512.jpg';
              const fallbackExcerpt =
                article.kind === 'video' && (!article.excerpt || article.excerpt === article.title)
                  ? '影音報導內容，原站未附完整文字摘要。'
                  : article.excerpt;
              return (
                <Link
                  key={`${article.groupSlug}-${article.articleSlug}`}
                  to={`/media/${article.groupSlug}/${article.articleSlug}`}
                  className="group block overflow-hidden rounded-3xl border border-[#eadfd1] bg-[#fffaf2] shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-stone-200 hover:shadow-[0_24px_58px_-26px_rgba(41,37,36,0.18)]"
                >
                  <div className="aspect-[4/3] bg-stone-100">
                    <img src={cardImage} alt={article.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  </div>
                  <div className="p-5">
                    <div className="mb-3 text-[11px] tracking-[0.18em] text-stone-400">{article.date}</div>
                    <h2 className="text-base leading-7 text-stone-800 transition-colors group-hover:text-amber-800">
                      {article.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-stone-500">{fallbackExcerpt}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
