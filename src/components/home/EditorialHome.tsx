import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FormEvent } from 'react';
import type { Room } from '../../types';
import { fetchThemeBanners, getFallbackThemeBanners, type ThemeBanner } from '../../lib/themeBanners';

interface Product { id: string; name: string; price: number; image_url: string | null; description: string | null; origin?: string | null }
interface BlogPost { id: string; title: string; slug: string; excerpt: string | null; cover_image_url: string | null; category: string; published_at: string }
interface Banner { id: string; image_url: string; title: string; subtitle: string; linkLabel: string; linkUrl: string }

interface Props {
  banner: Banner;
  banners: Banner[];
  bannerIndex: number;
  setBannerIndex: (index: number) => void;
  rooms: Room[];
  products: Product[];
  posts: BlogPost[];
  search: string;
  setSearch: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  labels: {
    searchPlaceholder: string; search: string; story: string; storyBody: string;
    coffee: string; stay: string; journal: string; coffeeBody: string; stayBody: string; journalBody: string;
    next: string; explore: string; viewStays: string; viewShop: string; viewJournal: string;
    guests: string; perNight: string; translationNotice: string;
  };
  dateLocale: string;
  fallbackRoom: string;
  fallbackProduct: string;
  fallbackBlog: string;
  onImageError: (event: { currentTarget: HTMLImageElement }, fallback: string) => void;
}

const fallbackDestinations = [
  { name: 'TAIPEI', local: '台北', image: '/homepage-images/homepage-hero-03.jpg', to: '/rooms?search=台北' },
  { name: 'YILAN', local: '宜蘭', image: '/homepage-images/homepage-hero-04.jpg', to: '/rooms?search=宜蘭' },
  { name: 'TOKYO', local: '東京', image: '/homepage-images/homepage-hero-05.jpg', to: '/rooms?search=東京' },
  { name: 'OKINAWA', local: '沖繩', image: '/homepage-images/homepage-hero-02.jpg', to: '/rooms?search=沖繩' },
];

export default function EditorialHome({ banner, banners, bannerIndex, setBannerIndex, rooms, products, posts, search, setSearch, onSearch, labels, dateLocale, fallbackRoom, fallbackProduct, fallbackBlog, onImageError }: Props) {
  const [spotBanners, setSpotBanners] = useState<ThemeBanner[]>(() => getFallbackThemeBanners('home_spots'));
  useEffect(() => {
    let cancelled = false;
    fetchThemeBanners('home_spots').then(items => {
      if (!cancelled && items.length > 0) setSpotBanners(items);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const destinations = spotBanners.length > 0 ? spotBanners.map(item => ({
    name: item.title_en || item.title_zh,
    local: item.title_zh,
    image: item.image_url,
    to: item.link_url?.startsWith('/rooms') ? item.link_url : `/rooms?search=${encodeURIComponent(item.title_zh)}`,
  })) : fallbackDestinations;
  const pillars = [
    { key: '01', title: labels.coffee, body: labels.coffeeBody, image: products[0]?.image_url || '/product-images/the-one-and-only-champion-blend-beans-1.jpg', to: '/shop', action: labels.viewShop },
    { key: '02', title: labels.stay, body: labels.stayBody, image: rooms[0]?.images?.[0] || rooms[0]?.image_url || fallbackRoom, to: '/rooms', action: labels.viewStays },
    { key: '03', title: labels.journal, body: labels.journalBody, image: posts[0]?.cover_image_url || '/blog-images/blog-14-01.webp', to: '/blog', action: labels.viewJournal },
  ];
  const stripImages = [
    ...products.map(item => item.image_url).filter(Boolean),
    ...rooms.map(item => item.images?.[0] || item.image_url).filter(Boolean),
    ...posts.map(item => item.cover_image_url).filter(Boolean),
  ].slice(0, 8) as string[];

  return (
    <main className="bg-[#F4F1EC] text-[#24231F]">
      <section className="relative flex min-h-[70svh] items-end overflow-hidden bg-[#282824] text-[#FAF9F6] md:min-h-[min(820px,78vh)]">
        {banners.map((item, index) => <img key={item.id} src={item.image_url} alt={item.title} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === bannerIndex ? 'opacity-100' : 'opacity-0'}`} />)}
        <div className="absolute inset-0 bg-[#161613]/35" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#161613]/75 to-transparent" />
        <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-6 pb-20 pt-40 text-center sm:pb-24 lg:pb-28">
          <p className="mb-5 text-[11px] font-medium tracking-[0.32em] text-white/80">COFFEE / STAY / LOCAL STORIES</p>
          <h1 className="max-w-4xl whitespace-pre-line font-serif text-5xl font-normal leading-[1.12] tracking-[0.03em] text-white sm:text-7xl lg:text-8xl">{banner.title}</h1>
          <p className="mt-6 max-w-xl text-sm tracking-[0.14em] text-white/85 sm:text-base">{banner.subtitle}</p>
          <form onSubmit={onSearch} className="mt-9 flex w-full max-w-xl items-center border-b border-white/70 pb-2 text-left">
            <Search size={18} className="mr-3 shrink-0 text-white/80" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder={labels.searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/65" />
            <button type="submit" className="ml-3 text-xs font-medium tracking-[0.16em] text-white transition-opacity hover:opacity-70">{labels.search}</button>
          </form>
          {banners.length > 1 && <div className="mt-7 flex gap-2">{banners.map((item, index) => <button key={item.id} type="button" onClick={() => setBannerIndex(index)} aria-label={`Banner ${index + 1}`} className={`h-px transition-all ${index === bannerIndex ? 'w-10 bg-white' : 'w-4 bg-white/50'}`} />)}</div>}
          <a href="#story" className="absolute bottom-5 flex flex-col items-center gap-2 text-[10px] tracking-[0.2em] text-white/80 sm:bottom-7">DISCOVER <ArrowDown size={15} /></a>
        </div>
      </section>

      <section id="story" className="bg-[#F7F5F1] px-6 py-20 text-center sm:py-28">
        <p className="text-xs tracking-[0.28em] text-[#69665F]">OUR STORY</p>
        <h2 className="mt-5 font-serif text-3xl font-normal tracking-[0.04em] sm:text-4xl">{labels.story}</h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-8 text-[#69665F]">{labels.storyBody}</p>
      </section>

      <section className="grid md:grid-cols-3">
        {pillars.map(pillar => <Link key={pillar.key} to={pillar.to} className="group relative min-h-[440px] overflow-hidden text-white sm:min-h-[520px]">
          <img src={pillar.image} alt={pillar.title} onError={event => onImageError(event, fallbackProduct)} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-[#24231F]/35 transition group-hover:bg-[#24231F]/45" />
          <div className="relative flex h-full flex-col justify-between p-7 text-white sm:p-10"><div><p className="text-sm tracking-[0.16em] text-white">{pillar.key}</p><h2 className="mt-7 font-serif text-4xl font-normal tracking-[0.08em] text-white">{pillar.title}</h2><p className="mt-3 max-w-[16rem] text-xs leading-6 text-white/90">{pillar.body}</p></div><span className="flex items-center gap-2 text-xs tracking-[0.16em] text-white underline underline-offset-8">{pillar.action}<ArrowUpRight size={15} /></span></div>
        </Link>)}
      </section>

      <section className="px-6 py-20 sm:px-10 sm:py-28"><div className="mx-auto max-w-[1440px]"><div className="mb-8 flex items-end justify-between"><div><p className="text-xs tracking-[0.28em] text-[#69665F]">WHERE TO NEXT?</p><h2 className="mt-3 font-serif text-3xl font-normal">{labels.next}</h2></div><Link to="/rooms" className="hidden text-xs tracking-[0.15em] text-[#69665F] underline underline-offset-8 sm:block">{labels.explore}</Link></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">{destinations.map(destination => <Link key={destination.name} to={destination.to} className="group relative aspect-[1.22] overflow-hidden"><img src={destination.image} alt={destination.local} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-[#24231F]/25" /><div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5"><p className="text-sm tracking-[0.24em]">{destination.name}</p><p className="mt-1 text-xs">{destination.local}</p></div></Link>)}</div></div></section>

      <section className="border-y border-[#D8D3CA] bg-[#F7F5F1] px-6 py-8 sm:px-10"><div className="mx-auto flex max-w-[1440px] items-center gap-5 overflow-x-auto pb-1">{stripImages.map((image, index) => <img key={`${image}-${index}`} src={image} alt="" onError={event => onImageError(event, index % 2 ? fallbackBlog : fallbackProduct)} className="h-20 w-28 shrink-0 object-cover sm:h-24 sm:w-36" />)}<span className="shrink-0 text-[10px] tracking-[0.2em] text-[#69665F]">FOLLOW THE JOURNEY</span></div></section>

      {posts.length > 0 && <section className="px-6 py-20 sm:px-10"><div className="mx-auto max-w-[1440px]"><div className="mb-8 flex items-end justify-between"><div><p className="text-xs tracking-[0.28em] text-[#69665F]">FROM THE JOURNEY</p><p className="mt-3 max-w-xl text-sm leading-7 text-[#69665F]">{labels.translationNotice}</p></div><Link to="/blog" className="text-xs tracking-[0.15em] text-[#69665F] underline underline-offset-8">{labels.explore}</Link></div><div className="grid gap-8 md:grid-cols-3">{posts.slice(0, 3).map(post => <Link key={post.id} to={`/blog/${post.slug}`} className="group"><img src={post.cover_image_url || fallbackBlog} alt={post.title} onError={event => onImageError(event, fallbackBlog)} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.02]" /><h3 className="mt-4 text-lg">{post.title}</h3><p className="mt-2 text-xs text-[#69665F]">{new Date(post.published_at).toLocaleDateString(dateLocale)} · {post.category}</p></Link>)}</div></div></section>}
    </main>
  );
}

function formatPrice(value: number) { return `NT$ ${Number(value || 0).toLocaleString()}`; }
