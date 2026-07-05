import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Monitor,
  Plus,
  Sparkles,
  Smartphone,
  Trash2,
  Wand2,
} from 'lucide-react';
import ImageUpload from '../ImageUpload';
import RichTextEditor from '../RichTextEditor';
import ProductPageCardRenderer from '../product-page/ProductPageCardRenderer';
import {
  ProductPageBlock,
  ProductPageDocument,
  ProductPageTone,
  PRODUCT_PAGE_TONE_LABEL,
  createBlockId,
  createDefaultProductPageDocument,
  extractProductPageDocument,
  generateProductPageDocumentFromText,
  normalizeProductPageDocument,
  reorderProductPageBlocks,
  renderProductPageDocumentAsHtml,
  serializeProductPageDocument,
} from '../../lib/productPageCards';
import { isSupabaseAiEnabled } from '../../lib/supabase';

interface ProductPageBuilderEditorProps {
  content: string;
  productName: string;
  productSummary: string;
  productImages: string[];
  onContentChange: (nextValue: string) => void;
}

const blockTypeOptions: { value: ProductPageBlock['type']; label: string }[] = [
  { value: 'hero', label: '主視覺' },
  { value: 'feature', label: '重點卡片' },
  { value: 'benefits', label: '賣點列表' },
  { value: 'story', label: '品牌故事' },
  { value: 'cta', label: '行動按鈕' },
];

const previewModeStyles = {
  desktop: 'w-full',
  mobile: 'mx-auto w-[390px] max-w-full',
} as const;

const createFallbackDoc = (name: string, summary: string, images: string[]) =>
  createDefaultProductPageDocument({
    productName: name,
    productSummary: summary,
    imagePool: images,
  });

const normalizeBlocksForEdit = (blocks: ProductPageBlock[]) =>
  blocks.map((block) => ({
    ...block,
    id: block.id || createBlockId(),
    highlights: Array.isArray(block.highlights) ? block.highlights : [],
  }));

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const highlightsToEditorHtml = (highlights: string[]) =>
  highlights.length
    ? `<ul>${highlights.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
    : '';

const highlightsFromEditorHtml = (value: string) =>
  value
    .replace(/<\/(li|p|div|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export default function ProductPageBuilderEditor({
  content,
  productName,
  productSummary,
  productImages,
  onContentChange,
}: ProductPageBuilderEditorProps) {
  const extracted = useMemo(() => extractProductPageDocument(content), [content]);
  const extractedDoc = extracted.document;
  const [isCardModeEnabled, setIsCardModeEnabled] = useState(Boolean(extractedDoc));
  const [tone, setTone] = useState<ProductPageTone>(extractedDoc?.tone || 'luxury');
  const [blocks, setBlocks] = useState<ProductPageBlock[]>(normalizeBlocksForEdit(extractedDoc?.blocks || []));
  const [documentUpdatedAt, setDocumentUpdatedAt] = useState(
    extractedDoc?.updatedAt || new Date().toISOString()
  );
  const [promptText, setPromptText] = useState('');
  const [cardCount, setCardCount] = useState(4);
  const [fallbackHtml, setFallbackHtml] = useState(extracted.fallbackHtml || '');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [editorMode, setEditorMode] = useState<'cards' | 'html'>('cards');
  const [isGenerating, setIsGenerating] = useState(false);
  const [preserveFullContent, setPreserveFullContent] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const lastSerializedRef = useRef(content || '');

  const currentDocument: ProductPageDocument | null = useMemo(() => {
    const normalized = normalizeProductPageDocument({
      version: 1,
      tone,
      blocks,
      updatedAt: documentUpdatedAt,
    });
    return normalized;
  }, [tone, blocks, documentUpdatedAt]);

  useEffect(() => {
    setDocumentUpdatedAt(new Date().toISOString());
  }, [tone, blocks]);

  useEffect(() => {
    if (!isCardModeEnabled || !currentDocument) return;

    const htmlFallback = fallbackHtml.trim() || renderProductPageDocumentAsHtml(currentDocument);
    const nextContent = serializeProductPageDocument(currentDocument, htmlFallback);

    if (nextContent === lastSerializedRef.current) return;
    lastSerializedRef.current = nextContent;
    onContentChange(nextContent);
  }, [currentDocument, fallbackHtml, isCardModeEnabled, onContentChange]);

  useEffect(() => {
    if (content === lastSerializedRef.current) return;

    const nextExtracted = extractProductPageDocument(content);
    const nextDoc = nextExtracted.document;

    setIsCardModeEnabled(Boolean(nextDoc));
    setTone(nextDoc?.tone || 'luxury');
    setBlocks(normalizeBlocksForEdit(nextDoc?.blocks || []));
    setDocumentUpdatedAt(nextDoc?.updatedAt || new Date().toISOString());
    setFallbackHtml(nextExtracted.fallbackHtml || '');
    lastSerializedRef.current = content || '';
  }, [content]);

  const ensureCardModeWithDefault = () => {
    if (isCardModeEnabled) return;
    const fallback = createFallbackDoc(productName, productSummary, productImages);
    setTone(fallback.tone);
    setBlocks(fallback.blocks);
    setDocumentUpdatedAt(fallback.updatedAt);
    setFallbackHtml(renderProductPageDocumentAsHtml(fallback));
    setIsCardModeEnabled(true);
  };

  const fitBlocksToCount = (nextBlocks: ProductPageBlock[], targetCount: number) => {
    const safeCount = Math.min(8, Math.max(1, targetCount || 1));
    const normalized = [...nextBlocks];
    if (normalized.length > safeCount) return normalized.slice(0, safeCount);
    if (normalized.length === safeCount) return normalized;

    const seed = normalized[normalized.length - 1] || {
      id: createBlockId(),
      type: 'feature' as const,
      title: productName || '產品重點',
      body: productSummary || '補充說明',
      imageUrl: productImages[0] || '',
      highlights: [],
    };

    while (normalized.length < safeCount) {
      normalized.push({
        ...seed,
        id: createBlockId(),
        type: normalized.length === safeCount - 1 ? 'cta' : 'feature',
        title: `${seed.title}${normalized.length + 1}`,
      });
    }
    return normalized;
  };

  const updateBlock = (blockId: string, updater: (current: ProductPageBlock) => ProductPageBlock) => {
    setBlocks((prev) => prev.map((block) => (block.id === blockId ? updater(block) : block)));
  };

  const addBlock = () => {
    ensureCardModeWithDefault();
    setBlocks((prev) => [
      ...prev,
      {
        id: createBlockId(),
        type: 'feature',
        title: '新卡片標題',
        body: '在這裡輸入區塊內容。',
        imageUrl: productImages[0] || '',
        highlights: [],
      },
    ]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== blockId));
  };

  const setToneAndEnable = (nextTone: ProductPageTone) => {
    ensureCardModeWithDefault();
    setTone(nextTone);
  };

  const handleDropOn = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;

    setBlocks((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === draggingId);
      const toIndex = prev.findIndex((item) => item.id === targetId);
      return reorderProductPageBlocks(prev, fromIndex, toIndex);
    });
    setDraggingId(null);
  };

  const moveBlockByStep = (blockId: string, direction: -1 | 1) => {
    setBlocks((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === blockId);
      if (fromIndex < 0) return prev;

      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= prev.length) return prev;

      return reorderProductPageBlocks(prev, fromIndex, toIndex);
    });
  };

  const tryGenerateWithRemoteAi = async () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const isLocalDev =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '::1');

    if (isLocalDev || !isSupabaseAiEnabled || !url || !anon) return null;

    try {
      const response = await fetch(`${url}/functions/v1/product-page-builder`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anon}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptText,
          productName,
          productSummary,
          imagePool: productImages,
        }),
      });

      if (!response.ok) return null;

      const payload = await response.json();
      return normalizeProductPageDocument(payload?.document);
    } catch {
      return null;
    }
  };

  const generateFullFidelityDocument = (input: string): ProductPageDocument => {
    const lines = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const headingSet = ['產地故事', '感官敘述', '風味層次解析', '風味筆記', '職人監製', '冠軍工藝', '聯名企劃', '咖啡資訊', '品牌理念'];
    const isHeading = (line: string) => headingSet.some((h) => line.includes(h));
    const sectionLines = (heading: string) => {
      const start = lines.findIndex((line) => line.includes(heading));
      if (start < 0) return [] as string[];
      const result: string[] = [];
      for (let i = start + 1; i < lines.length; i += 1) {
        if (isHeading(lines[i])) break;
        result.push(lines[i]);
      }
      return result.filter(Boolean);
    };
    const kv = (key: string) => {
      const idx = lines.findIndex((line) => line === key);
      return idx >= 0 ? (lines[idx + 1] || '').trim() : '';
    };

    const title = lines[0] || productName || 'Sonpin Selection';
    const subtitle = lines[1] || productSummary || '';
    const origin = sectionLines('產地故事');
    const sensory = sectionLines('感官敘述');
    const flavorFlow = sectionLines('風味層次解析');
    const notes = sectionLines('風味筆記');
    const craft = [...sectionLines('職人監製'), ...sectionLines('冠軍工藝')];
    const collab = sectionLines('聯名企劃');
    const concept = sectionLines('品牌理念');
    const info = [
      kv('國家') && `國家｜${kv('國家')}`,
      kv('產區') && `產區｜${kv('產區')}`,
      kv('莊園') && `莊園｜${kv('莊園')}`,
      kv('品種') && `品種｜${kv('品種')}`,
      kv('處理法') && `處理法｜${kv('處理法')}`,
      kv('烘焙度') && `烘焙度｜${kv('烘焙度')}`,
      kv('監製') && `監製｜${kv('監製')}`,
      kv('規格') && `規格｜${kv('規格')}`,
      kv('售價') && `售價｜${kv('售價')}`,
    ].filter(Boolean) as string[];

    const blocks: ProductPageBlock[] = [
      {
        id: createBlockId(),
        type: 'hero',
        title,
        body: subtitle,
        imageUrl: productImages[0] || '',
        badge: '品牌精選',
      },
      {
        id: createBlockId(),
        type: 'story',
        title: '產地故事',
        body: origin.join('\n') || '以高海拔風土與火山土壤造就層次風味。',
        imageUrl: productImages[1] || productImages[0] || '',
      },
      {
        id: createBlockId(),
        type: 'benefits',
        title: '感官敘述與風味層次',
        body: sensory.join('\n') || '從花香到甜韻，層層遞進。',
        highlights: flavorFlow.slice(0, 10),
        imageUrl: productImages[2] || productImages[0] || '',
      },
      {
        id: createBlockId(),
        type: 'feature',
        title: '風味筆記',
        body: notes.slice(0, 4).join('\n'),
        highlights: notes.slice(0, 10),
        imageUrl: productImages[3] || productImages[1] || productImages[0] || '',
      },
      {
        id: createBlockId(),
        type: 'story',
        title: '職人監製與冠軍工藝',
        body: craft.join('\n'),
        imageUrl: productImages[4] || productImages[2] || productImages[0] || '',
      },
      {
        id: createBlockId(),
        type: 'story',
        title: '聯名企劃',
        body: collab.join('\n'),
        imageUrl: productImages[5] || productImages[3] || productImages[0] || '',
      },
      {
        id: createBlockId(),
        type: 'feature',
        title: '咖啡資訊與品牌理念',
        body: info.join('\n'),
        highlights: concept.slice(0, 8),
        imageUrl: productImages[6] || productImages[4] || productImages[0] || '',
      },
      {
        id: createBlockId(),
        type: 'cta',
        title: '立即選購',
        body: '選擇規格後加入購物車，快速完成下單。',
        buttonText: '立即選購',
        buttonHref: '#buy-now',
      },
    ];

    return {
      version: 1,
      tone: 'barista',
      blocks,
      updatedAt: new Date().toISOString(),
    };
  };

  const generateCardsFromText = async () => {
    if (!promptText.trim()) return;
    ensureCardModeWithDefault();
    setIsGenerating(true);

    try {
      let generated = await tryGenerateWithRemoteAi();
      if (!generated) {
        generated = preserveFullContent
          ? generateFullFidelityDocument(promptText)
          : generateProductPageDocumentFromText(promptText, {
              productName,
              productSummary,
              imagePool: productImages,
            });
      }

      const fittedBlocks = fitBlocksToCount(generated.blocks, cardCount);
      setTone(generated.tone);
      setBlocks(normalizeBlocksForEdit(fittedBlocks));
      setDocumentUpdatedAt(generated.updatedAt || new Date().toISOString());
      setFallbackHtml(
        renderProductPageDocumentAsHtml({
          ...generated,
          blocks: fittedBlocks,
        })
      );
    } catch {
      const generated = generateProductPageDocumentFromText(promptText, {
        productName,
        productSummary,
        imagePool: productImages,
      });

      const fittedBlocks = fitBlocksToCount(generated.blocks, cardCount);
      setTone(generated.tone);
      setBlocks(normalizeBlocksForEdit(fittedBlocks));
      setDocumentUpdatedAt(generated.updatedAt || new Date().toISOString());
      setFallbackHtml(
        renderProductPageDocumentAsHtml({
          ...generated,
          blocks: fittedBlocks,
        })
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const applyRecommendedLayout = () => {
    ensureCardModeWithDefault();
    setBlocks((prev) => {
      const hero = prev.find((item) => item.type === 'hero');
      const cta = prev.find((item) => item.type === 'cta');
      const center = prev.filter((item) => item.id !== hero?.id && item.id !== cta?.id);
      const next = [
        ...(hero ? [hero] : []),
        ...center.map((item, index) => ({
          ...item,
          type: index === 0 ? 'benefits' : item.type,
        })),
        ...(cta ? [cta] : []),
      ];
      return next.length ? next : prev;
    });
  };

  const effectivePreviewDoc =
    currentDocument || createFallbackDoc(productName, productSummary, productImages);

  return (
    <section className="rounded-2xl border border-slate-200 p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-slate-900">Gamma AI 卡片商品頁</h4>
          <p className="mt-1 text-xs text-slate-500">
            純文字輸入產生區塊、拖曳排序、換風格，並即時預覽手機版與桌機版。
          </p>
        </div>
        {!isCardModeEnabled && (
          <button
            type="button"
            onClick={ensureCardModeWithDefault}
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            啟用卡片模式
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              純文字輸入
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={5}
              placeholder="輸入商品介紹、賣點、促銷重點，例如：\n- 2025 WCE 聯名限定\n- 送禮質感包裝\n- 三層風味：花香、柑橘、可可"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={preserveFullContent}
                  onChange={(e) => setPreserveFullContent(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                完整保留模式（不摘要）
              </label>
              <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5">
                <label className="text-xs text-slate-500">卡片數</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={cardCount}
                  onChange={(e) => setCardCount(Math.min(8, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-14 border-0 bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={generateCardsFromText}
                disabled={!promptText.trim() || isGenerating}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? '生成中...' : '自動產生商品頁區塊'}
              </button>
              <button
                type="button"
                onClick={applyRecommendedLayout}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Wand2 className="h-4 w-4" />
                AI 推薦版面
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {[...new Set(productImages.filter(Boolean))].slice(0, 8).map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() =>
                    setBlocks((prev) =>
                      prev.map((block, blockIndex) => ({
                        ...block,
                        imageUrl: block.imageUrl || imageUrl || productImages[blockIndex % Math.max(1, productImages.length)],
                      }))
                    )
                  }
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left hover:border-slate-400"
                >
                  <img src={imageUrl} alt={`範例圖 ${index + 1}`} className="h-16 w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">一鍵換風格</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                Object.keys(PRODUCT_PAGE_TONE_LABEL) as Array<ProductPageTone>
              ).map((toneKey) => (
                <button
                  key={toneKey}
                  type="button"
                  onClick={() => setToneAndEnable(toneKey)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    tone === toneKey
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {PRODUCT_PAGE_TONE_LABEL[toneKey]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">卡片拖曳排序</p>
              <button
                type="button"
                onClick={addBlock}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                新增卡片
              </button>
            </div>

            <div className="space-y-3">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  draggable
                  onDragStart={() => setDraggingId(block.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDropOn(block.id)}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-slate-400" />
                      <select
                        value={block.type}
                        onChange={(event) =>
                          updateBlock(block.id, (current) => ({
                            ...current,
                            type: event.target.value as ProductPageBlock['type'],
                          }))
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                      >
                        {blockTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlockByStep(block.id, -1)}
                        disabled={index === 0}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move block up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlockByStep(block.id, 1)}
                        disabled={index === blocks.length - 1}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move block down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={block.title}
                      onChange={(event) =>
                        updateBlock(block.id, (current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="卡片標題"
                      className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
                    />
                    <RichTextEditor
                      value={block.body}
                      onChange={(nextValue) =>
                        updateBlock(block.id, (current) => ({ ...current, body: nextValue }))
                      }
                      placeholder="卡片內容"
                      minHeightClassName="min-h-[140px]"
                    />
                    <div className="rounded-lg border border-slate-200 p-2.5">
                      <ImageUpload
                        label="AI 預設圖片（可手動替換）"
                        value={block.imageUrl || ''}
                        onChange={(url) =>
                          updateBlock(block.id, (current) => ({
                            ...current,
                            imageUrl: url,
                          }))
                        }
                      />
                    </div>
                    <RichTextEditor
                      value={highlightsToEditorHtml(block.highlights || [])}
                      onChange={(nextValue) =>
                        updateBlock(block.id, (current) => ({
                          ...current,
                          highlights: highlightsFromEditorHtml(nextValue),
                        }))
                      }
                      placeholder="賣點列表（每行一點）"
                      minHeightClassName="min-h-[110px]"
                    />
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input
                        type="text"
                        value={block.buttonText || ''}
                        onChange={(event) =>
                          updateBlock(block.id, (current) => ({
                            ...current,
                            buttonText: event.target.value,
                          }))
                        }
                        placeholder="按鈕文字（CTA 卡片用）"
                        className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={block.buttonHref || ''}
                        onChange={(event) =>
                          updateBlock(block.id, (current) => ({
                            ...current,
                            buttonHref: event.target.value,
                          }))
                        }
                        placeholder="按鈕連結（預設 #buy-now）"
                        className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {blocks.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  還沒有卡片內容，先輸入文字並按「自動產生商品頁區塊」。
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setEditorMode('cards')}
              className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-medium ${
                editorMode === 'cards' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              卡片編輯
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('html')}
              className={`inline-flex h-8 items-center rounded-md px-3 text-xs font-medium ${
                editorMode === 'html' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              HTML 編輯
            </button>
          </div>

          {editorMode === 'html' && (
            <textarea
              value={fallbackHtml}
              onChange={(e) => setFallbackHtml(e.target.value)}
              rows={10}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-6"
              placeholder="可直接編輯產品內容 HTML"
            />
          )}

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">商品頁即時預覽</p>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
              <button
                type="button"
                onClick={() => setPreviewMode('desktop')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium ${
                  previewMode === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                桌機
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('mobile')}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium ${
                  previewMode === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                手機
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className={previewModeStyles[previewMode]}>
              <ProductPageCardRenderer
                document={effectivePreviewDoc}
                layoutMode={previewMode === 'mobile' ? 'mobile' : 'desktop'}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
