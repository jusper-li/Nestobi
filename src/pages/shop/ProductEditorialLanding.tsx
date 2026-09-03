import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, ShoppingBag } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import { fetchThemeBanners, getFallbackThemeBanners, type ThemeBanner } from '../../lib/themeBanners';
import { supabase } from '../../lib/supabase';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock_quantity: number;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  search: string;
  sortMode: string;
  loading: boolean;
  heroImage: string;
  labels: Record<string, string>;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onCategoryChange: (id: string) => void;
  onSortChange: (value: string) => void;
  onAddToCart: (id: string) => void;
  showAll?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const fallbackJournalItems = [
  { image: '/blog-images/blog-01-01.jpg', eyebrow: 'BREW GUIDE', title: '怎麼沖出一杯好喝的手沖咖啡？', href: '/blog' },
  { image: '/blog-images/blog-14-01.webp', eyebrow: 'ORIGIN STORY', title: '咖啡與旅程，從產地開始。', href: '/blog' },
  { image: '/blog-images/blog-10-01.jpg', eyebrow: 'COFFEE BASICS', title: '咖啡保存與風味小知識', href: '/blog' },
];

interface JournalPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
}

function summary(value: string | null) {
  return value?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
}

export default function ProductEditorialLanding({
  products,
  categories,
  selectedCategory,
  search,
  sortMode,
  loading,
  heroImage,
  labels,
  onSearchChange,
  onSearch,
  onCategoryChange,
  onSortChange,
  onAddToCart,
  showAll = false,
  hasMore = false,
  onLoadMore,
}: Props) {
  const newArrivals = showAll ? products : products.slice(0, 4);
  const categoryItems = categories.filter(category => !category.id.includes('all')).slice(0, 6);
  const [themeBanners, setThemeBanners] = useState<ThemeBanner[]>(() => getFallbackThemeBanners('genbon_travel'));
  const [themeBannerIndex, setThemeBannerIndex] = useState(0);
  const [journalItems, setJournalItems] = useState(fallbackJournalItems);

  useEffect(() => {
    let cancelled = false;
    fetchThemeBanners('genbon_travel')
      .then(banners => {
        if (!cancelled && banners.length > 0) {
          setThemeBanners(banners);
          setThemeBannerIndex(0);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (themeBanners.length <= 1) return;
    const timer = window.setInterval(() => setThemeBannerIndex(index => (index + 1) % themeBanners.length), 6500);
    return () => window.clearInterval(timer);
  }, [themeBanners.length]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('blog_posts')
      .select('id,title,slug,excerpt,cover_image_url,category')
      .eq('status', 'published')
      .neq('slug', 'system-store-locations')
      .order('published_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (cancelled || error || !data?.length) return;
        const posts = [...(data as JournalPost[])].sort(() => Math.random() - 0.5).slice(0, 3);
        setJournalItems(posts.map(post => ({
          image: post.cover_image_url || '/blog-images/blog-01-01.jpg',
          eyebrow: post.category || 'COFFEE JOURNAL',
          title: post.title,
          href: `/blog/${post.slug}`,
        })));
      });
    return () => { cancelled = true; };
  }, []);

  const activeThemeBanner = themeBanners[themeBannerIndex] || themeBanners[0];
  const heroImageSource = activeThemeBanner?.image_url || heroImage;
  const bannerDots = useMemo(() => themeBanners.map(banner => banner.id), [themeBanners]);

  return (
    <>
      <Navigation />
      <main className="bg-[#F7F5F1] text-[#24231F]">
        <section className="relative overflow-hidden bg-[#EAE6E0]">
          <img src={heroImageSource} alt={activeThemeBanner?.title_zh || 'Coffee'} className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity duration-700" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F7F5F1]/95 via-[#F7F5F1]/70 to-transparent" />
          <div className="relative mx-auto flex min-h-[min(680px,78svh)] max-w-[1440px] items-center px-6 py-28 sm:px-10 lg:px-16">
            <div className="max-w-md">
              <p className="text-xs tracking-[0.34em]">COFFEE</p>
              <h1 className="mt-5 font-serif text-5xl font-normal leading-[1.04] tracking-[0.06em] sm:text-7xl">DRINK LIKE A LOCAL</h1>
              <p className="mt-7 max-w-xs text-sm leading-8 text-[#69665F]">{labels.heroDesc}</p>
              <a href="#new-arrivals" className="mt-8 inline-flex items-center gap-2 text-xs tracking-[0.18em] underline underline-offset-8">{labels.explore} <ArrowRight size={15} /></a>
              {bannerDots.length > 1 && <div className="mt-7 flex gap-2">{bannerDots.map((id, index) => <button key={id} type="button" onClick={() => setThemeBannerIndex(index)} aria-label={`Coffee banner ${index + 1}`} className={`h-px transition-all ${index === themeBannerIndex ? 'w-8 bg-[#24231F]' : 'w-3 bg-[#24231F]/35'}`} />)}</div>}
            </div>
          </div>
        </section>

        <section id="new-arrivals" className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 sm:py-24 lg:px-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs tracking-[0.28em] text-[#69665F]">NEW ARRIVALS</p>
              <h2 className="mt-3 font-serif text-3xl font-normal">{labels.newArrivals}</h2>
            </div>
            <Link to="/shop?view=all" className="text-xs tracking-[0.15em] text-[#69665F] underline underline-offset-8">{labels.viewAll}</Link>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-y border-[#D8D1C8] py-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center border-b border-[#BFB7AC] py-2">
              <Search size={16} className="mr-3 text-[#69665F]" />
              <input value={search} onChange={event => onSearchChange(event.target.value)} onKeyDown={event => event.key === 'Enter' && onSearch()} placeholder={labels.searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9A938A]" />
              <button type="button" onClick={onSearch} className="text-xs tracking-[0.12em] underline underline-offset-4">{labels.search}</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
              <button type="button" onClick={() => onCategoryChange('all')} className={`shrink-0 px-3 py-2 ${selectedCategory === 'all' ? 'bg-[#24231F] text-white' : 'border border-[#D8D1C8]'}`}>{labels.allProducts}</button>
              {categoryItems.map(category => <button key={category.id} type="button" onClick={() => onCategoryChange(category.id)} className={`shrink-0 px-3 py-2 ${selectedCategory === category.id ? 'bg-[#24231F] text-white' : 'border border-[#D8D1C8]'}`}>{category.name}</button>)}
            </div>
            <select value={sortMode} onChange={event => onSortChange(event.target.value)} className="border-0 bg-transparent text-xs text-[#69665F] outline-none">
              <option value="recommended">{labels.recommended}</option>
              <option value="price-asc">{labels.priceAsc}</option>
              <option value="price-desc">{labels.priceDesc}</option>
              <option value="stock">{labels.stockMost}</option>
            </select>
          </div>

          {loading ? <div className="py-20 text-center text-sm text-[#69665F]">Loading...</div> : <><div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">{newArrivals.map(product => <article key={product.id} className="group"><Link to={`/shop/${product.id}`} className="block"><div className="relative aspect-[4/5] overflow-hidden bg-[#EAE6E0]"><img src={product.image_url || '/product-images/the-one-and-only-champion-blend-beans-1.jpg'} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute left-3 top-3 bg-[#F7F5F1] px-2 py-1 text-[10px] tracking-[0.14em]">NEW</span></div><h3 className="mt-4 line-clamp-2 text-sm leading-6">{product.name}</h3><p className="mt-2 line-clamp-2 text-xs text-[#69665F]">{summary(product.description)}</p><p className="mt-3 text-xs tracking-[0.12em]">NT$ {product.price.toLocaleString()}</p></Link><button type="button" onClick={() => onAddToCart(product.id)} disabled={product.stock_quantity <= 0} className="mt-4 inline-flex items-center gap-2 text-xs tracking-[0.12em] text-[#69665F] underline underline-offset-4 disabled:no-underline disabled:opacity-45"><ShoppingBag size={14} />{product.stock_quantity > 0 ? labels.add : labels.soldOut}</button></article>)}</div>{showAll && hasMore && <button type="button" onClick={onLoadMore} className="mx-auto mt-14 block border-b border-[#24231F] pb-2 text-xs tracking-[0.16em]">{labels.loadMore}</button>}</>}
        </section>

        <section className="relative min-h-[360px] overflow-hidden bg-[#33291F] text-white"><img src="/product-images/ynm-pourover-brewing-set-2.jpg" alt="Subscription coffee" className="absolute inset-0 h-full w-full object-cover opacity-55" /><div className="absolute inset-0 bg-[#17130F]/45" /><div className="relative mx-auto flex min-h-[360px] max-w-[1440px] items-center px-6 py-16 text-white sm:px-10 lg:px-16"><div><p className="text-xs tracking-[0.3em] text-white">SUBSCRIPTION</p><h2 className="mt-4 max-w-sm font-serif text-4xl font-normal text-white">{labels.subscription}</h2><p className="mt-5 max-w-sm text-sm leading-7 text-white/85">{labels.subscriptionBody}</p><Link to="/shop" className="mt-7 inline-flex items-center gap-2 text-xs tracking-[0.18em] text-white underline underline-offset-8">{labels.learnMore} <ArrowRight size={15} /></Link></div></div></section>

        <section className="mx-auto max-w-[1440px] px-6 py-16 sm:px-10 sm:py-24 lg:px-16"><div className="flex items-end justify-between"><div><p className="text-xs tracking-[0.28em] text-[#69665F]">COFFEE JOURNAL</p><h2 className="mt-3 font-serif text-3xl font-normal">{labels.journal}</h2></div><Link to="/blog" className="text-xs tracking-[0.15em] text-[#69665F] underline underline-offset-8">{labels.viewAll}</Link></div><div className="mt-8 grid gap-5 sm:grid-cols-3">{journalItems.map(item => <Link key={`${item.href}-${item.title}`} to={item.href} className="group"><img src={item.image} alt={item.title} className="aspect-[1.25] w-full object-cover transition duration-700 group-hover:scale-[1.02]" /><p className="mt-4 text-[10px] tracking-[0.2em] text-[#69665F]">{item.eyebrow}</p><h3 className="mt-2 text-sm">{item.title}</h3></Link>)}</div></section>
      </main>
      <Footer />
    </>
  );
}
