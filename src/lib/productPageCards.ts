export type ProductPageTone = 'luxury' | 'friendly' | 'barista' | 'group-buy';
export type ProductPageBlockType = 'hero' | 'feature' | 'story' | 'benefits' | 'cta';

export interface ProductPageBlock {
  id: string;
  type: ProductPageBlockType;
  title: string;
  body: string;
  imageUrl?: string;
  highlights?: string[];
  buttonText?: string;
  buttonHref?: string;
  badge?: string;
}

export interface ProductPageDocument {
  version: 1;
  tone: ProductPageTone;
  blocks: ProductPageBlock[];
  updatedAt: string;
}

export interface ExtractedProductPageDocument {
  document: ProductPageDocument | null;
  fallbackHtml: string;
}

interface GenerationOptions {
  productName?: string;
  productSummary?: string;
  imagePool?: string[];
}

const MARKER_PREFIX = '<!--YM_PRODUCT_PAGE:';
const MARKER_SUFFIX = ':YM_PRODUCT_PAGE-->';
const MARKER_PATTERN = /<!--YM_PRODUCT_PAGE:([\s\S]*?):YM_PRODUCT_PAGE-->/;

const toneKeywordMap: Record<ProductPageTone, string[]> = {
  luxury: ['精品', '高端', '限量', '收藏', 'premium', 'luxury'],
  friendly: ['日常', '溫和', '順口', '親民', 'daily', 'friendly'],
  barista: ['職人', '沖煮', '烘焙', '風味', 'barista', 'origin'],
  'group-buy': ['團購', '優惠', '限時', '加購', 'bundle', 'group'],
};

export const PRODUCT_PAGE_TONES: ProductPageTone[] = ['luxury', 'friendly', 'barista', 'group-buy'];

export const PRODUCT_PAGE_TONE_LABEL: Record<ProductPageTone, string> = {
  luxury: '高端精品風',
  friendly: '親和日常風',
  barista: '咖啡職人風',
  'group-buy': '團購促銷風',
};

export const createBlockId = () =>
  `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const splitParagraphs = (text: string) =>
  text
    .split(/\r?\n\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);

const splitLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const cleanBullet = (line: string) => line.replace(/^[*\-\u2022\d.\s]+/, '').trim();

const pickToneByKeyword = (text: string): ProductPageTone => {
  const normalized = text.toLowerCase();
  let bestTone: ProductPageTone = 'luxury';
  let bestScore = 0;

  PRODUCT_PAGE_TONES.forEach((tone) => {
    const score = toneKeywordMap[tone].reduce(
      (acc, keyword) => acc + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestTone = tone;
    }
  });

  return bestTone;
};

export const createDefaultProductPageDocument = (options: GenerationOptions = {}): ProductPageDocument => ({
  version: 1,
  tone: 'luxury',
  updatedAt: new Date().toISOString(),
  blocks: [
    {
      id: createBlockId(),
      type: 'hero',
      title: options.productName || 'Sonpin Selection',
      body: options.productSummary || '以精品咖啡為核心，打造具有故事感與質感的一頁式商品內容。',
      imageUrl: options.imagePool?.[0] || '',
      badge: '品牌精選',
    },
    {
      id: createBlockId(),
      type: 'benefits',
      title: '風味與亮點',
      body: '把關鍵風味與使用情境整理成可快速理解的段落。',
      highlights: ['精選產地豆款', '香氣層次清晰', '送禮與自用皆適合'],
      imageUrl: options.imagePool?.[1] || options.imagePool?.[0] || '',
    },
    {
      id: createBlockId(),
      type: 'story',
      title: '品牌故事',
      body: '從產地、烘焙到杯中，我們讓每一杯都保留最真實的個性。',
      imageUrl: options.imagePool?.[2] || options.imagePool?.[0] || '',
    },
    {
      id: createBlockId(),
      type: 'cta',
      title: '立即選購',
      body: '挑選你的風味路線，現在就完成下單。',
      buttonText: '立即選購',
      buttonHref: '#buy-now',
    },
  ],
});

const normalizeHighlights = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
};

const normalizeBlockText = (value: string) => {
  const decoded = decodeHtmlEntities(value || '').trim();
  if (!decoded) return '';
  // Keep rich HTML from editor so frontend can preserve styles.
  // We'll only decode escaped entities here.
  if (/<[a-z][\s\S]*>/i.test(decoded)) return decoded;
  return decoded;
};

const normalizeBlockType = (value: unknown): ProductPageBlockType => {
  if (value === 'hero' || value === 'feature' || value === 'story' || value === 'benefits' || value === 'cta') {
    return value;
  }
  return 'feature';
};

const normalizeTone = (value: unknown): ProductPageTone => {
  if (value === 'luxury' || value === 'friendly' || value === 'barista' || value === 'group-buy') {
    return value;
  }
  return 'luxury';
};

const normalizeBlock = (input: unknown): ProductPageBlock | null => {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? normalizeBlockText(candidate.title) : '';
  const body = typeof candidate.body === 'string' ? normalizeBlockText(candidate.body) : '';
  if (!title && !body) return null;

  return {
    id: typeof candidate.id === 'string' && candidate.id ? candidate.id : createBlockId(),
    type: normalizeBlockType(candidate.type),
    title: title || '商品亮點',
    body,
    imageUrl: typeof candidate.imageUrl === 'string' ? candidate.imageUrl.trim() : '',
    highlights: normalizeHighlights(candidate.highlights).map(normalizeBlockText).filter(Boolean),
    buttonText: typeof candidate.buttonText === 'string' ? candidate.buttonText.trim() : '',
    buttonHref: typeof candidate.buttonHref === 'string' ? candidate.buttonHref.trim() : '',
    badge: typeof candidate.badge === 'string' ? candidate.badge.trim() : '',
  };
};

export const normalizeProductPageDocument = (input: unknown): ProductPageDocument | null => {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Record<string, unknown>;
  const blocks = Array.isArray(candidate.blocks)
    ? candidate.blocks.map(normalizeBlock).filter((block): block is ProductPageBlock => Boolean(block))
    : [];
  if (blocks.length === 0) return null;

  return {
    version: 1,
    tone: normalizeTone(candidate.tone),
    blocks,
    updatedAt:
      typeof candidate.updatedAt === 'string' && candidate.updatedAt ? candidate.updatedAt : new Date().toISOString(),
  };
};

const safeDecode = (encoded: string) => {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return '';
  }
};

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

const normalizeFallbackHtml = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Some records were saved as escaped HTML (e.g. &lt;div ...&gt;),
  // which caused frontend to display source code literally.
  if (trimmed.includes('&lt;') && trimmed.includes('&gt;')) {
    return decodeHtmlEntities(trimmed);
  }

  return trimmed;
};

export const extractProductPageDocument = (content: string | null | undefined): ExtractedProductPageDocument => {
  const raw = content || '';
  const markerMatch = raw.match(MARKER_PATTERN);
  if (!markerMatch) return { document: null, fallbackHtml: normalizeFallbackHtml(raw) };

  const payloadText = safeDecode(markerMatch[1] || '');
  const fallbackHtml = normalizeFallbackHtml(raw.replace(MARKER_PATTERN, ''));
  if (!payloadText) return { document: null, fallbackHtml };

  try {
    const parsed = JSON.parse(payloadText);
    return { document: normalizeProductPageDocument(parsed), fallbackHtml };
  } catch {
    return { document: null, fallbackHtml };
  }
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const renderBlockHtml = (block: ProductPageBlock) => {
  const title = escapeHtml(block.title || '');
  const body = escapeHtml(block.body || '');
  const badge = block.badge ? `<p>${escapeHtml(block.badge)}</p>` : '';
  const image = block.imageUrl ? `<figure><img src="${escapeHtml(block.imageUrl)}" alt="${title}" /></figure>` : '';
  const highlights = block.highlights?.length
    ? `<ul>${block.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';
  const button =
    block.type === 'cta' && block.buttonText
      ? `<p><a href="${escapeHtml(block.buttonHref || '#buy-now')}">${escapeHtml(block.buttonText)}</a></p>`
      : '';

  return `<section>${badge}<h3>${title}</h3><p>${body}</p>${highlights}${image}${button}</section>`;
};

export const renderProductPageDocumentAsHtml = (document: ProductPageDocument) => {
  const blocksHtml = document.blocks.map(renderBlockHtml).join('');
  return `<div class="ym-product-content ym-product-card-html" data-ym-product-page="1">${blocksHtml}</div>`;
};

export const serializeProductPageDocument = (document: ProductPageDocument, fallbackHtml?: string) => {
  const normalized = normalizeProductPageDocument(document);
  if (!normalized) return fallbackHtml?.trim() || '';

  const html = (fallbackHtml && fallbackHtml.trim()) || renderProductPageDocumentAsHtml(normalized);
  const encoded = encodeURIComponent(JSON.stringify(normalized));
  return `${html}\n\n${MARKER_PREFIX}${encoded}${MARKER_SUFFIX}`;
};

export const generateProductPageDocumentFromText = (
  text: string,
  options: GenerationOptions = {}
): ProductPageDocument => {
  const lines = splitLines(text);
  const paragraphs = splitParagraphs(text);
  const bullets = lines.filter((line) => /^[*\-\u2022]/.test(line)).map(cleanBullet);
  const proseLines = lines.filter((line) => !/^[*\-\u2022]/.test(line));
  const imagePool = options.imagePool?.filter(Boolean) || [];
  const tone = pickToneByKeyword(text);

  const title = proseLines[0] || options.productName || 'Sonpin Selection';
  const summary = proseLines[1] || options.productSummary || paragraphs[0] || '以精品咖啡風味打造的一頁式商品體驗。';

  const longParagraphs = paragraphs.length > 0 ? paragraphs : [proseLines.slice(2).join('\n')].filter(Boolean);
  const storyA = longParagraphs[1] || proseLines.slice(2, 6).join('\n') || '風味設計來自產地特性與烘焙節奏的平衡。';
  const storyB = longParagraphs[2] || proseLines.slice(6, 10).join('\n') || '我們關注每一個細節，讓你在任何場景都能穩定重現風味。';

  const highlights =
    bullets.length > 0
      ? bullets.slice(0, 5)
      : ['香氣層次清晰', '尾韻乾淨平衡', '適合送禮與日常共享', '支援多種沖煮方式'];

  const sections: ProductPageBlock[] = [
    {
      id: createBlockId(),
      type: 'hero',
      title,
      body: summary,
      imageUrl: imagePool[0] || '',
      badge: tone === 'group-buy' ? '限時團購' : '品牌精選',
    },
    {
      id: createBlockId(),
      type: 'benefits',
      title: '風味亮點',
      body: '從香氣、酸甜平衡到尾韻，完整呈現商品個性。',
      highlights,
      imageUrl: imagePool[1] || imagePool[0] || '',
    },
    {
      id: createBlockId(),
      type: 'story',
      title: '產地故事',
      body: storyA,
      imageUrl: imagePool[2] || imagePool[0] || '',
    },
    {
      id: createBlockId(),
      type: 'feature',
      title: '職人建議',
      body: '建議搭配你偏好的沖煮方式，調整粉水比與萃取時間以找到最佳口感。',
      highlights: ['建議粉水比 1:15~1:16', '水溫 90~93°C', '悶蒸 25~35 秒'],
      imageUrl: imagePool[3] || imagePool[1] || imagePool[0] || '',
    },
    {
      id: createBlockId(),
      type: 'story',
      title: '品牌主張',
      body: storyB,
      imageUrl: imagePool[4] || imagePool[2] || imagePool[0] || '',
    },
    {
      id: createBlockId(),
      type: 'cta',
      title: tone === 'group-buy' ? '立即團購' : '立即選購',
      body: '選擇規格後加入購物車，快速完成下單。',
      buttonText: tone === 'group-buy' ? '立即團購' : '立即選購',
      buttonHref: '#buy-now',
    },
  ];

  return {
    version: 1,
    tone,
    blocks: sections,
    updatedAt: new Date().toISOString(),
  };
};

export const reorderProductPageBlocks = (blocks: ProductPageBlock[], fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return blocks;
  if (fromIndex >= blocks.length || toIndex >= blocks.length) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};
