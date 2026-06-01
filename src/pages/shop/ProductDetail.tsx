import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, ChevronRight, Minus, Package, Plus, RotateCcw, Shield, ShoppingCart, Star, Tag, Truck } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import {
  getTranslationRuntimeState,
  translateCategoriesFromCacheOnly,
  translateCategoriesOnDemand,
  translateProductsFromCacheOnly,
  translateProductsOnDemand,
} from '../../lib/contentTranslations';
import { sanitizeHtml } from '../../lib/security';
import { supabase } from '../../lib/supabase';
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
  description?: string | null;
  origin?: string | null;
  roast_level?: string | null;
  processing_method?: string | null;
  flavor_notes?: string[] | null;
  tags?: string[] | null;
}

function stripHtml(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const shouldTranslate = pickByLang(normalizedLang, '0', '1', '1', '1') === '1';
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const labels = {
    notFoundTitle: t4('找不到商品', 'Product Not Found', '商品が見つかりません', '상품을 찾을 수 없습니다'),
    notFoundDesc: t4('此商品可能已下架或移除。', 'This product may be offline or removed.', 'この商品は非公開または削除された可能性があります。', '이 상품은 비공개 또는 삭제되었을 수 있습니다.'),
    backShop: t4('返回選物商店', 'Back to Shop', 'ショップへ戻る', '샵으로 돌아가기'),
    reviewHint: t4('精選推薦商品', 'Curated product', 'セレクト商品', '큐레이션 상품'),
    listPriceHint: t4('售價可能因供應商活動與批次有所調整。', 'List price may vary by supplier promotions.', '価格は仕入れやキャンペーンにより変動する場合があります。', '가격은 공급/프로모션에 따라 변동될 수 있습니다.'),
    detailsTitle: t4('商品介紹', 'Product Details', '商品詳細', '상품 설명'),
    flavorTitle: t4('風味標籤', 'Flavor Notes', 'フレーバーノート', '풍미 노트'),
    quantity: t4('購買數量', 'Quantity', '数量', '수량'),
    stockLeft: (count: number) => t4(`剩餘 ${count} 件`, `${count} left`, `残り ${count}`, `${count}개 남음`),
    outOfStock: t4('已售完', 'Sold Out', '売り切れ', '품절'),
    adding: t4('加入中...', 'Adding...', '追加中...', '담는 중...'),
    added: t4('已加入', 'Added', '追加済み', '추가됨'),
    addToCart: t4('加入購物車', 'Add to Cart', 'カートに追加', '장바구니 담기'),
    buyNow: t4('立即購買', 'Buy Now', '今すぐ購入', '바로 구매'),
    relatedTitle: t4('你可能也會喜歡', 'You May Also Like', 'あわせておすすめ', '함께 보면 좋은 상품'),
    viewMore: t4('查看更多', 'View More', 'もっと見る', '더 보기'),
    specsCategory: t4('分類', 'Category', 'カテゴリ', '카테고리'),
    specsOrigin: t4('產地', 'Origin', '産地', '원산지'),
    specsRoast: t4('焙度', 'Roast Level', '焙煎度', '로스팅'),
    specsProcess: t4('處理法', 'Process', '精製方法', '가공 방식'),
    specsWeight: t4('重量', 'Weight', '内容量', '중량'),
    specsAltitude: t4('海拔', 'Altitude', '標高', '고도'),
    specsVariety: t4('品種', 'Variety', '品種', '품종'),
    specsRoastDate: t4('烘焙日期', 'Roast Date', '焙煎日', '로스팅 날짜'),
    guaranteeSecure: t4('安全結帳', 'Secure Checkout', '安全な決済', '안전 결제'),
    guaranteeSecureDesc: t4('交易資料加密，訂單流程可追蹤。', 'Encrypted payment and verified order flow.', '決済情報は暗号化され、注文フローは検証済みです。', '결제 정보 암호화 및 검증된 주문 플로우를 제공합니다.'),
    guaranteeFast: t4('快速出貨', 'Fast Delivery', 'スピード発送', '빠른 배송'),
    guaranteeFastDesc: t4('訂單快速處理，並提供物流狀態更新。', 'Orders are processed quickly with tracking updates.', '注文は迅速に処理され、配送状況を追跡できます。', '주문을 빠르게 처리하고 배송 추적 정보를 제공합니다.'),
    guaranteeReturn: t4('退換無憂', 'Easy Return', '返品サポート', '간편 반품'),
    guaranteeReturnDesc: t4('客服團隊提供退換貨與售後協助。', 'Support team assists with return policies.', 'サポートチームが返品・交換をサポートします。', '고객지원팀이 반품/교환 정책을 안내합니다.'),
    guaranteeQuality: t4('品質嚴選', 'Quality Curated', '品質セレクト', '품질 큐레이션'),
    guaranteeQualityDesc: t4('以旅遊與日常使用情境精選商品。', 'Products are curated for travel and daily use.', '旅先と日常の両方で使いやすい商品を厳選。', '여행/일상 모두에 맞는 상품을 엄선했습니다.'),
    breadcrumbShop: t4('選物商店', 'Shop', 'ショップ', '샵'),
  };

  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [displayProduct, setDisplayProduct] = useState<Product | null>(null);
  const [displayCategory, setDisplayCategory] = useState<Category | null>(null);
  const [displayRelated, setDisplayRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [runtimeTick, setRuntimeTick] = useState(0);

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
        loadedProduct.category_id
          ? supabase.from('categories').select('id,name,slug').eq('id', loadedProduct.category_id).maybeSingle()
          : Promise.resolve({ data: null }),
        loadedProduct.category_id
          ? supabase
              .from('products')
              .select('id,name,price,image_url,stock_quantity,description,origin,roast_level,processing_method,flavor_notes,tags')
              .eq('is_active', true)
              .eq('category_id', loadedProduct.category_id)
              .neq('id', loadedProduct.id)
              .limit(4)
          : Promise.resolve({ data: [] }),
      ]);

      setCategory((categoryData as Category) || null);
      setRelated((relatedData as RelatedProduct[]) || []);
      setLoading(false);
    };
    if (id) void fetchProduct();
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!product || !shouldTranslate) {
      setDisplayProduct(product);
      return () => {
        cancelled = true;
      };
    }
    setDisplayProduct(product);
    translateProductsFromCacheOnly([product], normalizedLang).then(rows => {
      if (!cancelled && rows[0]) setDisplayProduct(rows[0] as Product);
    }).catch(() => {});
    translateProductsOnDemand([product], normalizedLang).then(rows => {
      if (!cancelled && rows[0]) setDisplayProduct(rows[0] as Product);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product, normalizedLang, shouldTranslate]);

  useEffect(() => {
    let cancelled = false;
    if (!category || !shouldTranslate) {
      setDisplayCategory(category);
      return () => {
        cancelled = true;
      };
    }
    setDisplayCategory(category);
    translateCategoriesFromCacheOnly([category], normalizedLang).then(rows => {
      if (!cancelled && rows[0]) setDisplayCategory(rows[0] as Category);
    }).catch(() => {});
    translateCategoriesOnDemand([category], normalizedLang).then(rows => {
      if (!cancelled && rows[0]) setDisplayCategory(rows[0] as Category);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [category, normalizedLang, shouldTranslate]);

  useEffect(() => {
    let cancelled = false;
    if (!related.length || !shouldTranslate) {
      setDisplayRelated(related);
      return () => {
        cancelled = true;
      };
    }
    setDisplayRelated(related);
    translateProductsFromCacheOnly(related as Product[], normalizedLang).then(rows => {
      if (!cancelled) setDisplayRelated(rows as unknown as RelatedProduct[]);
    }).catch(() => {});
    translateProductsOnDemand(related as Product[], normalizedLang).then(rows => {
      if (!cancelled) setDisplayRelated(rows as unknown as RelatedProduct[]);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [related, normalizedLang, shouldTranslate]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hostname !== 'localhost') return;
    const timer = window.setInterval(() => setRuntimeTick(t => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const viewProduct = displayProduct || product;
  const viewCategory = displayCategory || category;
  const viewRelated = displayRelated.length ? displayRelated : related;

  const images = useMemo(() => {
    if (!viewProduct) return [];
    const gallery = viewProduct.images?.filter(Boolean) || [];
    const fallback = viewProduct.image_url || 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=900';
    return gallery.length > 0 ? gallery : [fallback];
  }, [viewProduct]);

  const handleAddToCart = async () => {
    if (!viewProduct) return;
    setAdding(true);
    try {
      await addItem(viewProduct.id, qty);
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

  if (!viewProduct) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h1 className="mb-2 text-2xl font-bold text-gray-800">{labels.notFoundTitle}</h1>
          <p className="mb-6 text-gray-500">{labels.notFoundDesc}</p>
          <Link to="/shop" className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-6 py-3 font-semibold text-white transition hover:bg-[#8B6840]">
            <ArrowLeft className="h-4 w-4" />
            {labels.backShop}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const inStock = viewProduct.stock_quantity > 0;
  const lowStock = viewProduct.stock_quantity > 0 && viewProduct.stock_quantity <= 5;
  const displayImage = activeImg || images[0];
  const plainDescription = stripHtml(viewProduct.description);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: viewProduct.name,
    description: plainDescription || viewProduct.name,
    image: displayImage,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TWD',
      price: viewProduct.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  const guarantees = [
    { icon: Shield, title: labels.guaranteeSecure, desc: labels.guaranteeSecureDesc },
    { icon: Truck, title: labels.guaranteeFast, desc: labels.guaranteeFastDesc },
    { icon: RotateCcw, title: labels.guaranteeReturn, desc: labels.guaranteeReturnDesc },
    { icon: Star, title: labels.guaranteeQuality, desc: labels.guaranteeQualityDesc },
  ];

  const specs = [
    { label: labels.specsCategory, value: viewCategory?.name },
    { label: labels.specsOrigin, value: viewProduct.origin },
    { label: labels.specsRoast, value: viewProduct.roast_level },
    { label: labels.specsProcess, value: viewProduct.processing_method },
    { label: labels.specsWeight, value: viewProduct.weight_grams ? `${viewProduct.weight_grams}g` : undefined },
    { label: labels.specsAltitude, value: viewProduct.altitude },
    { label: labels.specsVariety, value: viewProduct.variety?.join(', ') },
    { label: labels.specsRoastDate, value: viewProduct.roast_date },
  ].filter(item => item.value);

  const runtime = getTranslationRuntimeState();
  void runtimeTick;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={viewProduct.name}
        description={plainDescription || `${viewProduct.name} - Nestobi`}
        keywords={`${viewProduct.name}, ${viewCategory?.name || ''}, Nestobi`}
        ogImage={displayImage}
        ogType="product"
        pageType="product"
        jsonLd={jsonLd}
      />
      <Navigation />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <div className="font-semibold">Translation Debug</div>
            <div>content: {runtime.writeStats.content.success}/{runtime.writeStats.content.attempts} success, {runtime.writeStats.content.failed} failed</div>
            <div>cache: {runtime.writeStats.cache.success}/{runtime.writeStats.cache.attempts} success, {runtime.writeStats.cache.failed} failed</div>
            {runtime.writeStats.lastError && <div className="text-red-600">lastError: {runtime.writeStats.lastError}</div>}
          </div>
        )}

        <nav className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500">
          <Link to="/shop" className="font-semibold transition hover:text-[#8B6840]">{labels.breadcrumbShop}</Link>
          {viewCategory && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{viewCategory.name}</span>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="max-w-[220px] truncate font-semibold text-gray-700">{viewProduct.name}</span>
        </nav>

        <div className="mb-12 grid gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-white shadow-card">
              <img src={displayImage} alt={viewProduct.name} className="h-full w-full object-cover" />
              {!inStock && <div className="absolute inset-0 flex items-center justify-center bg-black/45"><span className="rounded-full bg-white px-6 py-2.5 text-lg font-bold text-gray-800">{labels.outOfStock}</span></div>}
              {lowStock && <span className="absolute right-4 top-4 rounded-full bg-orange-500 px-3 py-1.5 text-sm font-bold text-white shadow-md">{labels.stockLeft(viewProduct.stock_quantity)}</span>}
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
            {viewCategory && (
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#8B6840]">
                <Tag className="h-4 w-4" />
                {viewCategory.name}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold leading-tight text-gray-900 md:text-4xl">{viewProduct.name}</h1>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                <span className="text-sm font-medium text-slate-500">{labels.reviewHint}</span>
              </div>
            </div>
            <div className="border-y border-gray-200 py-5">
              <p className="text-4xl font-bold text-[#8B6840]">{formatCurrency(viewProduct.price)}</p>
              <p className="mt-2 text-sm font-medium text-slate-600">{labels.listPriceHint}</p>
            </div>
            {viewProduct.description && (
              <div>
                <h2 className="mb-2 font-bold text-gray-900">{labels.detailsTitle}</h2>
                <div
                  className="space-y-3 text-sm font-medium leading-7 text-slate-700 [&_br]:hidden [&_li]:mb-1 [&_p]:m-0 [&_strong]:font-bold [&_strong]:text-gray-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewProduct.description) }}
                />
              </div>
            )}
            {viewProduct.flavor_notes && viewProduct.flavor_notes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">{labels.flavorTitle}</p>
                <div className="flex flex-wrap gap-2">
                  {viewProduct.flavor_notes.map(note => <span key={note} className="rounded-full bg-[#F0E4C8] px-3 py-1.5 text-sm font-semibold text-[#2C1F10]">{note}</span>)}
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
              <p className="mb-3 font-bold text-gray-900">{labels.quantity}</p>
              <div className="flex items-center gap-4">
                <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <button type="button" onClick={() => setQty(value => Math.max(1, value - 1))} disabled={qty <= 1} className="px-4 py-3 text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                  <span className="min-w-[58px] border-x border-gray-200 px-5 py-3 text-center font-bold">{qty}</span>
                  <button type="button" onClick={() => setQty(value => Math.min(viewProduct.stock_quantity, value + 1))} disabled={qty >= viewProduct.stock_quantity} className="px-4 py-3 text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
                </div>
                <span className={`text-sm ${lowStock ? 'font-bold text-orange-600' : 'font-medium text-slate-600'}`}>{inStock ? labels.stockLeft(viewProduct.stock_quantity) : labels.outOfStock}</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handleAddToCart} disabled={!inStock || adding} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B6840] px-5 py-4 font-bold text-white shadow-md transition hover:bg-[#6F4F2B] disabled:bg-gray-200 disabled:text-gray-500">
                {added ? <CheckCircle className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                {adding ? labels.adding : added ? labels.added : labels.addToCart}
              </button>
              <button type="button" onClick={() => handleAddToCart().then(() => navigate('/cart'))} disabled={!inStock || adding} className="rounded-xl bg-gray-900 px-5 py-4 font-bold text-white transition hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400">
                {labels.buyNow}
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

        {viewRelated.length > 0 && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{labels.relatedTitle}</h2>
              <Link to="/shop" className="text-sm font-bold text-[#8B6840] hover:underline">{labels.viewMore}</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {viewRelated.map(item => (
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
