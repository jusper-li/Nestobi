import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const CATEGORY_SOURCES = [
  {
    url: 'https://www.dlalshop.com/categories/tools',
    name: 'DLAL 器具用品',
    slug: 'dlal-tools',
    priority: 1,
  },
  {
    url: 'https://www.dlalshop.com/categories/subscription',
    name: 'DLAL 咖啡定期便',
    slug: 'dlal-subscription',
    priority: 2,
  },
  {
    url: 'https://www.dlalshop.com/categories/shop-for-coffee',
    name: 'DLAL 選購咖啡',
    slug: 'dlal-shop-for-coffee',
    priority: 3,
  },
  {
    url: 'https://www.dlalshop.com/categories/news',
    name: 'DLAL 最新消息',
    slug: 'dlal-news',
    priority: 4,
  },
  {
    url: 'https://www.dlalshop.com/categories/all-brands',
    name: 'DLAL 所有品牌',
    slug: 'dlal-all-brands',
    priority: 5,
  },
];

const REQUEST_HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; NestobiImporter/1.0)',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8',
};

const STORAGE_BUCKET = 'site-assets';
const STORAGE_FOLDER = 'products';
const MAX_IMAGES_PER_PRODUCT = 8;

function loadEnv() {
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitList(value = '') {
  return uniqueStrings(
    String(value)
      .split(/[、,，/／|｜]/)
      .map((item) => cleanText(item))
      .filter((item) => item && item !== '-' && item !== '- -'),
  );
}

function parseMoney(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  return Number(value.dollars || value.amount || value.cents || 0) || 0;
}

function extractMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return '';
}

function extractShoplineAppValue(html, name) {
  const needle = `app.value('${name}', JSON.parse('`;
  const start = html.indexOf(needle);
  if (start < 0) return null;

  let raw = '';
  let slashCount = 0;
  for (let i = start + needle.length; i < html.length; i += 1) {
    const ch = html[i];
    if (ch === "'" && slashCount % 2 === 0) break;
    raw += ch;
    slashCount = ch === '\\' ? slashCount + 1 : 0;
  }

  try {
    return JSON.parse(JSON.parse(`"${raw}"`));
  } catch {
    return null;
  }
}

function extractJsonLdProduct(html) {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const graphItems = items.flatMap((item) => (Array.isArray(item?.['@graph']) ? item['@graph'] : [item]));
      const product = graphItems.find((item) => item?.['@type'] === 'Product');
      if (product) return product;
    } catch {
      // Ignore malformed JSON-LD.
    }
  }
  return null;
}

function parseProductLinks(html, baseUrl) {
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      try {
        const url = new URL(decodeHtml(match[1]), baseUrl);
        url.hash = '';
        return {
          url: url.toString(),
          title: cleanText(match[2].replace(/<[^>]+>/g, ' ')),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((item) => item.url.includes('/products/') && !item.url.includes('%7B%7B') && !item.url.includes('{{'));

  const seen = new Set();
  return links.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function parsePaginationLinks(html, baseUrl, categoryPath) {
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .map((match) => {
      try {
        const url = new URL(decodeHtml(match[1]), baseUrl);
        url.hash = '';
        return url;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((url) => url.pathname === categoryPath && url.searchParams.has('page'))
    .map((url) => url.toString());

  return uniqueStrings(links);
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: REQUEST_HEADERS, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function collectProductLinks(source) {
  const start = new URL(source.url);
  start.hash = '';
  const queue = [start.toString()];
  const seenPages = new Set();
  const byUrl = new Map();

  while (queue.length > 0 && seenPages.size < 6) {
    const pageUrl = queue.shift();
    if (!pageUrl || seenPages.has(pageUrl)) continue;
    seenPages.add(pageUrl);

    const html = await fetchHtml(pageUrl);
    for (const product of parseProductLinks(html, pageUrl)) {
      byUrl.set(product.url, { ...product, source });
    }

    for (const nextPage of parsePaginationLinks(html, pageUrl, start.pathname)) {
      if (!seenPages.has(nextPage) && queue.length + seenPages.size < 6) queue.push(nextPage);
    }
  }

  return [...byUrl.values()];
}

function parseSummaryFields(summary) {
  const fields = {};
  const pattern = /【([^】]+)】\s*([^\n]+)/g;
  let match;
  while ((match = pattern.exec(summary)) !== null) {
    fields[cleanText(match[1])] = cleanText(match[2]).replace(/^- -$/, '');
  }
  return fields;
}

function parseWeightGrams(name, fields) {
  const source = `${name} ${fields['重量'] || ''} ${fields['規格'] || ''} ${fields['配送量'] || ''}`;
  const kg = source.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[1];
  if (kg) return Math.round(Number(kg) * 1000);
  const grams = source.match(/(\d+)\s*g/i)?.[1];
  if (grams) return Number(grams);
  const chineseGrams = source.match(/(\d+)\s*公克/)?.[1];
  if (chineseGrams) return Number(chineseGrams);
  return 0;
}

function buildDescription(name, fields, sourceUrl) {
  const rows = Object.entries(fields).filter(([, value]) => value && value !== '-' && value !== '- -');
  const items = rows
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</li>`)
    .join('');
  const host = new URL(sourceUrl).hostname;

  return [
    `<p>${escapeHtml(name)}</p>`,
    rows.length
      ? `<ul>${items}</ul>`
      : '<p>此商品由來源頁商品資料建立，保留原始商品網址供後台追蹤。</p>',
  ].join('');
}

function offerPrices(jsonLd) {
  const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers : [jsonLd?.offers].filter(Boolean);
  return offers.map((offer) => Number(offer?.price || 0)).filter((price) => price > 0);
}

function variationPrices(product) {
  return (Array.isArray(product?.variations) ? product.variations : [])
    .map((variation) => parseMoney(variation?.price_sale) || parseMoney(variation?.price))
    .filter((price) => price > 0);
}

function inStockFromJsonLd(jsonLd) {
  const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers : [jsonLd?.offers].filter(Boolean);
  const availability = offers.map((offer) => String(offer?.availability || '').toLowerCase()).join(' ');
  if (availability.includes('outofstock')) return false;
  if (availability.includes('instock')) return true;
  return null;
}

function stockQuantity(product, jsonLd) {
  const jsonLdInStock = inStockFromJsonLd(jsonLd);
  const soldOut = Boolean(product?.sold_out) || product?.status === 'sold_out' || jsonLdInStock === false;
  if (soldOut) return 0;

  const variationTotal = (Array.isArray(product?.variations) ? product.variations : [])
    .map((variation) => Number(variation?.quantity || 0))
    .filter((quantity) => quantity > 0)
    .reduce((sum, quantity) => sum + quantity, 0);
  if (variationTotal > 0) return variationTotal;

  const directQuantity = Number(product?.quantity || 0);
  if (directQuantity > 0) return directQuantity;

  const totalOrderable = Number(product?.total_orderable_quantity || 0);
  if (totalOrderable > 0) return totalOrderable;
  if (jsonLdInStock === true || product?.unlimited_quantity || totalOrderable < 0 || product?.out_of_stock_orderable) return 99;

  return 1;
}

function normalizeImageUrl(value, baseUrl) {
  if (!value || typeof value !== 'string') return '';
  try {
    return new URL(decodeHtml(value), baseUrl).toString();
  } catch {
    return '';
  }
}

function mediaUrl(media) {
  if (!media) return '';
  return [
    media?.images?.original?.url,
    media?.original_image_url,
    media?.detail_image_url,
    media?.default_image_url,
    media?.images?.large?.url,
  ].find(Boolean) || '';
}

function collectImages(product, jsonLd, html, baseUrl) {
  const productMedia = Array.isArray(product?.media) ? product.media.map(mediaUrl) : [];
  const coverMedia = Array.isArray(product?.cover_media_array) ? product.cover_media_array.map(mediaUrl) : [];
  const variationMedia = Array.isArray(product?.variations)
    ? product.variations.map((variation) => mediaUrl(variation?.media))
    : [];
  const jsonLdImages = Array.isArray(jsonLd?.image) ? jsonLd.image : [jsonLd?.image];
  const metaImages = [extractMeta(html, 'og:image'), extractMeta(html, 'twitter:image')];

  return uniqueStrings(
    [...productMedia, ...coverMedia, ...variationMedia, ...jsonLdImages, ...metaImages]
      .map((url) => normalizeImageUrl(url, baseUrl))
      .filter(Boolean),
  );
}

function parseProduct(html, sourceUrl, source, categoryId) {
  const product = extractShoplineAppValue(html, 'product');
  const jsonLd = extractJsonLdProduct(html);
  if (!product && !jsonLd) return null;

  const name = cleanText(
    product?.title_translations?.['zh-hant']
      || product?.title_translations?.en
      || jsonLd?.name
      || extractMeta(html, 'og:title'),
  );
  if (!name) return null;

  const summary = String(
    product?.summary_translations?.['zh-hant']
      || product?.summary_translations?.en
      || jsonLd?.description
      || extractMeta(html, 'og:description')
      || '',
  ).trim();
  const fields = parseSummaryFields(summary);
  const prices = [
    ...offerPrices(jsonLd),
    ...variationPrices(product),
    parseMoney(product?.price_sale),
    parseMoney(product?.price),
    parseMoney(product?.price_max),
  ].filter((price) => price > 0);
  const price = prices.length > 0 ? Math.min(...prices) : 0;
  const flavorNotes = splitList(fields['風味'] || '');
  const images = collectImages(product, jsonLd, html, sourceUrl);
  const tags = uniqueStrings([
    source.name,
    name.includes('掛耳') || name.includes('濾掛') ? '掛耳包' : '',
    name.includes('定期便') ? '定期便' : '',
    name.includes('咖啡豆') || fields['烘焙度'] ? '咖啡豆' : '',
    name.includes('茶') ? '茶品' : '',
    name.includes('杯') || name.includes('濾杯') || name.includes('器') ? '器具用品' : '',
    ...flavorNotes.slice(0, 4),
  ]);

  return {
    category_id: categoryId,
    name,
    description: buildDescription(name, fields, sourceUrl),
    price,
    stock_quantity: stockQuantity(product, jsonLd),
    image_url: images[0] || '',
    images,
    sku: cleanText(product?.sku || product?._id || jsonLd?.sku || ''),
    origin: fields['產地'] || '',
    roast_level: fields['烘焙度'] || '',
    processing_method: fields['處理法'] || '',
    altitude: fields['標高'] || fields['海拔'] || '',
    variety: splitList(fields['豆種'] || ''),
    flavor_notes: flavorNotes,
    weight_grams: parseWeightGrams(name, fields),
    tags,
    source_url: sourceUrl,
    is_active: true,
  };
}

function fileExtFrom(contentType, imageUrl) {
  const fromType = contentType?.split(';')[0]?.split('/')[1]?.toLowerCase();
  if (fromType) return fromType === 'jpeg' ? 'jpg' : fromType.replace(/[^a-z0-9]/g, '') || 'jpg';
  const ext = new URL(imageUrl).pathname.split('.').pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, '');
  return ext || 'jpg';
}

async function uploadImage(supabase, supabaseUrl, imageUrl, productSlug, index) {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'user-agent': REQUEST_HEADERS['user-agent'] },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return imageUrl;

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return imageUrl;

    const buffer = Buffer.from(await res.arrayBuffer());
    const hash = crypto.createHash('sha1').update(imageUrl).digest('hex').slice(0, 12);
    const ext = fileExtFrom(contentType, imageUrl);
    const path = `${STORAGE_FOLDER}/dlal-${productSlug}-${index + 1}-${hash}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType, cacheControl: '31536000', upsert: true });

    if (error) {
      console.warn(`  image upload failed: ${error.message}`);
      return imageUrl;
    }

    return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  } catch (error) {
    console.warn(`  image fetch failed: ${error.message}`);
    return imageUrl;
  }
}

async function uploadProductImages(supabase, supabaseUrl, product) {
  const productSlug = new URL(product.source_url).pathname.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'product';
  const uploaded = await Promise.all(
    product.images
      .filter((url) => typeof url === 'string' && url.startsWith('http'))
      .slice(0, MAX_IMAGES_PER_PRODUCT)
      .map((imageUrl, index) => uploadImage(supabase, supabaseUrl, imageUrl, productSlug, index)),
  );
  const images = uniqueStrings(uploaded);
  return {
    ...product,
    images,
    image_url: images[0] || product.image_url || '',
  };
}

async function ensureCategory(supabase, source) {
  const { data, error } = await supabase
    .from('categories')
    .upsert({ name: source.name, slug: source.slug, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
    .select('id,name,slug')
    .maybeSingle();

  if (error) throw new Error(`category ${source.slug}: ${error.message}`);
  return data.id;
}

async function upsertProduct(supabase, product, vendorId) {
  const payload = {
    ...product,
    vendor_id: vendorId,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: findError } = await supabase
    .from('products')
    .select('id')
    .eq('source_url', product.source_url)
    .maybeSingle();
  if (findError) throw new Error(`find product ${product.name}: ${findError.message}`);

  if (existing?.id) {
    const { error } = await supabase.from('products').update(payload).eq('id', existing.id);
    if (error) throw new Error(`update product ${product.name}: ${error.message}`);
    return 'updated';
  }

  const { error } = await supabase.from('products').insert(payload);
  if (error) throw new Error(`insert product ${product.name}: ${error.message}`);
  return 'inserted';
}

async function mapPool(items, limit, worker) {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  const email = process.env.NESTOBI_IMPORT_EMAIL;
  const password = process.env.NESTOBI_IMPORT_PASSWORD;

  if (!supabaseUrl || !supabaseKey) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required in .env');
  if (!email || !password) throw new Error('Set NESTOBI_IMPORT_EMAIL and NESTOBI_IMPORT_PASSWORD before running this script');

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) throw new Error(`login failed: ${loginError.message}`);

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id,name')
    .eq('name', '澄宜有限公司')
    .maybeSingle();
  if (vendorError) throw new Error(`vendor lookup failed: ${vendorError.message}`);
  if (!vendor) throw new Error('vendor 澄宜有限公司 not found');

  const categoryIds = new Map();
  for (const source of CATEGORY_SOURCES) {
    categoryIds.set(source.slug, await ensureCategory(supabase, source));
  }

  const discovered = new Map();
  for (const source of CATEGORY_SOURCES) {
    const links = await collectProductLinks(source);
    console.log(`${source.name}: ${links.length} products`);
    for (const link of links) {
      const current = discovered.get(link.url);
      if (!current || source.priority < current.source.priority) {
        discovered.set(link.url, { ...link, source });
      }
      if (current) {
        const sources = new Set([...(current.sources || []), current.source.name, source.name]);
        discovered.set(link.url, { ...discovered.get(link.url), sources: [...sources] });
      }
    }
  }

  const links = [...discovered.values()].sort((a, b) => a.source.priority - b.source.priority || a.url.localeCompare(b.url));
  console.log(`Unique products: ${links.length}`);

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  await mapPool(links, 4, async (link, index) => {
    try {
      const html = await fetchHtml(link.url);
      const categoryId = categoryIds.get(link.source.slug) || null;
      const parsed = parseProduct(html, link.url, link.source, categoryId);
      if (!parsed) throw new Error('no structured product data');

      const sourceTags = uniqueStrings([...(link.sources || []), link.source.name]);
      parsed.tags = uniqueStrings([...sourceTags, ...parsed.tags]).slice(0, 12);

      const product = await uploadProductImages(supabase, supabaseUrl, parsed);
      const action = await upsertProduct(supabase, product, vendor.id);
      if (action === 'inserted') inserted += 1;
      else updated += 1;

      console.log(`${index + 1}/${links.length} ${action}: ${product.name} (${product.images.length} images)`);
    } catch (error) {
      failed += 1;
      console.warn(`${index + 1}/${links.length} failed: ${link.url} - ${error.message}`);
    }
  });

  const { data: products } = await supabase
    .from('products')
    .select('id,category_id,images,source_url')
    .not('source_url', 'is', null);

  const imported = (products || []).filter((product) => String(product.source_url || '').includes('dlalshop.com'));
  const withImages = imported.filter((product) => Array.isArray(product.images) && product.images.length > 0);
  console.log(JSON.stringify({ inserted, updated, failed, imported: imported.length, withImages: withImages.length }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
