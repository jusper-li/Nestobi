import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ChevronRight, Eye, Loader2, Package, Search, ShoppingCart, SlidersHorizontal, Sparkles, Tag, X } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import ThemeHeroCarousel from '../../components/ThemeHeroCarousel';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { useProgressiveList } from '../../hooks/useProgressiveList';
import {
  getTranslationRuntimeState,
  translateCategoriesFromCacheOnly,
  translateCategoriesOnDemand,
  translateProductsFromCacheOnly,
  translateProductsOnDemand,
} from '../../lib/contentTranslations';
import { supabase } from '../../lib/supabase';
import { PRODUCT_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { fetchPublicList, fetchSnapshotList, readCachedList, withRetry, writeCachedList } from '../../lib/listData';
import { getCategoryDepth, getDescendantCategoryIds, getProductCategoryIds, sortCategoriesForTree } from '../../lib/categoryTree';
import { formatCurrency } from '../../lib/utils';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock_quantity: number;
  category_id: string | null;
  origin?: string | null;
  roast_level?: string | null;
  processing_method?: string | null;
  flavor_notes?: string[] | null;
  tags?: string[] | null;
  product_category_links?: { category_id: string | null }[] | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

type SortMode = 'recommended' | 'price-asc' | 'price-desc' | 'stock';
const PRODUCTS_CACHE_KEY = 'nestobi:list:products:v7';
const CATEGORIES_CACHE_KEY = 'nestobi:list:categories:v7';
const PRODUCTS_SNAPSHOT_PATH = '/snapshots/products.json';
const CATEGORIES_SNAPSHOT_PATH = '/snapshots/categories.json';

function productSearchText(product: Product) {
  return [
    product.name,
    product.description || '',
    product.origin || '',
    product.roast_level || '',
    product.processing_method || '',
    ...(product.flavor_notes || []),
    ...(product.tags || []),
  ].join(' ').toLowerCase();
}

function stripHtml(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sortProducts(products: Product[], sortMode: SortMode) {
  const sorted = [...products];
  if (sortMode === 'price-asc') return sorted.sort((a, b) => a.price - b.price);
  if (sortMode === 'price-desc') return sorted.sort((a, b) => b.price - a.price);
  if (sortMode === 'stock') return sorted.sort((a, b) => b.stock_quantity - a.stock_quantity);

  return sorted.sort((a, b) => Number(b.stock_quantity > 0) - Number(a.stock_quantity > 0));
}

export default function ProductList() {
  const [searchParams] = useSearchParams();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const shouldTranslate = pickByLang(normalizedLang, '0', '1', '1', '1') === '1';
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);
  const labels = {
    seoTitle: t4('根本在旅行', 'Genbon Travel Shop', '根本在旅行', '근본재여행'),
    seoDesc: t4('根本在旅行整合旅行選物、咖啡茶品、門市體驗與購物訂單，讓旅途中的味道可以帶回日常。', 'Genbon Travel Shop brings together travel goods, coffee and tea, store experiences, shopping, and orders for travel-inspired daily goods.', '根本在旅行は旅の選物、コーヒーやお茶、店舗体験、買い物と注文をまとめ、旅先の味を日常へ持ち帰ります。', '근본재여행은 여행 셀렉트 상품, 커피와 차, 매장 경험, 쇼핑과 주문을 모아 여행의 맛을 일상으로 가져옵니다.'),
    heroTitle: t4('根本在旅行', 'Genbon Travel Shop', '根本在旅行', '근본재여행'),
    heroDesc: t4('從產地咖啡、茶點到旅行器物，把旅程中的味道和日常用品一起帶回家。', 'From origin coffee and tea snacks to travel tools, bring the taste of the journey and daily essentials home together.', '産地のコーヒー、お茶菓子、旅の道具まで、旅の味と日用品を一緒に持ち帰れます。', '산지 커피와 차 간식부터 여행 도구까지, 여행의 맛과 생활용품을 함께 가져가세요.'),
    heroPlaceholder: t4('試試：果香咖啡、送禮茶包、沖繩旅行紀念品', 'Try: fruity coffee, gift tea bags, Okinawa souvenirs', '例：果実感のあるコーヒー、ギフト茶包、沖縄旅行のお土産', '예: 과일향 커피, 선물용 티백, 오키나와 여행 기념품'),
    search: t4('搜尋', 'Search', '検索', '검색'),
    clearHint: t4('清除提示', 'Clear hint', 'ヒントを消す', '힌트 지우기'),
    allProducts: t4('全部商品', 'All Products', 'すべての商品', '전체 상품'),
    subCategories: t4('子分類', 'Subcategories', 'サブカテゴリ', '하위 카테고리'),
    shownCount: t4('已顯示', 'Showing', '表示中', '표시 중'),
    foundProducts: t4('件商品', 'products found', '件の商品', '개 상품'),
    purchasable: t4('件可購買', 'purchasable', '件購入可', '개 구매 가능'),
    quickFilterHint: t4('商品可依庫存、價格與分類快速篩選。', 'Filter Genbon Travel products by stock, price, category, and keywords.', '在庫、価格、カテゴリ、キーワードで根本在旅行の商品を絞り込めます。', '재고, 가격, 카테고리, 키워드로 근본재여행 상품을 빠르게 필터링하세요.'),
    recommended: t4('推薦排序', 'Recommended', 'おすすめ順', '추천순'),
    priceAsc: t4('價格由低到高', 'Price: Low to High', '価格の安い順', '가격 낮은순'),
    priceDesc: t4('價格由高到低', 'Price: High to Low', '価格の高い順', '가격 높은순'),
    stockMost: t4('庫存最多', 'Most In Stock', '在庫が多い順', '재고 많은순'),
    lowStock: t4('僅剩 {count}', 'Only {count} left', '残り {count}', '{count}개 남음'),
    soldOut: t4('售完', 'Sold Out', '売り切れ', '품절'),
    details: t4('查看商品', 'View Product', '商品を見る', '상품 보기'),
    addOn: t4('加入購物車', 'Add', '追加', '담기'),
    loadMore: t4('載入更多商品', 'Load More Products', 'さらに商品を表示', '상품 더 보기'),
    empty: t4('沒有商品符合目前篩選。', 'No products match the current filters.', '現在の条件に合う商品がありません。', '현재 조건에 맞는 상품이 없습니다.'),
    clearFilters: t4('清除篩選', 'Clear filters', '条件をクリア', '필터 지우기'),
    aiUnavailable: t4('AI 搜尋暫時無法使用', 'AI search is temporarily unavailable', 'AI検索は一時的に利用できません', 'AI 검색을 일시적으로 사용할 수 없습니다'),
    aiSummary: t4('已依照你的描述整理商品。', 'Results organized based on your description.', '説明に合わせて商品を整理しました。', '입력한 설명을 바탕으로 상품을 정리했습니다.'),
    seoKeywords: t4('根本在旅行, 商品, 門市, 咖啡選物, 旅行商店', 'Genbon Travel, products, stores, coffee goods, travel shop', '根本在旅行, 商品, 店舗, コーヒー選物, 旅行ショップ', '근본재여행, 상품, 매장, 커피 상품, 여행 상점'),
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [displayCategories, setDisplayCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiError, setAiError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [dataNotice, setDataNotice] = useState('');
  const [translationNotice, setTranslationNotice] = useState('');
  const { addItem } = useCart();

  const mergeTranslatedProducts = (base: Product[], translated: Product[]) => {
    const byId = new Map(translated.map(item => [item.id, item]));
    return base.map(item => byId.get(item.id) || item);
  };

  useEffect(() => {
    let cancelled = false;
    let receivedFreshProducts = false;
    let receivedFreshCategories = false;
    const cachedProducts = readCachedList<Product>(PRODUCTS_CACHE_KEY);
    const cachedCategories = readCachedList<Category>(CATEGORIES_CACHE_KEY);

    if (cachedProducts?.length) {
      setProducts(cachedProducts);
      setDisplayProducts(cachedProducts);
      setLoading(false);
    }
    if (cachedCategories?.length) {
      setCategories(cachedCategories);
      setDisplayCategories(cachedCategories);
    }

    fetchSnapshotList<Product>(PRODUCTS_SNAPSHOT_PATH)
      .then(snapshotProducts => {
        if (cancelled || receivedFreshProducts || snapshotProducts.length === 0 || cachedProducts?.length) return;
        setProducts(snapshotProducts);
        setDisplayProducts(snapshotProducts);
        setLoading(false);
        setDataNotice(t4('目前先顯示快速快照資料，正在背景更新最新商品。', 'Showing snapshot data first while syncing latest products.', '最新商品を同期しながら、先にスナップショットを表示します。', '최신 상품 동기화 중이며 스냅샷 데이터를 먼저 표시합니다.'));
      })
      .catch(() => {});

    fetchSnapshotList<Category>(CATEGORIES_SNAPSHOT_PATH)
      .then(snapshotCategories => {
        if (cancelled || receivedFreshCategories || snapshotCategories.length === 0 || cachedCategories?.length) return;
        setCategories(snapshotCategories);
        setDisplayCategories(snapshotCategories);
      })
      .catch(() => {});

    withRetry(() => fetchPublicList<Product>('products', async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*,product_category_links(category_id)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(360);
      if (error) throw error;
      return (data as Product[]) || [];
    }))
      .then(freshProducts => {
        if (cancelled) return;
        receivedFreshProducts = true;
        setProducts(freshProducts);
        setDisplayProducts(freshProducts);
        writeCachedList(PRODUCTS_CACHE_KEY, freshProducts);
        setDataNotice('');
      })
      .catch(() => {
        if (cancelled) return;
        if (!cachedProducts?.length) setDataNotice(t4('Supabase 連線暫時不穩，已改用快照商品加速顯示。', 'Supabase is unstable now. Snapshot products are shown first.', 'Supabase接続が不安定のため、スナップショット商品を先に表示します。', 'Supabase 연결이 불안정하여 스냅샷 상품을 먼저 표시합니다.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    withRetry(() => fetchPublicList<Category>('categories', async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name,slug,parent_id')
        .order('name', { ascending: true })
        .limit(120);
      if (error) throw error;
      return (data as Category[]) || [];
    }))
      .then(freshCategories => {
        if (cancelled) return;
        receivedFreshCategories = true;
        setCategories(freshCategories);
        setDisplayCategories(freshCategories);
        writeCachedList(CATEGORIES_CACHE_KEY, freshCategories);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!products.length || !shouldTranslate) {
      setDisplayProducts(products);
      setTranslationNotice('');
      return () => { cancelled = true; };
    }
    setDisplayProducts(products);
    const runtime = getTranslationRuntimeState();
    setTranslationNotice(
      runtime.tableUnavailable || runtime.isLocalProxyMode
        ? t4('目前先顯示原文商品，翻譯快取尚未就緒。', 'Showing source products first. Translation cache is not ready yet.', '翻訳キャッシュ未準備のため、原文商品を先に表示します。', '번역 캐시 준비 전이라 원문 상품을 먼저 표시합니다.')
        : t4('正在套用商品快取翻譯...', 'Applying cached product translations...', 'キャッシュ翻訳を適用中...', '캐시 번역 적용 중...')
    );
    translateProductsFromCacheOnly(products, normalizedLang)
      .then(cachedTranslated => {
        if (!cancelled) setDisplayProducts(cachedTranslated);
      })
      .catch(() => {
        if (!cancelled) setDisplayProducts(products);
      })
      .finally(() => {
        if (!cancelled) {
          setTranslationNotice(t4('正在背景補齊其餘商品翻譯...', 'Syncing remaining product translations in background...', '残りの商品翻訳をバックグラウンド同期中...', '나머지 상품 번역을 백그라운드 동기화 중...'));
        }
      });
    const BATCH_SIZE = 3;
    const batches: Product[][] = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE));
    }

    (async () => {
      let current = products;
      for (let i = 0; i < batches.length; i += 1) {
        if (cancelled) return;
        try {
          const translatedChunk = await translateProductsOnDemand(batches[i], normalizedLang);
          if (cancelled) return;
          current = mergeTranslatedProducts(current, translatedChunk);
          setDisplayProducts(current);
          if (i === batches.length - 1) setTranslationNotice('');
        } catch {
          if (!cancelled) {
            setTranslationNotice(t4('目前顯示原文或快取商品。', 'Showing source/cached products.', '原文/キャッシュ商品を表示しています。', '원문/캐시 상품을 표시합니다.'));
          }
          return;
        }
      }
    })();

    return () => { cancelled = true; };
  }, [products, normalizedLang, shouldTranslate]);

  useEffect(() => {
    let cancelled = false;
    if (!categories.length || !shouldTranslate) {
      setDisplayCategories(categories);
      return () => {
        cancelled = true;
      };
    }

    setDisplayCategories(categories);
    translateCategoriesFromCacheOnly(categories, normalizedLang)
      .then(cachedTranslated => {
        if (!cancelled) setDisplayCategories(cachedTranslated);
      })
      .catch(() => {
        if (!cancelled) setDisplayCategories(categories);
      });

    translateCategoriesOnDemand(categories, normalizedLang)
      .then(translated => {
        if (!cancelled) setDisplayCategories(translated);
      })
      .catch(() => {
        if (!cancelled) setDisplayCategories(categories);
      });

    return () => {
      cancelled = true;
    };
  }, [categories, normalizedLang, shouldTranslate]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedCategoryIds = selectedCategory === 'all'
      ? null
      : getDescendantCategoryIds(displayCategories, selectedCategory);
    const matches = displayProducts.filter(product => {
      const categoryMatches = !selectedCategoryIds
        || Array.from(getProductCategoryIds(product)).some(categoryId => selectedCategoryIds.has(categoryId));
      const queryMatches = !query || productSearchText(product).includes(query);

      return categoryMatches && queryMatches;
    });

    return sortProducts(matches, sortMode);
  }, [displayProducts, displayCategories, search, selectedCategory, sortMode]);
  const orderedCategories = useMemo(() => sortCategoriesForTree(displayCategories), [displayCategories]);
  const categoryById = useMemo(() => new Map(displayCategories.map(category => [category.id, category])), [displayCategories]);
  const activeCategory = selectedCategory === 'all' ? null : categoryById.get(selectedCategory) || null;
  const activePath = useMemo(() => {
    if (!activeCategory) return [] as Category[];
    const path = [activeCategory];
    let current = activeCategory;
    let guard = 0;

    while (current.parent_id && categoryById.has(current.parent_id) && guard < 8) {
      current = categoryById.get(current.parent_id)!;
      path.unshift(current);
      guard += 1;
    }

    return path;
  }, [activeCategory, categoryById]);
  const activeRoot = activePath[0] || null;
  const rootCategories = useMemo(
    () => orderedCategories.filter(category => getCategoryDepth(category, displayCategories) === 0),
    [orderedCategories, displayCategories],
  );
  const childCategories = useMemo(
    () => activeCategory ? orderedCategories.filter(category => category.parent_id === activeCategory.id) : [],
    [activeCategory, orderedCategories],
  );
  const handleCategoryChange = (nextCategoryId: string) => {
    setSelectedCategory(nextCategoryId);
    setSearch('');
    setAiSummary('');
    setAiError('');
  };
  const { visibleItems: visibleProducts, visibleCount, hasMore, sentinelRef, loadMore } = useProgressiveList(filtered, { initialCount: 12, increment: 12 });

  const inStockCount = filtered.filter(product => product.stock_quantity > 0).length;

  const handleAddToCart = async (productId: string) => {
    setAddingId(productId);
    try {
      await addItem(productId, 1);
    } finally {
      setAddingId(null);
    }
  };

  const handleAISearch = async () => {
    if (!search.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiSummary('');

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'product-search', query: search }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || labels.aiUnavailable);

      setAiSummary(json.result?.summary || labels.aiSummary);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : labels.aiUnavailable);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={labels.seoTitle}
        description={labels.seoDesc}
        keywords={labels.seoKeywords}
        ogType="website"
        pageType="list"
      />
      <Navigation />

      <ThemeHeroCarousel
        themeKey="genbon_travel"
        title={labels.heroTitle}
        description={labels.heroDesc}
      >
        <div className="rounded-3xl border border-white/12 bg-white/90 p-4 shadow-2xl backdrop-blur">
            <div className={`flex max-w-2xl items-center rounded-2xl bg-white shadow-card transition ${aiLoading ? 'ring-2 ring-[#C09A6A]/40' : 'focus-within:ring-2 focus-within:ring-[#C09A6A]/30'}`}>
              <div className="pl-4 text-[#C09A6A]">{aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}</div>
              <input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.key === 'Enter' && handleAISearch()} placeholder={labels.heroPlaceholder} className="min-w-0 flex-1 bg-transparent px-3 py-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none" />
              {search && <button type="button" onClick={() => { setSearch(''); setAiSummary(''); setAiError(''); }} className="p-2 text-gray-400 transition hover:text-gray-600"><X className="h-4 w-4" /></button>}
              <button type="button" onClick={handleAISearch} disabled={aiLoading || !search.trim()} className="m-1.5 inline-flex items-center gap-1.5 rounded-xl bg-[#C09A6A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8B6840] disabled:opacity-50">
                <Search className="h-4 w-4" />
                {labels.search}
              </button>
            </div>
          <p className="mt-3 text-sm font-semibold text-[#2C1F10]/70">{visibleCount} / {filtered.length} {labels.foundProducts}</p>
        </div>
      </ThemeHeroCarousel>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence>
          {aiError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {aiError}
              <button type="button" onClick={() => setAiError('')} className="ml-auto"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {aiSummary && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#8B6840]/25 bg-white px-5 py-4 shadow-sm">
            <Sparkles className="h-4 w-4 text-[#8B6840]" />
            <span className="text-sm font-semibold text-[#2C1F10]">{aiSummary}</span>
            <button type="button" onClick={() => setAiSummary('')} className="ml-auto text-sm font-semibold text-slate-500 hover:text-slate-700">
              {labels.clearHint}
            </button>
          </div>
        )}

        {dataNotice && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {dataNotice}
          </div>
        )}
        {translationNotice && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {translationNotice}
          </div>
        )}

        <div className="mb-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#8B6840] text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-[#8B6840]/40 hover:text-[#8B6840]'
              }`}
            >
              {labels.allProducts}
            </button>
            {rootCategories.map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryChange(category.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  activeRoot?.id === category.id
                    ? 'bg-[#8B6840] text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-[#8B6840]/40 hover:text-[#8B6840]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {childCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <ChevronRight className="h-3 w-3" />
                <span>{labels.subCategories}</span>
              </div>
              {childCategories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange(category.id)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'border-[#8B6840] bg-[#8B6840] text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-[#8B6840]/40 hover:text-[#8B6840]'
                  }`}
                >
                  <Tag className="h-2.5 w-2.5" />
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCategory !== 'all' && activeCategory && (
          <div className="mb-5 flex items-center gap-1.5 text-xs text-slate-400">
            <button type="button" onClick={() => handleCategoryChange('all')} className="transition hover:text-[#8B6840]">{labels.allProducts}</button>
            {activePath.map((category, index) => (
              <span key={category.id} className="inline-flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" />
                {index === activePath.length - 1 ? (
                  <span className="font-medium text-[#8B6840]">{category.name}</span>
                ) : (
                  <button type="button" onClick={() => handleCategoryChange(category.id)} className="transition hover:text-[#8B6840]">{category.name}</button>
                )}
              </span>
            ))}
            <span className="ml-auto text-slate-300">{labels.shownCount} {Math.min(visibleCount, filtered.length)} / {filtered.length}</span>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">
              {pickByLang(
                normalizedLang,
                `找到 ${filtered.length} ${labels.foundProducts}`,
                `${filtered.length} ${labels.foundProducts}`,
                `${filtered.length}${labels.foundProducts}`,
                `${filtered.length}${labels.foundProducts}`,
              )}
              <span className="ml-2 text-xs font-semibold text-slate-500">
                {labels.shownCount} {Math.min(visibleCount, filtered.length)}，{inStockCount} {labels.purchasable}
              </span>
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{labels.quickFilterHint}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <SlidersHorizontal className="h-4 w-4 text-[#8B6840]" />
            <select value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#8B6840] focus:ring-2 focus:ring-[#8B6840]/20">
              <option value="recommended">{labels.recommended}</option>
              <option value="price-asc">{labels.priceAsc}</option>
              <option value="price-desc">{labels.priceDesc}</option>
              <option value="stock">{labels.stockMost}</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C09A6A] border-t-transparent" />
          </div>
        ) : filtered.length > 0 ? (
          <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {visibleProducts.map((product, index) => (
              <motion.article key={product.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 11) * 0.02 }} className="group mb-5 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-card" style={{ contentVisibility: 'auto', containIntrinsicSize: '340px' }}>
                <Link to={`/shop/${product.id}`} className="relative block h-52 overflow-hidden bg-gray-100">
                  <img src={product.image_url || PRODUCT_FALLBACK_IMAGE} alt={product.name} loading={index < 6 ? 'eager' : 'lazy'} decoding="async" onError={event => useFallbackImage(event, PRODUCT_FALLBACK_IMAGE)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  {product.stock_quantity <= 5 && product.stock_quantity > 0 && <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white">{labels.lowStock.replace('{count}', String(product.stock_quantity))}</span>}
                  {product.stock_quantity === 0 && <div className="absolute inset-0 flex items-center justify-center bg-black/45"><span className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-gray-800">{labels.soldOut}</span></div>}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link to={`/shop/${product.id}`} className="line-clamp-2 text-sm font-bold leading-6 text-gray-900 transition hover:text-[#8B6840]">
                    {product.name}
                  </Link>
                  {product.description && <p className="mt-2 line-clamp-2 text-xs font-medium leading-6 text-slate-600">{stripHtml(product.description)}</p>}
                  {(product.origin || product.roast_level || product.flavor_notes?.length) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {([product.origin, product.roast_level, ...(product.flavor_notes || []).slice(0, 2)].filter(Boolean) as string[]).map(label => (
                        <span key={label} className="rounded-full border border-[#8B6840]/15 bg-[#F0E4C8] px-2 py-0.5 text-[11px] font-bold text-[#6F4F2B]">{label}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                    <span className="text-lg font-bold text-[#8B6840]">{formatCurrency(product.price)}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Link to={`/shop/${product.id}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-[#F0E4C8] hover:text-[#2C1F10]">
                        <Eye className="h-3.5 w-3.5" />
                        {labels.details}
                      </Link>
                      <button type="button" onClick={() => handleAddToCart(product.id)} disabled={product.stock_quantity === 0 || addingId === product.id} className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B6840] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#6F4F2B] disabled:bg-gray-200 disabled:text-gray-500">
                        {addingId === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                        {labels.addOn}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <button type="button" onClick={loadMore} className="inline-flex items-center gap-2 rounded-full border border-[#8B6840]/25 bg-white px-5 py-2 text-sm font-bold text-[#8B6840] shadow-sm transition hover:bg-[#FEF9EC]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {labels.loadMore}
              </button>
            </div>
          )}
          </>
        ) : (
          <div className="py-24 text-center text-slate-500">
            <Package className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p className="text-sm font-medium">{labels.empty}</p>
            <button type="button" onClick={() => { setSearch(''); handleCategoryChange('all'); }} className="mt-3 text-sm font-bold text-[#8B6840] hover:underline">
              {labels.clearFilters}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

