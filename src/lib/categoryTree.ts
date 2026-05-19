export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  display_order?: number | null;
}

export interface CategoryLink {
  category_id: string | null;
}

const CATEGORY_SLUG_ORDER = new Map<string, number>([
  ['dlal-news', 10],
  ['dlal-all-brands', 20],
  ['dlal-shop-for-coffee', 30],
  ['dlal-subscription', 40],
  ['dlal-tools', 50],

  ['news-subscription-selection', 101],
  ['news-new-arrival', 102],
  ['news-hot-sales', 103],
  ['news-limited-edition', 104],
  ['news-limited-dlal', 105],
  ['news-limited-trsc-origami', 106],
  ['news-outlet-coffee-beans', 107],
  ['news-limited-yoshiaki-imamura', 108],

  ['brand-tea-at-all', 201],
  ['brand-about-us-coffee', 202],
  ['brand-cacaocat', 203],
  ['brand-glitch-coffee-roasters', 204],
  ['brand-liwei-coffee-stand', 205],
  ['brand-ituka-coffee', 206],
  ['brand-mame-polepole', 207],
  ['brand-lilo-coffee-roasters', 208],
  ['brand-okinawa-cerrado-coffee', 209],
  ['brand-wakamizu-brew', 210],
  ['brand-tokado-coffee', 211],
  ['brand-wakoya', 212],
  ['brand-weekenders-coffee', 213],
  ['brand-marumi-coffee', 214],
  ['brand-yoshiaki-imamura', 215],

  ['shop-featured-goods', 301],
  ['shop-limited', 302],
  ['shop-craftsmans-recipe', 303],
  ['shop-roast-degree', 304],
  ['roast-light', 305],
  ['roast-light-medium', 306],
  ['roast-medium', 307],
  ['roast-medium-dark', 308],
  ['roast-dark', 309],
  ['shop-processing-methods', 310],
  ['process-wet', 311],
  ['process-natural', 312],
  ['process-honey', 313],
  ['shop-flavor', 314],
  ['flavor-nutty', 315],
  ['flavor-floral', 316],
  ['flavor-fruity', 317],
  ['flavor-balanced', 318],
  ['flavor-spice-wine', 319],
  ['shop-drip-bag', 320],

  ['subscription-drip-bag', 401],
  ['subscription-beans-200g', 402],
  ['subscription-beans-400g', 403],
  ['subscription-plan-time', 404],
  ['subscription-3-months', 405],
  ['subscription-6-months', 406],
  ['subscription-12-months', 407],

  ['tools-coffee-tools', 501],
  ['tools-cups-plates', 502],
  ['tools-goods', 503],
]);

export function sortCategoriesForTree<T extends CategoryTreeItem>(categories: T[]) {
  const byParent = new Map<string, T[]>();
  const roots: T[] = [];

  for (const category of categories) {
    if (category.parent_id) {
      const siblings = byParent.get(category.parent_id) || [];
      siblings.push(category);
      byParent.set(category.parent_id, siblings);
    } else {
      roots.push(category);
    }
  }

  const sortItems = (items: T[]) => items.sort((a, b) => {
    const orderA = typeof a.display_order === 'number' ? a.display_order : CATEGORY_SLUG_ORDER.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.display_order === 'number' ? b.display_order : CATEGORY_SLUG_ORDER.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'zh-Hant');
  });
  const ordered: T[] = [];

  const visit = (category: T) => {
    ordered.push(category);
    for (const child of sortItems(byParent.get(category.id) || [])) visit(child);
  };

  for (const root of sortItems(roots)) visit(root);
  return ordered;
}

export function getCategoryDepth(category: CategoryTreeItem, categories: CategoryTreeItem[]) {
  const byId = new Map(categories.map(item => [item.id, item]));
  let depth = 0;
  let current = category;

  while (current.parent_id && byId.has(current.parent_id) && depth < 8) {
    depth += 1;
    current = byId.get(current.parent_id)!;
  }

  return depth;
}

export function getCategoryPath(category: CategoryTreeItem, categories: CategoryTreeItem[]) {
  const byId = new Map(categories.map(item => [item.id, item]));
  const path = [category.name];
  let current = category;

  while (current.parent_id && byId.has(current.parent_id) && path.length < 8) {
    current = byId.get(current.parent_id)!;
    path.unshift(current.name);
  }

  return path.join(' / ');
}

export function getCategoryOptionLabel(category: CategoryTreeItem, categories: CategoryTreeItem[]) {
  const depth = getCategoryDepth(category, categories);
  return `${'  '.repeat(depth)}${depth > 0 ? '- ' : ''}${category.name}`;
}

export function getDescendantCategoryIds(categories: CategoryTreeItem[], selectedId: string) {
  const ids = new Set([selectedId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parent_id && ids.has(category.parent_id) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }

  return ids;
}

export function getProductCategoryIds(product: { category_id?: string | null; product_category_links?: CategoryLink[] | null }) {
  const ids = new Set<string>();
  if (product.category_id) ids.add(product.category_id);

  for (const link of product.product_category_links || []) {
    if (link.category_id) ids.add(link.category_id);
  }

  return ids;
}

export function getBlogPostCategoryIds(post: { blog_post_category_links?: CategoryLink[] | null }) {
  const ids = new Set<string>();

  for (const link of post.blog_post_category_links || []) {
    if (link.category_id) ids.add(link.category_id);
  }

  return ids;
}
