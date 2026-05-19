import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SALON_ID = '65ac03d7fd89780001938530';
const SALON_URL = `https://vocus.cc/salon/${SALON_ID}`;
const API_BASE = 'https://api.vocus.cc';
const AUTHOR_NAME = '咖啡旅行家・Hola I’m Ryoko';
const VENDOR_NAME = '澄宜有限公司';
const STORAGE_BUCKET = 'site-assets';
const STORAGE_FOLDER = 'blog';
const PAGE_SIZE = 50;

const REQUEST_HEADERS = {
  accept: 'application/json',
  origin: 'https://vocus.cc',
  referer: SALON_URL,
  'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
};

const COPY_REMOTE_COVERS = process.env.VOCUS_COPY_IMAGES === '1';
const COPY_FULL_HTML = process.env.VOCUS_COPY_FULL_HTML === '1';
const COPY_SOURCE_ABSTRACT = process.env.VOCUS_COPY_SOURCE_ABSTRACT === '1';
const DRY_RUN = process.env.DRY_RUN === '1';

function loadEnv() {
  const env = {};
  if (fs.existsSync('.env')) {
    for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
    }
  }
  return { ...env, ...process.env };
}

function requireEnv(env, key) {
  if (!env[key]) throw new Error(`Missing required environment variable: ${key}`);
  return env[key];
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: REQUEST_HEADERS });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GET ${url} failed: ${res.status} ${body.slice(0, 180)}`);
  }
  return res.json();
}

function cleanText(value) {
  return String(value ?? '')
    .replace(/[\u00a0\r]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function stripRoomTitle(title) {
  return cleanText(title).replace(/[【】]/g, '').trim();
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values
        .filter((value) => typeof value === 'string' || typeof value === 'number')
        .map(cleanText)
        .filter(Boolean),
    ),
  ];
}

function htmlEscape(value) {
  return cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlAttribute(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function sourceUrl(articleId) {
  return `https://vocus.cc/article/${articleId}`;
}

function slugFor(articleId) {
  return `vocus-${articleId}`;
}

function getArticle(content) {
  return content.article ?? content;
}

function getRooms(content) {
  const article = getArticle(content);
  return Array.isArray(article.rooms) ? article.rooms : [];
}

function getRoomNames(content) {
  return getRooms(content).map((room) => stripRoomTitle(room.title));
}

function getCoverUrl(content) {
  const article = getArticle(content);
  return (
    article.thumbnailUrl ||
    article.coverUrl ||
    article.imageUrl ||
    article.ogImageURL ||
    ''
  );
}

function mapCategory(content) {
  const title = cleanText(content.title);
  const tags = uniqueStrings([...(content.tags ?? []), ...(getArticle(content).tags ?? [])]).filter(
    (tag) => !/咖啡旅行家|Vocus/i.test(tag),
  );
  const rooms = getRoomNames(content);
  const roomText = rooms.join(' ');
  const text = [roomText, title, ...tags].join(' ');
  const foodPattern = /美食|伴手禮|甜點|和菓子|餅乾|麵|吐司|餐廳|菜單|牛|酒|拉麵|鬆餅|奶油|銅鑼燒/;

  if (/在宅咖啡/.test(roomText) || /手沖|耳掛|掛耳|浸泡式|咖啡豆|養豆|濾杯|磨豆|烘豆|器具|水溫/.test(text)) {
    return '咖啡知識';
  }
  if (/職人故事|職人|咖啡師|烘豆師|陶藝/.test(text)) {
    return '旅行日記';
  }
  if (/日本旅行|沖繩美好旅行/.test(roomText) && foodPattern.test(text)) {
    return '旅遊美食';
  }
  if (/咖啡旅行|咖啡廳|東京咖啡|大阪咖啡|京都咖啡|福岡咖啡|沖繩咖啡|日本咖啡/.test(text)) {
    return '咖啡旅行';
  }
  if (foodPattern.test(text)) {
    return '旅遊美食';
  }
  if (/沖繩|日本旅行|旅遊|旅行|夏威夷/.test(text)) {
    return '旅遊指南';
  }
  return '旅行日記';
}

function summarizeFromMetadata(content) {
  const title = cleanText(content.title);
  const topic = title.split(/[｜|]/)[0].trim() || title;
  const rooms = getRoomNames(content).slice(0, 2).join('、');
  const category = mapCategory(content);

  if (COPY_SOURCE_ABSTRACT) {
    const abstract = cleanText(getArticle(content).abstract);
    if (abstract) return abstract.slice(0, 420);
  }

  const roomText = rooms ? `，收錄於「${rooms}」` : '';
  return `咖啡誌索引：${topic}${roomText}。已補齊分類、關鍵字與原文來源，適合規劃日本咖啡、美食與旅行時快速查找。分類：${category}。`;
}

function renderContent(content, excerpt) {
  const articleId = content.contentId || getArticle(content)._id || content._id;
  const rooms = getRoomNames(content);
  const tags = uniqueStrings([...(content.tags ?? []), ...(getArticle(content).tags ?? [])]).slice(0, 16);
  const published = content.publishAt || getArticle(content).lastPublishAt || getArticle(content).createdAt;
  const source = sourceUrl(articleId);

  const roomList = rooms.length ? rooms.map((room) => `<li>${htmlEscape(room)}</li>`).join('') : '<li>咖啡誌</li>';
  const tagList = tags.length ? tags.map((tag) => `<li>${htmlEscape(tag)}</li>`).join('') : '<li>咖啡旅行家</li>';

  return [
    `<p>${htmlEscape(excerpt)}</p>`,
    '<h2>文章資訊</h2>',
    '<ul>',
    `<li><strong>分類：</strong>${htmlEscape(mapCategory(content))}</li>`,
    published ? `<li><strong>發布日期：</strong>${htmlEscape(new Date(published).toLocaleDateString('zh-TW'))}</li>` : '',
    `<li><strong>來源：</strong><a href="${htmlEscape(source)}" target="_blank" rel="noopener noreferrer">方格子咖啡旅行家原文</a></li>`,
    '</ul>',
    '<h2>咖啡誌分類</h2>',
    `<ul>${roomList}</ul>`,
    '<h2>關鍵字</h2>',
    `<ul>${tagList}</ul>`,
  ]
    .filter(Boolean)
    .join('\n');
}

function fileExtFrom(contentType, url) {
  const byType = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  if (byType[contentType]) return byType[contentType];
  const pathname = new URL(url).pathname;
  const ext = pathname.split('.').pop()?.toLowerCase();
  return ext && /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
}

function imageContentType(contentType, url) {
  if (contentType?.startsWith('image/')) return contentType;
  const ext = fileExtFrom(contentType, url);
  const byExt = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  return byExt[ext] ?? '';
}

async function uploadCover(supabase, supabaseUrl, imageUrl, articleId, stats) {
  if (imageUrl) stats.coverImagesFound += 1;
  const uploaded = await uploadRemoteImage(supabase, supabaseUrl, imageUrl, articleId, 'cover', 0);
  if (uploaded && uploaded !== imageUrl) stats.coverImagesUploaded += 1;
  return uploaded;
}

async function fetchAllContents() {
  const all = [];
  let expectedCount = null;

  for (let page = 1; page <= 20; page += 1) {
    const url = `${API_BASE}/api/contents?num=${PAGE_SIZE}&page=${page}&salonId=${SALON_ID}`;
    const json = await fetchJson(url);
    expectedCount ??= json.count ?? null;
    const contents = Array.isArray(json.contents) ? json.contents : [];
    all.push(...contents);
    console.log(`Fetched Vocus page ${page}: ${contents.length} entries`);
    if (contents.length === 0 || (expectedCount && all.length >= expectedCount)) break;
  }

  const unique = new Map();
  for (const content of all.filter((item) => item.type === 'article')) {
    const articleId = content.contentId || getArticle(content)._id || content._id;
    if (articleId) unique.set(articleId, content);
  }

  return { contents: [...unique.values()], expectedCount };
}

async function fetchArticleDetail(articleId) {
  const json = await fetchJson(`${API_BASE}/api/article/${articleId}`);
  if (!json.article?._id) throw new Error(`Vocus article detail missing for ${articleId}`);
  return json.article;
}

function mergeArticleDetail(content, detail) {
  return {
    ...content,
    title: detail.title || content.title,
    publishAt: content.publishAt || detail.lastPublishAt || detail.createdAt,
    tags: Array.isArray(detail.tags) ? detail.tags : content.tags,
    article: {
      ...getArticle(content),
      ...detail,
    },
  };
}

function normalizeImageSource(rawUrl) {
  const decoded = decodeHtmlAttribute(rawUrl).trim();
  if (!decoded || decoded.startsWith('data:') || decoded.startsWith('blob:')) return '';
  const absolute = decoded.startsWith('//') ? `https:${decoded}` : decoded;

  try {
    const url = new URL(absolute);
    const nestedImage = url.searchParams.get('url');
    if (nestedImage && /images\.vocus\.cc|wpimg\.vocus\.cc/i.test(nestedImage)) {
      return nestedImage;
    }
    return url.href;
  } catch {
    return '';
  }
}

function sanitizeContentHtml(html) {
  return String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+=(["']).*?\1/gi, '')
    .replace(/\s(href|src)=(["'])javascript:[\s\S]*?\2/gi, ' $1="#"')
    .trim();
}

function withSourceFooter(html, content) {
  const articleId = content.contentId || getArticle(content)._id || content._id;
  const source = sourceUrl(articleId);
  return [
    html,
    '<hr />',
    `<p><strong>來源：</strong><a href="${htmlEscape(source)}" target="_blank" rel="noopener noreferrer">方格子咖啡旅行家原文</a></p>`,
  ].join('\n');
}

async function uploadRemoteImage(supabase, supabaseUrl, imageUrl, articleId, kind, index) {
  if (!COPY_REMOTE_COVERS || !imageUrl || DRY_RUN) return imageUrl;

  try {
    const res = await fetch(imageUrl, { headers: { 'user-agent': REQUEST_HEADERS['user-agent'] } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const responseContentType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    const contentType = imageContentType(responseContentType, imageUrl);
    if (!contentType) throw new Error(`not an image: ${responseContentType}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const hash = crypto.createHash('sha1').update(imageUrl).digest('hex').slice(0, 12);
    const ext = fileExtFrom(contentType, imageUrl);
    const path = `${STORAGE_FOLDER}/vocus-${articleId}-${kind}-${index}-${hash}.${ext}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType, cacheControl: '31536000', upsert: true });

    if (error) throw error;
    return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  } catch (error) {
    console.warn(`${kind} image upload failed for ${articleId}: ${error.message}`);
    return imageUrl;
  }
}

async function rewriteHtmlImages(supabase, supabaseUrl, html, articleId, stats) {
  if (!COPY_REMOTE_COVERS || !html) return html;

  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const uniqueSources = new Map();

  for (const tag of imgTags) {
    const src = tag.match(/\ssrc=(["'])(.*?)\1/i)?.[2] || '';
    const dataSrc = tag.match(/\sdata-src=(["'])(.*?)\1/i)?.[2] || '';
    const srcset = tag.match(/\ssrcset=(["'])(.*?)\1/i)?.[2] || '';
    const firstSrcset = srcset.split(',')[0]?.trim().split(/\s+/)[0] || '';
    const normalized = normalizeImageSource(dataSrc || src || firstSrcset);
    if (normalized && !uniqueSources.has(normalized)) uniqueSources.set(normalized, null);
  }
  stats.inlineImagesFound += uniqueSources.size;

  let index = 0;
  for (const source of uniqueSources.keys()) {
    const uploaded = await uploadRemoteImage(supabase, supabaseUrl, source, articleId, 'inline', index);
    uniqueSources.set(source, uploaded);
    if (uploaded && uploaded !== source) stats.inlineImagesUploaded += 1;
    index += 1;
  }

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\ssrc=(["'])(.*?)\1/i)?.[2] || '';
    const dataSrc = tag.match(/\sdata-src=(["'])(.*?)\1/i)?.[2] || '';
    const srcset = tag.match(/\ssrcset=(["'])(.*?)\1/i)?.[2] || '';
    const firstSrcset = srcset.split(',')[0]?.trim().split(/\s+/)[0] || '';
    const normalized = normalizeImageSource(dataSrc || src || firstSrcset);
    const uploaded = uniqueSources.get(normalized);
    if (!uploaded) return tag;

    let nextTag = tag;
    if (/\ssrc=(["']).*?\1/i.test(nextTag)) {
      nextTag = nextTag.replace(/\ssrc=(["']).*?\1/i, ` src="${uploaded}"`);
    } else {
      nextTag = nextTag.replace('<img', `<img src="${uploaded}"`);
    }

    if (/\sdata-src=(["']).*?\1/i.test(nextTag)) {
      nextTag = nextTag.replace(/\sdata-src=(["']).*?\1/i, ` data-src="${uploaded}"`);
    }
    if (/\sdata-original-src=(["']).*?\1/i.test(nextTag)) {
      nextTag = nextTag.replace(/\sdata-original-src=(["']).*?\1/i, ` data-original-src="${uploaded}"`);
    }
    if (/\ssrcset=(["']).*?\1/i.test(nextTag)) {
      nextTag = nextTag.replace(/\ssrcset=(["']).*?\1/i, '');
    }
    if (!/\sloading=/i.test(nextTag)) nextTag = nextTag.replace('<img', '<img loading="lazy"');
    return nextTag;
  });
}

async function rewritePrerenderImageBlocks(supabase, supabaseUrl, html, articleId, stats) {
  if (!html) return html;

  const blockPattern = /<div\b(?=[^>]*\bimage-block-prerender\b)[^>]*\sdata-src=(["'])(.*?)\1[^>]*><\/div>/gi;
  const blocks = [...html.matchAll(blockPattern)].map((match) => match[0]);
  if (blocks.length === 0) return html;

  const uniqueSources = new Map();
  for (const block of blocks) {
    const dataSrc = block.match(/\sdata-src=(["'])(.*?)\1/i)?.[2] || '';
    const normalized = normalizeImageSource(dataSrc);
    if (normalized && !uniqueSources.has(normalized)) uniqueSources.set(normalized, null);
  }
  stats.prerenderImagesFound += uniqueSources.size;

  let index = 0;
  for (const source of uniqueSources.keys()) {
    const uploaded = await uploadRemoteImage(supabase, supabaseUrl, source, articleId, 'prerender', index);
    uniqueSources.set(source, uploaded);
    if (uploaded && uploaded !== source) stats.prerenderImagesUploaded += 1;
    index += 1;
  }

  return html.replace(blockPattern, (block) => {
    const dataSrc = block.match(/\sdata-src=(["'])(.*?)\1/i)?.[2] || '';
    const width = block.match(/\sdata-width=(["'])(.*?)\1/i)?.[2] || '';
    const height = block.match(/\sdata-height=(["'])(.*?)\1/i)?.[2] || '';
    const normalized = normalizeImageSource(dataSrc);
    const uploaded = uniqueSources.get(normalized);
    if (!uploaded) return block;

    const sizeAttrs = [
      width && width !== '0' ? `data-width="${htmlEscape(width)}"` : '',
      height && height !== '0' ? `data-height="${htmlEscape(height)}"` : '',
    ].filter(Boolean).join(' ');
    return `<img loading="lazy" src="${uploaded}" data-src="${uploaded}" data-original-src="${uploaded}" ${sizeAttrs} class="image-block-prerender-image" alt="raw-image">`;
  });
}

function firstStorageImageFromHtml(html) {
  return html.match(/<img\b[^>]*\ssrc=["']([^"']*\/storage\/v1\/object\/public\/site-assets\/[^"']+)["']/i)?.[1] || '';
}

async function prepareArticleContent(supabase, supabaseUrl, content, stats) {
  const articleId = content.contentId || getArticle(content)._id || content._id;
  const excerpt = summarizeFromMetadata(content);

  if (!COPY_FULL_HTML) return renderContent(content, excerpt);

  const sourceHtml = getArticle(content).content;
  if (!sourceHtml) return renderContent(content, excerpt);

  let html = sanitizeContentHtml(sourceHtml);
  html = await rewriteHtmlImages(supabase, supabaseUrl, html, articleId, stats);
  html = await rewritePrerenderImageBlocks(supabase, supabaseUrl, html, articleId, stats);
  stats.fullHtmlArticles += 1;
  return withSourceFooter(html, content);
}

async function buildRecord(supabase, supabaseUrl, content, vendorId, coverImageUrl, stats) {
  const articleId = content.contentId || getArticle(content)._id || content._id;
  const excerpt = summarizeFromMetadata(content);
  const rooms = getRoomNames(content);
  const tags = uniqueStrings([
    ...rooms,
    ...(content.tags ?? []),
    ...(getArticle(content).tags ?? []),
    mapCategory(content),
    '咖啡旅行家',
    'Vocus',
  ]).slice(0, 18);
  const publishedAt = content.publishAt || getArticle(content).lastPublishAt || getArticle(content).createdAt || new Date().toISOString();

  const contentHtml = await prepareArticleContent(supabase, supabaseUrl, content, stats);
  const finalCoverImageUrl =
    coverImageUrl?.includes('/storage/v1/object/public/site-assets/')
      ? coverImageUrl
      : firstStorageImageFromHtml(contentHtml) || coverImageUrl;

  return {
    vendor_id: vendorId,
    title: cleanText(content.title || getArticle(content).title),
    slug: slugFor(articleId),
    excerpt,
    content: contentHtml,
    cover_image_url: finalCoverImageUrl,
    author_name: AUTHOR_NAME,
    tags,
    category: mapCategory(content),
    status: 'published',
    meta_description: excerpt.slice(0, 160),
    published_at: new Date(publishedAt).toISOString(),
    source_url: sourceUrl(articleId),
    updated_at: new Date().toISOString(),
  };
}

async function getLegacyCoffeePostIds(supabase) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id,title,source_url,slug')
    .ilike('author_name', '%咖啡旅行家%');

  if (error) throw new Error(`legacy blog query failed: ${error.message}`);
  return (data ?? []).filter((post) => !post.source_url || !post.source_url.startsWith('https://vocus.cc/article/'));
}

async function upsertInChunks(supabase, records) {
  let upserted = 0;
  for (let index = 0; index < records.length; index += 50) {
    const chunk = records.slice(index, index + 50);
    const { error } = await supabase
      .from('blog_posts')
      .upsert(chunk, { onConflict: 'slug' });

    if (error) throw new Error(`blog upsert failed: ${error.message}`);
    upserted += chunk.length;
  }
  return upserted;
}

async function deleteByIds(supabase, posts) {
  if (posts.length === 0) return 0;
  let deleted = 0;
  for (let index = 0; index < posts.length; index += 100) {
    const ids = posts.slice(index, index + 100).map((post) => post.id);
    const { data, error } = await supabase
      .from('blog_posts')
      .delete()
      .in('id', ids)
      .select('id');

    if (error) throw new Error(`legacy blog delete failed: ${error.message}`);
    deleted += data?.length ?? ids.length;
  }
  return deleted;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = requireEnv(env, 'VITE_SUPABASE_URL');
  const supabaseKey = requireEnv(env, 'VITE_SUPABASE_ANON_KEY');
  const adminEmail = requireEnv(env, 'SUPABASE_ADMIN_EMAIL');
  const adminPassword = requireEnv(env, 'SUPABASE_ADMIN_PASSWORD');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (authError) throw new Error(`Supabase sign-in failed: ${authError.message}`);

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('id,name')
    .eq('name', VENDOR_NAME)
    .maybeSingle();

  if (vendorError) throw new Error(`vendor query failed: ${vendorError.message}`);
  if (!vendor?.id) throw new Error(`Vendor not found: ${VENDOR_NAME}`);

  const legacyPosts = await getLegacyCoffeePostIds(supabase);
  const { contents, expectedCount } = await fetchAllContents();
  const stats = {
    articleDetailsFetched: 0,
    fullHtmlArticles: 0,
    coverImagesFound: 0,
    coverImagesUploaded: 0,
    inlineImagesFound: 0,
    inlineImagesUploaded: 0,
    prerenderImagesFound: 0,
    prerenderImagesUploaded: 0,
  };

  const records = [];
  for (const [index, content] of contents.entries()) {
    const articleId = content.contentId || getArticle(content)._id || content._id;
    let preparedContent = content;
    if (COPY_FULL_HTML) {
      const detail = await fetchArticleDetail(articleId);
      preparedContent = mergeArticleDetail(content, detail);
      stats.articleDetailsFetched += 1;
    }

    const coverImageUrl = await uploadCover(supabase, supabaseUrl, getCoverUrl(preparedContent), articleId, stats);
    records.push(await buildRecord(supabase, supabaseUrl, preparedContent, vendor.id, coverImageUrl, stats));
    console.log(`Prepared ${index + 1}/${contents.length}: ${cleanText(preparedContent.title).slice(0, 60)}`);
  }

  const categoryCounts = records.reduce((acc, record) => {
    acc[record.category] = (acc[record.category] || 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        copyRemoteCovers: COPY_REMOTE_COVERS,
        copyFullHtml: COPY_FULL_HTML,
        copySourceAbstract: COPY_SOURCE_ABSTRACT,
        expectedCount,
        fetchedArticles: contents.length,
        preparedRecords: records.length,
        vendor,
        legacyPostsToDelete: legacyPosts.length,
        categoryCounts,
        stats,
      },
      null,
      2,
    ),
  );

  if (DRY_RUN) return;

  const upserted = await upsertInChunks(supabase, records);
  const deletedLegacy = await deleteByIds(supabase, legacyPosts);

  const { count, error: countError } = await supabase
    .from('blog_posts')
    .select('id', { count: 'exact', head: true })
    .ilike('source_url', 'https://vocus.cc/article/%');
  if (countError) throw new Error(`verification query failed: ${countError.message}`);

  console.log(JSON.stringify({ upserted, deletedLegacy, vocusArticleCount: count, stats }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
