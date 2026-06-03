import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Heart, Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMemberFavorite } from '../../hooks/useMemberFavorite';
import { translateCategoriesFromCacheOnly, translateCategoriesOnDemand, translateProductsFromCacheOnly, translateProductsOnDemand } from '../../lib/contentTranslations';
import { normalizeLang, pickByLang } from '../../lib/i18n';
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
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const shouldTranslate = pickByLang(locale, '0', '1', '1', '1') === '1';
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const labels = {
    shop: t4('選物商店', 'Shop', 'ショップ', '샵'),
    notFound: t4('找不到商品', 'Product not found', '商品が見つかりません', '상품을 찾을 수 없습니다'),
    back: t4('返回商店', 'Back to shop', 'ショップへ戻る', '상점으로 돌아가기'),
    quantity: t4('數量', 'Quantity', '数量', '수량'),
    addCart: t4('加入購物車', 'Add to cart', 'カートに追加', '장바구니 담기'),
    buyNow: t4('立即購買', 'Buy now', '今すぐ購入', '지금 구매'),
    soldOut: t4('已售完', 'Sold out', '売り切れ', '품절'),
    info: t4('商品資訊', 'Product info', '商品情報', '상품 정보'),
    origin: t4('產地', 'Origin', '産地', '원산지'),
    roast: t4('烘焙度', 'Roast', '焙煎度', '로스팅'),
    process: t4('處理法', 'Process', '精製方法', '가공 방식'),
    related: t4('你可能也會喜歡', 'You may also like', 'おすすめ商品', '추천 상품'),
    details: t4('詳情', 'Details', '詳細', '상세'),
  };

  const actionLabels = {
    favorite: t4('加入收藏', 'Add Favorite', 'お気に入りに追加', '찜하기'),
    favorited: t4('已收藏', 'Favorited', 'お気に入り済み', '찜 완료'),
    reviews: t4('商品評價', 'Product Reviews', '商品レビュー', '상품 리뷰'),
    noReviews: t4('目前尚無評價', 'No reviews yet', 'レビューはまだありません', '아직 리뷰가 없습니다'),
    loginToFavorite: t4('請先登入後再收藏', 'Please sign in to save favorites.', 'お気に入りにはログインが必要です。', '찜하려면 먼저 로그인해 주세요.'),
  };

  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [displayProduct, setDisplayProduct] = useState<Product | null>(null);
  const [displayCategory, setDisplayCategory] = useState<Category | null>(null);
  const [displayRelated, setDisplayRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const { isFavorite, loading: favoriteLoading, toggleFavorite } = useMemberFavorite(user?.id, 'product', id);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data: p } = await supabase.from('products').select('*').eq('id', id).eq('is_active', true).maybeSingle();
      if (!p) {
        setLoading(false);
        return;
      }
      const loaded = p as Product;
      setProduct(loaded);
      setQty(1);
      setActiveImage(null);

      const [{ data: c }, { data: r }] = await Promise.all([
        loaded.category_id ? supabase.from('categories').select('id,name,slug').eq('id', loaded.category_id).maybeSingle() : Promise.resolve({ data: null }),
        loaded.category_id
          ? supabase.from('products').select('id,name,description,price,image_url,images,stock_quantity,category_id,origin,roast_level,processing_method').eq('is_active', true).eq('category_id', loaded.category_id).neq('id', loaded.id).limit(4)
          : Promise.resolve({ data: [] }),
      ]);
      setCategory((c || null) as Category | null);
      setRelated((r || []) as Product[]);
      setLoading(false);
    };
    if (id) void run();
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const fetchReviews = async () => {
      if (!id) {
        setReviews([]);
        return;
      }
      const { data } = await supabase
        .from('product_reviews')
        .select('id,rating,comment,created_at')
        .eq('product_id', id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);
      if (!cancelled) setReviews((data || []) as ProductReview[]);
    };
    void fetchReviews();
    return () => {
      cancelled = true;
    };
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
    translateProductsFromCacheOnly([product], locale).then(rows => !cancelled && rows[0] && setDisplayProduct(rows[0] as Product)).catch(() => {});
    translateProductsOnDemand([product], locale).then(rows => !cancelled && rows[0] && setDisplayProduct(rows[0] as Product)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product, locale, shouldTranslate]);

  useEffect(() => {
    let cancelled = false;
    if (!category || !shouldTranslate) {
      setDisplayCategory(category);
      return () => {
        cancelled = true;
      };
    }
    setDisplayCategory(category);
    translateCategoriesFromCacheOnly([category], locale).then(rows => !cancelled && rows[0] && setDisplayCategory(rows[0] as Category)).catch(() => {});
    translateCategoriesOnDemand([category], locale).then(rows => !cancelled && rows[0] && setDisplayCategory(rows[0] as Category)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [category, locale, shouldTranslate]);

  useEffect(() => {
    let cancelled = false;
    if (!related.length || !shouldTranslate) {
      setDisplayRelated(related);
      return () => {
        cancelled = true;
      };
    }
    setDisplayRelated(related);
    translateProductsFromCacheOnly(related, locale).then(rows => !cancelled && setDisplayRelated(rows as Product[])).catch(() => {});
    translateProductsOnDemand(related, locale).then(rows => !cancelled && setDisplayRelated(rows as Product[])).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [related, locale, shouldTranslate]);

  const viewProduct = displayProduct || product;
  const viewCategory = displayCategory || category;
  const viewRelated = displayRelated.length ? displayRelated : related;

  const images = useMemo(() => {
    if (!viewProduct) return [];
    const gallery = viewProduct.images?.filter(Boolean) || [];
    const cover = viewProduct.image_url || 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=900';
    return gallery.length ? gallery : [cover];
  }, [viewProduct]);

  const handleAdd = async () => {
    if (!viewProduct) return;
    setAdding(true);
    try {
      await addItem(viewProduct.id, qty);
    } finally {
      setAdding(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      window.alert(actionLabels.loginToFavorite);
      navigate('/auth/login');
      return;
    }
    await toggleFavorite();
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50"><Navigation /><div className="flex justify-center py-24"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C09A6A] border-t-transparent" /></div></div>;
  }

  if (!viewProduct) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="mb-4 text-2xl font-bold">{labels.notFound}</h1>
          <Link to="/shop" className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-5 py-3 font-semibold text-white"><ArrowLeft className="h-4 w-4" />{labels.back}</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const inStock = viewProduct.stock_quantity > 0;
  const mainImage = activeImage || images[0];
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead title={viewProduct.name} description={(viewProduct.description || '').replace(/<[^>]+>/g, ' ').slice(0, 160)} ogImage={mainImage} ogType="product" pageType="product" />
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-slate-500">
          <Link to="/shop" className="font-semibold hover:text-[#8B6840]">{labels.shop}</Link>
          {viewCategory && (<><ChevronRight className="h-3.5 w-3.5" /><span>{viewCategory.name}</span></>)}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="max-w-[220px] truncate font-semibold text-slate-700">{viewProduct.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}>
            <div className="aspect-square overflow-hidden rounded-2xl bg-white shadow-card">
              <img src={mainImage} alt={viewProduct.name} className="h-full w-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {images.map(image => (
                  <button key={image} type="button" onClick={() => setActiveImage(image)} className={`overflow-hidden rounded-xl border ${mainImage === image ? 'border-[#8B6840]' : 'border-gray-200'}`}>
                    <img src={image} alt={viewProduct.name} className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h1 className="text-3xl font-bold text-charcoal">{viewProduct.name}</h1>
            <div className="text-4xl font-bold text-[#2C1F10]">{formatCurrency(viewProduct.price)}</div>
            <p className={`text-sm ${inStock ? 'text-emerald-700' : 'text-red-600'}`}>{inStock ? `${viewProduct.stock_quantity}` : labels.soldOut}</p>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{labels.quantity}</span>
              <div className="inline-flex items-center rounded-xl border bg-white">
                <button type="button" onClick={() => setQty(v => Math.max(1, v - 1))} disabled={qty <= 1} className="p-2 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                <span className="min-w-[2rem] text-center text-sm font-semibold">{qty}</span>
                <button type="button" onClick={() => setQty(v => Math.min(Math.max(1, viewProduct.stock_quantity), v + 1))} disabled={qty >= Math.max(1, viewProduct.stock_quantity)} className="p-2 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={handleAdd} disabled={!inStock || adding} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 disabled:opacity-40">
                <ShoppingCart className="h-4 w-4" />
                {labels.addCart}
              </button>
              <button type="button" onClick={() => handleAdd().then(() => navigate('/cart'))} disabled={!inStock || adding} className="rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-40">
                {labels.buyNow}
              </button>
            </div>

            <button type="button" onClick={() => void handleFavorite()} disabled={favoriteLoading} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${isFavorite ? 'border-pink-200 bg-pink-50 text-pink-600' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? actionLabels.favorited : actionLabels.favorite}
            </button>

            <div className="rounded-2xl border bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">{labels.info}</h2>
              <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                {viewCategory?.name ? <p><span className="font-medium">{labels.details}:</span> {viewCategory.name}</p> : null}
                {viewProduct.origin ? <p><span className="font-medium">{labels.origin}:</span> {viewProduct.origin}</p> : null}
                {viewProduct.roast_level ? <p><span className="font-medium">{labels.roast}:</span> {viewProduct.roast_level}</p> : null}
                {viewProduct.processing_method ? <p><span className="font-medium">{labels.process}:</span> {viewProduct.processing_method}</p> : null}
              </div>
            </div>
          </motion.div>
        </div>

        {viewProduct.description ? (
          <section className="mt-10 rounded-2xl border bg-white p-6">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewProduct.description) }} />
          </section>
        ) : null}

        <section className="mt-10 rounded-2xl border bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-charcoal">{actionLabels.reviews}</h2>
            {reviews.length > 0 ? (
              <div className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-700">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {averageRating.toFixed(1)}
              </div>
            ) : null}
          </div>
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map(review => (
                <article key={review.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="mb-2 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  {review.comment ? <p className="text-sm leading-6 text-gray-700">{review.comment}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{actionLabels.noReviews}</p>
          )}
        </section>

        {viewRelated.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-bold text-charcoal">{labels.related}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {viewRelated.map(item => (
                <Link key={item.id} to={`/shop/${item.id}`} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <img src={item.image_url || images[0]} alt={item.name} className="h-36 w-full object-cover" />
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-800">{item.name}</h3>
                    <p className="mt-2 font-bold text-[#2C1F10]">{formatCurrency(item.price)}</p>
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
