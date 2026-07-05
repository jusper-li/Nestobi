import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  Check,
  ChevronRight,
  Gift,
  Loader,
  Search,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import ProductImage from '../components/ProductImage';
import { useSEO } from '../hooks/useSEO';
import { breadcrumbSchema, collectionPageSchema } from '../utils/schemaMarkup';
import {
  isMissingSupabaseTableError,
  isSupabaseAiEnabled,
  isSupabaseContentEnabled,
  isSupabaseNetworkError,
  isSupabaseTemporarilyOffline,
  markSupabaseTemporarilyOffline,
  supabase,
} from '../lib/supabase';
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS, OBSOLETE_PRODUCT_SLUGS } from '../data/fallbackProducts';

interface Product {
  id: string;
  name: string;
  slug: string;
  summary: string;
  price: number;
  sale_price: number | null;
  stock: number;
  images: string[];
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'discount';

const PRODUCT_ORDER_SETTING_KEY = 'product_order';
const SHOP_PRODUCTS_CACHE_KEY = 'shop_products_cache_v1';
const SHOP_CATEGORIES_CACHE_KEY = 'shop_categories_cache_v1';
const SHOP_PRODUCT_ORDER_CACHE_KEY = 'shop_product_order_cache_v1';

const withRequestTimeout = <T,>(request: PromiseLike<T>, ms = 4500) =>
  Promise.race([
    request,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Request timed out')), ms);
    }),
  ]);

const getProductOrderKey = (product: Product) => product.slug || product.id;

const parseProductOrder = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (value && typeof value === 'object') {
    const maybeOrder = value as { slugs?: unknown; ids?: unknown };
    if (Array.isArray(maybeOrder.slugs)) return parseProductOrder(maybeOrder.slugs);
    if (Array.isArray(maybeOrder.ids)) return parseProductOrder(maybeOrder.ids);
  }

  return [];
};

const sortProductsByOrder = (items: Product[], order: string[]) => {
  const originalIndex = new Map(items.map((item, index) => [item.id, index]));
  const orderIndex = new Map(order.map((key, index) => [key, index]));

  return [...items].sort((a, b) => {
    const aIndex = orderIndex.get(getProductOrderKey(a)) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderIndex.get(getProductOrderKey(b)) ?? Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) return aIndex - bIndex;
    return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
  });
};

const normalizeCatalogCategoryId = (category: Category) => {
  const text = `${category.slug} ${category.name}`.toLowerCase();

  if (text.includes('bean')) return 'beans';
  if (text.includes('drip')) return 'drip-coffee';
  if (text.includes('gift')) return 'gift-boxes';
  if (text.includes('brew') || text.includes('tool')) return 'brew-tools';
  return category.id;
};

const mergeWithFallbackCategories = (loadedCategories: Category[]) => {
  const categories = new Map<string, Category>();

  for (const category of FALLBACK_CATEGORIES) {
    categories.set(category.id, category);
  }

  for (const category of loadedCategories) {
    const mappedId = normalizeCatalogCategoryId(category);
    categories.set(mappedId, { ...category, id: mappedId });
  }

  return Array.from(categories.values());
};

const mergeWithFallbackProducts = (
  loadedProducts: Product[],
  mergedCategories: Category[],
  loadedCategories: Category[]
) => {
  const categoryIdBySlug = new Map(mergedCategories.map((category) => [category.slug, category.id]));
  const fallbackCategorySlugById = new Map(FALLBACK_CATEGORIES.map((category) => [category.id, category.slug]));
  const loadedCategoryIdMap = new Map(
    loadedCategories.map((category) => [category.id, normalizeCatalogCategoryId(category) || category.id])
  );
  const fallbackBySlug = new Map(FALLBACK_PRODUCTS.map((product) => [product.slug, product]));
  const bySlug = new Map<string, Product>();
  const obsoleteSlugs = new Set(OBSOLETE_PRODUCT_SLUGS);

  for (const product of FALLBACK_PRODUCTS) {
    const categorySlug = fallbackCategorySlugById.get(product.category_id);
    bySlug.set(product.slug, {
      ...product,
      category_id: categorySlug ? categoryIdBySlug.get(categorySlug) || product.category_id : product.category_id,
    });
  }

  for (const product of loadedProducts) {
    if (obsoleteSlugs.has(product.slug)) continue;
    const fallbackProduct = fallbackBySlug.get(product.slug);
    const normalizedCategoryId = loadedCategoryIdMap.get(product.category_id) || product.category_id;

    if (fallbackProduct) {
      bySlug.set(product.slug, {
        ...fallbackProduct,
        id: product.id,
        images: fallbackProduct.images?.length ? fallbackProduct.images : product.images,
        category_id: normalizedCategoryId,
      });
      continue;
    }

    bySlug.set(product.slug, {
      ...product,
      category_id: normalizedCategoryId,
      images: Array.isArray(product.images) ? product.images : [],
      stock: product.stock ?? 0,
    });
  }

  return Array.from(bySlug.values());
};

function ProductSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-stone-100 bg-white">
      <div className="aspect-square bg-stone-100" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 rounded-lg bg-stone-100" />
        <div className="h-3 w-full rounded-lg bg-stone-100" />
        <div className="h-3 w-2/3 rounded-lg bg-stone-100" />
        <div className="mt-2 h-6 w-1/3 rounded-lg bg-stone-100" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 flex-1 rounded-lg bg-stone-100" />
          <div className="h-9 w-10 rounded-lg bg-stone-100" />
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  const { t, translationRevision } = useLanguage();
  const { addToCart } = useCart();
  const [searchParams] = useSearchParams();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isAiResult, setIsAiResult] = useState(false);
  const [aiResultIds, setAiResultIds] = useState<string[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [addedProductName, setAddedProductName] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const addToastTimeoutRef = useRef<number | null>(null);

  const readCachedArray = <T,>(key: string): T[] => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  };

  const writeCachedArray = (key: string, value: unknown[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore cache write failures
    }
  };

  const sortOptions = [
    { key: 'newest' as const, label: t('shop.sort.newest', '最新上架') },
    { key: 'price_asc' as const, label: t('shop.sort.priceAsc', '價格由低到高') },
    { key: 'price_desc' as const, label: t('shop.sort.priceDesc', '價格由高到低') },
    { key: 'discount' as const, label: t('shop.sort.discount', '折扣最多') },
  ];

  const quickSearches = [
    { label: t('shop.quick.gift', '禮盒'), query: '禮盒' },
    { label: t('shop.quick.drip', '掛耳咖啡'), query: '掛耳咖啡' },
    { label: t('shop.quick.bean', '咖啡豆'), query: '咖啡豆' },
    { label: t('shop.quick.tool', '器具'), query: '器具' },
  ];

  const shopPromises = [
    {
      icon: Gift,
      label: t('shop.promise.gift.title', '質感禮盒'),
      text: t('shop.promise.gift.description', '適合節慶與企業送禮'),
    },
    {
      icon: Truck,
      label: t('shop.promise.delivery.title', '快速出貨'),
      text: t('shop.promise.delivery.description', '完成付款後盡快安排配送'),
    },
    {
      icon: Shield,
      label: t('shop.promise.quality.title', '安心品質'),
      text: t('shop.promise.quality.description', '嚴選咖啡豆與穩定烘焙'),
    },
  ];

  useSEO({
    title: t('shop.seo.title', '禮盒商城'),
    description: t(
      'shop.seo.description',
      '瀏覽 Sonpin 的精品咖啡、禮盒與沖煮器具，找到適合送禮與日常享用的商品。'
    ),
    keywords: t('shop.seo.keywords', '精品咖啡,禮盒,掛耳咖啡,咖啡豆,沖煮器具,Sonpin'),
    schema: [
      collectionPageSchema(
        t('shop.schema.name', 'Sonpin 禮盒商城'),
        t('shop.schema.description', '挑選精品咖啡與送禮組合，完整呈現 Sonpin 的選品風格。')
      ),
      breadcrumbSchema([
        { name: t('common.home', '首頁'), url: window.location.origin },
        { name: t('shop.breadcrumb', '禮盒商城'), url: `${window.location.origin}/shop` },
      ]),
    ],
  });

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
    loadData();
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    return () => {
      if (addToastTimeoutRef.current) window.clearTimeout(addToastTimeoutRef.current);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [productsData, categoriesData, productOrder] = await Promise.all([
      loadProducts(),
      loadCategories(),
      loadProductOrder(),
    ]);

    const mergedCategories = mergeWithFallbackCategories(categoriesData);
    const mergedProducts = mergeWithFallbackProducts(productsData, mergedCategories, categoriesData);

    setCategories(mergedCategories);
    setAllProducts(sortProductsByOrder(mergedProducts, productOrder));
    setLoading(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const loadProducts = async () => {
    if (!isSupabaseContentEnabled || isSupabaseTemporarilyOffline()) return [];

    try {
      const { data, error } = await withRequestTimeout(
        supabase
          .from('products')
          .select('id, name, slug, summary, price, sale_price, stock, images, category_id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      );
      if (error) throw error;
      writeCachedArray(SHOP_PRODUCTS_CACHE_KEY, data || []);
      return data || [];
    } catch (err) {
      if (isSupabaseNetworkError(err)) {
        markSupabaseTemporarilyOffline();
        return readCachedArray<Product>(SHOP_PRODUCTS_CACHE_KEY);
      }
      if (isMissingSupabaseTableError(err)) return readCachedArray<Product>(SHOP_PRODUCTS_CACHE_KEY);
      console.warn('Using fallback products:', err);
      return readCachedArray<Product>(SHOP_PRODUCTS_CACHE_KEY);
    }
  };

  const loadCategories = async () => {
    if (!isSupabaseContentEnabled || isSupabaseTemporarilyOffline()) return [];

    try {
      const { data, error } = await withRequestTimeout(
        supabase
          .from('categories')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      );
      if (error) throw error;
      writeCachedArray(SHOP_CATEGORIES_CACHE_KEY, data || []);
      return data || [];
    } catch (err) {
      if (isSupabaseNetworkError(err)) {
        markSupabaseTemporarilyOffline();
        return readCachedArray<Category>(SHOP_CATEGORIES_CACHE_KEY);
      }
      if (isMissingSupabaseTableError(err)) return readCachedArray<Category>(SHOP_CATEGORIES_CACHE_KEY);
      console.warn('Using fallback categories:', err);
      return readCachedArray<Category>(SHOP_CATEGORIES_CACHE_KEY);
    }
  };

  const loadProductOrder = async () => {
    if (!isSupabaseContentEnabled || isSupabaseTemporarilyOffline()) return [];

    try {
      const { data, error } = await withRequestTimeout(
        supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', PRODUCT_ORDER_SETTING_KEY)
          .limit(1)
      );
      if (error) throw error;
      const parsed = parseProductOrder(data?.[0]?.setting_value);
      writeCachedArray(SHOP_PRODUCT_ORDER_CACHE_KEY, parsed);
      return parsed;
    } catch (err) {
      if (isSupabaseNetworkError(err)) {
        markSupabaseTemporarilyOffline();
        return readCachedArray<string>(SHOP_PRODUCT_ORDER_CACHE_KEY);
      }
      if (isMissingSupabaseTableError(err)) return readCachedArray<string>(SHOP_PRODUCT_ORDER_CACHE_KEY);
      console.warn('Using fallback product order:', err);
      return readCachedArray<string>(SHOP_PRODUCT_ORDER_CACHE_KEY);
    }
  };

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories) {
      map.set(category.id, t(`shop.category.${category.slug}`, category.name));
    }
    return map;
  }, [categories, translationRevision]);

  const displayProducts = useMemo(() => {
    let base = allProducts;

    const searchInProduct = (product: Product) => {
      const translatedName = t(`shop.product.${product.slug}.name`, product.name).toLowerCase();
      const translatedSummary = t(`shop.product.${product.slug}.summary`, product.summary || '').toLowerCase();
      const rawName = product.name.toLowerCase();
      const rawSummary = (product.summary || '').toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      return (
        translatedName.includes(q) ||
        translatedSummary.includes(q) ||
        rawName.includes(q) ||
        rawSummary.includes(q)
      );
    };

    if (isAiResult) {
      if (aiResultIds.length === 0) return [];
      const idMap: Record<string, Product> = {};
      for (const item of allProducts) idMap[item.id] = item;
      base = aiResultIds.map((id) => idMap[id]).filter(Boolean);
    } else {
      if (selectedCategory) {
        base = base.filter((product) => product.category_id === selectedCategory);
      }

      if (searchQuery.trim()) {
        base = base.filter((product) => searchInProduct(product));
      }
    }

    const sorted = [...base].sort((a, b) => {
      const aPrice = a.sale_price ?? a.price;
      const bPrice = b.sale_price ?? b.price;

      if (sortKey === 'price_asc') return aPrice - bPrice;
      if (sortKey === 'price_desc') return bPrice - aPrice;
      if (sortKey === 'discount') {
        const aDiscount = a.sale_price ? a.price - a.sale_price : 0;
        const bDiscount = b.sale_price ? b.price - b.sale_price : 0;
        return bDiscount - aDiscount;
      }
      return 0;
    });

    return sorted;
  }, [allProducts, aiResultIds, isAiResult, selectedCategory, searchQuery, sortKey, translationRevision, t]);

  const countForCategory = (categoryId: string | null) => {
    if (categoryId === null) return allProducts.length;
    return allProducts.filter((product) => product.category_id === categoryId).length;
  };

  const handleTextSearch = (query: string) => {
    setSearchQuery(query);
    setIsAiResult(false);
    setAiSuggestion('');
    setAiResultIds([]);
  };

  const handleAISearch = async () => {
    if (!isSupabaseAiEnabled || !searchQuery.trim() || aiSearching) return;

    setAiSearching(true);
    setAiSuggestion('');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAiResultIds([]);
        setIsAiResult(true);
        setAiSuggestion(
          payload.suggestion ||
            t('shop.ai.error', 'AI 搜尋目前暫時不可用，請改用手動搜尋。')
        );
        return;
      }

      const { results, suggestion } = payload;

      if (results?.length > 0) {
        setAiResultIds(results.map((product: Product) => product.id));
        setIsAiResult(true);
        setAiSuggestion(suggestion || '');
      } else {
        setAiResultIds([]);
        setIsAiResult(true);
        setAiSuggestion(
          suggestion || t('shop.ai.empty', '找不到符合條件的商品，請試試其他關鍵字。')
        );
      }
    } catch {
      setIsAiResult(false);
    } finally {
      setAiSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsAiResult(false);
    setAiSuggestion('');
    setAiResultIds([]);
    searchInputRef.current?.focus();
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setShowFilters(false);
    if (isAiResult) {
      setIsAiResult(false);
      setSearchQuery('');
      setAiSuggestion('');
      setAiResultIds([]);
    }
  };

  const selectedCategoryName = selectedCategory
    ? categoryNameById.get(selectedCategory) || t('shop.category.all', '全部')
    : t('shop.category.all', '全部');

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) return;

    addToCart({
      id: product.id,
      productId: product.id,
      name: t(`shop.product.${product.slug}.name`, product.name),
      price: product.price,
      salePrice: product.sale_price,
      image: product.images?.[0] || '',
      slug: product.slug,
    });

    setAddedProductName(t(`shop.product.${product.slug}.name`, product.name));
    if (addToastTimeoutRef.current) window.clearTimeout(addToastTimeoutRef.current);
    addToastTimeoutRef.current = window.setTimeout(() => setAddedProductName(''), 2400);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ scrollSnapType: 'none' }}>
      <SiteHeader />

      <main className="flex-1 bg-[#fbf6ee] pt-20 pb-20">
        <div className="border-b border-[#eadfd1] bg-[#f7f0e6]">
          <div className="container mx-auto px-6 py-14 md:py-20">
            <div className="mb-6 flex items-center gap-2 text-xs tracking-[0.1em] text-stone-400">
              <Link to="/" className="transition-colors hover:text-stone-600">
                {t('common.home', '首頁')}
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-stone-600">{t('shop.breadcrumb', '禮盒商城')}</span>
            </div>
            <p className="mb-4 text-[10px] font-medium tracking-[0.35em] text-amber-600/80 uppercase">
              {t('shop.hero.pretitle', 'Gift Collection')}
            </p>
            <h1 className="mb-5 text-4xl font-light tracking-[0.15em] text-stone-800 md:text-5xl">
              {t('shop.title', '禮盒商城')}
            </h1>
            <div className="mb-10 h-px w-10 bg-[#cfa87a]/50" />

            <div className="max-w-2xl">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleTextSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && isSupabaseAiEnabled && handleAISearch()}
                    placeholder={
                      isSupabaseAiEnabled
                        ? t('shop.search.placeholder.ai', '可輸入商品用途、預算或口味偏好')
                        : t('shop.search.placeholder', '搜尋商品、禮盒名稱或關鍵字')
                    }
                    className="w-full rounded-xl border border-[#d8c8b6] bg-[#fffaf2] py-3 pl-10 pr-10 text-sm text-stone-800 placeholder-stone-300 transition-all focus:border-[#a97a4f] focus:outline-none focus:ring-2 focus:ring-[#d8bda4]/40"
                  />
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 transition-colors hover:text-stone-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {isSupabaseAiEnabled && (
                  <button
                    onClick={handleAISearch}
                    disabled={!searchQuery.trim() || aiSearching}
                    className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-stone-800 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {aiSearching ? <Loader className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span className="hidden sm:inline">{t('shop.search.ai', 'AI 搜尋')}</span>
                  </button>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs tracking-[0.14em] text-stone-400">
                  {t('shop.quick.label', '快速找')}
                </span>
                {quickSearches.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleTextSearch(item.query)}
                    className="border border-[#d8c8b6] bg-[#fffaf2] px-3 py-1.5 text-xs text-stone-500 transition-all hover:border-[#cfa87a] hover:text-[#8e6448]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {isAiResult && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#e1c7b4] bg-[#f3e6d3] px-4 py-2.5 text-xs text-[#8e6448]">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span className="flex-1">
                    {aiSuggestion ||
                      t(
                        'shop.ai.summary',
                        `已找到 ${displayProducts.length} 項符合條件的商品`
                      )}
                  </span>
                  <button onClick={handleClearSearch} className="whitespace-nowrap underline hover:no-underline">
                    {t('common.clear', '清除')}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
              {shopPromises.map(({ icon: Icon, label, text }) => (
                <div key={label} className="flex items-center gap-3 border border-stone-200 bg-white px-4 py-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-stone-900 text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.12em] text-stone-800">{label}</p>
                    <p className="mt-0.5 text-xs text-stone-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => handleCategorySelect(null)}
                className={`flex-shrink-0 border px-4 py-1.5 text-xs font-medium tracking-[0.1em] transition-all duration-200 ${
                  selectedCategory === null && !isAiResult
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 text-stone-500 hover:border-stone-500 hover:text-stone-800'
                }`}
              >
                {t('shop.category.all', '全部')}
                <span
                  className={`ml-1.5 text-[10px] ${
                    selectedCategory === null && !isAiResult ? 'text-white/60' : 'text-stone-300'
                  }`}
                >
                  {countForCategory(null)}
                </span>
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`flex-shrink-0 border px-4 py-1.5 text-xs font-medium tracking-[0.1em] transition-all duration-200 ${
                    selectedCategory === category.id && !isAiResult
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 text-stone-500 hover:border-stone-500 hover:text-stone-800'
                  }`}
                >
                  {t(`shop.category.${category.slug}`, category.name)}
                  <span
                    className={`ml-1.5 text-[10px] ${
                      selectedCategory === category.id && !isAiResult ? 'text-white/60' : 'text-stone-300'
                    }`}
                  >
                    {countForCategory(category.id)}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-shrink-0 items-center gap-3">
              <span className="hidden text-xs text-stone-400 sm:block">
                {loading
                  ? t('shop.loading', '載入中')
                  : t('shop.resultCount', `${displayProducts.length} 項商品`)}
              </span>

              <div className="relative" ref={sortMenuRef}>
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-600 transition-colors hover:border-stone-400"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {sortOptions.find((option) => option.key === sortKey)?.label}
                  </span>
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[140px] overflow-hidden rounded-xl border border-stone-100 bg-white shadow-lg">
                    {sortOptions.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setSortKey(option.key);
                          setShowSortMenu(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-xs transition-colors ${
                          sortKey === option.key ? 'bg-stone-800 text-white' : 'text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs text-stone-600 transition-colors hover:border-stone-400 lg:hidden"
                aria-expanded={showFilters}
                aria-label={t('shop.filters.open', '開啟篩選')}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {(selectedCategory || searchQuery || isAiResult) && (
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-stone-400">{t('shop.filter.label', '目前篩選')}</span>
              <span className="border border-stone-200 bg-stone-50 px-3 py-1.5 text-stone-600">
                {isAiResult ? t('shop.filter.ai', 'AI 搜尋') : selectedCategoryName}
              </span>
              {searchQuery && (
                <span className="border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-700">
                  {searchQuery}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  handleClearSearch();
                  handleCategorySelect(null);
                }}
                className="text-stone-400 underline underline-offset-4 transition-colors hover:text-stone-700"
              >
                {t('shop.filter.clear', '清除條件')}
              </button>
            </div>
          )}

          {showFilters && (
            <div className="fixed inset-0 z-[60] lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-stone-950/45"
                onClick={() => setShowFilters(false)}
                aria-label={t('shop.filters.close', '關閉篩選')}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-white px-6 pb-6 pt-5 shadow-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium tracking-[0.3em] text-amber-700 uppercase">
                      {t('shop.filters.titleSmall', 'Filter')}
                    </p>
                    <h2 className="mt-1 text-lg font-medium text-stone-900">
                      {t('shop.filters.title', '商品篩選')}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="flex h-9 w-9 items-center justify-center border border-stone-200 text-stone-500"
                    aria-label={t('shop.filters.close', '關閉篩選')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategorySelect(null)}
                    className={`flex items-center justify-between border px-4 py-3 text-sm ${
                      selectedCategory === null && !isAiResult
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 text-stone-700'
                    }`}
                  >
                    <span>{t('shop.category.all', '全部')}</span>
                    <span className="text-xs opacity-60">{countForCategory(null)}</span>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className={`flex items-center justify-between border px-4 py-3 text-sm ${
                        selectedCategory === category.id && !isAiResult
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-200 text-stone-700'
                      }`}
                    >
                      <span>{t(`shop.category.${category.slug}`, category.name)}</span>
                      <span className="text-xs opacity-60">{countForCategory(category.id)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="py-28 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                <ShoppingBag className="h-7 w-7 text-stone-400" />
              </div>
              <p className="mb-2 text-sm text-stone-500">
                {searchQuery
                  ? t('shop.empty.search', `找不到符合「${searchQuery}」的商品`)
                  : t('shop.empty.title', '目前沒有可顯示的商品')}
              </p>
              {(searchQuery || selectedCategory) && (
                <button
                  onClick={() => {
                    handleClearSearch();
                    handleCategorySelect(null);
                  }}
                  className="mt-1 text-xs text-amber-600 underline hover:no-underline"
                >
                  {t('shop.empty.reset', '重新查看全部商品')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {displayProducts.map((product, index) => {
                const effectivePrice = product.sale_price ?? product.price;
                const discountPct = product.sale_price
                  ? Math.round((1 - product.sale_price / product.price) * 100)
                  : 0;
                const inStock = product.stock > 0;
                const translatedName = t(`shop.product.${product.slug}.name`, product.name);
                const translatedSummary = t(`shop.product.${product.slug}.summary`, product.summary || '');

                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border border-stone-100 bg-white transition-all duration-500 hover:-translate-y-1 hover:border-stone-200 hover:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.1)]"
                  >
                    <Link to={`/product/${product.slug}`} className="relative block overflow-hidden p-4 pb-0">
                      <div className="aspect-square overflow-hidden rounded-2xl bg-stone-50">
                        <ProductImage
                          src={product.images?.[0]}
                          alt={translatedName}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          loading={index < 4 ? 'eager' : 'lazy'}
                          decoding="async"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-x-4 top-4 aspect-square rounded-2xl bg-gradient-to-t from-stone-900/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <div className="absolute right-7 top-7 flex flex-col items-end gap-1.5">
                        {product.sale_price && (
                          <span className="bg-stone-900 px-2.5 py-1 text-[10px] font-medium tracking-[0.15em] text-white">
                            -{discountPct}%
                          </span>
                        )}
                        {isAiResult && (
                          <span className="flex items-center gap-1 bg-amber-500 px-2.5 py-1 text-[10px] font-medium tracking-[0.1em] text-white">
                            <Sparkles className="h-2.5 w-2.5" />
                            AI
                          </span>
                        )}
                      </div>
                      {!inStock && (
                        <span className="absolute left-7 top-7 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-medium tracking-[0.15em] text-stone-500 shadow-sm">
                          {t('shop.card.soldOut', 'SOLD OUT')}
                        </span>
                      )}
                    </Link>

                    <div className="border-t border-stone-100 p-5">
                      <Link to={`/product/${product.slug}`}>
                        <h3 className="mb-3 min-h-[2.75rem] text-sm font-medium tracking-wide text-stone-800 transition-colors line-clamp-2 leading-relaxed group-hover:text-amber-700">
                          {translatedName}
                        </h3>
                      </Link>

                      <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-stone-400">
                        {translatedSummary}
                      </p>

                      <div className="mb-5 flex items-baseline gap-2">
                        {product.sale_price ? (
                          <>
                            <span className="text-base font-semibold tracking-wide text-stone-900">
                              NT$ {product.sale_price.toLocaleString()}
                            </span>
                            <span className="text-xs font-light text-stone-300 line-through">
                              NT$ {product.price.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-base font-semibold tracking-wide text-stone-900">
                            NT$ {product.price.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 border-t border-stone-50 pt-4">
                        <Link
                          to={`/product/${product.slug}`}
                          className="flex-1 border-r border-stone-100 py-2.5 text-center text-[11px] font-medium tracking-[0.15em] text-stone-500 transition-all uppercase hover:text-stone-800"
                        >
                          {t('shop.card.view', '查看詳情')}
                        </Link>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={!inStock}
                          className="group/btn flex flex-shrink-0 items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-medium tracking-[0.12em] text-stone-700 transition-all hover:bg-stone-900 hover:text-white disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent disabled:hover:text-stone-300"
                          title={t('shop.card.addTitle', `加入購物車，價格 NT$ ${effectivePrice.toLocaleString()}`)}
                          aria-label={t('shop.card.addLabel', `將 ${translatedName} 加入購物車`)}
                        >
                          <ShoppingBag className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                          <span className="hidden md:inline">{t('shop.card.add', '加入購物車')}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <div
        className={`fixed left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 border border-stone-200 bg-white px-4 py-3 shadow-[0_18px_50px_rgba(41,37,36,0.18)] transition-all duration-300 ${
          addedProductName ? 'bottom-6 opacity-100' : 'bottom-0 pointer-events-none opacity-0'
        }`}
        role="status"
        aria-live="polite"
      >
        <span className="flex h-8 w-8 items-center justify-center bg-green-50 text-green-600">
          <Check className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-900">
            {t('shop.toast.title', '已加入購物車')}
          </p>
          <p className="max-w-[240px] truncate text-xs text-stone-500">{addedProductName}</p>
        </div>
        <Link
          to="/cart"
          className="ml-2 border-l border-stone-100 pl-4 text-xs font-medium tracking-[0.12em] text-amber-700 transition-colors hover:text-stone-900"
        >
          {t('shop.toast.link', '前往購物車')}
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}
