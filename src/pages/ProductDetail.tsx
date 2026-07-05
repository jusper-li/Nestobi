import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  Minus,
  Package,
  Plus,
  Share2,
  Shield,
  ShoppingBag,
  Star,
  Truck,
  ZoomIn,
} from 'lucide-react';
import {
  isMissingSupabaseTableError,
  isSupabaseContentEnabled,
  isSupabaseNetworkError,
  isSupabaseTemporarilyOffline,
  markSupabaseTemporarilyOffline,
  supabase,
} from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMemberAuth } from '../contexts/MemberAuthContext';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import ProductImage from '../components/ProductImage';
import ProductImagePlaceholder from '../components/ProductImagePlaceholder';
import ProductPageCardRenderer from '../components/product-page/ProductPageCardRenderer';
import { useSEO } from '../hooks/useSEO';
import { breadcrumbSchema, productSchema } from '../utils/schemaMarkup';
import { FALLBACK_PRODUCTS } from '../data/fallbackProducts';
import { extractProductPageDocument, type ExtractedProductPageDocument } from '../lib/productPageCards';
import { normalizeLang } from '../lib/language';
import { shouldTranslateProductPage, translateHtmlContentWithT, translateProductPageDocumentWithT } from '../lib/productPageLiveTranslation';

interface Product {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  content: string;
  price: number;
  sale_price: number | null;
  member_price: number | null;
  images: string[];
  specifications: Array<{ name: string; value?: string; options?: string[] }>;
  stock: number;
  sku: string;
  category_id: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image: string | null;
  categories?: { name: string; slug: string };
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  images: string[];
  summary: string;
}

type FallbackProduct = (typeof FALLBACK_PRODUCTS)[number];

const FALLBACK_PRODUCT_BY_SLUG = new Map(FALLBACK_PRODUCTS.map((item) => [item.slug, item]));

const withRequestTimeout = <T,>(request: PromiseLike<T>, ms = 4500) =>
  Promise.race([
    request,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Request timed out')), ms);
    }),
  ]);

const toDetailProduct = (item: FallbackProduct): Product => ({
  ...item,
  seo_title: null,
  seo_description: null,
  seo_keywords: null,
  og_image: null,
});

const mergeDetailProductWithFallback = (item: Product, fallback?: FallbackProduct): Product => {
  if (!fallback) return item;
  return {
    ...toDetailProduct(fallback),
    id: item.id,
    images: fallback.images?.length ? fallback.images : item.images,
  };
};

const toRelatedProduct = (item: FallbackProduct): RelatedProduct => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  price: item.price,
  sale_price: item.sale_price,
  images: item.images,
  summary: item.summary,
});

const mergeRelatedProductWithFallback = (item: RelatedProduct): RelatedProduct => {
  const fallback = FALLBACK_PRODUCT_BY_SLUG.get(item.slug);
  if (!fallback) return item;
  return {
    ...item,
    images: fallback.images?.length ? fallback.images : item.images,
    summary: item.summary || fallback.summary,
  };
};

const isSeedPlaceholderImage = (src?: string | null) => !src || src.includes('images.pexels.com');

const hasPublishableImage = (item: RelatedProduct) => item.images?.some((src) => !isSeedPlaceholderImage(src)) ?? false;

function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  const prev = () => setSelected((current) => Math.max(0, current - 1));
  const next = () => setSelected((current) => Math.min(images.length - 1, current + 1));

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    setZoomPos({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    setTouchStartX(event.touches[0].clientX);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    }
    setTouchStartX(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={imgRef}
        className="relative aspect-square overflow-hidden rounded-2xl border border-[#eadfd1] bg-[#f7efe5] select-none cursor-zoom-in"
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {images.length > 0 ? (
          <ProductImage
            src={images[selected]}
            alt={t('product.detail.imageAlt', `${name} - 圖片 ${selected + 1}`)}
            className="h-full w-full object-contain p-6 transition-transform duration-200"
            style={
              zoomed
                ? {
                    transform: 'scale(1.9)',
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  }
                : {}
            }
            draggable={false}
            loading="eager"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        ) : (
          <ProductImagePlaceholder name={name} />
        )}

        {zoomed && images.length > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#fffaf2]/90 p-1.5">
            <ZoomIn className="h-4 w-4 text-stone-500" />
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={selected === 0}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffaf2]/90 shadow-md backdrop-blur-sm transition-all hover:bg-white disabled:opacity-20"
            >
              <ChevronLeft className="h-4 w-4 text-stone-700" />
            </button>
            <button
              onClick={next}
              disabled={selected === images.length - 1}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#fffaf2]/90 shadow-md backdrop-blur-sm transition-all hover:bg-white disabled:opacity-20"
            >
              <ChevronRight className="h-4 w-4 text-stone-700" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelected(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === selected ? 'w-5 bg-[#cfa87a]' : 'w-1.5 bg-stone-300'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.slice(0, 5).map((image, index) => (
            <button
              key={index}
              onClick={() => setSelected(index)}
              className={`aspect-square overflow-hidden rounded-xl border-2 bg-[#f7efe5] transition-all ${
                selected === index
                  ? 'border-[#cfa87a] shadow-md scale-[1.03]'
                  : 'border-[#eadfd1] opacity-70 hover:border-[#c7a08d] hover:opacity-100'
              }`}
            >
              <ProductImage
                src={image}
                alt={t('product.detail.thumbnailAlt', `${name} ${index + 1}`)}
                compactPlaceholder
                className="h-full w-full object-contain p-1.5"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatedProductCard({ product }: { product: RelatedProduct }) {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const translatedName = t(`product.related.${product.slug}.name`, product.name);
  const displayPrice = product.sale_price ?? product.price;

  return (
    <article className="group">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="mb-3 overflow-hidden rounded-2xl border border-[#eadfd1] bg-[#f7efe5] transition-all group-hover:border-[#d8bda4] group-hover:shadow-lg aspect-square">
          <ProductImage
            src={product.images?.[0]}
            alt={translatedName}
            compactPlaceholder
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            sizes="(max-width: 768px) 46vw, 220px"
          />
        </div>
        <h3 className="mb-1.5 text-sm font-medium leading-snug text-stone-800 transition-colors line-clamp-2 group-hover:text-[#8e6448]">
          {translatedName}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-800">NT$ {displayPrice.toLocaleString()}</span>
          {product.sale_price && (
            <span className="text-xs text-stone-300 line-through">NT$ {product.price.toLocaleString()}</span>
          )}
        </div>
      </Link>
      <button
        onClick={() =>
          addToCart(
            {
              id: product.id,
              productId: product.id,
              name: translatedName,
              price: product.price,
              salePrice: product.sale_price,
              image: product.images?.[0] || '',
              slug: product.slug,
            },
            1
          )
        }
        className="mt-3 w-full rounded-xl border border-[#d8c8b6] py-2.5 text-xs font-medium text-stone-600 transition-all hover:border-[#2b221d] hover:bg-[#2b221d] hover:text-[#fffaf2]"
      >
        {t('product.detail.related.add', '加入購物車')}
      </button>
    </article>
  );
}

function ProductInfoSections({
  product,
  productPage,
}: {
  product: Product;
  productPage: ExtractedProductPageDocument;
}) {
  const { t } = useLanguage();
  const shippingGroups = [
    {
      title: t('product.detail.shipping.payment', '付款方式'),
      items: [
        t('product.detail.shipping.paymentItem1', '信用卡線上刷卡、Apple Pay'),
        t('product.detail.shipping.paymentItem2', 'ATM 轉帳，請提供帳號後五碼方便對帳'),
      ],
    },
    {
      title: t('product.detail.shipping.delivery', '運送方式'),
      items: [
        t('product.detail.shipping.deliveryItem1', '7-11 取件：每件 NT$65'),
        t('product.detail.shipping.deliveryItem2', '常溫宅配：黑貓宅急便或中華郵政，每件 NT$100'),
      ],
    },
    {
      title: t('product.detail.shipping.arrival', '出貨與到貨'),
      items: [
        t('product.detail.shipping.arrivalItem1', '收到訂單後約 1-2 個工作天出貨'),
        t('product.detail.shipping.arrivalItem2', '7-11 取貨約 3-4 個工作天送達'),
        t('product.detail.shipping.arrivalItem3', '宅配到府約 1-3 個工作天送達'),
      ],
    },
    {
      title: t('product.detail.shipping.return', '退換貨提醒'),
      items: [
        t('product.detail.shipping.returnItem1', '商品到貨後享有 7 天猶豫期，猶豫期並非試用期'),
        t('product.detail.shipping.returnItem2', '食品基於衛生安全，已拆封商品恕無法辦理換貨'),
        t('product.detail.shipping.returnItem3', '商品瑕疵請於 7 天內聯繫我們協助處理'),
      ],
    },
  ];

  return (
    <div className="space-y-8 border-t border-[#eadfd1] pt-8">
      <section className="scroll-mt-28">
        <div className="mb-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-[#8e6448]">
            {t('product.detail.storyTag', 'Product Story')}
          </p>
          <h2 className="text-xl font-light tracking-[0.08em] text-stone-800">
            {t('product.detail.story', '商品故事')}
          </h2>
        </div>
        {productPage.document ? (
          <ProductPageCardRenderer document={productPage.document} />
        ) : (
          <div className="rounded-2xl border border-[#eadfd1] bg-[#fffaf2] p-5 md:p-6">
            {productPage.fallbackHtml ? (
              <div className="ym-product-content" dangerouslySetInnerHTML={{ __html: productPage.fallbackHtml }} />
            ) : product.description ? (
              <p className="whitespace-pre-line text-sm leading-8 text-stone-600">{product.description}</p>
            ) : (
              <p className="text-sm italic text-stone-400">{t('product.detail.storyEmpty', '尚未提供商品故事內容。')}</p>
            )}
          </div>
        )}
      </section>

      <section className="scroll-mt-28">
        <div className="mb-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-[#8e6448]">
            {t('product.detail.specTag', 'Specifications')}
          </p>
          <h2 className="text-xl font-light tracking-[0.08em] text-stone-800">
            {t('product.detail.spec', '規格資訊')}
          </h2>
        </div>
        {product.specifications && product.specifications.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-[#eadfd1]">
            {product.specifications.map((spec, index) => (
              <div
                key={index}
                className={`grid grid-cols-[35%_1fr] gap-4 px-4 py-3.5 text-sm ${
                  index % 2 === 0 ? 'bg-[#f7efe5]/80' : 'bg-[#fffaf2]'
                }`}
              >
                <span className="font-medium text-stone-500">
                  {t(`product.detail.specName.${spec.name}`, spec.name)}
                </span>
                <span className="leading-relaxed text-stone-700">
                  {Array.isArray(spec.options)
                    ? spec.options.map((option) => t(`product.detail.specOption.${option}`, option)).join('、')
                    : t(`product.detail.specValue.${spec.value || 'default'}`, spec.value || t('product.detail.specEmpty', '無'))
                  }
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-stone-400">{t('product.detail.specEmpty', '暫無規格資訊')}</p>
        )}
      </section>

      <section className="scroll-mt-28">
        <div className="mb-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.28em] text-[#8e6448]">
            {t('product.detail.serviceTag', 'Service')}
          </p>
          <h2 className="text-xl font-light tracking-[0.08em] text-stone-800">
            {t('product.detail.service', '配送與服務')}
          </h2>
        </div>
        <div className="space-y-5 rounded-2xl border border-[#eadfd1] bg-[#fffaf2] p-5 text-sm">
          {shippingGroups.map(({ title, items }) => (
            <div key={title}>
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-stone-700">{title}</h3>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-stone-500">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ProductDetail() {
  const { t, currentLanguage, translationRevision } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useMemberAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const productSectionRef = useRef<HTMLElement>(null);
  const extractedProductPage = useMemo(
    () => (product ? extractProductPageDocument(product.content) : { document: null, fallbackHtml: '' }),
    [product?.content],
  );
  const activeProductPage = useMemo(() => {
    const normalizedLanguage = normalizeLang(currentLanguage);
    if (!shouldTranslateProductPage(normalizedLanguage)) {
      return extractedProductPage;
    }

    const pageKeyPrefix = `product.detail.content.${product?.slug || slug || 'product'}`;
    if (extractedProductPage.document) {
      return {
        ...extractedProductPage,
        document: translateProductPageDocumentWithT(extractedProductPage.document, t, pageKeyPrefix),
      };
    }

    return {
      ...extractedProductPage,
      fallbackHtml: extractedProductPage.fallbackHtml
        ? translateHtmlContentWithT(extractedProductPage.fallbackHtml, t, pageKeyPrefix)
        : extractedProductPage.fallbackHtml,
    };
  }, [currentLanguage, extractedProductPage, product?.slug, slug, t, translationRevision]);

  const getEffectivePrice = useCallback(
    (item: Product) => {
      if (user && item.member_price) return item.member_price;
      return item.sale_price ?? item.price;
    },
    [user]
  );

  const getCartSalePrice = useCallback(
    (item: Product) => {
      const effectivePrice = getEffectivePrice(item);
      return effectivePrice < item.price ? effectivePrice : null;
    },
    [getEffectivePrice]
  );

  useSEO({
    title: product ? product.seo_title || t(`product.${product.slug}.name`, product.name) : undefined,
    description: product
      ? product.seo_description || t(`product.${product.slug}.summary`, product.summary || '') || undefined
      : undefined,
    keywords: product?.seo_keywords || undefined,
    ogImage: product ? product.og_image || product.images?.[0] || undefined : undefined,
    ogType: 'product',
    schema: product
      ? [
          productSchema({
            name: t(`product.${product.slug}.name`, product.name),
            description: t(`product.${product.slug}.summary`, product.summary || product.description || ''),
            images: product.images || [],
            sku: product.sku,
            price: product.price,
            salePrice: product.sale_price,
            stock: product.stock,
            slug: product.slug,
            category: product.categories?.name ? t(`product.category.${product.categories.slug}`, product.categories.name) : undefined,
          }),
          breadcrumbSchema([
            { name: t('common.home', '首頁'), url: window.location.origin },
            { name: t('shop.breadcrumb', '禮盒商城'), url: `${window.location.origin}/shop` },
            { name: t('product.detail.breadcrumb', t(`product.${product.slug}.name`, product.name)), url: window.location.href },
          ]),
        ]
      : undefined,
  });

  useEffect(() => {
    loadProduct();
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      if (productSectionRef.current) {
        const rect = productSectionRef.current.getBoundingClientRect();
        setShowStickyBar(rect.bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadProduct = async () => {
    setLoading(true);
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: 'auto' });
    const fallbackProduct = FALLBACK_PRODUCTS.find((item) => item.slug === slug);

    const useFallbackProduct = () => {
      if (!fallbackProduct) {
        setProduct(null);
        setRelated([]);
        navigate('/shop', { replace: true });
        return;
      }
      setProduct(toDetailProduct(fallbackProduct));
      setRelated(
        FALLBACK_PRODUCTS.filter((item) => item.category_id === fallbackProduct.category_id && item.id !== fallbackProduct.id).map(
          toRelatedProduct
        )
      );
    };

    if (!isSupabaseContentEnabled || isSupabaseTemporarilyOffline()) {
      useFallbackProduct();
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await withRequestTimeout(
        supabase.from('products').select('*, categories(name, slug)').eq('slug', slug).eq('is_active', true).maybeSingle()
      );

      if (error) throw error;
      if (!data) {
        useFallbackProduct();
        return;
      }

      setProduct(mergeDetailProductWithFallback(data, fallbackProduct));

      if (data?.category_id) {
        const { data: relatedData } = await withRequestTimeout(
          supabase
            .from('products')
            .select('id, name, slug, price, sale_price, images, summary')
            .eq('category_id', data.category_id)
            .eq('is_active', true)
            .neq('id', data.id)
            .limit(4)
        );

        setRelated((relatedData || []).map(mergeRelatedProductWithFallback).filter(hasPublishableImage));
      }
    } catch (err) {
      if (isSupabaseNetworkError(err)) {
        markSupabaseTemporarilyOffline();
      }
      if (!isMissingSupabaseTableError(err) && !isSupabaseNetworkError(err)) {
        console.error('Failed to load product:', err);
      }
      useFallbackProduct();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const cartSalePrice = getCartSalePrice(product);
    addToCart(
      {
        id: product.id,
        productId: product.id,
        name: t(`product.${product.slug}.name`, product.name),
        price: product.price,
        salePrice: cartSalePrice,
        image: product.images?.[0] || '',
        slug: product.slug,
      },
      quantity
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  }, [product, quantity, addToCart, getCartSalePrice, t]);

  const handleBuyNow = () => {
    if (!product) return;
    const cartSalePrice = getCartSalePrice(product);
    addToCart(
      {
        id: product.id,
        productId: product.id,
        name: t(`product.${product.slug}.name`, product.name),
        price: product.price,
        salePrice: cartSalePrice,
        image: product.images?.[0] || '',
        slug: product.slug,
      },
      quantity
    );
    navigate('/checkout');
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // ignore share failures
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
          <p className="text-xs tracking-[0.3em] text-stone-400 uppercase">
            {t('product.detail.loading', 'Loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="mb-4 text-xs tracking-[0.3em] text-stone-300 uppercase">404</p>
          <h1 className="mb-6 text-xl font-light text-stone-800">
            {t('product.detail.notFound', '找不到此商品')}
          </h1>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-xl bg-stone-800 px-6 py-3 text-sm text-white transition-colors hover:bg-stone-700"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('product.detail.backShop', '返回商城')}
          </Link>
        </div>
      </div>
    );
  }

  const translatedName = t(`product.${product.slug}.name`, product.name);
  const translatedSummary = t(`product.${product.slug}.summary`, product.summary || '');
  const displayPrice = getEffectivePrice(product);
  const hasDiscount = displayPrice < product.price;
  const discountPct = hasDiscount ? Math.round((1 - displayPrice / product.price) * 100) : 0;
  const savingsAmount = hasDiscount ? product.price - displayPrice : 0;
  const priceLabel = user && product.member_price
    ? t('product.detail.price.member', '會員價')
    : product.sale_price
      ? t('product.detail.price.sale', '優惠價')
      : t('product.detail.price.regular', '售價');
  const inStock = product.stock > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ scrollSnapType: 'none' }}>
      <SiteHeader />

      <main className="flex-1 bg-white pb-24 pt-20 lg:pb-20">
        <nav className="border-b border-stone-100 bg-stone-50">
          <div className="container mx-auto px-6 py-3.5">
            <ol className="flex flex-wrap items-center gap-2 text-xs tracking-[0.1em] text-stone-400">
              <li>
                <Link to="/" className="transition-colors hover:text-stone-600">
                  {t('common.home', '首頁')}
                </Link>
              </li>
              <li>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li>
                <Link to="/shop" className="transition-colors hover:text-stone-600">
                  {t('shop.breadcrumb', '禮盒商城')}
                </Link>
              </li>
              {product.categories && (
                <>
                  <li>
                    <ChevronRight className="h-3 w-3" />
                  </li>
                  <li>
                    <Link to="/shop" className="transition-colors hover:text-stone-600">
                      {t(`product.category.${product.categories.slug}`, product.categories.name)}
                    </Link>
                  </li>
                </>
              )}
              <li>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="line-clamp-1 max-w-[200px] text-stone-600">{translatedName}</li>
            </ol>
          </div>
        </nav>

        <section ref={productSectionRef} className="container mx-auto px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 xl:gap-20">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <ImageGallery images={product.images || []} name={translatedName} />
            </div>

            <div className="flex flex-col">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  {product.categories && (
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-amber-600">
                      {t(`product.category.${product.categories.slug}`, product.categories.name)}
                    </p>
                  )}
                  <h1 className="text-[24px] font-light leading-[1.36] tracking-normal text-stone-800 sm:text-[28px] lg:text-[32px]">
                    {translatedName}
                  </h1>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2 pt-1">
                  <button
                    onClick={() => setWishlisted((value) => !value)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                      wishlisted
                        ? 'border-red-200 bg-red-50 text-red-400'
                        : 'border-stone-200 text-stone-400 hover:border-red-200 hover:text-red-300'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${wishlisted ? 'fill-red-400' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition-all hover:border-stone-300 hover:text-stone-600"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {product.sku && (
                <p className="mb-4 text-xs tracking-[0.2em] text-stone-300">
                  SKU: {product.sku}
                </p>
              )}

              {translatedSummary && (
                <p className="mb-6 border-l-2 border-amber-300 pl-4 text-sm leading-relaxed italic text-stone-500">
                  {translatedSummary}
                </p>
              )}

              <div className="mb-6 rounded-2xl bg-stone-50 p-5">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-amber-700">
                  {priceLabel}
                </p>
                <div className="mb-1 flex items-end gap-3">
                  {hasDiscount ? (
                    <>
                      <span className="text-3xl font-semibold text-stone-900">NT$ {displayPrice.toLocaleString()}</span>
                      <span className="mb-0.5 text-lg font-light text-stone-300 line-through">
                        NT$ {product.price.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-semibold text-stone-900">NT$ {product.price.toLocaleString()}</span>
                  )}
                </div>
                {hasDiscount && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                      -{discountPct}%
                    </span>
                    <span className="text-xs font-medium text-red-500">
                      {t('product.detail.save', '省下')} NT$ {savingsAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                <p className="mt-2 text-xs text-stone-400">
                  {t('product.detail.taxNote', '含稅，購物車將自動套用目前可用價格')}
                </p>
              </div>

              {product.member_price && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <Star className="h-4 w-4 flex-shrink-0 text-amber-500" />
                  <div className="flex-1">
                    <p className="mb-0.5 text-xs text-amber-600">
                      {user ? t('product.detail.memberApplied', '您的會員優惠價') : t('product.detail.memberOnly', '會員專屬優惠')}
                    </p>
                    <p className="text-lg font-semibold text-amber-700">NT$ {product.member_price.toLocaleString()}</p>
                  </div>
                  {!user && (
                    <Link
                      to="/member/auth"
                      className="flex-shrink-0 rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-600 transition-colors hover:bg-amber-100"
                    >
                      {t('product.detail.loginForDeal', '登入享優惠')}
                    </Link>
                  )}
                  {user && (
                    <span className="flex-shrink-0 rounded-lg border border-amber-200 bg-white/70 px-3 py-1.5 text-xs text-amber-700">
                      {t('product.detail.applied', '已套用')}
                    </span>
                  )}
                </div>
              )}

              <div className="mb-6 flex items-center gap-2.5">
                <div className={`h-2 w-2 flex-shrink-0 rounded-full ${inStock ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={`text-sm ${inStock ? 'text-green-700' : 'text-red-500'}`}>
                  {inStock
                    ? t('product.detail.stock', `現貨充足（庫存 ${product.stock} 件）`)
                    : t('product.detail.outOfStock', '暫時缺貨')}
                </span>
              </div>

              <div className="mb-6" id="buy-now">
                <div className="mb-5 flex items-center gap-4">
                  <span className="text-sm font-medium text-stone-500">{t('product.detail.quantity', '數量')}</span>
                  <div className="flex items-center overflow-hidden rounded-xl border border-stone-200">
                    <button
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      disabled={quantity <= 1}
                      className="flex h-11 w-11 items-center justify-center text-stone-500 transition-colors hover:bg-stone-50 active:bg-stone-100 disabled:opacity-30"
                      aria-label={t('product.detail.decreaseQty', '減少數量')}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-12 select-none text-center text-base font-semibold tabular-nums text-stone-800">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((current) => Math.min(product.stock, current + 1))}
                      disabled={quantity >= product.stock}
                      className="flex h-11 w-11 items-center justify-center text-stone-500 transition-colors hover:bg-stone-50 active:bg-stone-100 disabled:opacity-30"
                      aria-label={t('product.detail.increaseQty', '增加數量')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {quantity > 1 && (
                    <p className="text-sm text-stone-400">
                      {t('product.detail.total', '合計')}{' '}
                      <span className="font-semibold text-stone-700">NT$ {(displayPrice * quantity).toLocaleString()}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold transition-all duration-200 ${
                      added
                        ? 'bg-green-600 text-white'
                        : inStock
                          ? 'border border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200 active:bg-stone-300'
                          : 'cursor-not-allowed bg-stone-100 text-stone-300'
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="h-4 w-4" />
                        {t('product.detail.added', '已加入購物車！')}
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" />
                        {t('product.detail.addToCart', '加入購物車')}
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={!inStock}
                    className="flex flex-1 items-center justify-center rounded-xl bg-stone-800 py-4 text-sm font-semibold text-white transition-all hover:bg-stone-700 active:bg-stone-900 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
                  >
                    {inStock ? t('product.detail.buyNow', '立即購買') : t('product.detail.soldOut', '缺貨中')}
                  </button>
                </div>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-2.5">
                {[
                  {
                    icon: Gift,
                    label: t('product.detail.badge.gift', '禮盒包裝'),
                    sub: t('product.detail.badge.giftSub', '節慶贈禮體面大方'),
                  },
                  {
                    icon: Truck,
                    label: t('product.detail.badge.delivery', '配送安心'),
                    sub: t('product.detail.badge.deliverySub', '全台配送與進度追蹤'),
                  },
                  {
                    icon: Shield,
                    label: t('product.detail.badge.quality', '品質把關'),
                    sub: t('product.detail.badge.qualitySub', '嚴選咖啡豆與烘焙'),
                  },
                  {
                    icon: Package,
                    label: t('product.detail.badge.package', '妥善包裝'),
                    sub: t('product.detail.badge.packageSub', '防破損專業打包'),
                  },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3.5">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-white shadow-sm">
                      <Icon className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-snug text-stone-700">{label}</p>
                      <p className="mt-0.5 text-[10px] leading-snug text-stone-400">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 lg:mt-14">
            <ProductInfoSections product={product} productPage={activeProductPage} />
          </div>
        </section>

        {related.length > 0 && (
          <section className="border-t border-stone-100 bg-stone-50/40 py-14">
            <div className="container mx-auto px-6">
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.3em] text-amber-600">
                    {t('product.detail.relatedTag', '同系列商品')}
                  </p>
                  <h2 className="text-2xl font-light text-stone-800">
                    {t('product.detail.relatedTitle', '您可能也喜歡')}
                  </h2>
                </div>
                <Link to="/shop" className="group flex items-center gap-1 text-xs text-stone-400 transition-colors hover:text-stone-700">
                  {t('product.detail.viewAll', '查看全部')}
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
                {related.map((item) => (
                  <RelatedProductCard key={item.id} product={item} />
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="fixed bottom-0 left-0 right-0 z-40 flex gap-3 border-t border-stone-100 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm lg:hidden">
          <div className="flex min-w-[84px] flex-shrink-0 flex-col justify-center">
            <span className="text-base font-semibold text-stone-900">NT$ {displayPrice.toLocaleString()}</span>
            {hasDiscount && <span className="text-xs text-stone-300 line-through">NT$ {product.price.toLocaleString()}</span>}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all ${
              added
                ? 'bg-green-600 text-white'
                : inStock
                  ? 'border border-stone-200 text-stone-700 hover:bg-stone-50'
                  : 'cursor-not-allowed border border-stone-100 text-stone-300'
            }`}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                {t('product.detail.addedShort', '已加入')}
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                {t('product.detail.addToCart', '加入購物車')}
              </>
            )}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!inStock}
            className="flex flex-1 items-center justify-center rounded-xl bg-stone-800 py-3.5 text-sm font-semibold text-white transition-all hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400"
          >
            {inStock ? t('product.detail.buyNow', '立即購買') : t('product.detail.soldOut', '缺貨中')}
          </button>
        </div>

        {showStickyBar && (
          <div className="fixed left-0 right-0 top-[72px] z-30 hidden border-b border-stone-100 bg-white/95 shadow-sm backdrop-blur-sm lg:block">
            <div className="container mx-auto flex items-center gap-6 px-6 py-3">
              {product.images?.[0] && (
                <ProductImage
                  src={product.images[0]}
                  alt={translatedName}
                  className="h-10 w-10 flex-shrink-0 rounded-lg border border-stone-100 bg-stone-50 p-1 object-contain"
                  sizes="40px"
                />
              )}
              <h2 className="flex-1 line-clamp-1 text-sm font-medium text-stone-800">{translatedName}</h2>
              <div className="flex flex-shrink-0 items-baseline gap-2">
                <span className="text-lg font-semibold text-stone-900">NT$ {displayPrice.toLocaleString()}</span>
                {product.sale_price && <span className="text-sm text-stone-300 line-through">NT$ {product.price.toLocaleString()}</span>}
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                    added
                      ? 'bg-green-600 text-white'
                      : inStock
                        ? 'border border-stone-200 text-stone-700 hover:bg-stone-100'
                        : 'border border-stone-100 text-stone-300'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      {t('product.detail.addedShort', '已加入')}
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {t('product.detail.addToCart', '加入購物車')}
                    </>
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!inStock}
                  className="rounded-lg bg-stone-800 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400"
                >
                  {t('product.detail.buyNow', '立即購買')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
