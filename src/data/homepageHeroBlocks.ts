import { FALLBACK_PRODUCTS } from './fallbackProducts';

export const HOMEPAGE_HERO_BLOCKS_SETTING_KEY = 'homepage_hero_blocks';

export interface HomepageHeroProduct {
  id: string;
  name: string;
  slug: string;
  summary?: string;
  images?: string[];
  is_active?: boolean;
}

export interface HomepageHeroBlock {
  id: string;
  mode: 'product' | 'custom';
  product_id?: string;
  product_slug?: string;
  title?: string;
  image?: string;
  href?: string;
  is_active: boolean;
  sort_order: number;
}

export interface ResolvedHomepageHeroBlock {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  href: string;
  sort_order: number;
}

const HOMEPAGE_IMAGE_URL_MAP: Record<string, string> = {};

const normalizeHeroImage = (src?: string) => {
  const image = String(src || '').trim();
  return HOMEPAGE_IMAGE_URL_MAP[image] || image;
};

export const FALLBACK_HERO_PRODUCTS: HomepageHeroProduct[] = FALLBACK_PRODUCTS.map((product) => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  summary: product.summary,
  images: product.images,
  is_active: true,
}));

export function mergeHomepageHeroProducts(products: HomepageHeroProduct[] = []) {
  const bySlug = new Map(FALLBACK_HERO_PRODUCTS.map((product) => [product.slug, product]));

  for (const product of products) {
    if (!product?.slug || product.is_active === false) continue;
    const fallback = bySlug.get(product.slug);

    bySlug.set(product.slug, {
      ...fallback,
      ...product,
      images: product.images?.length ? product.images : fallback?.images || [],
      summary: product.summary || fallback?.summary || '',
    });
  }

  return Array.from(bySlug.values()).filter((product) => product.images?.length);
}

export function createDefaultHomepageHeroBlocks(products: HomepageHeroProduct[] = FALLBACK_HERO_PRODUCTS): HomepageHeroBlock[] {
  return products
    .filter((product) => product.images?.length)
    .slice(0, 5)
    .map((product, index) => ({
      id: `product-${product.slug}`,
      mode: 'product' as const,
      product_id: product.id,
      product_slug: product.slug,
      title: '',
      image: '',
      href: '',
      is_active: true,
      sort_order: index + 1,
    }));
}

export function normalizeHomepageHeroBlocks(value: unknown): HomepageHeroBlock[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const source = item as Partial<HomepageHeroBlock>;
      const productSlug = String(source.product_slug || '').trim();
      const productId = String(source.product_id || '').trim();
      const mode: HomepageHeroBlock['mode'] = source.mode === 'custom' || (!productSlug && !productId) ? 'custom' : 'product';

      return {
        id: String(source.id || `${mode}-${index + 1}`),
        mode,
        product_id: productId || undefined,
        product_slug: productSlug || undefined,
        title: String(source.title || '').trim(),
        image: normalizeHeroImage(source.image),
        href: String(source.href || '').trim(),
        is_active: source.is_active !== false,
        sort_order: Number(source.sort_order || index + 1),
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function resolveHomepageHeroBlock(
  block: HomepageHeroBlock,
  products: HomepageHeroProduct[]
): ResolvedHomepageHeroBlock | null {
  const product = products.find((item) => {
    if (block.product_id && item.id === block.product_id) return true;
    return Boolean(block.product_slug && item.slug === block.product_slug);
  });

  const title = block.mode === 'product'
    ? product?.name || block.title || ''
    : block.title || product?.name || '';
  const image = block.image || product?.images?.[0] || '';
  const href = block.href || (product?.slug ? `/product/${product.slug}` : '');

  if (!title || !image || !href) return null;

  return {
    id: block.id,
    title,
    subtitle: block.mode === 'product' ? '精選商品' : '自訂焦點',
    description: product?.summary || '',
    image,
    href,
    sort_order: block.sort_order,
  };
}
