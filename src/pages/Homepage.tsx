import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { isMissingSupabaseTableError, isSupabaseContentEnabled, supabase } from '../lib/supabase';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { useSEO } from '../hooks/useSEO';
import { useLanguage } from '../contexts/LanguageContext';
import { localBusinessSchema, organizationSchema, websiteSchema } from '../utils/schemaMarkup';
import { getOptimizedProductImage } from '../utils/optimizedImages';
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  HomepageSection,
  HomepageSectionContent,
  HomepageSubmenuItem,
} from '../data/homepageContent';
import {
  createDefaultHomepageHeroBlocks,
  HOMEPAGE_HERO_BLOCKS_SETTING_KEY,
  HomepageHeroBlock,
  HomepageHeroProduct,
  mergeHomepageHeroProducts,
  normalizeHomepageHeroBlocks,
  ResolvedHomepageHeroBlock,
  resolveHomepageHeroBlock,
} from '../data/homepageHeroBlocks';

interface HomepageSectionRow {
  section_type: string;
  title: string;
  content?: HomepageSectionContent;
}

interface HomepageProductRow {
  id: string;
  name: string;
  slug: string;
  summary?: string;
  images?: string[];
  is_active?: boolean;
}

interface SectionVisual {
  media: string;
  objectPosition: string;
  accent: string;
}

interface ProductStagePalette {
  background: string;
  panel: string;
  accent: string;
  stripe: string;
  ink: string;
}

const PRODUCT_STAGE_PALETTES: ProductStagePalette[] = [
  {
    background: '#fbf6ee',
    panel: '#d8bda4',
    accent: '#e8d2aa',
    stripe: '#cfa87a',
    ink: '#2b221d',
  },
  {
    background: '#f4ecdf',
    panel: '#caa384',
    accent: '#d8b19d',
    stripe: '#e4c992',
    ink: '#2b221d',
  },
  {
    background: '#fffaf2',
    panel: '#d7b4aa',
    accent: '#d9aeb8',
    stripe: '#efd4bf',
    ink: '#2b221d',
  },
  {
    background: '#f7f0e7',
    panel: '#c7a08d',
    accent: '#d9c5df',
    stripe: '#d7b06f',
    ink: '#2b221d',
  },
  {
    background: '#f5eadf',
    panel: '#c99a8c',
    accent: '#e7b5a5',
    stripe: '#ead1a1',
    ink: '#2b221d',
  },
];

const FALLBACK_VISUALS: Record<string, SectionVisual> = {
  hero: {
    media: '/product-images/reserved-for-you-huasitian-huo-limited-1.jpg',
    objectPosition: 'center center',
    accent: '#d7b4aa',
  },
  shop: {
    media: '/product-images/champion-coffee-chocolate-huo-gang-gift-box-1.jpg',
    objectPosition: 'center center',
    accent: '#caa384',
  },
  story: {
    media: '/product-images/the-one-and-only-huo-gang-drip-2.jpg',
    objectPosition: 'center center',
    accent: '#e8d2aa',
  },
  contact: {
    media: '/product-images/huo-gang-coffee-letter-gift-2.jpg',
    objectPosition: 'center center',
    accent: '#d9c5df',
  },
  default: {
    media: '/product-images/the-one-and-only-15-drip-canvas-set-1.jpg',
    objectPosition: 'center center',
    accent: '#d9aeb8',
  },
};

function StageImage({
  alt,
  eager = false,
  objectPosition,
  src,
}: {
  alt: string;
  eager?: boolean;
  objectPosition: string;
  src: string;
}) {
  const optimized = getOptimizedProductImage(src);
  const imagePriority = { fetchpriority: eager ? 'high' : 'low' } as {
    fetchpriority: 'high' | 'low';
  };

  return (
    <img
      {...imagePriority}
      src={optimized?.src || src}
      srcSet={optimized?.srcSet}
      sizes="100vw"
      alt={alt}
      className="h-full w-full max-w-none object-cover"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={{ objectPosition, minHeight: '100%', minWidth: '100%' }}
    />
  );
}

const getStagePalette = (index: number) =>
  PRODUCT_STAGE_PALETTES[index % PRODUCT_STAGE_PALETTES.length];

const hashText = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return String(hash >>> 0);
};

const DEFAULT_HERO_PRODUCTS = mergeHomepageHeroProducts();
const HERO_BLOCKS_CACHE_KEY = 'ym_homepage_hero_blocks_cache_v1';
const HERO_PRODUCTS_CACHE_KEY = 'ym_homepage_hero_products_cache_v1';
const DEFAULT_HERO_BLOCKS: HomepageHeroBlock[] = [
  {
    id: 'product-reserved-for-you-huasitian-huo-limited',
    mode: 'product',
    product_slug: 'reserved-for-you-huasitian-huo-limited',
    image: '/homepage-images/homepage-hero-01.jpg',
    href: '',
    title: '',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'product-reserved-for-you-zuo-wce-wu-limited',
    mode: 'product',
    product_slug: 'reserved-for-you-zuo-wce-wu-limited',
    image: '/homepage-images/homepage-hero-02.jpg',
    href: '',
    title: '',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'product-the-one-and-only-huo-gang-drip',
    mode: 'product',
    product_slug: 'the-one-and-only-huo-gang-drip',
    image: '/homepage-images/homepage-hero-03.jpg',
    href: '',
    title: '',
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'product-champion-coffee-chocolate-koyama-gift-box',
    mode: 'product',
    product_slug: 'champion-coffee-chocolate-koyama-gift-box',
    image: '/homepage-images/homepage-hero-04.jpg',
    href: '',
    title: '',
    is_active: true,
    sort_order: 4,
  },
  {
    id: 'product-the-one-and-only-15-drip-canvas-set',
    mode: 'product',
    product_slug: 'the-one-and-only-15-drip-canvas-set',
    image: '/homepage-images/homepage-hero-05.jpg',
    href: '',
    title: '',
    is_active: true,
    sort_order: 5,
  },
];

const withRequestTimeout = <T,>(request: PromiseLike<T>, ms = 2600) =>
  Promise.race([
    request,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Homepage request timed out')), ms);
    }),
  ]);

const isHomepageTimeoutError = (error: unknown) =>
  error instanceof Error && error.message === 'Homepage request timed out';

const getSectionTitle = (section?: HomepageSection) =>
  section?.content?.title || section?.title || '';

const getSectionSubmenu = (section?: HomepageSection): HomepageSubmenuItem[] =>
  section?.content?.submenu?.length ? section.content.submenu : section?.submenu || [];

const getSectionHref = (section?: HomepageSection) =>
  section?.content?.href || section?.content?.link || getSectionSubmenu(section)[0]?.href || '';

const getSectionVisual = (section?: HomepageSection, index = 0): SectionVisual => {
  const fallback = FALLBACK_VISUALS[section?.section_type || ''] || FALLBACK_VISUALS.default;

  return {
    ...fallback,
    media: section?.background_image || section?.content?.background_image || section?.content?.image || fallback.media,
    objectPosition: index % 2 === 0 ? fallback.objectPosition : 'center center',
  };
};

export default function Homepage() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState(0);
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set([0]));
  const [sections, setSections] = useState<HomepageSection[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const [heroBlocks, setHeroBlocks] = useState<HomepageHeroBlock[]>(() => {
    try {
      const raw = localStorage.getItem(HERO_BLOCKS_CACHE_KEY);
      if (!raw) return DEFAULT_HERO_BLOCKS;
      const parsed = JSON.parse(raw);
      const normalized = normalizeHomepageHeroBlocks(parsed);
      return normalized.length ? normalized : DEFAULT_HERO_BLOCKS;
    } catch {
      return DEFAULT_HERO_BLOCKS;
    }
  });
  const [heroProducts, setHeroProducts] = useState<HomepageHeroProduct[]>(() => {
    try {
      const raw = localStorage.getItem(HERO_PRODUCTS_CACHE_KEY);
      if (!raw) return DEFAULT_HERO_PRODUCTS;
      const parsed = JSON.parse(raw) as HomepageHeroProduct[];
      return parsed.length ? parsed : DEFAULT_HERO_PRODUCTS;
    } catch {
      return DEFAULT_HERO_PRODUCTS;
    }
  });
  const [loading, setLoading] = useState(false);
  const sectionsRef = useRef<(HTMLElement | HTMLDivElement | null)[]>([]);

  useSEO({
    title: 'Sonpin 精品咖啡禮盒',
    description: 'Sonpin 以精品咖啡、冠軍烘豆與精緻禮盒，打造適合收藏、贈禮與日常飲用的咖啡選物。',
    keywords: '精品咖啡,咖啡禮盒,you and me coffee,y and m coffee,Sonpin',
    noSuffix: true,
    schema: [organizationSchema(), localBusinessSchema(), websiteSchema()],
  });

  useSEO({
    title: t('homepage.seo.title', 'Sonpin 精品禮盒'),
    description: t('homepage.seo.description', 'Sonpin 以精品咖啡與禮盒設計，傳遞送禮與日常品飲的美好體驗。'),
    keywords: t('homepage.seo.keywords', '精品禮盒,精品咖啡,coffee gift box,you and me coffee,y and m coffee,Sonpin'),
    noSuffix: true,
  });

  useEffect(() => {
    let cancelled = false;
    loadHomepageData(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, []);

  const loadHomepageData = async (isCancelled: () => boolean) => {
    if (!isSupabaseContentEnabled || isCancelled()) {
      setLoading(false);
      return;
    }

    await Promise.allSettled([
      loadSections(isCancelled),
      loadHeroBlocks(isCancelled),
      loadHeroProducts(isCancelled),
    ]);
  };

  const loadSections = async (isCancelled: () => boolean) => {
    try {
      const { data, error } = await withRequestTimeout(
        supabase
          .from('homepage_sections')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      );

      if (error) throw error;
      if (isCancelled()) return;

      const transformedSections = ((data || []) as HomepageSectionRow[]).map((section) => ({
        id: section.section_type,
        label: section.content?.label || section.title,
        subtitle: section.content?.subtitle || '',
        title: section.content?.title || section.title,
        number: section.content?.number || '',
        submenu: section.content?.submenu || [],
        section_type: section.section_type,
        content: section.content || {},
        background_image: section.content?.background_image || section.content?.image || '',
        description: section.content?.description || '',
      }));

      setSections(transformedSections.length > 0 ? transformedSections : DEFAULT_HOMEPAGE_SECTIONS);
    } catch (error) {
      if (!isMissingSupabaseTableError(error) && !isHomepageTimeoutError(error)) {
        console.warn('Using fallback homepage sections:', error);
      }
      setSections(DEFAULT_HOMEPAGE_SECTIONS);
    }
  };

  const loadHeroBlocks = async (isCancelled: () => boolean) => {
    try {
      const { data, error } = await withRequestTimeout(
        supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', HOMEPAGE_HERO_BLOCKS_SETTING_KEY)
          .maybeSingle()
      );

      if (error) throw error;
      if (isCancelled()) return;
      const nextBlocks = normalizeHomepageHeroBlocks(data?.setting_value);
      setHeroBlocks(nextBlocks);
      localStorage.setItem(HERO_BLOCKS_CACHE_KEY, JSON.stringify(nextBlocks));
    } catch (error) {
      if (!isMissingSupabaseTableError(error) && !isHomepageTimeoutError(error)) {
        console.warn('Using fallback homepage hero blocks:', error);
      }
      setHeroBlocks((prev) => (prev.length ? prev : DEFAULT_HERO_BLOCKS));
    }
  };

  const loadHeroProducts = async (isCancelled: () => boolean) => {
    try {
      const { data, error } = await withRequestTimeout(
        supabase
          .from('products')
          .select('id,name,slug,summary,images,is_active')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      );

      if (error) throw error;
      if (isCancelled()) return;
      const nextProducts = mergeHomepageHeroProducts((data || []) as HomepageProductRow[]);
      setHeroProducts(nextProducts);
      localStorage.setItem(HERO_PRODUCTS_CACHE_KEY, JSON.stringify(nextProducts));
    } catch (error) {
      if (!isMissingSupabaseTableError(error) && !isHomepageTimeoutError(error)) {
        console.warn('Using fallback homepage hero products:', error);
      }
      setHeroProducts((prev) => (prev.length ? prev : DEFAULT_HERO_PRODUCTS));
    }
  };

  const stageSections = useMemo(() => {
    const products = heroProducts.length ? heroProducts : DEFAULT_HERO_PRODUCTS;
    const configuredBlocks = heroBlocks.length ? heroBlocks : createDefaultHomepageHeroBlocks(products);
    const resolvedBlocks = configuredBlocks
      .filter((block) => block.is_active !== false)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((block) => resolveHomepageHeroBlock(block, products))
      .filter((block): block is ResolvedHomepageHeroBlock => Boolean(block));

    if (resolvedBlocks.length > 0) {
      return resolvedBlocks.map((block, index): HomepageSection => ({
        id: block.id,
        label: block.subtitle,
        subtitle: block.subtitle,
        title: block.title,
        number: String(index + 1).padStart(2, '0'),
        section_type: 'hero_product',
        content: {
          label: block.subtitle,
          subtitle: block.subtitle,
          title: block.title,
          number: String(index + 1).padStart(2, '0'),
          description: block.description,
          background_image: block.image,
          image: block.image,
          href: block.href,
          cta_label: '前往商品',
          submenu: [{ label: 'View', title: '前往商品', href: block.href }],
        },
        background_image: block.image,
        description: block.description,
      }));
    }

    const displaySections = sections.length > 0 ? sections : DEFAULT_HOMEPAGE_SECTIONS;
    const heroSection = displaySections.find((section) => section.section_type === 'hero') || displaySections[0];
    const chapterSections = displaySections.filter((section) => section !== heroSection);
    return heroSection ? [heroSection, ...chapterSections] : displaySections;
  }, [heroBlocks, heroProducts, sections]);

  useEffect(() => {
    setActiveSection(0);
    setVisibleSections(new Set([0]));
    sectionsRef.current = [];
  }, [stageSections.length]);

  useEffect(() => {
    if (loading) return;

    const root = document.querySelector('.homepage-main');
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = sectionsRef.current.findIndex((ref) => ref === entry.target);
          if (entry.isIntersecting && index !== -1) {
            setActiveSection(index);
            setVisibleSections((prev) => new Set(prev).add(index));
          }
        });
      },
      { root, threshold: 0.38 }
    );

    const observedSections = [...sectionsRef.current];

    observedSections.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      observedSections.forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, [loading, stageSections.length]);

  useEffect(() => {
    if (loading) return;

    const mainElement = document.querySelector('.homepage-main') as HTMLElement | null;
    if (!mainElement) return;

    let frameId = 0;
    const syncActiveSection = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const sectionHeight = Math.max(mainElement.clientHeight || window.innerHeight, 1);
        const currentIndex = Math.min(
          stageSections.length - 1,
          Math.max(0, Math.round(mainElement.scrollTop / sectionHeight))
        );

        setActiveSection(currentIndex);
        setVisibleSections((prev) => {
          if (prev.has(currentIndex)) return prev;
          const next = new Set(prev);
          next.add(currentIndex);
          return next;
        });
      });
    };

    mainElement.addEventListener('scroll', syncActiveSection, { passive: true });
    window.addEventListener('resize', syncActiveSection);
    syncActiveSection();

    return () => {
      window.cancelAnimationFrame(frameId);
      mainElement.removeEventListener('scroll', syncActiveSection);
      window.removeEventListener('resize', syncActiveSection);
    };
  }, [loading, stageSections.length]);

  if (loading) {
    return (
      <div className="ym-home-loading relative flex h-screen items-center justify-center overflow-hidden text-[#2f261b]">
        <style>{`
          .ym-home-loading {
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(245, 232, 205, 0.82) 22%, rgba(214, 180, 116, 0.74) 48%, rgba(252, 239, 213, 0.9) 73%, rgba(188, 147, 72, 0.68) 100%),
              linear-gradient(180deg, #f7efe2 0%, #e4c98e 58%, #b9893f 100%);
          }
          .ym-home-loading::before {
            content: '';
            position: absolute;
            inset: -42%;
            background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.58) 49%, transparent 63%);
            opacity: 0.45;
            transform: translateX(-16%) rotate(8deg);
            animation: ymLoadingSheen 4.6s ease-in-out infinite;
          }
          .ym-home-loading::after {
            content: '';
            position: absolute;
            inset: 0;
            background:
              repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.07) 0 1px, transparent 1px 8px),
              linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(108, 78, 32, 0.12));
            mix-blend-mode: soft-light;
            pointer-events: none;
          }
          .ym-home-loading-panel {
            position: relative;
            z-index: 1;
          }
          .ym-home-loading p {
            color: rgba(59, 45, 28, 0.86);
            font-size: 13px;
            font-weight: 500;
            letter-spacing: 0.18em;
          }
          .ym-loading-ring {
            width: 34px;
            height: 34px;
            border-radius: 9999px;
            border: 1px solid rgba(81, 61, 32, 0.16);
            border-top-color: rgba(78, 53, 20, 0.8);
            border-right-color: rgba(255, 255, 255, 0.76);
            box-shadow:
              0 0 0 1px rgba(255, 255, 255, 0.22) inset,
              0 12px 34px rgba(112, 78, 30, 0.18);
            animation: ymLoadingSpin 1.05s linear infinite;
          }
          @keyframes ymLoadingSpin {
            to { transform: rotate(360deg); }
          }
          @keyframes ymLoadingSheen {
            0% { transform: translateX(-24%) rotate(8deg); opacity: 0.18; }
            45% { opacity: 0.5; }
            100% { transform: translateX(24%) rotate(8deg); opacity: 0.18; }
          }
          @media (prefers-reduced-motion: reduce) {
            .ym-home-loading::before,
            .ym-loading-ring {
              animation: none;
            }
          }
        `}</style>
        <div className="ym-home-loading-panel text-center">
          <div className="ym-loading-ring mx-auto mb-4" />
          <p className="text-sm">載入首頁商品</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ym-homepage overflow-x-hidden bg-[#fbf6ee] text-[#2b221d]">
      <style>{`
        .ym-homepage header {
          background: transparent !important;
          border-bottom-color: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .ym-homepage header img {
          filter: brightness(0) invert(1) drop-shadow(0 1px 8px rgba(0, 0, 0, 0.28)) !important;
        }
        .ym-homepage header nav a,
        .ym-homepage header nav button {
          color: #ffffff !important;
          filter: drop-shadow(0 1px 8px rgba(0, 0, 0, 0.32));
        }
        .homepage-main {
          height: 100vh;
          height: 100svh;
          height: 100dvh;
          overflow-y: auto;
          scroll-behavior: smooth;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          background: #fbf6ee;
        }
        .homepage-main section,
        .homepage-main > div {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
        .ym-stage {
          background: var(--ym-bg);
          color: var(--ym-ink);
          contain: layout paint style;
        }
        .ym-stage::before,
        .ym-stage::after {
          display: none;
        }
        .ym-stage-media {
          inset: 0;
          height: 100vh;
          height: 100svh;
          height: 100dvh;
          box-shadow: none;
        }
        .ym-stage-media::after {
          content: '';
          pointer-events: none;
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(49, 38, 31, 0.2) 0%, rgba(251, 246, 238, 0.04) 30%, color-mix(in srgb, var(--ym-panel) 18%, transparent) 58%, rgba(46, 34, 27, 0.5) 100%),
            radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--ym-accent) 20%, transparent), transparent 34%),
            radial-gradient(circle at 82% 72%, color-mix(in srgb, var(--ym-stripe) 16%, transparent), transparent 38%);
        }
        .ym-stage-media img {
          transform: none;
          transition: transform 1.35s cubic-bezier(0.16, 1, 0.3, 1), filter 1.35s cubic-bezier(0.16, 1, 0.3, 1);
          filter: saturate(0.96) contrast(1.02) sepia(0.06);
          backface-visibility: hidden;
          will-change: transform;
        }
        .ym-stage.is-active .ym-stage-media img {
          transform: scale(1);
          filter: saturate(0.98) contrast(1.03) sepia(0.05);
        }
        .ym-stage-panel {
          inset: 0;
          min-height: 100vh;
          min-height: 100svh;
          min-height: 100dvh;
          align-items: flex-end;
          background: transparent;
          box-shadow: none;
          pointer-events: none;
        }
        .ym-stage-copy {
          width: min(92vw, 760px);
          min-height: 30vh;
          justify-content: flex-end;
          padding-bottom: calc(4.8rem + env(safe-area-inset-bottom));
          color: #fffaf2;
          text-shadow: 0 2px 18px rgba(36, 27, 21, 0.48);
        }
        .ym-stage-title {
          color: #fffaf2 !important;
          font-family: "Noto Serif TC", "Songti TC", "Noto Serif CJK TC", Georgia, serif;
          font-size: clamp(1.08rem, 2.1vw, 2rem) !important;
          font-weight: 540 !important;
          line-height: 1.58 !important;
          letter-spacing: 0.08em;
          text-align: center;
          text-wrap: balance;
          word-break: break-word;
        }
        .ym-stage-title-link {
          pointer-events: auto;
          max-width: min(82vw, 720px) !important;
          will-change: opacity, transform, filter, letter-spacing;
        }
        .ym-stage-actions {
          margin-top: 20px !important;
          display: grid;
          width: min(78vw, 560px);
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: end;
          gap: 16px;
        }
        .ym-stage-cta,
        .ym-stage-side-label {
          will-change: opacity, transform, filter, letter-spacing;
        }
        .ym-stage-cta {
          pointer-events: auto;
          height: 34px !important;
          min-width: 108px !important;
          border-color: color-mix(in srgb, var(--ym-stripe) 82%, #fffaf2) !important;
          color: #fffaf2 !important;
          background: color-mix(in srgb, var(--ym-panel) 26%, transparent) !important;
          padding-inline: 16px !important;
          font-size: 11px !important;
          letter-spacing: 0.08em;
          text-shadow: 0 2px 14px rgba(36, 27, 21, 0.42);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--ym-accent) 18%, transparent) inset;
        }
        .ym-stage-cta:hover {
          background: color-mix(in srgb, var(--ym-stripe) 36%, rgba(255, 250, 242, 0.14)) !important;
          color: #fffaf2 !important;
        }
        .ym-stage-side-label {
          display: block;
          border-bottom: 1px solid color-mix(in srgb, var(--ym-stripe) 78%, #fffaf2);
          padding-bottom: 5px;
          color: #fffaf2;
          font-size: 9px;
          font-weight: 560;
          letter-spacing: 0.055em;
          line-height: 1;
          text-align: center;
          text-transform: lowercase;
          text-shadow: 0 2px 14px rgba(36, 27, 21, 0.46);
          white-space: nowrap;
        }
        .ym-stage.is-active .ym-stage-title-link {
          animation: ymBrandTitleIn 920ms cubic-bezier(0.18, 1, 0.22, 1) both;
        }
        .ym-stage.is-active .ym-stage-cta {
          animation: ymBrandButtonIn 760ms cubic-bezier(0.2, 1, 0.22, 1) 150ms both;
        }
        .ym-stage.is-active .ym-stage-side-label:first-child {
          animation: ymBrandLineLeftIn 780ms cubic-bezier(0.18, 1, 0.22, 1) 220ms both;
        }
        .ym-stage.is-active .ym-stage-side-label:last-child {
          animation: ymBrandLineRightIn 780ms cubic-bezier(0.18, 1, 0.22, 1) 220ms both;
        }
        @keyframes ymBrandTitleIn {
          0% {
            opacity: 0;
            transform: translate3d(0, 18px, 0);
            filter: blur(5px);
            letter-spacing: 0.16em;
          }
          58% {
            opacity: 1;
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
            letter-spacing: 0.08em;
          }
        }
        @keyframes ymBrandButtonIn {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0) scale(0.96);
            filter: blur(3px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes ymBrandLineLeftIn {
          0% {
            opacity: 0;
            transform: translate3d(-18px, 0, 0);
            filter: blur(3px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
          }
        }
        @keyframes ymBrandLineRightIn {
          0% {
            opacity: 0;
            transform: translate3d(18px, 0, 0);
            filter: blur(3px);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
          }
        }
        .ym-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ym-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .ym-stage-side-label {
          display: block;
        }
        @media (min-width: 768px) {
          .ym-homepage header nav {
            padding-top: 20px !important;
          }
          .ym-stage-copy {
            padding-bottom: clamp(3rem, 7vh, 5.8rem);
          }
        }
        @media (max-width: 767px) {
          .ym-homepage header {
            height: 132px;
            pointer-events: none;
          }
          .ym-homepage header nav {
            padding: 18px 20px 0 !important;
          }
          .ym-homepage header nav > div {
            align-items: flex-start !important;
          }
          .ym-homepage header nav > div > a:first-child {
            pointer-events: auto;
            position: fixed;
            left: 21px;
            top: 21px;
          }
          .ym-homepage header nav > div > a:first-child img {
            height: 48px !important;
            filter: brightness(0) invert(1) drop-shadow(0 1px 8px rgba(0, 0, 0, 0.28)) !important;
          }
          .ym-homepage header nav > div > div:last-child {
            pointer-events: none;
            position: fixed;
            right: 16px;
            top: 18px;
            gap: 10px;
          }
          .ym-homepage header nav > div > div:last-child > a:first-child {
            display: none !important;
          }
          .ym-homepage header nav > div > div:last-child > a,
          .ym-homepage header nav > div > div:last-child > button {
            pointer-events: auto;
            color: #ffffff !important;
            filter: drop-shadow(0 1px 8px rgba(0, 0, 0, 0.32));
          }
        .ym-homepage header nav > div > div:last-child > div {
          pointer-events: auto;
        }
        .ym-homepage header nav > div > div:last-child > div > button {
          pointer-events: auto;
        }
        .ym-homepage header nav .ym-language-menu,
        .ym-homepage header nav .ym-language-menu button {
          color: #2b221d !important;
          filter: none !important;
          text-shadow: none !important;
        }
        .ym-homepage header nav .ym-language-menu button:hover {
          color: #2b221d !important;
        }
        .ym-homepage header nav > div > div:last-child > button:last-child {
          position: fixed;
          left: 14px;
          top: 92px;
        }
          .ym-stage-panel {
            padding: 0 24px calc(1.5rem + env(safe-area-inset-bottom));
          }
          .ym-stage-copy {
            width: 100%;
            max-width: 100%;
            min-height: 32vh;
            justify-content: flex-end;
            padding-bottom: calc(116px + env(safe-area-inset-bottom));
            color: #fffaf2;
            text-shadow: 0 2px 16px rgba(36, 27, 21, 0.48);
          }
          .ym-stage {
            height: 100vh !important;
            height: 100svh !important;
            height: 100dvh !important;
            min-height: 100svh;
          }
          .floating-ai-chat-button.floating-ai-chat-home {
            right: 18px;
            bottom: calc(1.15rem + env(safe-area-inset-bottom));
          }
          .floating-ai-chat-minimized.floating-ai-chat-home,
          .floating-ai-chat-window.floating-ai-chat-home {
            right: 12px;
            bottom: calc(1rem + env(safe-area-inset-bottom));
          }
          .floating-ai-chat-window.floating-ai-chat-home {
            max-height: min(76dvh, 520px);
          }
          .ym-stage .ym-reveal {
            opacity: 1;
            transform: none;
          }
          .ym-stage-copy a {
            pointer-events: auto;
          }
          .ym-stage-title-link {
            max-width: min(76vw, 328px) !important;
          }
          .ym-stage-title {
            color: #fffaf2 !important;
            font-family: "Noto Serif TC", "Songti TC", "Noto Serif CJK TC", Georgia, serif;
            font-size: clamp(0.88rem, 3.65vw, 1.14rem) !important;
            font-weight: 520 !important;
            line-height: 1.58 !important;
            letter-spacing: 0.075em;
            text-align: center;
          }
          .ym-stage-actions {
            margin-top: 16px !important;
            width: 100%;
            grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
            gap: 12px;
          }
          .ym-stage-cta {
            height: 33px !important;
            min-width: 96px !important;
            padding-inline: 15px !important;
            font-size: 11px !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .homepage-main {
            scroll-behavior: auto;
          }
          .ym-stage-media img,
          .ym-reveal,
          .ym-stage-title-link,
          .ym-stage-cta,
          .ym-stage-side-label {
            transition: none;
            animation: none !important;
            transform: none;
            filter: none;
          }
        }
      `}</style>

      <SiteHeader />

      <main className="homepage-main">
        {stageSections.map((section, index) => {
          const visual = getSectionVisual(section, index);
          const palette = getStagePalette(index);
          const title = getSectionTitle(section) || 'Sonpin';
          const href = getSectionHref(section) || '/shop';
          const localizedTitle = t(`homepage:${section.id}:title:${hashText(title)}`, title);
          const localizedSubtitle = t(`homepage:${section.id}:subtitle:${hashText(section.subtitle || '')}`, section.subtitle || '');
          const localizedLabel = t(`homepage:${section.id}:label:${hashText(section.label || '')}`, section.label || '');
          const ctaLabel = section.content?.cta_label || (section.section_type === 'hero_product' ? '前往商品' : '閱讀更多');
          const localizedCtaLabel = t(`homepage:${section.id}:cta:${hashText(ctaLabel)}`, ctaLabel);
          const isVisible = visibleSections.has(index) || index === 0;
          const shouldLoadImage = index === 0 || visibleSections.has(index);
          const sectionStyle = {
            '--ym-bg': palette.background,
            '--ym-panel': palette.panel,
            '--ym-accent': palette.accent,
            '--ym-stripe': palette.stripe,
            '--ym-ink': palette.ink,
          } as CSSProperties;

          return (
            <section
              key={`${section.id}-${index}-${visual.media}`}
              ref={(el) => (sectionsRef.current[index] = el)}
              id={section.id}
              className={`ym-stage relative h-screen w-full overflow-hidden ${activeSection === index ? 'is-active' : ''}`}
              style={sectionStyle}
            >
              <Link
                to={href}
                className="ym-stage-media absolute inset-x-0 top-0 z-10 block overflow-hidden"
                aria-label={`前往 ${localizedTitle}`}
              >
                {shouldLoadImage ? (
                  <StageImage
                    key={visual.media}
                    src={visual.media}
                    alt={title}
                    objectPosition={visual.objectPosition}
                    eager={index === 0}
                  />
                ) : null}
              </Link>

              <div className="ym-stage-panel absolute inset-x-0 bottom-0 z-20 flex items-center justify-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-10 text-center sm:px-8 md:pb-12 md:pt-12">
                <div className={`ym-stage-copy ym-reveal is-visible mx-auto flex max-w-4xl flex-col items-center ${isVisible ? 'is-active-copy' : ''}`}>
                  <Link to={href} className="ym-stage-title-link group block max-w-[22rem] sm:max-w-2xl md:max-w-4xl">
                    <h1
                      className={`ym-stage-title font-serif text-xl font-semibold leading-relaxed text-[#211d1c] transition-transform duration-300 group-hover:-translate-y-0.5 sm:text-2xl md:text-4xl ${
                        index === 0 ? '' : 'md:text-3xl'
                      }`}
                    >
                      {localizedTitle}
                    </h1>
                  </Link>

                  <div className="ym-stage-actions mt-4 flex w-full items-center justify-center md:mt-5">
                    <span className="ym-stage-side-label" aria-hidden="true">{localizedLabel || 'y&m coffee'}</span>
                    <Link
                      to={href}
                      className="ym-stage-cta inline-flex h-8 min-w-[104px] items-center justify-center border border-[#211d1c] bg-transparent px-5 text-sm font-medium text-[#211d1c] transition-colors duration-300 hover:bg-[#211d1c] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#211d1c]/30"
                    >
                      {localizedCtaLabel}
                    </Link>
                    <span className="ym-stage-side-label" aria-hidden="true">{localizedSubtitle || 'you and me'}</span>
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        <div
          ref={(el) => (sectionsRef.current[stageSections.length] = el)}
          className="flex min-h-screen flex-col justify-end bg-white text-stone-900"
        >
          <SiteFooter />
        </div>
      </main>
    </div>
  );
}
