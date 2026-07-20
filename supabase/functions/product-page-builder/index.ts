import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { openAIModels } from "../_shared/openaiModels.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ProductPageTone = 'luxury' | 'friendly' | 'barista' | 'group-buy';
type ProductPageBlockType = 'hero' | 'feature' | 'story' | 'benefits' | 'cta';

type ProductPageBlock = {
  id: string;
  type: ProductPageBlockType;
  title: string;
  body: string;
  imageUrl?: string;
  highlights?: string[];
  buttonText?: string;
  buttonHref?: string;
  badge?: string;
};

type ProductPageDocument = {
  version: 1;
  tone: ProductPageTone;
  blocks: ProductPageBlock[];
  updatedAt: string;
};

type BuildRequest = {
  prompt?: string;
  productName?: string;
  productSummary?: string;
  imagePool?: string[];
};

const toneKeywordMap: Record<ProductPageTone, string[]> = {
  luxury: ['收藏', '精品', '限量', '高端', '尊榮', '送禮', 'premium', 'luxury'],
  friendly: ['日常', '輕鬆', '入門', '暖心', '家庭', '新手', 'daily', 'friendly'],
  barista: ['風味', '烘焙', '杯測', '莊園', '手沖', '咖啡師', 'barista', 'origin'],
  'group-buy': ['團購', '優惠', '折扣', '促銷', '限時', '免運', '買', '現折'],
};

const createBlockId = () =>
  `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeTone = (value: unknown): ProductPageTone => {
  if (value === 'luxury' || value === 'friendly' || value === 'barista' || value === 'group-buy') {
    return value;
  }
  return 'luxury';
};

const normalizeBlockType = (value: unknown): ProductPageBlockType => {
  if (value === 'hero' || value === 'feature' || value === 'story' || value === 'benefits' || value === 'cta') {
    return value;
  }
  return 'feature';
};

const normalizeHighlights = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
};

const normalizeDocument = (value: unknown): ProductPageDocument | null => {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.blocks)) return null;

  const blocks = obj.blocks
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const block = item as Record<string, unknown>;
      const title = typeof block.title === 'string' ? block.title.trim() : '';
      const body = typeof block.body === 'string' ? block.body.trim() : '';
      if (!title && !body) return null;

      return {
        id: typeof block.id === 'string' && block.id ? block.id : createBlockId(),
        type: normalizeBlockType(block.type),
        title: title || '商品亮點',
        body,
        imageUrl: typeof block.imageUrl === 'string' ? block.imageUrl.trim() : '',
        highlights: normalizeHighlights(block.highlights),
        buttonText: typeof block.buttonText === 'string' ? block.buttonText.trim() : '',
        buttonHref: typeof block.buttonHref === 'string' ? block.buttonHref.trim() : '',
        badge: typeof block.badge === 'string' ? block.badge.trim() : '',
      } as ProductPageBlock;
    })
    .filter((item): item is ProductPageBlock => Boolean(item));

  if (!blocks.length) return null;

  return {
    version: 1,
    tone: normalizeTone(obj.tone),
    blocks,
    updatedAt: new Date().toISOString(),
  };
};

const pickTone = (text: string): ProductPageTone => {
  const normalized = text.toLowerCase();
  let bestTone: ProductPageTone = 'luxury';
  let bestScore = 0;

  (Object.keys(toneKeywordMap) as ProductPageTone[]).forEach((tone) => {
    const score = toneKeywordMap[tone].reduce((acc, keyword) => {
      return acc + (normalized.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestTone = tone;
      bestScore = score;
    }
  });

  return bestTone;
};

const generateFallbackDocument = ({ prompt = '', productName, productSummary, imagePool = [] }: BuildRequest) => {
  const lines = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletLines = lines
    .filter((line) => /^[*\-•]/.test(line))
    .map((line) => line.replace(/^[*\-•\s]+/, '').trim());
  const paragraphLines = lines.filter((line) => !/^[*\-•]/.test(line));

  const heroTitle = paragraphLines[0] || productName || 'Sonpin Selection';
  const heroBody =
    paragraphLines[1] ||
    productSummary ||
    '以精品咖啡理念打造，兼具風味、設計與送禮儀式感。';
  const storyBody = paragraphLines.slice(2).join('\n') || heroBody;
  const highlights =
    bulletLines.length > 0
      ? bulletLines.slice(0, 4)
      : ['風味層次清晰', '包裝設計完整', '送禮與自用皆適合'];
  const tone = pickTone(prompt);

  return {
    version: 1 as const,
    tone,
    updatedAt: new Date().toISOString(),
    blocks: [
      {
        id: createBlockId(),
        type: 'hero' as const,
        title: heroTitle,
        body: heroBody,
        imageUrl: imagePool[0] || '',
        badge: tone === 'group-buy' ? '限時優惠' : '精選推薦',
      },
      {
        id: createBlockId(),
        type: 'benefits' as const,
        title: '商品亮點',
        body: '以卡片方式快速理解商品核心價值。',
        imageUrl: imagePool[1] || imagePool[0] || '',
        highlights,
      },
      {
        id: createBlockId(),
        type: 'story' as const,
        title: '風味與品牌故事',
        body: storyBody,
        imageUrl: imagePool[2] || imagePool[0] || '',
      },
      {
        id: createBlockId(),
        type: 'cta' as const,
        title: '現在就帶走',
        body: '選擇喜歡的數量，加入購物車快速結帳。',
        buttonText: tone === 'group-buy' ? '立即加入團購' : '立即購買',
        buttonHref: '#buy-now',
      },
    ],
  };
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const buildOpenAiPrompt = ({ prompt, productName, productSummary, imagePool }: BuildRequest) => {
  const safePrompt = prompt?.trim() || '';
  const safeImages = (imagePool || []).filter(Boolean).slice(0, 6);

  return [
    '你是電商商品頁編輯器，請把輸入整理成卡片式商品頁資料。',
    '輸出必須是 JSON，且不可包含 markdown。',
    'tone 僅能是: luxury, friendly, barista, group-buy。',
    'blocks 至少 3 張，最多 8 張。',
    '每張卡片需包含: type, title, body。',
    'type 僅能是: hero, feature, story, benefits, cta。',
    '若是 cta，請填 buttonText 與 buttonHref，buttonHref 預設 #buy-now。',
    '若有 imagePool，請盡量使用其中 URL 放到 imageUrl。',
    '',
    `商品名稱: ${productName || ''}`,
    `商品摘要: ${productSummary || ''}`,
    `可用圖片池: ${safeImages.join(', ') || '無'}`,
    '',
    '使用者輸入:',
    safePrompt,
  ].join('\n');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const body = (await req.json()) as BuildRequest;
    if (!body.prompt || !body.prompt.trim()) {
      return jsonResponse({ error: 'prompt_required' }, 400);
    }

    const fallback = generateFallbackDocument(body);
    const openAiKey = Deno.env.get('OPENAI_API_KEY')?.trim();

    if (!openAiKey) {
      return jsonResponse({ document: fallback, source: 'fallback-no-openai-key' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openAIModels.pageBuilder(),
        temperature: 0.55,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You generate ecommerce product page card JSON. Output JSON only with shape: { tone, blocks }.',
          },
          {
            role: 'user',
            content: buildOpenAiPrompt(body),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', response.status, errorText);
      return jsonResponse({ document: fallback, source: 'fallback-openai-error' });
    }

    const payload = await response.json();
    const message = payload?.choices?.[0]?.message?.content;
    if (typeof message !== 'string' || !message.trim()) {
      return jsonResponse({ document: fallback, source: 'fallback-empty-openai-content' });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return jsonResponse({ document: fallback, source: 'fallback-invalid-json' });
    }

    const normalized = normalizeDocument(parsed);
    if (!normalized) {
      return jsonResponse({ document: fallback, source: 'fallback-normalize-failed' });
    }

    return jsonResponse({ document: normalized, source: 'openai' });
  } catch (error) {
    console.error('product-page-builder error:', error);
    return jsonResponse({ error: 'internal_error' }, 500);
  }
});
