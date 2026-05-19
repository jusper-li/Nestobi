import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookMarked,
  Building2,
  Calendar,
  Coffee,
  Hotel,
  Languages,
  Map,
  MapPin,
  MessageCircle,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Users,
} from 'lucide-react';
import FloatingButtons from '../components/FloatingButtons';
import Footer from '../components/Footer';
import Navigation from '../components/Navigation';
import SEOHead from '../components/SEOHead';
import { supabase } from '../lib/supabase';
import { BLOG_FALLBACK_IMAGE, PRODUCT_FALLBACK_IMAGE, ROOM_FALLBACK_IMAGE, SCENIC_GALLERY_IMAGES, useFallbackImage } from '../lib/images';
import { fetchPublicList, fetchSnapshotList } from '../lib/listData';
import { formatCurrency } from '../lib/utils';
import type { Room } from '../types';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  origin?: string | null;
  flavor_notes?: string[] | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author_name: string;
  category: string;
  published_at: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const services = [
  { icon: Hotel, title: '住得安心', desc: '快速比較房型、地點與價格，預訂旅途中真正想回去休息的地方。', to: '/rooms' },
  { icon: ShoppingBag, title: '買得有故事', desc: '咖啡、茶、器物與旅途選品，都有清楚規格與風味線索。', to: '/shop' },
  { icon: Map, title: 'AI 規劃行程', desc: '把目的地、日期與喜好丟給 AI，先拿到一份可調整的旅行草案。', to: '/ai/itinerary' },
  { icon: Languages, title: '即時翻譯', desc: '菜單、交通、住宿訊息都能快速翻譯，降低旅途中的不確定。', to: '/ai/translator' },
  { icon: MessageCircle, title: '客服支援', desc: '訂房、購物、會員點數與訂單狀態，可以先由 AI 協助整理。', to: '/ai/chat' },
  { icon: BookMarked, title: '旅人護照', desc: '收藏你的旅程、偏好與點數，讓下一次購買與出發更順手。', to: '/ai/passport' },
];

const stats = [
  { value: '120+', label: '精選房源與商品' },
  { value: '24/7', label: 'AI 旅遊支援' },
  { value: '5%', label: '購物點數回饋' },
  { value: '1 stop', label: '訂房購物整合' },
];

function stripHtml(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function Home() {
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [heroImageIndex, setHeroImageIndex] = useState(() => Math.floor(Math.random() * SCENIC_GALLERY_IMAGES.length));
  const [heroImageErrorCount, setHeroImageErrorCount] = useState(0);
  const heroImage = SCENIC_GALLERY_IMAGES[heroImageIndex] || ROOM_FALLBACK_IMAGE;

  const handleHeroImageError = () => {
    if (heroImageErrorCount >= SCENIC_GALLERY_IMAGES.length - 1) return;
    setHeroImageErrorCount(count => count + 1);
    setHeroImageIndex(current => (current + 1) % SCENIC_GALLERY_IMAGES.length);
  };

  useEffect(() => {
    let cancelled = false;

    const loadFeaturedRooms = async () => {
      const rooms = await fetchPublicList<Room>('rooms', async () => {
        const { data } = await supabase
          .from('tbl_rooms')
          .select('id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,image_url,images,location,is_available,amenities,hotels(id,name,city,star_rating)')
          .eq('is_available', true)
          .limit(3);
        return (data as unknown as Room[]) || [];
      }).catch(() => fetchSnapshotList<Room>('/snapshots/rooms.json'));

      if (!cancelled) setFeaturedRooms(rooms.slice(0, 3));
    };

    const loadFeaturedProducts = async () => {
      const products = await fetchPublicList<Product>('products', async () => {
        const { data } = await supabase
          .from('products')
          .select('id,name,price,image_url,description,origin,flavor_notes')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(3);
        return (data as Product[]) || [];
      }).catch(() => fetchSnapshotList<Product>('/snapshots/products.json'));

      if (!cancelled) setFeaturedProducts(products.slice(0, 3));
    };

    const loadFeaturedPosts = async () => {
      const posts = await fetchPublicList<BlogPost>('blog-posts', async () => {
        const { data } = await supabase
          .from('blog_posts')
          .select('id,title,slug,excerpt,cover_image_url,author_name,category,published_at')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(3);
        return (data as BlogPost[]) || [];
      }).catch(() => fetchSnapshotList<BlogPost>('/snapshots/blog-posts.json'));

      if (!cancelled) setFeaturedPosts(posts.slice(0, 3));
    };

    loadFeaturedRooms();
    loadFeaturedProducts();
    loadFeaturedPosts();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="根本在旅行"
        description="Nestobi 根本在旅行整合精選住宿、旅行選物、AI 行程規劃與會員購物體驗。"
        keywords="旅行購物平台, 精選住宿, 咖啡選物, AI 行程規劃, Nestobi"
        pageType="home"
        ogType="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Nestobi 根本在旅行',
          description: '精選住宿、旅行選物與 AI 旅遊工具整合平台。',
        }}
      />
      <Navigation />

      <section className="relative overflow-hidden bg-[#FEF9EC]">
        <img src={heroImage} alt="" aria-hidden="true" className="sr-only" loading="eager" onError={handleHeroImageError} />
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-cover bg-center lg:block" style={{ backgroundImage: `url("${heroImage}")` }} />
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-r from-[#FEF9EC] via-[#FEF9EC]/45 to-transparent lg:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="max-w-2xl">
            <motion.h1 variants={fadeUp} className="text-4xl font-bold leading-tight text-[#2C1F10] md:text-6xl">
              把旅行的美好
              <span className="block italic text-[#8B6840]">帶回日常</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base leading-8 text-[#2C1F10]/70 md:text-lg">
              從精選住宿、咖啡選物到 AI 行程規劃，Nestobi 幫你把旅程、購物與回憶整理在同一個地方。
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary">
                <ShoppingBag size={18} />
                逛選物商店
              </Link>
              <Link to="/rooms" className="btn-ghost">
                <Hotel size={18} />
                尋找住宿
              </Link>
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

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden">
            <div
              role="img"
              aria-label="旅行中的風景與筆記"
              className="aspect-[4/3] w-full rounded-2xl bg-[#D9C6A8] bg-cover bg-center shadow-card"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(44, 31, 16, 0.04), rgba(44, 31, 16, 0.22)), url("${heroImage}")` }}
            />
          </motion.div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="section-label">Platform</p>
              <h2 className="section-title text-3xl">一次完成出發前後的需要</h2>
              <span className="gold-bar" />
            </div>
            <p className="max-w-xl text-sm leading-7 text-gray-500">旅遊平台不只賣房間，也要讓使用者知道下一步該做什麼。這裡把住宿、商品、AI 工具與會員服務串成清楚的入口。</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ icon: Icon, title, desc, to }, index) => (
              <motion.div key={title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.04 }}>
                <Link to={to} className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-[#F9FAFB] p-6 transition hover:-translate-y-1 hover:border-[#C09A6A]/40 hover:bg-white hover:shadow-card">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0E4C8] text-[#2C1F10] transition group-hover:bg-[#C09A6A] group-hover:text-white">
                    <Icon size={21} />
                  </span>
                  <h3 className="text-lg font-bold text-[#2C1F10]">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-7 text-gray-500">{desc}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#8B6840]">
                    前往體驗 <ArrowRight size={15} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="bg-[#F5F5F3] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader label="Shop" title="最新旅行選物" desc="把旅程中的味道與器物帶回家，商品資訊清楚、加入購物車也更快。" to="/shop" action="查看全部商品" />
            <div className="grid gap-6 md:grid-cols-3">
              {featuredProducts.map(product => (
                <Link key={product.id} to={`/shop/${product.id}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card-hover">
                  <div className="relative h-56 overflow-hidden bg-gray-100">
                    <img src={product.image_url || PRODUCT_FALLBACK_IMAGE} alt={product.name} onError={event => useFallbackImage(event, PRODUCT_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    {product.origin && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#2C1F10]">{product.origin}</span>}
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-base font-bold text-gray-900">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{stripHtml(product.description)}</p>
                    <div className="mt-5 flex items-end justify-between border-t border-gray-100 pt-4">
                      <span className="text-lg font-bold text-[#C09A6A]">{formatCurrency(Number(product.price))}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#2C1F10]">看商品 <ArrowRight size={14} /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {featuredRooms.length > 0 && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader label="Stays" title="精選住宿" desc="用清楚資訊快速判斷地點、價格與適合人數。" to="/rooms" action="探索更多住宿" />
            <div className="grid gap-6 md:grid-cols-3">
              {featuredRooms.map(room => {
                const cover = room.images?.[0] || room.image_url || ROOM_FALLBACK_IMAGE;

                return (
                  <Link key={room.id} to={`/rooms/${room.id}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card-hover">
                    <div className="h-52 overflow-hidden">
                      <img src={cover} alt={room.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-5">
                      {room.hotels?.name && (
                        <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-[#8B6840]">
                          <Building2 size={13} />
                          {room.hotels.name}
                        </p>
                      )}
                      <h3 className="text-base font-bold text-gray-900">{room.name}</h3>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><MapPin size={13} />{room.location || room.hotels?.city || '精選地點'}</span>
                        <span className="flex items-center gap-1"><Users size={13} />{room.capacity} 人</span>
                      </div>
                      <div className="mt-5 flex items-end justify-between border-t border-gray-100 pt-4">
                        <span className="text-lg font-bold text-[#2C1F10]">{formatCurrency(room.price_per_night)} <span className="text-xs font-medium text-gray-400">/ 晚</span></span>
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

      {featuredPosts.length > 0 && (
        <section className="bg-[#F5F5F3] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeader label="Journal" title="咖啡旅誌" desc="用內容補上購物與旅行之間的故事感。" to="/blog" action="閱讀所有文章" />
            <div className="grid gap-6 md:grid-cols-3">
              {featuredPosts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition hover:-translate-y-1 hover:shadow-card-hover">
                  <div className="relative h-48 overflow-hidden bg-[#F0E4C8]">
                    {post.cover_image_url ? (
                      <img src={post.cover_image_url} alt={post.title} onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#C09A6A]"><Coffee size={42} /></div>
                    )}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#2C1F10]/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      <Tag size={12} />
                      {post.category}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-base font-bold text-gray-900 group-hover:text-[#8B6840]">{post.title}</h3>
                    {post.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{post.excerpt}</p>}
                    <p className="mt-5 flex items-center gap-1 border-t border-gray-100 pt-4 text-xs font-medium text-gray-400">
                      <Calendar size={13} />
                      {new Date(post.published_at).toLocaleDateString('zh-TW')}
                    </p>
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
            <h2 className="font-serif text-3xl font-bold text-[#FFF7EA] md:text-4xl">從下一趟旅程開始，讓平台替你少想一點。</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Shield, title: '安全結帳', desc: '訂單與會員資料分層管理。' },
              { icon: Star, title: '點數回饋', desc: '購物可累積會員點數。' },
              { icon: MessageCircle, title: '旅途支援', desc: 'AI 先整理常見問題。' },
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

function SectionHeader({ label, title, desc, to, action }: { label: string; title: string; desc: string; to: string; action: string }) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="section-label">{label}</p>
        <h2 className="section-title text-3xl">{title}</h2>
        <span className="gold-bar" />
        <p className="mt-4 max-w-xl text-sm leading-7 text-gray-500">{desc}</p>
      </div>
      <Link to={to} className="inline-flex items-center gap-1 self-start border-b border-[#2C1F10]/25 pb-1 text-sm font-bold text-[#2C1F10] transition hover:border-[#2C1F10] md:self-auto">
        {action}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
