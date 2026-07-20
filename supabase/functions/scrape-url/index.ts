/* eslint-disable @typescript-eslint/no-explicit-any */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};
const secretCache = new Map<string, string>();

async function getSecret(name: string): Promise<string> {
  const envValue = Deno.env.get(name);
  if (envValue) return envValue;
  const cached = secretCache.get(name);
  if (cached) return cached;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error(`${name} is not configured`);

  const res = await fetch(
    `${supabaseUrl}/rest/v1/app_secrets?key=eq.${encodeURIComponent(name)}&select=value&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!res.ok) throw new Error(`${name} is not configured`);
  const rows = await res.json();
  const value = rows?.[0]?.value;
  if (!value) throw new Error(`${name} is not configured`);
  secretCache.set(name, value);
  return value;
}

function stripHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 20000);
}

function extractImages(html: string, baseUrl: string): string[] {
  const imgs: string[] = [];
  // Match meta hero images, lazy-loaded images, and srcset first URLs.
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi,
    /<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi,
    /<img[^>]+srcset=["']([^"'\s,]+)/gi,
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(html)) !== null) {
      let src: string;
      try {
        src = new URL(match[1], baseUrl).toString();
      } catch {
        continue;
      }
      const lower = src.toLowerCase();
      // Keep real content images, skip tracking pixels, icons, logos, avatars, and placeholders.
      if (
        src.startsWith("http") &&
        !lower.includes("facebook.com/tr") &&
        !lower.includes("icon") &&
        !lower.includes("logo") &&
        !lower.includes("avatar") &&
        !lower.includes("placeholder") &&
        !lower.includes("blank") &&
        !lower.includes("1x1") &&
        !imgs.includes(src)
      ) {
        imgs.push(src);
      }
    }
  }
  return imgs.slice(0, 40);
}

function parsePrice(value: string | undefined): number {
  if (!value) return 0;
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

function roomTypeFor(capacity: number, name: string): string {
  if (capacity >= 4 || /家庭|親子|四人/.test(name)) return "family";
  if (/套房|Villa|別墅/i.test(name)) return "suite";
  if (/豪華|景觀|超大/.test(name)) return "deluxe";
  if (/單人/.test(name)) return "single";
  return "double";
}

function extractFloor(roomNo: string, segment: string): string {
  if (/一樓|位於1樓|1F/i.test(segment)) return "1F";
  if (/二樓|位於2樓|2F/i.test(segment)) return "2F";
  if (/三樓|位於3樓|3F/i.test(segment)) return "3F";
  if (roomNo.startsWith("1")) return "1F";
  if (roomNo.startsWith("2")) return "2F";
  if (roomNo.startsWith("3")) return "3F";
  return "";
}

function extractLocation(text: string): string {
  const address = text.match(/地址\s*[｜|]\s*([^電話訂房LINE粉專]+)/)?.[1]?.trim();
  if (address) return address;
  return text.includes("宜蘭縣三星鄉") ? "宜蘭縣三星鄉" : "";
}

function extractAmenities(segment: string): string[] {
  const candidates = [
    "頂級眠豆腐床",
    "頂級眠豆腐芝麻床",
    "AH 實木柚木床架",
    "AVEDA 精油洗髮精、沐浴乳",
    "Dyson Supersonic 吹風機",
    "TOTO 暖氣浴室",
    "TOTO 免治馬桶",
    "TOTO 溫水溫座免治馬桶",
    "DAIKIN 冷暖空調",
    "4K HDR SmartTV SONY 電視",
    "泡澡浴缸",
    "高速 WiFi 上網",
    "寵物友善",
    "寶寶澡盆",
    "房費包含早餐",
  ];
  return candidates.filter((item) => {
    if (item === "Dyson Supersonic 吹風機") return /Dyson Supersonic/.test(segment);
    if (item === "AVEDA 精油洗髮精、沐浴乳") return /AVEDA|精油洗髮精/.test(segment);
    if (item === "TOTO 免治馬桶") return /TOTO 免治馬桶/.test(segment);
    if (item === "TOTO 溫水溫座免治馬桶") return /TOTO 溫水溫座免治馬桶/.test(segment);
    if (item === "DAIKIN 冷暖空調") return /DAIKIN|DAKIN/.test(segment);
    if (item === "4K HDR SmartTV SONY 電視") return /4K HDR|SONY 電視|SONY/.test(segment);
    if (item === "高速 WiFi 上網") return /WiFi|WIFI|高速/.test(segment);
    return segment.includes(item);
  });
}

function imagesForRoom(roomNo: string, images: string[]): string[] {
  const re = new RegExp(`(?:/|-)${roomNo}(?:[-_.\\/]|$)`);
  const matched = images.filter((image) => re.test(image));
  return matched.slice(0, 3);
}

function capacityFromSegment(name: string, segment: string): { min: number; max: number } {
  const explicitMax = segment.match(/合計\s*(\d+)\s*位/)?.[1];
  const base = /四人/.test(name + segment) ? 4 : /三人/.test(name + segment) ? 3 : /單人/.test(name + segment) ? 1 : 2;
  return {
    min: base,
    max: explicitMax ? Number(explicitMax) || base : base,
  };
}

function descriptionFromSegment(name: string, segment: string): string {
  const notes: string[] = [];
  if (/田園|山田|美景/.test(name)) notes.push("採光良好，窗景可欣賞田園與山景。");
  if (/泡澡|浴缸/.test(name + segment)) notes.push("房內配置泡澡浴缸與完整衛浴設備。");
  if (/和風/.test(name)) notes.push("一樓和風雙人房，適合兩人安靜入住。");
  if (/寵物友善/.test(segment)) notes.push("寵物友善。");
  return notes.length > 0 ? notes.join("") : `${name}，提供舒適床具、獨立衛浴與基本住宿備品。`;
}

function normalizeRoomName(name: string, segment: string): string {
  if (name.endsWith("房")) return name;
  if (/(單人|雙人|三人|四人)$/.test(name)) return `${name}房`;
  const roomKind = segment.match(/(單人房|雙人房|三人房|四人房|家庭房|套房)/)?.[1];
  return roomKind ? `${name}${roomKind}` : name;
}

function extractNumberedRooms(text: string, images: string[]): any[] {
  const headingRe = /(?:^|\s)((\d{3})\s+([^\s·。]{2,18}(?:房|單人|雙人|三人|四人|美景)?))\s+(?:[a-z][a-z\s]+?\.\s+)?(?=一樓|二樓|三樓|面向|獨立|雙人房|四人房|單人房|三人房|家庭房|套房)/gi;
  const matches = [...text.matchAll(headingRe)]
    .map((match) => ({
      start: (match.index || 0) + match[0].indexOf(match[1]),
      heading: match[1].trim(),
      roomNo: match[2],
      name: match[1].trim(),
    }))
    .filter((match, index, list) => list.findIndex((item) => item.roomNo === match.roomNo) === index)
    .sort((a, b) => a.start - b.start);

  if (matches.length === 0) return [];

  const breakfastStart = text.indexOf("小K私房早餐");
  const location = extractLocation(text);

  return matches.map((match, index) => {
    const nextStart = matches[index + 1]?.start ?? (breakfastStart > match.start ? breakfastStart : text.length);
    const segment = text.slice(match.start, nextStart);
    const name = normalizeRoomName(match.name, segment);
    const { min, max } = capacityFromSegment(match.name, segment);
    const weekday = parsePrice(segment.match(/平日\s*([\d,]+)\s*(?:元起|NTD)/)?.[1]);
    const weekend = parsePrice(segment.match(/假日\s*([\d,]+)\s*(?:元起|NTD)/)?.[1]);
    const roomImages = imagesForRoom(match.roomNo, images);

    return {
      name,
      description: descriptionFromSegment(name, segment),
      room_type: roomTypeFor(max, name),
      capacity: max,
      min_capacity: min,
      price_per_night: weekday,
      weekend_price: weekend,
      floor: extractFloor(match.roomNo, segment),
      location,
      image_url: roomImages[0] || "",
      images: roomImages,
      amenities: extractAmenities(segment),
    };
  });
}

/** Download an image URL and upload it to site-assets/rooms/ in Supabase storage. Returns the public URL on success, or the original URL on failure. */
async function uploadImgFromUrl(
  imageUrl: string,
  serviceClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  folder = "rooms",
): Promise<string> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NestobiBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return imageUrl;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return imageUrl;
    const buf = await res.arrayBuffer();
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const filename = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await serviceClient.storage
      .from("site-assets")
      .upload(filename, buf, { contentType, upsert: false });
    if (error) return imageUrl;
    const { data } = serviceClient.storage
      .from("site-assets")
      .getPublicUrl(filename);
    return data.publicUrl;
  } catch {
    return imageUrl;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function extractMeta(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

function extractShoplineAppValue(html: string, name: string): any | null {
  const needle = `app.value('${name}', JSON.parse('`;
  const start = html.indexOf(needle);
  if (start < 0) return null;

  let raw = "";
  let slashCount = 0;
  for (let i = start + needle.length; i < html.length; i++) {
    const ch = html[i];
    if (ch === "'" && slashCount % 2 === 0) break;
    raw += ch;
    slashCount = ch === "\\" ? slashCount + 1 : 0;
  }

  try {
    const jsonText = JSON.parse(`"${raw}"`);
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function extractJsonLdProduct(html: string): any | null {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const product = items.find((item) => item?.["@type"] === "Product");
      if (product) return product;
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return null;
}

const DLAL_CATEGORY_MAP: Record<string, { name: string; slug: string }> = {
  "/categories/all-brands": { name: "DLAL 所有品牌", slug: "dlal-all-brands" },
  "/categories/news": { name: "DLAL 最新消息", slug: "dlal-news" },
  "/categories/shop-for-coffee": { name: "DLAL 選購咖啡", slug: "dlal-shop-for-coffee" },
  "/categories/subscription": { name: "DLAL 咖啡定期便", slug: "dlal-subscription" },
  "/categories/tools": { name: "DLAL 器具用品", slug: "dlal-tools" },
};

function getDlalCategory(url: string): { name: string; slug: string } | null {
  try {
    const { pathname } = new URL(url);
    return DLAL_CATEGORY_MAP[pathname] || null;
  } catch {
    return null;
  }
}

async function ensureCategory(
  serviceClient: ReturnType<typeof createClient>,
  category: { name: string; slug: string } | null,
): Promise<string | null> {
  if (!category) return null;

  const { data, error } = await serviceClient
    .from("categories")
    .upsert({ name: category.name, slug: category.slug, updated_at: new Date().toISOString() }, { onConflict: "slug" })
    .select("id")
    .maybeSingle();

  if (error) return null;
  return data?.id || null;
}

function parseProductLinks(html: string, baseUrl: string): { url: string; title: string }[] {
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      try {
        const url = new URL(decodeHtml(match[1]), baseUrl);
        url.hash = "";
        const title = cleanText(match[2].replace(/<[^>]+>/g, " "));
        return { url: url.toString(), title };
      } catch {
        return null;
      }
    })
    .filter((item): item is { url: string; title: string } => Boolean(item))
    .filter((item) => item.url.includes("/products/") && !item.url.includes("%7B%7B") && !item.url.includes("{{"));

  const seen = new Set<string>();
  return links.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function parsePaginationLinks(html: string, baseUrl: string, categoryPath: string): string[] {
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .map((match) => {
      try {
        const url = new URL(decodeHtml(match[1]), baseUrl);
        url.hash = "";
        return url;
      } catch {
        return null;
      }
    })
    .filter((url): url is URL => Boolean(url))
    .filter((url) => url.pathname === categoryPath && url.searchParams.has("page"))
    .map((url) => url.toString());

  return uniqueStrings(links);
}

async function collectProductLinks(startUrl: string, limit = 60, maxPages = 4): Promise<{ url: string; title: string }[]> {
  const start = new URL(startUrl);
  start.hash = "";
  const queue = [start.toString()];
  const seenPages = new Set<string>();
  const byUrl = new Map<string, { url: string; title: string }>();

  while (queue.length > 0 && seenPages.size < maxPages && byUrl.size < limit) {
    const pageUrl = queue.shift()!;
    if (seenPages.has(pageUrl)) continue;
    seenPages.add(pageUrl);

    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NestobiBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) continue;

    const html = await res.text();
    for (const product of parseProductLinks(html, pageUrl)) {
      if (byUrl.size >= limit) break;
      byUrl.set(product.url, product);
    }

    for (const nextPage of parsePaginationLinks(html, pageUrl, start.pathname)) {
      if (!seenPages.has(nextPage) && queue.length + seenPages.size < maxPages) queue.push(nextPage);
    }
  }

  return [...byUrl.values()].slice(0, limit);
}

function parseSummaryFields(summary: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const pattern = /【([^】]+)】\s*([^\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(summary)) !== null) {
    fields[cleanText(match[1])] = cleanText(match[2]).replace(/^- -$/, "");
  }
  return fields;
}

function splitList(value: string): string[] {
  return uniqueStrings(
    value
      .split(/[、,，/／|｜]/)
      .map((item) => cleanText(item))
      .filter((item) => item && item !== "-" && item !== "- -"),
  );
}

function parseWeightGrams(name: string, fields: Record<string, string>): number {
  const source = `${name} ${fields["重量"] || ""} ${fields["規格"] || ""}`;
  const kg = source.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[1];
  if (kg) return Math.round(Number(kg) * 1000);
  const grams = source.match(/(\d+)\s*g/i)?.[1];
  if (grams) return Number(grams);
  return 0;
}

function buildProductDescription(name: string, summary: string, fields: Record<string, string>, sourceUrl: string): string {
  const rows = [
    ["烘焙度", fields["烘焙度"]],
    ["處理法", fields["處理法"]],
    ["產地", fields["產地"]],
    ["豆種", fields["豆種"]],
    ["標高", fields["標高"] || fields["海拔"]],
    ["風味", fields["風味"]],
    ["規格", fields["規格"] || fields["重量"]],
    ["最佳賞味期限", fields["最佳賞味期限"]],
  ].filter(([, value]) => value && value !== "-" && value !== "- -");

  if (rows.length === 0 && summary) {
    return `<p>${escapeHtml(summary).replace(/\n/g, "<br>")}</p>`;
  }

  const items = rows.map(([label, value]) => `<li><strong>${escapeHtml(label)}：</strong>${escapeHtml(value || "")}</li>`).join("");
  const host = (() => {
    try {
      return new URL(sourceUrl).hostname;
    } catch {
      return "";
    }
  })();

  return [
    `<p>${escapeHtml(name)}</p>`,
    items ? `<ul>${items}</ul>` : "",
  ].filter(Boolean).join("");
}

function productMediaUrl(media: any): string {
  if (!media) return "";
  return [
    media?.images?.original?.url,
    media?.original_image_url,
    media?.detail_image_url,
    media?.default_image_url,
    media?.images?.large?.url,
  ].find(Boolean) || "";
}

function collectProductImages(product: any, jsonLd: any, html: string, baseUrl: string): string[] {
  const fromMedia = Array.isArray(product?.media)
    ? product.media.map(productMediaUrl)
    : [];

  const fromCovers = Array.isArray(product?.cover_media_array)
    ? product.cover_media_array.map(productMediaUrl)
    : [];

  const fromJsonLd = Array.isArray(jsonLd?.image) ? jsonLd.image : [jsonLd?.image];
  const fromMeta = [extractMeta(html, "og:image"), extractMeta(html, "thumbnail")];
  const all = [...fromMedia, ...fromCovers, ...fromJsonLd, ...fromMeta]
    .filter((value): value is string => typeof value === "string" && Boolean(value))
    .map((value) => {
      try {
        return new URL(decodeHtml(value), baseUrl).toString();
      } catch {
        return "";
      }
    });

  return uniqueStrings(all).slice(0, 8);
}

function parseShoplineProduct(html: string, url: string, categoryId: string | null, category: { name: string; slug: string } | null): any | null {
  const appProduct = extractShoplineAppValue(html, "product");
  const jsonLd = extractJsonLdProduct(html);
  if (!appProduct && !jsonLd) return null;

  const name = cleanText(appProduct?.title_translations?.["zh-hant"] || appProduct?.title_translations?.en || jsonLd?.name || extractMeta(html, "og:title"));
  if (!name) return null;

  const summary = String(appProduct?.summary_translations?.["zh-hant"] || appProduct?.summary_translations?.en || extractMeta(html, "og:description") || jsonLd?.description || "").trim();
  const fields = parseSummaryFields(summary);
  const price = Number(appProduct?.price_sale?.dollars || appProduct?.price?.dollars || jsonLd?.offers?.price || 0);
  const quantity = Number(appProduct?.quantity ?? appProduct?.total_orderable_quantity ?? 0);
  const soldOut = Boolean(appProduct?.sold_out) || appProduct?.status === "sold_out" || String(jsonLd?.offers?.availability || "").toLowerCase().includes("outofstock");
  const images = collectProductImages(appProduct, jsonLd, html, url);
  const flavorNotes = splitList(fields["風味"] || "");
  const tags = uniqueStrings([
    category?.name || "",
    name.includes("掛耳") || name.includes("濾掛") ? "掛耳包" : "",
    name.includes("定期便") ? "定期便" : "",
    name.includes("咖啡豆") || fields["烘焙度"] ? "咖啡豆" : "",
    name.includes("茶") ? "茶品" : "",
    name.includes("杯") || name.includes("濾杯") || name.includes("器") ? "器具用品" : "",
    ...flavorNotes.slice(0, 3),
  ]);

  return {
    name,
    description: buildProductDescription(name, summary, fields, url),
    price,
    stock_quantity: soldOut ? 0 : Math.max(quantity, 1),
    image_url: images[0] || "",
    images,
    sku: cleanText(appProduct?.sku || appProduct?._id || jsonLd?.sku || ""),
    origin: fields["產地"] || "",
    roast_level: fields["烘焙度"] || "",
    processing_method: fields["處理法"] || "",
    altitude: fields["標高"] || fields["海拔"] || "",
    variety: splitList(fields["豆種"] || ""),
    flavor_notes: flavorNotes,
    weight_grams: parseWeightGrams(name, fields),
    tags,
    source_url: url,
    category_id: categoryId,
    category_name: category?.name || "",
    category_slug: category?.slug || "",
    is_active: true,
  };
}

async function uploadProductImages(product: any, serviceClient: ReturnType<typeof createClient>, supabaseUrl: string): Promise<any> {
  const rawImages = Array.isArray(product.images)
    ? product.images.filter((url: any) => typeof url === "string" && url.startsWith("http"))
    : [];
  if (product.image_url && typeof product.image_url === "string" && product.image_url.startsWith("http") && !rawImages.includes(product.image_url)) {
    rawImages.unshift(product.image_url);
  }

  const uploaded = await Promise.all(rawImages.slice(0, 6).map((imageUrl: string) => uploadImgFromUrl(imageUrl, serviceClient, supabaseUrl, "products")));
  const images = uniqueStrings(uploaded);
  return {
    ...product,
    images,
    image_url: images[0] || product.image_url || "",
  };
}

const ROOM_BULK_PROMPT = (text: string, images: string[]) => `
You are a data extraction assistant. Extract ALL distinct room types listed on this webpage.
Return ONLY a valid JSON object with this structure (no markdown, no extra text):
{
  "rooms": [
    {
      "name": string,
      "description": string,
      "room_type": "single"|"double"|"suite"|"deluxe"|"family",
      "capacity": number,
      "min_capacity": number,
      "price_per_night": number,
      "weekend_price": number,
      "floor": string,
      "location": string,
      "images": string[],
      "amenities": string[]
    }
  ]
}

Extraction rules:
- Extract EVERY distinct room type (e.g. 201雙人山景房, 202雙人浴缸房, 301四人房 etc.)
- If only one room is found, still return an array with one item
- capacity: maximum number of guests for this room
- min_capacity: minimum number of guests (often 2 for doubles), default same as capacity if unknown
- price_per_night: weekday (平日) price in NT$ numeric value
- weekend_price: weekend/holiday (假日/連假) price in NT$ numeric value, 0 if same as weekday or unknown
- floor: floor label like "1F", "2F", "3F", empty string if unknown
- location: city or address (use property address/city if per-room not specified)
- images: array of up to 3 most relevant image URLs for this specific room from the list below. Assign images that visually match each room's description. Return [] if none are clearly matching.
- amenities: list ALL amenities that apply to this room (combine property-wide and room-specific)
- Respond in Traditional Chinese for all text fields (name, description, amenities, etc.)

Available page images (assign the most relevant to each room):
${JSON.stringify(images)}

Webpage text:
${text}
`;

const ROOM_SINGLE_PROMPT = (text: string, images: string[]) => `
You are a data extraction assistant. Extract room/accommodation listing information from the following webpage text.
Return ONLY a valid JSON object (no markdown) with these fields:
{
  "name": string,
  "description": string,
  "room_type": "single"|"double"|"suite"|"deluxe"|"family",
  "capacity": number,
  "min_capacity": number,
  "price_per_night": number,
  "weekend_price": number,
  "floor": string,
  "location": string,
  "images": string[],
  "amenities": string[]
}

- capacity: max guests; min_capacity: min guests (default same as capacity)
- price_per_night: weekday price NT$; weekend_price: weekend/holiday price NT$ (0 if unknown)
- floor: e.g. "2F", empty string if unknown
- images: up to 3 most relevant image URLs from the list below, or []
- amenities: all applicable amenities in Traditional Chinese

Available page images: ${JSON.stringify(images)}

Webpage text:
${text}
`;

const HOTEL_PROMPT = (text: string, images: string[]) => `
You are a data extraction assistant. Extract hotel/accommodation property information from the following webpage text.
Return ONLY a valid JSON object with these fields (use null for missing values):
{
  "name": string,
  "description": string,
  "city": string,
  "address": string,
  "phone": string or null,
  "email": string or null,
  "star_rating": number (1-5),
  "image_url": string or null
}

Available images on page: ${JSON.stringify(images)}
Pick the most relevant image_url for the main hotel/property photo from available images, or null.
For star_rating: infer from context (民宿/B&B = 3, boutique hotel = 4, luxury = 5). Default to 3.
Respond in Traditional Chinese where appropriate for text fields.

Webpage text:
${text}
`;

const BLOG_PROMPT = (text: string, images: string[]) => `
You are a content extraction assistant. Extract blog article information from the following webpage text.
Return ONLY a valid JSON object (no markdown, no extra text) with these fields:
{
  "title": string,
  "excerpt": string,
  "content": string,
  "cover_image_url": string or null,
  "author_name": string,
  "tags": string[],
  "category": string,
  "meta_description": string,
  "published_date": string or null
}

Rules:
- title: the main article headline (in Traditional Chinese if the article is in Chinese)
- excerpt: 1-2 sentence summary of the article (in Traditional Chinese)
- content: the full article body formatted as clean semantic HTML using <h2>, <h3>, <p>, <ul>/<li>, <figure><img src="..." alt="..."></figure> tags. Preserve all meaningful content. Include inline images where relevant using the provided image list.
- cover_image_url: the most prominent/hero image from the available images list, or null
- author_name: the article author's name or display name
- tags: 3-6 relevant keyword tags in Traditional Chinese (e.g. ["東京", "咖啡廳", "銀座"])
- category: one of exactly these values: "咖啡旅行" | "旅遊指南" | "美食探索" | "住宿推薦" | "旅行日記" | "咖啡知識" | "旅遊美食"
- meta_description: 1-2 sentence SEO description (120-160 characters, Traditional Chinese)
- published_date: ISO 8601 date string if found (e.g. "2024-08-05"), or null

Available page images (use the most relevant ones in content and as cover_image_url):
${JSON.stringify(images)}

Webpage text:
${text}
`;

const PRODUCT_PROMPT = (text: string, images: string[]) => `
You are a data extraction assistant. Extract product listing information from the following webpage text.
Return ONLY a valid JSON object with these fields (use null for missing values):
{
  "name": string,
  "description": string,
  "price": number,
  "stock_quantity": number,
  "image_url": string or null,
  "images": string[],
  "sku": string or null,
  "origin": string,
  "roast_level": string,
  "processing_method": string,
  "altitude": string,
  "variety": string[],
  "flavor_notes": string[],
  "weight_grams": number,
  "tags": string[],
  "source_url": string
}

Available images on page: ${JSON.stringify(images)}
Pick the most relevant image_url for the main product photo and include up to 6 product images.
For price extract the numeric value in TWD (NT$). If USD, multiply by 30.
For stock_quantity use 1 if not mentioned.
For description, write clean Traditional Chinese HTML that summarizes the facts. Do not copy long copyrighted marketing text verbatim.
Respond in Traditional Chinese where appropriate for text fields.

Webpage text:
${text}
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await serviceClient.auth.getUser(jwt);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerAuth } = await serviceClient
      .from("tbl_user_auth")
      .select("role")
      .eq("user_id", caller.id)
      .maybeSingle();

    const allowedRoles = ["vendor", "admin", "superadmin"];
    if (!callerAuth || !allowedRoles.includes(callerAuth.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { url, type, bulk, limit } = body;

    if (!url || !type) {
      return new Response(JSON.stringify({ error: "url and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["room", "product", "hotel", "blog"];
    if (!validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: "type must be 'room', 'product', 'hotel', or 'blog'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the webpage
    let html: string;
    try {
      const pageRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NestobiBot/1.0)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);
      html = await pageRes.text();
    } catch (err) {
      return new Response(JSON.stringify({ error: `無法取得頁面：${err instanceof Error ? err.message : "網路錯誤"}` }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageText = stripHtml(html);
    const pageImages = extractImages(html, url);

    if (type === "product" && bulk) {
      const category = getDlalCategory(url);
      const categoryId = await ensureCategory(serviceClient, category);
      const productLinks = await collectProductLinks(url, Math.min(Number(limit) || 60, 80), 4);
      const links = productLinks.length > 0 ? productLinks : [{ url, title: "" }];
      const products: any[] = [];

      for (const link of links) {
        try {
          const productRes = await fetch(link.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; NestobiBot/1.0)",
              "Accept": "text/html,application/xhtml+xml",
              "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
            },
            signal: AbortSignal.timeout(15000),
          });
          if (!productRes.ok) continue;
          const productHtml = await productRes.text();
          const structured = parseShoplineProduct(productHtml, link.url, categoryId, category);
          if (!structured) continue;
          products.push(await uploadProductImages(structured, serviceClient, supabaseUrl));
        } catch {
          // Continue with the rest of the category when one product fails.
        }
      }

      return new Response(JSON.stringify({
        products,
        product_urls: links.map((link) => link.url),
        source_url: url,
        category,
        category_id: categoryId,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "product") {
      const category = getDlalCategory(url);
      const categoryId = await ensureCategory(serviceClient, category);
      const structured = parseShoplineProduct(html, url, categoryId, category);
      if (structured) {
        const result = await uploadProductImages(structured, serviceClient, supabaseUrl);
        return new Response(JSON.stringify({ result, source_url: url, images: result.images || pageImages }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const uploadRoomImages = async (room: any): Promise<any> => {
      const rawImages: string[] = Array.isArray(room.images)
        ? room.images.filter((u: any) => typeof u === "string" && u.startsWith("http"))
        : [];

      if (room.image_url && typeof room.image_url === "string" && !rawImages.includes(room.image_url)) {
        rawImages.push(room.image_url);
      }

      const toUpload = rawImages.slice(0, 3);
      const uploadedUrls = await Promise.all(
        toUpload.map((imgUrl) => uploadImgFromUrl(imgUrl, serviceClient, supabaseUrl))
      );

      return {
        ...room,
        images: uploadedUrls,
        image_url: uploadedUrls[0] || "",
      };
    };

    if (type === "room" && bulk) {
      const structuredRooms = extractNumberedRooms(pageText, pageImages);
      if (structuredRooms.length > 0) {
        const rooms = await Promise.all(structuredRooms.map(uploadRoomImages));
        return new Response(JSON.stringify({ rooms, source_url: url, images: pageImages }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let prompt: string;
    if (type === "room" && bulk) {
      prompt = ROOM_BULK_PROMPT(pageText, pageImages);
    } else if (type === "room") {
      prompt = ROOM_SINGLE_PROMPT(pageText, pageImages);
    } else if (type === "hotel") {
      prompt = HOTEL_PROMPT(pageText, pageImages);
    } else if (type === "blog") {
      prompt = BLOG_PROMPT(pageText, pageImages);
    } else {
      prompt = PRODUCT_PROMPT(pageText, pageImages);
    }

    // Call OpenAI
    const openaiKey = await getSecret("OPENAI_API_KEY");
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI 解析失敗：${err}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "AI 未回傳結果" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "AI 回傳格式錯誤" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload images to Supabase storage and replace URLs
    if (type === "room") {
      if (bulk) {
        const rawRooms: any[] = Array.isArray(parsed.rooms)
          ? parsed.rooms
          : Array.isArray(parsed.result?.rooms)
            ? parsed.result.rooms
            : parsed.result?.name
              ? [parsed.result]
              : parsed.name
                ? [parsed]
                : [];
        const rooms = await Promise.all(rawRooms.map(uploadRoomImages));
        return new Response(JSON.stringify({ rooms, source_url: url, images: pageImages }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const result = await uploadRoomImages(parsed);
        return new Response(JSON.stringify({ result, source_url: url, images: pageImages }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (type === "product") {
      const result = await uploadProductImages({
        ...parsed,
        source_url: parsed.source_url || url,
      }, serviceClient, supabaseUrl);
      return new Response(JSON.stringify({ result, source_url: url, images: result.images || pageImages }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "blog") {
      if (parsed.cover_image_url && typeof parsed.cover_image_url === "string") {
        parsed.cover_image_url = await uploadImgFromUrl(parsed.cover_image_url, serviceClient, supabaseUrl);
      }
    }

    return new Response(JSON.stringify({ result: parsed, source_url: url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
