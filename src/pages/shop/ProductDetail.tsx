import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, ChevronRight, Minus, Package, Plus, RotateCcw, Shield, ShoppingCart, Star, Tag, Truck } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useCart } from '../../contexts/CartContext';
import { supabase } from '../../lib/supabase';
import { sanitizeHtml } from '../../lib/security';
import { formatCurrency } from '../../lib/utils';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  images?: string[] | null;
  stock_quantity: number;
  category_id: string | null;
  origin?: string | null;
  roast_level?: string | null;
  processing_method?: string | null;
  altitude?: string | null;
  variety?: string[] | null;
  flavor_notes?: string[] | null;
  weight_grams?: number | null;
  tags?: string[] | null;
  source_url?: string | null;
  roast_date?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  stock_quantity: number;
}

const guarantees = [
  { icon: Shield, title: '安全結帳', desc: '會員訂單與付款狀態清楚記錄。' },
  { icon: Truck, title: '出貨通知', desc: '訂單成立後由平台協助追蹤。' },
  { icon: RotateCcw, title: '售後協助', desc: '商品問題可由客服協助確認。' },
  { icon: Star, title: '點數回饋', desc: '購買成功可累積會員點數。' },
];

function stripHtml(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const { data: productData } = await supabase.from('products').select('*').eq('id', id).eq('is_active', true).maybeSingle();

      if (!productData) {
        setLoading(false);
        return;
      }

      const loadedProduct = productData as Product;
      setProduct(loadedProduct);
      setQty(1);
      setActiveImg(null);

      const [{ data: categoryData }, { data: relatedData }] = await Promise.all([
        loadedProduct.category_id ? supabase.from('categories').select('*').eq('id', loadedProduct.category_id).maybeSingle() : Promise.resolve({ data: null }),
        loadedProduct.category_id
          ? supabase.from('products').select('id,name,price,image_url,stock_quantity').eq('is_active', true).eq('category_id', loadedProduct.category_id).neq('id', loadedProduct.id).limit(4)
          : Promise.resolve({ data: [] }),
      ]);

      setCategory((categoryData as Category) || null);
      setRelated((relatedData as RelatedProduct[]) || []);
      setLoading(false);
    };

    if (id) fetchProduct();
  }, [id]);

  const images = useMemo(() => {
    if (!product) return [];
    const gallery = product.images?.filter(Boolean) || [];
    const fallback = product.image_url || 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=900';

    return gallery.length > 0 ? gallery : [fallback];
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex justify-center py-32">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C09A6A] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h1 className="mb-2 text-2xl font-bold text-gray-800">找不到這項商品</h1>
          <p className="mb-6 text-gray-500">商品可能已下架或暫時停止販售。</p>
          <Link to="/shop" className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-6 py-3 font-semibold text-white transition hover:bg-[#8B6840]">
            <ArrowLeft className="h-4 w-4" />
            回到選物商店
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const inStock = product.stock_quantity > 0;
  const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const displayImage = activeImg || images[0];
  const plainDescription = stripHtml(product.description);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: plainDescription || product.name,
    image: displayImage,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TWD',
      price: product.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  const specs = [
    { label: '分類', value: category?.name },
    { label: '產地', value: product.origin },
    { label: '烘焙度', value: product.roast_level },
    { label: '處理法', value: product.processing_method },
    { label: '重量', value: product.weight_grams ? `${product.weight_grams}g` : undefined },
    { label: '海拔', value: product.altitude },
    { label: '品種', value: product.variety?.join('、') },
    { label: '烘焙日期', value: product.roast_date },
  ].filter(item => item.value);

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={product.name}
        description={plainDescription || `${product.name} - Nestobi 旅行選物商店`}
        keywords={`${product.name}, 旅行選物, ${category?.name || ''}, Nestobi`}
        ogImage={displayImage}
        ogType="product"
        pageType="product"
        jsonLd={jsonLd}
      />
      <Navigation />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500">
          <Link to="/shop" className="font-semibold transition hover:text-[#8B6840]">選物商店</Link>
          {category && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{category.name}</span>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="max-w-[220px] truncate font-semibold text-gray-700">{product.name}</span>
        </nav>

        <div className="mb-12 grid gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-white shadow-card">
              <img src={displayImage} alt={product.name} className="h-full w-full object-cover" />
              {!inStock && <div className="absolute inset-0 flex items-center justify-center bg-black/45"><span className="rounded-full bg-white px-6 py-2.5 text-lg font-bold text-gray-800">售完</span></div>}
              {lowStock && <span className="absolute right-4 top-4 rounded-full bg-orange-500 px-3 py-1.5 text-sm font-bold text-white shadow-md">僅剩 {product.stock_quantity}</span>}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map(image => (
                  <button key={image} type="button" onClick={() => setActiveImg(image)} className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${displayImage === image ? 'border-[#C09A6A]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {category && (
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#8B6840]">
                <Tag className="h-4 w-4" />
                {category.name}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold leading-tight text-gray-900 md:text-4xl">{product.name}</h1>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                <span className="text-sm font-medium text-slate-500">精選旅人選物</span>
              </div>
            </div>
            <div className="border-y border-gray-200 py-5">
              <p className="text-4xl font-bold text-[#8B6840]">{formatCurrency(product.price)}</p>
              <p className="mt-2 text-sm font-medium text-slate-600">每 NT$100 可累積 5 點會員點數。</p>
            </div>
            {product.description && (
              <div>
                <h2 className="mb-2 font-bold text-gray-900">商品介紹</h2>
                <div
                  className="space-y-3 text-sm font-medium leading-7 text-slate-700 [&_br]:hidden [&_li]:mb-1 [&_p]:m-0 [&_strong]:font-bold [&_strong]:text-gray-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                />
              </div>
            )}
            {product.flavor_notes && product.flavor_notes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">風味筆記</p>
                <div className="flex flex-wrap gap-2">
                  {product.flavor_notes.map(note => <span key={note} className="rounded-full bg-[#F0E4C8] px-3 py-1.5 text-sm font-semibold text-[#2C1F10]">{note}</span>)}
                </div>
              </div>
            )}
            {specs.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {specs.map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-white px-3 py-3 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-bold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="mb-3 font-bold text-gray-900">購買數量</p>
              <div className="flex items-center gap-4">
                <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <button type="button" onClick={() => setQty(value => Math.max(1, value - 1))} disabled={qty <= 1} className="px-4 py-3 text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                  <span className="min-w-[58px] border-x border-gray-200 px-5 py-3 text-center font-bold">{qty}</span>
                  <button type="button" onClick={() => setQty(value => Math.min(product.stock_quantity, value + 1))} disabled={qty >= product.stock_quantity} className="px-4 py-3 text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
                </div>
                <span className={`text-sm ${lowStock ? 'font-bold text-orange-600' : 'font-medium text-slate-600'}`}>{inStock ? `庫存 ${product.stock_quantity} 件` : '目前售完'}</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handleAddToCart} disabled={!inStock || adding} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B6840] px-5 py-4 font-bold text-white shadow-md transition hover:bg-[#6F4F2B] disabled:bg-gray-200 disabled:text-gray-500">
                {added ? <CheckCircle className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                {adding ? '加入中...' : added ? '已加入購物車' : '加入購物車'}
              </button>
              <button type="button" onClick={() => handleAddToCart().then(() => navigate('/cart'))} disabled={!inStock || adding} className="rounded-xl bg-gray-900 px-5 py-4 font-bold text-white transition hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400">
                立即購買
              </button>
            </div>
          </motion.div>
        </div>

        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {guarantees.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#F0E4C8] text-[#C09A6A]"><Icon className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {related.length > 0 && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">相關商品</h2>
               <Link to="/shop" className="text-sm font-bold text-[#8B6840] hover:underline">查看全部</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map(item => (
                <Link key={item.id} to={`/shop/${item.id}`} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-card">
                  <div className="h-36 overflow-hidden bg-gray-100">
                    <img src={item.image_url || 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=500'} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-gray-800">{item.name}</p>
                    <p className="mt-1 text-sm font-bold text-[#8B6840]">{formatCurrency(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
