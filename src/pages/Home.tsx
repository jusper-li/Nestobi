import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Calendar, Coffee, Hotel, MapPin, MessageCircle, ShoppingBag, Sparkles, Users } from 'lucide-react';
import FloatingButtons from '../components/FloatingButtons';
import Footer from '../components/Footer';
import Navigation from '../components/Navigation';
import SEOHead from '../components/SEOHead';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getTranslationRuntimeState,
  translateBlogPostsFromCacheOnly,
  translateBlogPostsOnDemand,
  translateHotelsOnDemand,
  translateProductsFromCacheOnly,
  translateProductsOnDemand,
  translateRoomsFromCacheOnly,
  translateRoomsOnDemand,
} from '../lib/contentTranslations';
import { BLOG_FALLBACK_IMAGE, PRODUCT_FALLBACK_IMAGE, ROOM_FALLBACK_IMAGE, SCENIC_GALLERY_IMAGES, useFallbackImage } from '../lib/images';
import { fetchPublicList, fetchSnapshotList } from '../lib/listData';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import type { Room } from '../types';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  origin?: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string;
}

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

function stripHtml(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function Home() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

  const t = {
    pageTitle: isEn ? 'Nestobi Travel & Shop Platform' : 'Nestobi 旅遊購物平台',
    pageDesc: isEn ? 'One-stop stays, shopping, and AI travel tools.' : '一站整合住宿、購物與 AI 旅遊工具。',
    heroTitle1: isEn ? 'Start Your Next' : '從下一趟旅程開始',
    heroTitle2: isEn ? 'Journey Here' : '讓平台替你少想一點',
    heroDesc: isEn
      ? 'From curated stays and coffee picks to AI itinerary planning, Nestobi helps you travel, shop, and organize in one place.'
      : '從精選住宿、咖啡選物到 AI 行程規劃，Nestobi 幫你把旅程、購物與日常整理在同一個地方。',
    shopNow: isEn ? 'Shop' : '逛選物商店',
    exploreStays: isEn ? 'Find Stays' : '尋找住宿',
    stays: isEn ? 'Stays' : '住宿',
    shop: isEn ? 'Shop' : '選物商店',
    journal: isEn ? 'Coffee Journal' : '咖啡旅誌',
    featuredStays: isEn ? 'Featured Stays' : '精選住宿',
    featuredShop: isEn ? 'Featured Products' : '精選商品',
    featuredJournal: isEn ? 'Latest Stories' : '最新文章',
    viewAllStays: isEn ? 'View All Stays' : '查看全部住宿',
    viewAllShop: isEn ? 'View All Products' : '查看全部商品',
    viewAllJournal: isEn ? 'View All Articles' : '查看全部文章',
    perNight: isEn ? '/ night' : '/ 晚',
    guests: isEn ? 'guests' : '人',
    translationSyncing: isEn ? 'Homepage translation is syncing in background...' : '首頁翻譯正在背景同步...',
    translationFallback: isEn ? 'Showing source content first. Translation cache is not ready yet.' : '目前先顯示原文內容，翻譯快取尚未就緒。',
    closeTitle: isEn ? 'Make every trip easier and calmer.' : '讓每趟旅程更輕鬆、更安心。',
  };

  const stats = [
    { value: '120+', label: isEn ? 'Curated Products' : '精選商品' },
    { value: '24/7', label: isEn ? 'AI Support' : 'AI 旅遊支援' },
    { value: '5%', label: isEn ? 'Points Back' : '購物點數回饋' },
    { value: '1 stop', label: isEn ? 'All-in-one' : '一站整合' },
  ];

  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);
  const [displayRooms, setDisplayRooms] = useState<Room[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [displayPosts, setDisplayPosts] = useState<BlogPost[]>([]);
  const [heroImageIndex, setHeroImageIndex] = useState(() => Math.floor(Math.random() * SCENIC_GALLERY_IMAGES.length));
  const [translationNotice, setTranslationNotice] = useState('');

  const heroImage = SCENIC_GALLERY_IMAGES[heroImageIndex] || ROOM_FALLBACK_IMAGE;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroImageIndex(current => (current + 1) % SCENIC_GALLERY_IMAGES.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      const [rooms, products, posts] = await Promise.all([
        fetchPublicList<Room>('rooms', async () => {
          const { data } = await supabase
            .from('tbl_rooms')
            .select('id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,image_url,images,location,is_available,amenities,hotels(id,name,city,star_rating)')
            .eq('is_available', true)
            .limit(3);
          return (data as unknown as Room[]) || [];
        }).catch(() => fetchSnapshotList<Room>('/snapshots/rooms.json')),
        fetchPublicList<Product>('products', async () => {
          const { data } = await supabase.from('products').select('id,name,price,image_url,description,origin').eq('is_active', true).order('created_at', { ascending: false }).limit(3);
          return (data as Product[]) || [];
        }).catch(() => fetchSnapshotList<Product>('/snapshots/products.json')),
        fetchPublicList<BlogPost>('blog-posts', async () => {
          const { data } = await supabase.from('blog_posts').select('id,title,slug,excerpt,cover_image_url,category,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(3);
          return (data as BlogPost[]) || [];
        }).catch(() => fetchSnapshotList<BlogPost>('/snapshots/blog-posts.json')),
      ]);

      if (cancelled) return;
      setFeaturedRooms(rooms.slice(0, 3));
      setDisplayRooms(rooms.slice(0, 3));
      setFeaturedProducts(products.slice(0, 3));
      setFeaturedPosts(posts.slice(0, 3));
      setDisplayProducts(products.slice(0, 3));
      setDisplayPosts(posts.slice(0, 3));
    };
    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!featuredRooms.length || lang === 'zh-TW') {
      setDisplayRooms(featuredRooms);
      setTranslationNotice('');
      return () => {
        cancelled = true;
      };
    }
    const runtime = getTranslationRuntimeState();
    setTranslationNotice(runtime.tableUnavailable || runtime.isLocalProxyMode ? t.translationFallback : t.translationSyncing);
    Promise.all([
      translateRoomsFromCacheOnly(featuredRooms, lang),
      translateHotelsOnDemand(
        featuredRooms
          .map(room => room.hotels)
          .filter((hotel): hotel is NonNullable<Room['hotels']> => Boolean(hotel))
          .map(hotel => ({ id: hotel.id, name: hotel.name, city: hotel.city })),
        lang,
      ),
    ]).then(([translatedRooms, translatedHotels]) => {
        if (!cancelled) {
          const hotelMap = new Map(translatedHotels.map(hotel => [hotel.id, hotel]));
          const mergedRooms = translatedRooms.map(room => {
            const hotel = room.hotels;
            if (!hotel || !hotel.id) return room;
            const translatedHotel = hotelMap.get(hotel.id);
            if (!translatedHotel) return room;
            return {
              ...room,
              hotels: {
                ...hotel,
                name: translatedHotel.name || hotel.name,
                city: translatedHotel.city || hotel.city,
              },
            };
          });
          setDisplayRooms(mergedRooms);
          setTranslationNotice(isEn ? 'Syncing remaining translations in background...' : '正在背景補齊其餘翻譯...');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayRooms(featuredRooms);
          setTranslationNotice(t.translationFallback);
        }
      });

    Promise.all([
      translateRoomsOnDemand(featuredRooms, lang),
      translateHotelsOnDemand(
        featuredRooms
          .map(room => room.hotels)
          .filter((hotel): hotel is NonNullable<Room['hotels']> => Boolean(hotel))
          .map(hotel => ({ id: hotel.id, name: hotel.name, city: hotel.city })),
        lang,
      ),
    ]).then(([translatedRooms, translatedHotels]) => {
      if (cancelled) return;
      const hotelMap = new Map(translatedHotels.map(hotel => [hotel.id, hotel]));
      const mergedRooms = translatedRooms.map(room => {
        const hotel = room.hotels;
        if (!hotel || !hotel.id) return room;
        const translatedHotel = hotelMap.get(hotel.id);
        if (!translatedHotel) return room;
        return {
          ...room,
          hotels: {
            ...hotel,
            name: translatedHotel.name || hotel.name,
            city: translatedHotel.city || hotel.city,
          },
        };
      });
      setDisplayRooms(mergedRooms);
      setTranslationNotice('');
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [featuredRooms, lang, t.translationFallback, t.translationSyncing]);

  useEffect(() => {
    let cancelled = false;
    if (!featuredProducts.length) return () => { cancelled = true; };
    setDisplayProducts(featuredProducts);
    translateProductsFromCacheOnly(featuredProducts, lang)
      .then(translated => { if (!cancelled) setDisplayProducts(translated); })
      .catch(() => {});
    translateProductsOnDemand(featuredProducts, lang)
      .then(translated => { if (!cancelled) setDisplayProducts(translated); })
      .catch(() => { if (!cancelled) setDisplayProducts(featuredProducts); });
    return () => { cancelled = true; };
  }, [featuredProducts, lang]);

  useEffect(() => {
    let cancelled = false;
    if (!featuredPosts.length) return () => { cancelled = true; };
    setDisplayPosts(featuredPosts);
    translateBlogPostsFromCacheOnly(featuredPosts, lang)
      .then(translated => { if (!cancelled) setDisplayPosts(translated); })
      .catch(() => {});
    translateBlogPostsOnDemand(featuredPosts, lang)
      .then(translated => { if (!cancelled) setDisplayPosts(translated); })
      .catch(() => { if (!cancelled) setDisplayPosts(featuredPosts); });
    return () => { cancelled = true; };
  }, [featuredPosts, lang]);

  return (
    <div className="min-h-screen bg-white">
      <SEOHead title={t.pageTitle} description={t.pageDesc} keywords={`Nestobi, ${t.stays}, ${t.shop}`} pageType="home" ogType="website" />
      <Navigation />

      <section className="relative overflow-hidden bg-[#FEF9EC]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-cover bg-center lg:block" style={{ backgroundImage: `url("${heroImage}")` }} />
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-r from-[#FEF9EC] via-[#FEF9EC]/45 to-transparent lg:block" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="max-w-2xl">
            <motion.h1 variants={fadeUp} className="text-4xl font-bold leading-tight text-[#2C1F10] md:text-6xl">
              {t.heroTitle1}
              <span className="block italic text-[#8B6840]">{t.heroTitle2}</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-8 text-[#2C1F10]/70 md:text-lg">{t.heroDesc}</motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary"><ShoppingBag size={18} />{t.shopNow}</Link>
              <Link to="/rooms" className="btn-ghost"><Hotel size={18} />{t.exploreStays}</Link>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-10 grid max-w-xl grid-cols-2 gap-4 md:grid-cols-4">
              {stats.map(stat => (
                <div key={stat.label} className="border-l border-[#C09A6A]/35 pl-3">
                  <p className="font-serif text-2xl font-bold text-[#2C1F10]">{stat.value}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#2C1F10]/55">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {translationNotice && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{translationNotice}</div>
        </div>
      )}

      {displayRooms.length > 0 && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader label={t.stays} title={t.featuredStays} to="/rooms" action={t.viewAllStays} />
            <div className="grid gap-6 md:grid-cols-3">
              {displayRooms.map(room => {
                const cover = room.images?.[0] || room.image_url || ROOM_FALLBACK_IMAGE;
                return (
                  <Link key={room.id} to={`/rooms/${room.id}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card-hover">
                    <div className="h-52 overflow-hidden">
                      <img src={cover} alt={room.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-5">
                      {room.hotels?.name && <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-[#8B6840]"><Building2 size={13} />{room.hotels.name}</p>}
                      <h3 className="text-base font-bold text-gray-900">{room.name}</h3>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><MapPin size={13} />{room.location || room.hotels?.city || '-'}</span>
                        <span className="flex items-center gap-1"><Users size={13} />{room.capacity} {t.guests}</span>
                      </div>
                      <div className="mt-5 flex items-end justify-between border-t border-gray-100 pt-4">
                        <span className="text-lg font-bold text-[#2C1F10]">{formatCurrency(room.price_per_night)} <span className="text-xs font-medium text-gray-400">{t.perNight}</span></span>
                        <ArrowRight size={17} className="text-[#C09A6A]" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {displayProducts.length > 0 && (
        <section className="bg-[#F5F5F3] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader label={t.shop} title={t.featuredShop} to="/shop" action={t.viewAllShop} />
            <div className="grid gap-6 md:grid-cols-3">
              {displayProducts.map(product => (
                <Link key={product.id} to={`/shop/${product.id}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card-hover">
                  <div className="relative h-56 overflow-hidden bg-gray-100">
                    <img src={product.image_url || PRODUCT_FALLBACK_IMAGE} alt={product.name} onError={event => useFallbackImage(event, PRODUCT_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-base font-bold text-gray-900">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{stripHtml(product.description)}</p>
                    <div className="mt-5 flex items-end justify-between border-t border-gray-100 pt-4">
                      <span className="text-lg font-bold text-[#C09A6A]">{formatCurrency(Number(product.price))}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#2C1F10]"><ArrowRight size={14} /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {displayPosts.length > 0 && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader label={t.journal} title={t.featuredJournal} to="/blog" action={t.viewAllJournal} />
            <div className="grid gap-6 md:grid-cols-3">
              {displayPosts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card-hover">
                  <div className="relative h-48 overflow-hidden bg-[#F0E4C8]">
                    {post.cover_image_url ? <img src={post.cover_image_url} alt={post.title} onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-[#C09A6A]"><Coffee size={42} /></div>}
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-base font-bold text-gray-900 group-hover:text-[#8B6840]">{post.title}</h3>
                    {post.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{post.excerpt}</p>}
                    <p className="mt-5 flex items-center gap-1 border-t border-gray-100 pt-4 text-xs font-medium text-gray-400"><Calendar size={13} />{new Date(post.published_at).toLocaleDateString(isEn ? 'en-US' : 'zh-TW')}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#1F160B] py-20 text-[#FFF7EA]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <Sparkles className="mb-5 text-[#C09A6A]" size={28} />
            <h2 className="font-serif text-3xl font-bold text-[#FFF7EA] md:text-4xl">{t.closeTitle}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Building2, title: isEn ? 'Trusted Stays' : '精選住宿', desc: isEn ? 'Verified and quality-picked rooms.' : '嚴選合作房源，重視品質與入住體驗。' },
              { icon: ShoppingBag, title: isEn ? 'Curated Shop' : '旅行選物', desc: isEn ? 'Coffee and travel picks in one place.' : '咖啡與旅行好物一次挑選，不用分散比對。' },
              { icon: MessageCircle, title: isEn ? 'AI Support' : 'AI 支援', desc: isEn ? 'Plan, translate, and chat anytime.' : '隨時可用 AI 行程規劃、翻譯與客服。' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-white/15 bg-white/[0.08] p-5">
                <Icon size={22} className="text-[#C09A6A]" />
                <h3 className="mt-4 font-bold text-[#FFF7EA]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#F5E7D4]/80">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <FloatingButtons />
    </div>
  );
}

function SectionHeader({ label, title, to, action }: { label: string; title: string; to: string; action: string }) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="section-label">{label}</p>
        <h2 className="section-title text-3xl">{title}</h2>
        <span className="gold-bar" />
      </div>
      <Link to={to} className="inline-flex items-center gap-1 self-start border-b border-[#2C1F10]/25 pb-1 text-sm font-bold text-[#2C1F10] transition hover:border-[#2C1F10] md:self-auto">
        {action}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
