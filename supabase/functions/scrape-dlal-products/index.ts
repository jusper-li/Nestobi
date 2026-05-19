/* eslint-disable @typescript-eslint/no-explicit-any */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; NestobiImporter/1.0)",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
};

const DLAL_CATEGORIES: Record<string, { name: string; slug: string; priority: number }> = {
  "/categories/tools": { name: "DLAL 器具用品", slug: "dlal-tools", priority: 1 },
  "/categories/subscription": { name: "DLAL 咖啡定期便", slug: "dlal-subscription", priority: 2 },
  "/categories/shop-for-coffee": { name: "DLAL 選購咖啡", slug: "dlal-shop-for-coffee", priority: 3 },
  "/categories/news": { name: "DLAL 最新消息", slug: "dlal-news", priority: 4 },
  "/categories/all-brands": { name: "DLAL 所有品牌", slug: "dlal-all-brands", priority: 5 },
};

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function splitList(value = "") {
  return uniqueStrings(
    String(value)
      .split(/[、,，/／|｜]/)
      .map((item) => cleanText(item))
      .filter((item) => item && item !== "-" && item !== "- -"),
  );
}

function parseMoney(value: any) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  return Number(value.dollars || value.amount || value.cents || 0) || 0;
}

function extractMeta(html: string, name: string) {
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
  for (let i = start + needle.length; i < html.length; i += 1) {
    const ch = html[i];
    if (ch === "'" && slashCount % 2 === 0) break;
    raw += ch;
    slashCount = ch === "\\" ? slashCount + 1 : 0;
  }

  try {
    return JSON.parse(JSON.parse(`"${raw}"`));
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
      const graphItems = items.flatMap((item) => (Array.isArray(item?.["@graph"]) ? item["@graph"] : [item]));
      const product = graphItems.find((item) => item?.["@type"] === "Product");
      if (product) return product;
    } catch {
      // Ignore malformed JSON-LD.
    }
  }
  return null;
}

function parseProductLinks(html: string, baseUrl: string) {
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      try {
        const url = new URL(decodeHtml(match[1]), baseUrl);
        url.hash = "";
        return {
          url: url.toString(),
          title: cleanText(match[2].replace(/<[^>]+>/g, " ")),
        };
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

function parsePaginationLinks(html: string, baseUrl: string, categoryPath: string) {
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

async function fetchHtml(url: string) {
  const res = await fetch(url, { headers: REQUEST_HEADERS, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function collectProductLinks(startUrl: string, limit: number) {
  const start = new URL(startUrl);
  start.hash = "";
  const queue = [start.toString()];
  const seenPages = new Set<string>();
  const byUrl = new Map<string, { url: string; title: string }>();

  while (queue.length > 0 && seenPages.size < 6 && byUrl.size < limit) {
    const pageUrl = queue.shift();
    if (!pageUrl || seenPages.has(pageUrl)) continue;
    seenPages.add(pageUrl);

    const html = await fetchHtml(pageUrl);
    for (const product of parseProductLinks(html, pageUrl)) {
      if (byUrl.size >= limit) break;
      byUrl.set(product.url, product);
    }

    for (const nextPage of parsePaginationLinks(html, pageUrl, start.pathname)) {
      if (!seenPages.has(nextPage) && queue.length + seenPages.size < 6) queue.push(nextPage);
    }
  }

  return [...byUrl.values()];
}

function parseSummaryFields(summary: string) {
  const fields: Record<string, string> = {};
  const pattern = /【([^】]+)】\s*([^\n]+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(summary)) !== null) {
    fields[cleanText(match[1])] = cleanText(match[2]).replace(/^- -$/, "");
  }
  return fields;
}

function parseWeightGrams(name: string, fields: Record<string, string>) {
  const source = `${name} ${fields["重量"] || ""} ${fields["規格"] || ""} ${fields["配送量"] || ""}`;
  const kg = source.match(/(\d+(?:\.\d+)?)\s*kg/i)?.[1];
  if (kg) return Math.round(Number(kg) * 1000);
  const grams = source.match(/(\d+)\s*g/i)?.[1];
  if (grams) return Number(grams);
  const chineseGrams = source.match(/(\d+)\s*公克/)?.[1];
  if (chineseGrams) return Number(chineseGrams);
  return 0;
}

function buildDescription(name: string, fields: Record<string, string>, sourceUrl: string) {
  const rows = Object.entries(fields).filter(([, value]) => value && value !== "-" && value !== "- -");
  const items = rows
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</li>`)
    .join("");
  const host = new URL(sourceUrl).hostname;

  return [
    `<p>${escapeHtml(name)}</p>`,
    rows.length ? `<ul>${items}</ul>` : "<p>此商品由來源頁商品資料建立，保留原始商品網址供後台追蹤。</p>",
    `<p>商品資料整理自 ${escapeHtml(host)}，已轉為 Nestobi 商品欄位。</p>`,
  ].join("");
}

function offerPrices(jsonLd: any) {
  const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers : [jsonLd?.offers].filter(Boolean);
  return offers.map((offer) => Number(offer?.price || 0)).filter((price) => price > 0);
}

function variationPrices(product: any) {
  return (Array.isArray(product?.variations) ? product.variations : [])
    .map((variation) => parseMoney(variation?.price_sale) || parseMoney(variation?.price))
    .filter((price) => price > 0);
}

function inStockFromJsonLd(jsonLd: any): boolean | null {
  const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers : [jsonLd?.offers].filter(Boolean);
  const availability = offers.map((offer) => String(offer?.availability || "").toLowerCase()).join(" ");
  if (availability.includes("outofstock")) return false;
  if (availability.includes("instock")) return true;
  return null;
}

function stockQuantity(product: any, jsonLd: any) {
  const jsonLdInStock = inStockFromJsonLd(jsonLd);
  const soldOut = Boolean(product?.sold_out) || product?.status === "sold_out" || jsonLdInStock === false;
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

function normalizeImageUrl(value: unknown, baseUrl: string) {
  if (!value || typeof value !== "string") return "";
  try {
    return new URL(decodeHtml(value), baseUrl).toString();
  } catch {
    return "";
  }
}

function mediaUrl(media: any) {
  if (!media) return "";
  return [
    media?.images?.original?.url,
    media?.original_image_url,
    media?.detail_image_url,
    media?.default_image_url,
    media?.images?.large?.url,
  ].find(Boolean) || "";
}

function collectImages(product: any, jsonLd: any, html: string, baseUrl: string) {
  const productMedia = Array.isArray(product?.media) ? product.media.map(mediaUrl) : [];
  const coverMedia = Array.isArray(product?.cover_media_array) ? product.cover_media_array.map(mediaUrl) : [];
  const variationMedia = Array.isArray(product?.variations)
    ? product.variations.map((variation) => mediaUrl(variation?.media))
    : [];
  const jsonLdImages = Array.isArray(jsonLd?.image) ? jsonLd.image : [jsonLd?.image];
  const metaImages = [extractMeta(html, "og:image"), extractMeta(html, "twitter:image")];

  return uniqueStrings(
    [...productMedia, ...coverMedia, ...variationMedia, ...jsonLdImages, ...metaImages]
      .map((url) => normalizeImageUrl(url, baseUrl))
      .filter(Boolean),
  );
}

function fileExtFrom(contentType: string, imageUrl: string) {
  const fromType = contentType?.split(";")[0]?.split("/")[1]?.toLowerCase();
  if (fromType) return fromType === "jpeg" ? "jpg" : fromType.replace(/[^a-z0-9]/g, "") || "jpg";
  const ext = new URL(imageUrl).pathname.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "");
  return ext || "jpg";
}

async function uploadImage(
  serviceClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  imageUrl: string,
  productSlug: string,
  index: number,
) {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": REQUEST_HEADERS["User-Agent"] },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return imageUrl;

    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return imageUrl;

    const buffer = await res.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(imageUrl));
    const hashText = [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("").slice(0, 12);
    const ext = fileExtFrom(contentType, imageUrl);
    const path = `products/dlal-${productSlug}-${index + 1}-${hashText}.${ext}`;
    const { error } = await serviceClient.storage
      .from("site-assets")
      .upload(path, buffer, { contentType, cacheControl: "31536000", upsert: true });

    if (error) return imageUrl;
    return `${supabaseUrl}/storage/v1/object/public/site-assets/${path}`;
  } catch {
    return imageUrl;
  }
}

async function uploadProductImages(product: any, serviceClient: ReturnType<typeof createClient>, supabaseUrl: string) {
  const productSlug = new URL(product.source_url).pathname.split("/").pop()?.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "product";
  const uploaded = await Promise.all(
    product.images
      .filter((url: unknown) => typeof url === "string" && url.startsWith("http"))
      .slice(0, 8)
      .map((imageUrl: string, index: number) => uploadImage(serviceClient, supabaseUrl, imageUrl, productSlug, index)),
  );
  const images = uniqueStrings(uploaded);
  return {
    ...product,
    images,
    image_url: images[0] || product.image_url || "",
  };
}

function parseProduct(html: string, sourceUrl: string, category: { name: string; slug: string } | null, categoryId: string | null) {
  const product = extractShoplineAppValue(html, "product");
  const jsonLd = extractJsonLdProduct(html);
  if (!product && !jsonLd) return null;

  const name = cleanText(
    product?.title_translations?.["zh-hant"]
      || product?.title_translations?.en
      || jsonLd?.name
      || extractMeta(html, "og:title"),
  );
  if (!name) return null;

  const summary = String(
    product?.summary_translations?.["zh-hant"]
      || product?.summary_translations?.en
      || jsonLd?.description
      || extractMeta(html, "og:description")
      || "",
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
  const flavorNotes = splitList(fields["風味"] || "");
  const images = collectImages(product, jsonLd, html, sourceUrl);
  const tags = uniqueStrings([
    category?.name || "",
    name.includes("掛耳") || name.includes("濾掛") ? "掛耳包" : "",
    name.includes("定期便") ? "定期便" : "",
    name.includes("咖啡豆") || fields["烘焙度"] ? "咖啡豆" : "",
    name.includes("茶") ? "茶品" : "",
    name.includes("杯") || name.includes("濾杯") || name.includes("器") ? "器具用品" : "",
    ...flavorNotes.slice(0, 4),
  ]);

  return {
    category_id: categoryId,
    name,
    description: buildDescription(name, fields, sourceUrl),
    price,
    stock_quantity: stockQuantity(product, jsonLd),
    image_url: images[0] || "",
    images,
    sku: cleanText(product?.sku || product?._id || jsonLd?.sku || ""),
    origin: fields["產地"] || "",
    roast_level: fields["烘焙度"] || "",
    processing_method: fields["處理法"] || "",
    altitude: fields["標高"] || fields["海拔"] || "",
    variety: splitList(fields["豆種"] || ""),
    flavor_notes: flavorNotes,
    weight_grams: parseWeightGrams(name, fields),
    tags,
    source_url: sourceUrl,
    is_active: true,
  };
}

async function ensureCategory(
  serviceClient: ReturnType<typeof createClient>,
  category: { name: string; slug: string } | null,
) {
  if (!category) return null;
  const { data, error } = await serviceClient
    .from("categories")
    .upsert({ name: category.name, slug: category.slug, updated_at: new Date().toISOString() }, { onConflict: "slug" })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

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

    if (!callerAuth || !["vendor", "admin", "superadmin"].includes(callerAuth.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, limit } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inputUrl = new URL(url);
    if (inputUrl.hostname !== "www.dlalshop.com" && inputUrl.hostname !== "dlalshop.com") {
      return new Response(JSON.stringify({ error: "Only dlalshop.com URLs are supported" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    inputUrl.hash = "";

    const category = DLAL_CATEGORIES[inputUrl.pathname] || null;
    const categoryId = await ensureCategory(serviceClient, category);
    const maxProducts = Math.min(Number(limit) || 80, 100);
    const links = inputUrl.pathname.startsWith("/categories/")
      ? await collectProductLinks(inputUrl.toString(), maxProducts)
      : [{ url: inputUrl.toString(), title: "" }];

    const products = [];
    for (const link of links) {
      try {
        const html = await fetchHtml(link.url);
        const parsed = parseProduct(html, link.url, category, categoryId);
        if (!parsed) continue;
        products.push(await uploadProductImages(parsed, serviceClient, supabaseUrl));
      } catch {
        // Continue with the rest of the category when one product fails.
      }
    }

    return new Response(JSON.stringify({
      products,
      product_urls: links.map((link) => link.url),
      source_url: inputUrl.toString(),
      category,
      category_id: categoryId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
