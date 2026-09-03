import { useEffect, useState } from 'react';
import { ArrowRight, Calendar, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { BLOG_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { fetchThemeBanners, getFallbackThemeBanners, type ThemeBanner } from '../../lib/themeBanners';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string;
  category: string;
  published_at: string;
}

interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface Props {
  articles: Article[];
  latestArticles: Article[];
  categories: Category[];
  activeCategory: string;
  search: string;
  loading: boolean;
  labels: Record<string, string>;
  dateLocale: string;
  onCategoryChange: (id: string) => void;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  showAll?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

function formatDate(value: string, locale: string) {
  return value ? new Date(value).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
}

export default function BlogEditorialLanding({ articles, latestArticles, categories, activeCategory, search, loading, labels, dateLocale, onCategoryChange, onSearchChange, onSearch, showAll = false, hasMore = false, onLoadMore }: Props) {
  const featured = articles[0];
  const guideImage = latestArticles[0]?.cover_image_url || featured?.cover_image_url || BLOG_FALLBACK_IMAGE;
  const [themeBanners, setThemeBanners] = useState<ThemeBanner[]>(() => getFallbackThemeBanners('coffee_traveler'));
  const [themeBannerIndex, setThemeBannerIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchThemeBanners('coffee_traveler').then(banners => {
      if (!cancelled && banners.length > 0) {
        setThemeBanners(banners);
        setThemeBannerIndex(0);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (themeBanners.length <= 1) return;
    const timer = window.setInterval(() => setThemeBannerIndex(index => (index + 1) % themeBanners.length), 6500);
    return () => window.clearInterval(timer);
  }, [themeBanners.length]);

  const activeThemeBanner = themeBanners[themeBannerIndex] || themeBanners[0];

  return (
    <div className="blog-page min-h-screen bg-[#F7F5F1] text-[#24231F]">
      <SEOHead title={labels.pageTitle} description={labels.pageDesc} keywords={labels.seoKeywords} ogType="blog" />
      <Navigation />
      <main>
        <section className="mx-auto grid max-w-[1440px] gap-10 px-6 py-14 sm:px-10 sm:py-20 lg:grid-cols-[0.9fr_1.6fr] lg:items-center lg:gap-16 lg:px-16">
          <div className="max-w-sm"><p className="text-xs tracking-[0.34em] text-[#69665F]">JOURNAL</p><h1 className="mt-5 font-serif text-5xl font-normal tracking-[0.08em] sm:text-6xl">STORIES FROM THE ROAD</h1><p className="mt-7 text-sm leading-8 text-[#69665F]">{labels.heroDesc}</p></div>
          <div className="relative aspect-[4/3] overflow-hidden bg-[#EAE6E0]"><img src={activeThemeBanner?.image_url || featured?.cover_image_url || BLOG_FALLBACK_IMAGE} alt={activeThemeBanner?.title_zh || featured?.title || 'Journal'} className="h-full w-full object-cover transition-opacity duration-700" onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} />{themeBanners.length > 1 && <div className="absolute bottom-5 left-5 flex gap-2">{themeBanners.map((banner, index) => <button key={banner.id} type="button" onClick={() => setThemeBannerIndex(index)} aria-label={`Journal banner ${index + 1}`} className={`h-px transition-all ${index === themeBannerIndex ? 'w-8 bg-white' : 'w-3 bg-white/60'}`} />)}</div>}</div>
        </section>

        <section className="border-y border-[#D7D2C9]"><div className="mx-auto flex max-w-[1440px] gap-8 overflow-x-auto px-6 py-5 sm:px-10 lg:px-16">{[{ id: 'all', name: labels.all }, ...categories.filter(category => !category.parent_id)].map(category => <button key={category.id} type="button" onClick={() => onCategoryChange(category.id)} className={`shrink-0 border-b pb-2 text-[11px] uppercase tracking-[0.14em] ${activeCategory === category.id ? 'border-[#24231F] text-[#24231F]' : 'border-transparent text-[#8A857D]'}`}>{category.name}</button>)}</div></section>

        <section className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 sm:py-24 lg:px-16"><div className="mb-8 flex items-center justify-between gap-6"><div><p className="text-xs tracking-[0.28em] text-[#69665F]">FEATURED STORY</p><h2 className="mt-3 font-serif text-3xl font-normal">{labels.featured}</h2></div><div className="flex items-center border-b border-[#BFB7AC] py-2"><input value={search} onChange={event => onSearchChange(event.target.value)} onKeyDown={event => event.key === 'Enter' && onSearch()} placeholder={labels.searchPlaceholder} className="w-36 bg-transparent text-xs outline-none placeholder:text-[#9A938A] sm:w-56" /><button type="button" onClick={onSearch} aria-label={labels.search}><ArrowRight size={15} /></button></div></div>{loading ? <div className="py-20 text-center text-sm text-[#69665F]">Loading...</div> : featured ? <Link to={`/blog/${featured.slug}`} className="group grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-center"><div className="aspect-[4/3] overflow-hidden"><img src={featured.cover_image_url || BLOG_FALLBACK_IMAGE} alt={featured.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]" onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} /></div><div className="lg:pl-6"><div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-[#69665F]"><span>{featured.category}</span><span>{formatDate(featured.published_at, dateLocale)}</span></div><h3 className="mt-5 font-serif text-3xl font-normal leading-tight">{featured.title}</h3><p className="mt-5 text-sm leading-8 text-[#69665F]">{featured.excerpt}</p><span className="mt-7 inline-flex items-center gap-2 text-xs tracking-[0.16em] underline underline-offset-8">{labels.readMore} <ArrowRight size={14} /></span></div></Link> : <p className="py-20 text-center text-sm text-[#69665F]">{labels.noResult}</p>}</section>

        <section className="mx-auto max-w-[1440px] px-6 pb-16 sm:px-10 sm:pb-24 lg:px-16"><div className="flex items-end justify-between gap-6"><div><p className="text-xs tracking-[0.28em] text-[#69665F]">LATEST STORIES</p><h2 className="mt-3 font-serif text-3xl font-normal">{labels.latest}</h2></div>{showAll ? <span className="text-xs text-[#69665F]">{articles.length} {labels.found}</span> : <Link to="/blog?view=all" className="text-xs tracking-[0.14em] text-[#69665F] underline underline-offset-8">{labels.showMore}</Link>}</div>{!loading && <div className="mt-8 grid gap-8 md:grid-cols-3">{latestArticles.slice(0, showAll ? latestArticles.length : 3).map(article => <Link key={article.id} to={`/blog/${article.slug}`} className="group"><div className="aspect-[4/3] overflow-hidden"><img src={article.cover_image_url || BLOG_FALLBACK_IMAGE} alt={article.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]" onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} /></div><div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-[#69665F]"><span>{article.category}</span><span>{formatDate(article.published_at, dateLocale)}</span></div><h3 className="mt-3 text-base leading-7">{article.title}</h3><span className="mt-4 inline-flex items-center gap-2 text-[11px] tracking-[0.14em] underline underline-offset-8">{labels.readMore} <ArrowRight size={13} /></span></Link>)}</div>}{showAll && hasMore && <button type="button" onClick={onLoadMore} className="mx-auto mt-14 block border-b border-[#24231F] pb-2 text-xs tracking-[0.16em]">{labels.loadMore}</button>}</section>

        <section className="relative min-h-[280px] overflow-hidden bg-[#292925] text-white"><img src={guideImage} alt="Local guide" className="absolute inset-0 h-full w-full object-cover opacity-45" onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} /><div className="absolute inset-0 bg-black/35" /><div className="relative mx-auto flex min-h-[280px] max-w-[1440px] items-center px-6 py-16 sm:px-10 lg:px-16"><div><p className="text-xs tracking-[0.28em] text-white">LOCAL GUIDE</p><h2 className="mt-4 font-serif text-3xl font-normal text-white">{labels.localGuide}</h2><p className="mt-4 max-w-sm text-sm leading-7 text-white/80">{labels.localGuideBody}</p><Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-xs tracking-[0.16em] text-white underline underline-offset-8">{labels.exploreGuide} <ArrowRight size={14} /></Link></div></div></section>

        <section className="mx-auto grid max-w-[1440px] gap-10 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-16"><div><p className="text-xs tracking-[0.28em] text-[#69665F]">STAY IN TOUCH</p><h2 className="mt-4 font-serif text-3xl font-normal">{labels.stayInTouch}</h2><p className="mt-4 max-w-sm text-sm leading-7 text-[#69665F]">{labels.stayInTouchBody}</p><div className="mt-7 flex max-w-sm border border-[#BFB7AC]"><input type="email" placeholder={labels.emailPlaceholder} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" /><button type="button" aria-label="Subscribe" className="bg-[#24231F] px-4 text-white"><Mail size={15} /></button></div></div><div className="border-t border-[#D7D2C9] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"><p className="text-xs tracking-[0.2em]">FOLLOW US ON INSTAGRAM</p><div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">{[featured, ...latestArticles].filter(Boolean).slice(0, 5).map((article, index) => <img key={`${article!.id}-${index}`} src={article!.cover_image_url || BLOG_FALLBACK_IMAGE} alt="Instagram" className="aspect-square w-full object-cover" onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} />)}</div></div></section>
      </main>
      <Footer />
    </div>
  );
}
