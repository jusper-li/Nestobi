import { useState, useEffect } from 'react';
import { Plus, Search, CreditCard as Edit, Trash2, Package, X, Save, FolderTree, Tag, Image as ImageIcon, Settings, Database, ChevronUp, ChevronDown, Link2, Wand2 } from 'lucide-react';
import { isMissingSupabaseTableError, isSupabaseContentEnabled, supabase } from '../../lib/supabase';
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from '../../data/fallbackProducts';
import ImageUpload from '../ImageUpload';
import ProductPageBuilderEditor from './ProductPageBuilderEditor';
import {
  extractProductPageDocument,
  generateProductPageDocumentFromText,
  renderProductPageDocumentAsHtml,
  serializeProductPageDocument,
} from '../../lib/productPageCards';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_id: string | null;
  is_active: boolean;
}

interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  summary: string;
  description: string;
  content: string;
  price: number;
  sale_price: number | null;
  cost_price: number;
  member_price: number | null;
  stock: number;
  sku: string;
  images: string[];
  specifications: Specification[];
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_image: string;
  og_title: string;
  og_description: string;
  published_at: string | null;
  unpublished_at: string | null;
  is_hidden: boolean;
  is_active: boolean;
  is_featured: boolean;
  source?: 'database' | 'local';
}

interface Specification {
  name: string;
  options: string[];
}

type FallbackProduct = (typeof FALLBACK_PRODUCTS)[number];

const PRODUCT_ORDER_SETTING_KEY = 'product_order';

const stripHtmlTags = (value: string) =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildSeoDraft = (payload: {
  name: string;
  summary: string;
  description: string;
  content: string;
}) => {
  const extracted = extractProductPageDocument(payload.content || '');
  const blockTexts = (extracted.document?.blocks || [])
    .flatMap((block) => [block.title, block.body, ...(block.highlights || [])])
    .filter((item): item is string => Boolean(item && item.trim()))
    .map((item) => item.trim());

  const plainText = stripHtmlTags(extracted.fallbackHtml || payload.content || '');
  const firstLine = blockTexts[0] || payload.name || '';
  const descriptionSource =
    payload.summary ||
    payload.description ||
    blockTexts.slice(1, 5).join(' ') ||
    plainText;

  const keywords = Array.from(
    new Set(
      [
        payload.name,
        ...blockTexts.slice(0, 6),
        'Sonpin',
        '精品咖啡',
      ]
        .flatMap((item) => item.split(/[、,，｜|／/\s]+/))
        .map((item) => item.trim())
        .filter((item) => item.length >= 2)
    )
  )
    .slice(0, 12)
    .join(', ');

  return {
    seo_title: firstLine.slice(0, 65),
    seo_description: descriptionSource.slice(0, 160),
    seo_keywords: keywords,
    og_title: firstLine.slice(0, 65),
    og_description: descriptionSource.slice(0, 160),
  };
};

const LOCAL_CATEGORIES: Category[] = FALLBACK_CATEGORIES.map((category) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  description: '',
  parent_id: null,
  is_active: true,
}));

const toSpecificationOptions = (specification: FallbackProduct['specifications'][number]) => {
  if ('options' in specification && Array.isArray(specification.options)) return specification.options;
  if ('value' in specification && specification.value) return [specification.value];
  return [];
};

const toBackofficeProduct = (product: FallbackProduct): Product => ({
  id: product.id,
  category_id: product.category_id,
  name: product.name,
  slug: product.slug,
  summary: product.summary || '',
  description: product.description || '',
  content: product.content || '',
  price: product.price,
  sale_price: product.sale_price,
  cost_price: 0,
  member_price: product.member_price,
  stock: product.stock,
  sku: product.sku || '',
  images: product.images || [],
  specifications: (product.specifications || []).map((specification) => ({
    name: specification.name || '',
    options: toSpecificationOptions(specification),
  })),
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  og_image: '',
  og_title: '',
  og_description: '',
  published_at: null,
  unpublished_at: null,
  is_hidden: false,
  is_active: true,
  is_featured: false,
  source: 'local',
});

const getProductOrderKey = (product: Product) => product.slug || product.id;

const parseProductOrder = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (value && typeof value === 'object') {
    const maybeOrder = value as { slugs?: unknown; ids?: unknown };
    if (Array.isArray(maybeOrder.slugs)) return parseProductOrder(maybeOrder.slugs);
    if (Array.isArray(maybeOrder.ids)) return parseProductOrder(maybeOrder.ids);
  }

  return [];
};

const sortProductsByOrder = (items: Product[], order: string[]) => {
  const originalIndex = new Map(items.map((item, index) => [item.id, index]));
  const orderIndex = new Map(order.map((key, index) => [key, index]));

  return [...items].sort((a, b) => {
    const aIndex = orderIndex.get(getProductOrderKey(a)) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderIndex.get(getProductOrderKey(b)) ?? Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) return aIndex - bIndex;
    return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
  });
};

export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isLocalCatalog, setIsLocalCatalog] = useState(false);
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [reorderingProductId, setReorderingProductId] = useState<string | null>(null);
  const [productEditorMode, setProductEditorMode] = useState<'manual' | 'ai_text' | 'ai_url' | 'ai_cards'>('manual');
  const [aiInput, setAiInput] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [aiSourceUrl, setAiSourceUrl] = useState('');
  const [isCrawlingUrl, setIsCrawlingUrl] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    summary: '',
    description: '',
    content: '',
    category_id: '',
    price: 0,
    sale_price: null as number | null,
    cost_price: 0,
    member_price: null as number | null,
    stock: 0,
    sku: '',
    images: [] as string[],
    specifications: [] as Specification[],
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    og_image: '',
    og_title: '',
    og_description: '',
    published_at: '',
    unpublished_at: '',
    is_hidden: false,
    is_active: true,
    is_featured: false,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    parent_id: null as string | null,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!isSupabaseContentEnabled) {
      loadLocalCatalog();
      setLoading(false);
      return;
    }

    await Promise.all([loadProducts(), loadCategories(), loadProductOrder()]);
    setLoading(false);
  };

  const loadLocalCatalog = () => {
    const localProducts = FALLBACK_PRODUCTS.map(toBackofficeProduct);
    setProducts(localProducts);
    setCategories(LOCAL_CATEGORIES);
    setProductOrder(localProducts.map(getProductOrderKey));
    setIsLocalCatalog(true);
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalizedProducts = (data || []).map(product => ({
        ...product,
        images: Array.isArray(product.images) ? product.images : [],
        specifications: Array.isArray(product.specifications)
          ? product.specifications.map((spec: any) => ({
              name: spec?.name || '',
              options: Array.isArray(spec?.options) ? spec.options : []
            }))
          : []
      }));

      setProducts(normalizedProducts);
      setIsLocalCatalog(false);
    } catch (error) {
      if (isMissingSupabaseTableError(error)) {
        loadLocalCatalog();
        return;
      }
      console.error('Failed to load products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      if (isMissingSupabaseTableError(error)) {
        loadLocalCatalog();
        return;
      }
      console.error('Failed to load categories:', error);
    }
  };

  const loadProductOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', PRODUCT_ORDER_SETTING_KEY)
        .limit(1);

      if (error) throw error;

      setProductOrder(parseProductOrder(data?.[0]?.setting_value));
    } catch (error) {
      if (isMissingSupabaseTableError(error)) {
        setProductOrder([]);
        return;
      }
      console.error('Failed to load product order:', error);
      setProductOrder([]);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const generateUniqueSlug = async (baseSlug: string, excludeId?: string) => {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const query = supabase
        .from('products')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query.neq('id', excludeId);
      }

      const { data } = await query;

      if (!data || data.length === 0) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  };

  const generateUniqueCategorySlug = async (baseSlug: string, excludeId?: string) => {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const query = supabase
        .from('categories')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query.neq('id', excludeId);
      }

      const { data } = await query;

      if (!data || data.length === 0) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  };

  const formatDatetimeLocal = (datetime: string | null): string => {
    if (!datetime) return '';
    try {
      const date = new Date(datetime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const handleProductFormChange = (field: string, value: any) => {
    setProductForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'name' && !editingProduct) {
        next.slug = generateSlug(String(value || ''));
      }

      if (field === 'name' || field === 'summary' || field === 'description' || field === 'content') {
        const seoDraft = buildSeoDraft({
          name: String(next.name || ''),
          summary: String(next.summary || ''),
          description: String(next.description || ''),
          content: String(next.content || ''),
        });

        next.seo_title = next.seo_title || seoDraft.seo_title;
        next.seo_description = next.seo_description || seoDraft.seo_description;
        next.seo_keywords = next.seo_keywords || seoDraft.seo_keywords;
        next.og_title = next.og_title || seoDraft.og_title;
        next.og_description = next.og_description || seoDraft.og_description;
      }

      return next;
    });
  };

  const handleCategoryFormChange = (field: string, value: any) => {
    setCategoryForm({ ...categoryForm, [field]: value });
    if (field === 'name' && !editingCategory) {
      setCategoryForm({ ...categoryForm, name: value, slug: generateSlug(value) });
    }
  };

  const addImage = (url: string) => {
    setProductForm({ ...productForm, images: [...productForm.images, url] });
  };

  const removeImage = (index: number) => {
    const newImages = [...productForm.images];
    newImages.splice(index, 1);
    setProductForm({ ...productForm, images: newImages });
  };

  const addSpecification = () => {
    setProductForm({
      ...productForm,
      specifications: [...productForm.specifications, { name: '', options: [] }],
    });
  };

  const updateSpecification = (index: number, field: 'name' | 'options', value: any) => {
    const newSpecs = [...productForm.specifications];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setProductForm({ ...productForm, specifications: newSpecs });
  };

  const removeSpecification = (index: number) => {
    const newSpecs = [...productForm.specifications];
    newSpecs.splice(index, 1);
    setProductForm({ ...productForm, specifications: newSpecs });
  };

const extractPriceFromText = (text: string): number | null => {
    const matched = text.match(/(?:NT\$|NTD|\$)\s*([0-9][0-9,]*)/i);
    if (!matched?.[1]) return null;
    const value = Number(matched[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

const PRODUCT_SECTION_HEADINGS = [
  '產地故事',
  '風味層次解析',
  '風味筆記',
  '職人監製',
  '冠軍工藝',
  '聯名企劃',
  '咖啡資訊',
  '品牌理念',
];

const parseStructuredProductText = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const findSection = (heading: string) => {
    const start = lines.findIndex((line) => line.includes(heading));
    if (start < 0) return [] as string[];
    const result: string[] = [];
    for (let i = start + 1; i < lines.length; i += 1) {
      if (PRODUCT_SECTION_HEADINGS.some((h) => lines[i].includes(h))) break;
      result.push(lines[i]);
    }
    return result.filter(Boolean);
  };

  const readValueLine = (key: string) => {
    const idx = lines.findIndex((line) => line === key);
    return idx >= 0 ? (lines[idx + 1] || '').trim() : '';
  };

  const title = lines[0] || '';
  const subtitle = lines[1] || '';
  const originStory = findSection('產地故事');
  const flavorFlow = findSection('風味層次解析');
  const flavorNotes = findSection('風味筆記');
  const craft = [...findSection('職人監製'), ...findSection('冠軍工藝')];
  const collab = findSection('聯名企劃');
  const concept = findSection('品牌理念');

  const infoRows = [
    readValueLine('國家') && `國家｜${readValueLine('國家')}`,
    readValueLine('產區') && `產區｜${readValueLine('產區')}`,
    readValueLine('莊園') && `莊園｜${readValueLine('莊園')}`,
    readValueLine('品種') && `品種｜${readValueLine('品種')}`,
    readValueLine('處理法') && `處理法｜${readValueLine('處理法')}`,
    readValueLine('烘焙度') && `烘焙度｜${readValueLine('烘焙度')}`,
    readValueLine('規格') && `規格｜${readValueLine('規格')}`,
  ].filter(Boolean);

  return {
    title,
    subtitle,
    originStory,
    flavorFlow,
    flavorNotes,
    craft,
    collab,
    concept,
    infoRows,
  };
};

const rebuildDocWithStructuredText = (doc: any, sourceText: string) => {
  const parsed = parseStructuredProductText(sourceText);
  if (!doc?.blocks || !Array.isArray(doc.blocks)) return doc;

  const nextBlocks = [...doc.blocks];
  const updateAt = (index: number, patch: Record<string, unknown>) => {
    if (!nextBlocks[index]) return;
    nextBlocks[index] = { ...nextBlocks[index], ...patch };
  };

  updateAt(0, {
    title: parsed.title || nextBlocks[0]?.title,
    body: parsed.subtitle || nextBlocks[0]?.body,
    badge: '品牌精選',
  });

  updateAt(1, {
    title: '風味層次解析',
    body: parsed.flavorFlow.slice(0, 2).join('\n') || nextBlocks[1]?.body,
    highlights: parsed.flavorFlow.slice(0, 8),
  });

  updateAt(2, {
    title: '產地故事',
    body: parsed.originStory.slice(0, 4).join('\n') || nextBlocks[2]?.body,
  });

  updateAt(3, {
    title: '風味筆記',
    body: parsed.flavorNotes.slice(0, 3).join('\n') || nextBlocks[3]?.body,
    highlights: parsed.flavorNotes.slice(0, 8),
  });

  updateAt(4, {
    title: '職人監製與聯名企劃',
    body: [...parsed.craft, ...parsed.collab].slice(0, 6).join('\n') || nextBlocks[4]?.body,
  });

  if (nextBlocks[5] && nextBlocks[5].type !== 'cta') {
    updateAt(5, {
      title: '咖啡資訊',
      body: parsed.infoRows.join('\n') || nextBlocks[5]?.body,
      highlights: parsed.concept.slice(0, 4),
    });
  }

  return {
    ...doc,
    blocks: nextBlocks,
    updatedAt: new Date().toISOString(),
  };
};

  const applyGeneratedProductFromText = (prompt: string, sourceUrl?: string) => {
    const lines = prompt
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const title = lines[0] || productForm.name || 'Sonpin 商品';
    const summary = lines.find((line) => line.length >= 16) || lines[1] || productForm.summary || '';
    const bodyLines = lines.slice(1, 8);
    const description = bodyLines.join('\n') || summary || productForm.description || '';
    const inferredPrice = extractPriceFromText(prompt);
    const nextSlug = generateSlug(title);

    const generatedDoc = generateProductPageDocumentFromText(prompt, {
      productName: title,
      productSummary: summary || description,
      imagePool: productForm.images,
    });
    const html = renderProductPageDocumentAsHtml(generatedDoc);
    const content = serializeProductPageDocument(generatedDoc, html);

    setProductForm((prev) => ({
      ...prev,
      name: prev.name || title,
      slug: prev.slug || nextSlug,
      summary: prev.summary || summary,
      description: prev.description || description,
      seo_title: prev.seo_title || title,
      seo_description: prev.seo_description || summary || description.slice(0, 120),
      seo_keywords:
        prev.seo_keywords ||
        Array.from(new Set([title, 'Sonpin', '精品咖啡', '禮盒'].filter(Boolean))).join(', '),
      content,
      price: inferredPrice ?? prev.price,
      og_title: prev.og_title || title,
      og_description: prev.og_description || summary || description.slice(0, 120),
      og_image: prev.og_image || prev.images[0] || '',
    }));

    if (sourceUrl && !productForm.specifications.some((spec) => spec.name === '資料來源')) {
      setProductForm((prev) => ({
        ...prev,
        specifications: [
          ...prev.specifications,
          { name: '資料來源', options: [sourceUrl] },
        ],
      }));
    }
  };

  const autoFillProductByAiInput = async () => {
    const prompt = aiInput.trim();
    if (!prompt) {
      alert('請先輸入商品資訊再產生');
      return;
    }

    setIsGeneratingCopy(true);
    try {
      applyGeneratedProductFromText(prompt);
    } finally {
      setIsGeneratingCopy(false);
    }
  };
  void autoFillProductByAiInput;

  const applyGeneratedProductFromTextEnhanced = (prompt: string, sourceUrl?: string) => {
    const lines = prompt
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const title = lines[0] || productForm.name || 'Sonpin 商品';
    const summary = lines.find((line) => line.length >= 16) || lines[1] || productForm.summary || '';
    const description = lines.slice(1, 12).join('\n') || summary || productForm.description || '';
    const inferredPrice = extractPriceFromText(prompt);
    const nextSlug = generateSlug(title);

    const generatedDoc = generateProductPageDocumentFromText(prompt, {
      productName: title,
      productSummary: summary || description,
      imagePool: productForm.images,
    });
    const structuredDoc = rebuildDocWithStructuredText(generatedDoc, prompt);
    const html = renderProductPageDocumentAsHtml(structuredDoc);
    const content = serializeProductPageDocument(structuredDoc, html);
    const parsed = parseStructuredProductText(prompt);
    const betterSummary = parsed.subtitle || summary;
    const betterDescription =
      parsed.originStory.slice(0, 2).join('\n') ||
      description;

    setProductForm((prev) => ({
      ...prev,
      name: title,
      slug: nextSlug || prev.slug,
      summary: betterSummary,
      description: betterDescription,
      seo_title: title,
      seo_description: betterSummary || betterDescription.slice(0, 120),
      seo_keywords: Array.from(new Set([title, 'Sonpin', '精品咖啡', '禮盒'].filter(Boolean))).join(', '),
      content,
      price: inferredPrice ?? prev.price,
      og_title: title,
      og_description: betterSummary || betterDescription.slice(0, 120),
      og_image: prev.og_image || prev.images[0] || '',
      specifications:
        sourceUrl && !prev.specifications.some((spec) => spec.name === '資料來源')
          ? [...prev.specifications, { name: '資料來源', options: [sourceUrl] }]
          : prev.specifications,
    }));
  };

  const autoFillProductByAiInputEnhanced = async () => {
    const prompt = aiInput.trim();
    if (!prompt) {
      alert('請先輸入商品資訊再產生');
      return;
    }
    setIsGeneratingCopy(true);
    try {
      applyGeneratedProductFromTextEnhanced(prompt);
      setProductEditorMode('manual');
    } finally {
      setIsGeneratingCopy(false);
    }
  };
  void autoFillProductByAiInputEnhanced;

  const handleAiGenerateClick = async () => {
    const prompt = aiInput.trim();
    if (!prompt) {
      alert('請先輸入商品資訊再產生');
      return;
    }
    setIsGeneratingCopy(true);
    try {
      applyGeneratedProductFromTextEnhanced(prompt);
      setProductEditorMode('manual');
      alert('已完成 AI 回填，請在手動編輯確認內容。');
    } catch (error) {
      console.error('AI 生成失敗:', error);
      alert('AI 生成失敗，請再試一次。');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const normalizeUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchCrawledText = async (targetUrl: string) => {
    const stripped = targetUrl.replace(/^https?:\/\//i, '');
    const candidates = [
      `https://r.jina.ai/http://${stripped}`,
      `https://r.jina.ai/http://${stripped}?_=${Date.now()}`,
    ];

    let bestText = '';
    for (const endpoint of candidates) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;
        const text = (await response.text()).trim();
        if (text.length > bestText.length) bestText = text;
      } catch {
        // Try next endpoint
      }

      // Some pages are rendered progressively in crawler cache; wait then retry.
      await sleep(1200);
    }

    return bestText;
  };

  const crawlUrlAndAutoFill = async () => {
    const normalizedUrl = normalizeUrl(aiSourceUrl);
    if (!normalizedUrl) {
      alert('請先輸入網址');
      return;
    }

    setIsCrawlingUrl(true);
    try {
      const crawledText = await fetchCrawledText(normalizedUrl);
      if (!crawledText) {
        throw new Error('Empty content');
      }

      const cappedText = crawledText.slice(0, 28000);
      setAiInput(cappedText);
      applyGeneratedProductFromTextEnhanced(cappedText, normalizedUrl);
      setProductEditorMode('manual');
    } catch (error) {
      console.error('Failed to crawl url content:', error);
      alert('抓取網址內容失敗，請確認網址可公開存取，或改用 AI 文字生成模式。');
    } finally {
      setIsCrawlingUrl(false);
    }
  };

  const saveProduct = async () => {
    try {
      if (isLocalCatalog) {
        alert('目前商品管理顯示的是前台本地展示商品。若要在後台新增或編輯商品，請先建立 Supabase products/categories 資料表並匯入商品資料。');
        return;
      }

      if (!productForm.name?.trim()) {
        alert('請輸入商品名稱');
        return;
      }
      if (!productForm.slug?.trim()) {
        alert('請輸入商品 Slug');
        return;
      }

      let productData = {
        ...productForm,
        name: productForm.name.trim(),
        slug: productForm.slug.trim(),
        category_id: productForm.category_id || null,
        sale_price: productForm.sale_price || null,
        member_price: productForm.member_price || null,
        sku: productForm.sku?.trim() || null,
        published_at: productForm.published_at ? new Date(productForm.published_at).toISOString() : null,
        unpublished_at: productForm.unpublished_at ? new Date(productForm.unpublished_at).toISOString() : null,
      };

      if (editingProduct) {
        const uniqueSlug = await generateUniqueSlug(productForm.slug, editingProduct.id);
        if (uniqueSlug !== productForm.slug) {
          productData = { ...productData, slug: uniqueSlug };
        }

        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) {
          if (error.code === '23505' && error.message?.includes('sku')) {
            alert('SKU 已被使用，請使用不同的 SKU 或留空');
            return;
          }
          throw error;
        }

        if (uniqueSlug !== productForm.slug) {
          alert(`Slug 已自動調整為：${uniqueSlug}`);
        }
      } else {
        const uniqueSlug = await generateUniqueSlug(productForm.slug);
        if (uniqueSlug !== productForm.slug) {
          productData = { ...productData, slug: uniqueSlug };
        }

        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) {
          if (error.code === '23505' && error.message?.includes('sku')) {
            alert('SKU 已被使用，請使用不同的 SKU 或留空');
            return;
          }
          throw error;
        }

        if (uniqueSlug !== productForm.slug) {
          alert(`Slug 已自動調整為：${uniqueSlug}`);
        }
      }

      await loadProducts();
      closeProductForm();
    } catch (error: any) {
      console.error('Failed to save product:', error);
      alert('儲存失敗：' + (error?.message || '未知錯誤'));
    }
  };

  const saveCategory = async () => {
    try {
      if (isLocalCatalog) {
        alert('目前分類管理顯示的是前台本地展示分類。若要在後台新增或編輯分類，請先啟用 Supabase 商品資料表。');
        return;
      }

      if (!categoryForm.name?.trim()) {
        alert('請輸入分類名稱');
        return;
      }
      if (!categoryForm.slug?.trim()) {
        alert('請輸入分類 Slug');
        return;
      }

      let categoryData = {
        ...categoryForm,
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim(),
      };

      if (editingCategory) {
        const uniqueSlug = await generateUniqueCategorySlug(categoryForm.slug, editingCategory.id);
        if (uniqueSlug !== categoryForm.slug) {
          categoryData = { ...categoryData, slug: uniqueSlug };
        }

        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;

        if (uniqueSlug !== categoryForm.slug) {
          alert(`Slug 已自動調整為：${uniqueSlug}`);
        }
      } else {
        const uniqueSlug = await generateUniqueCategorySlug(categoryForm.slug);
        if (uniqueSlug !== categoryForm.slug) {
          categoryData = { ...categoryData, slug: uniqueSlug };
        }

        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);

        if (error) throw error;

        if (uniqueSlug !== categoryForm.slug) {
          alert(`Slug 已自動調整為：${uniqueSlug}`);
        }
      }

      await loadCategories();
      closeCategoryForm();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      alert('儲存失敗：' + (error?.message || '未知錯誤'));
    }
  };

  const deleteProduct = async (id: string) => {
    if (isLocalCatalog) {
      alert('本地展示商品不能從後台刪除。請在資料庫商品管理啟用後再操作，或由工程端更新 fallbackProducts.ts。');
      return;
    }

    if (!confirm('確定要刪除此商品嗎？')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const saveProductOrder = async (nextOrder: string[]) => {
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        {
          setting_key: PRODUCT_ORDER_SETTING_KEY,
          setting_value: nextOrder,
        },
        { onConflict: 'setting_key' }
      );

    if (error) throw error;
  };

  const moveProduct = async (product: Product, direction: -1 | 1) => {
    if (isLocalCatalog) {
      alert('本地展示商品排序僅供查看；匯入 Supabase 後即可調整正式排序。');
      return;
    }

    if (reorderingProductId) return;

    const orderedProducts = sortProductsByOrder(products, productOrder);
    const currentIndex = orderedProducts.findIndex((item) => item.id === product.id);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedProducts.length) return;

    const nextProducts = [...orderedProducts];
    const [movedProduct] = nextProducts.splice(currentIndex, 1);
    nextProducts.splice(targetIndex, 0, movedProduct);

    const previousOrder = productOrder;
    const nextOrder = nextProducts.map(getProductOrderKey);

    setReorderingProductId(product.id);
    setProductOrder(nextOrder);

    try {
      await saveProductOrder(nextOrder);
    } catch (error: any) {
      setProductOrder(previousOrder);
      console.error('Failed to save product order:', error);
      alert('商品排序儲存失敗：' + (error?.message || '未知錯誤'));
    } finally {
      setReorderingProductId(null);
    }
  };

  const deleteCategory = async (id: string) => {
    if (isLocalCatalog) {
      alert('本地展示分類不能從後台刪除。請在資料庫商品管理啟用後再操作。');
      return;
    }

    if (!confirm('確定要刪除此分類嗎？')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const openProductForm = (product?: Product) => {
    if (isLocalCatalog) {
      alert(product
        ? '目前這 12 件商品是前台本地展示資料，後台先提供查看清單；若要編輯，需將商品匯入 Supabase products 資料表。'
        : '目前商品清單來自前台本地展示資料，後台先提供查看清單；若要新增正式商品，需先建立 Supabase products/categories 資料表。'
      );
      return;
    }

    setProductEditorMode('manual');
    setAiInput('');
    setAiSourceUrl('');

    if (product) {
      setEditingProduct(product);
      const specs = Array.isArray(product.specifications)
        ? product.specifications.map(spec => ({
            name: spec.name || '',
            options: Array.isArray(spec.options) ? spec.options : []
          }))
        : [];

      setProductForm({
        name: product.name,
        slug: product.slug,
        summary: product.summary || '',
        description: product.description || '',
        content: product.content || '',
        category_id: product.category_id || '',
        price: product.price,
        sale_price: product.sale_price,
        cost_price: product.cost_price || 0,
        member_price: product.member_price,
        stock: product.stock,
        sku: product.sku || '',
        images: product.images || [],
        specifications: specs,
        seo_title: product.seo_title || '',
        seo_description: product.seo_description || '',
        seo_keywords: product.seo_keywords || '',
        og_image: product.og_image || '',
        og_title: product.og_title || '',
        og_description: product.og_description || '',
        published_at: formatDatetimeLocal(product.published_at),
        unpublished_at: formatDatetimeLocal(product.unpublished_at),
        is_hidden: product.is_hidden,
        is_active: product.is_active,
        is_featured: product.is_featured,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        slug: '',
        summary: '',
        description: '',
        content: '',
        category_id: '',
        price: 0,
        sale_price: null,
        cost_price: 0,
        member_price: null,
        stock: 0,
        sku: '',
        images: [],
        specifications: [],
        seo_title: '',
        seo_description: '',
        seo_keywords: '',
        og_image: '',
        og_title: '',
        og_description: '',
        published_at: '',
        unpublished_at: '',
        is_hidden: false,
        is_active: true,
        is_featured: false,
      });
    }
    setShowProductForm(true);
  };

  const closeProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductEditorMode('manual');
    setAiInput('');
    setAiSourceUrl('');
  };

  const openCategoryForm = (category?: Category) => {
    if (isLocalCatalog) {
      alert(category
        ? '目前分類是前台本地展示資料，需啟用 Supabase categories 資料表後才能編輯。'
        : '目前分類來自前台本地展示資料，需啟用 Supabase categories 資料表後才能新增。'
      );
      return;
    }

    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parent_id: category.parent_id,
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        slug: '',
        description: '',
        parent_id: null,
        is_active: true,
      });
    }
    setShowCategoryForm(true);
  };

  const closeCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || '-';
  };

  const orderedProducts = sortProductsByOrder(products, productOrder);
  const filteredProducts = orderedProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const getProductIndex = (product: Product) => orderedProducts.findIndex((item) => item.id === product.id);
  const canMoveProduct = (product: Product, direction: -1 | 1) => {
    const index = getProductIndex(product);
    if (index < 0) return false;
    return direction === -1 ? index > 0 : index < orderedProducts.length - 1;
  };

  if (loading) {
    return <div className="p-6">載入中...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">商品管理</h1>
          <p className="text-slate-600 mt-2">管理所有商品與分類</p>
        </div>
        <button
          onClick={() => activeTab === 'products' ? openProductForm() : openCategoryForm()}
          title={isLocalCatalog ? '目前為本地展示清單，需匯入 Supabase 後才能新增' : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isLocalCatalog
              ? 'bg-slate-200 text-slate-500 hover:bg-slate-200'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'products' ? '新增商品' : '新增分類'}
        </button>
      </div>

      {isLocalCatalog && (
        <div className="mb-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Database className="mt-0.5 h-5 w-5 flex-none" />
          <div>
            <div className="font-semibold">目前顯示前台本地商品清單</div>
            <p className="mt-1 text-amber-800">
              已載入 {products.length} 件 Y&M COFFEE 商品與 {categories.length} 個分類。Supabase products/categories 尚未啟用或缺少資料表，後台暫時為查看模式；正式新增、編輯、刪除需先匯入資料庫。
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'products'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            商品列表
          </div>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'categories'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            分類管理
          </div>
        </button>
      </div>

      {activeTab === 'products' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋商品..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              使用上移 / 下移調整前台商品顯示順序，儲存後商城預設排序會同步更新。
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">商品</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">分類</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">價格</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">庫存</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">狀態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-8 h-8 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-900">{product.name}</span>
                            {product.source === 'local' && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">本地展示</span>
                            )}
                          </div>
                          {product.is_featured && (
                            <span className="text-xs text-orange-600 font-medium">精選商品</span>
                          )}
                          <div className="mt-1 text-xs text-slate-400">排序 {getProductIndex(product) + 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{getCategoryName(product.category_id)}</td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">NT${product.price}</div>
                      {product.sale_price && (
                        <div className="text-xs text-red-600">特價 NT${product.sale_price}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`${product.stock < 10 ? 'text-red-600' : 'text-slate-900'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {product.is_active ? '上架中' : '已下架'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveProduct(product, -1)}
                          disabled={isLocalCatalog || reorderingProductId !== null || !canMoveProduct(product, -1)}
                          aria-label="Move product up"
                          title={isLocalCatalog ? '本地展示商品需匯入資料庫後才能排序' : '上移'}
                          className="p-2 rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveProduct(product, 1)}
                          disabled={isLocalCatalog || reorderingProductId !== null || !canMoveProduct(product, 1)}
                          aria-label="Move product down"
                          title={isLocalCatalog ? '本地展示商品需匯入資料庫後才能排序' : '下移'}
                          className="p-2 rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openProductForm(product)}
                          title={isLocalCatalog ? '本地展示商品需匯入資料庫後才能編輯' : '編輯商品'}
                          className={`p-2 rounded-lg transition-colors ${
                            isLocalCatalog
                              ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          title={isLocalCatalog ? '本地展示商品不能從後台刪除' : '刪除商品'}
                          className={`p-2 rounded-lg transition-colors ${
                            isLocalCatalog
                              ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                              : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">名稱</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">代碼</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">上級分類</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">狀態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{category.name}</span>
                        {isLocalCatalog && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">本地展示</span>
                        )}
                      </div>
                      {category.description && (
                        <div className="text-sm text-slate-500 mt-1">{category.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{category.slug}</td>
                    <td className="px-6 py-4 text-slate-600">{getCategoryName(category.parent_id)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        category.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {category.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openCategoryForm(category)}
                          title={isLocalCatalog ? '本地展示分類需匯入資料庫後才能編輯' : '編輯分類'}
                          className={`p-2 rounded-lg transition-colors ${
                            isLocalCatalog
                              ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          title={isLocalCatalog ? '本地展示分類不能從後台刪除' : '刪除分類'}
                          className={`p-2 rounded-lg transition-colors ${
                            isLocalCatalog
                              ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                              : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full mx-4 my-8">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl z-10">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingProduct ? '編輯商品' : '新增商品'}
              </h2>
              <button onClick={closeProductForm} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="inline-flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {[
                  { key: 'manual', label: '手動編輯' },
                  { key: 'ai_text', label: 'AI 文字生成' },
                  { key: 'ai_url', label: 'AI 網址爬蟲' },
                  { key: 'ai_cards', label: 'AI 卡片排版' },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setProductEditorMode(mode.key as typeof productEditorMode)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      productEditorMode === mode.key
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-8 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  商品圖片
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    {productForm.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img src={image} alt="" className="w-full h-32 object-cover rounded-lg" />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <ImageUpload
                    label="新增圖片"
                    value=""
                    onChange={addImage}
                  />
                </div>
              </div>

              {productEditorMode === 'ai_text' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    AI 文字生成（輸入資訊後自動回填商品欄位）
                  </label>
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    rows={7}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
                    placeholder={'範例：\nReserved for You 限量聯名禮盒\n阿里山精品咖啡豆、藝術家聯名包裝\n送禮、收藏、節慶限定\nNT$ 1280'}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAiGenerateClick}
                      disabled={isGeneratingCopy}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      <Wand2 className="h-4 w-4" />
                      {isGeneratingCopy ? 'AI 生成中...' : 'AI 生成並回填'}
                    </button>
                  </div>
                </div>
              )}

              {productEditorMode === 'ai_url' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    AI 網址爬蟲上架（貼上網址自動抓內容並回填）
                  </label>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      type="text"
                      value={aiSourceUrl}
                      onChange={(e) => setAiSourceUrl(e.target.value)}
                      placeholder="https://www.ynm.com.tw/..."
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={crawlUrlAndAutoFill}
                      disabled={isCrawlingUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      <Link2 className="h-4 w-4" />
                      {isCrawlingUrl ? '爬蟲擷取中...' : '開始爬蟲並回填'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    說明：會先抓取公開頁面文字，再由 AI 產生商品文案、SEO、內容並回填。
                  </p>
                </div>
              )}

              {productEditorMode === 'manual' && (
              <>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  商品資訊
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">商品名稱 *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => handleProductFormChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">網址代碼 (Slug)</label>
                    <input
                      type="text"
                      value={productForm.slug}
                      onChange={(e) => handleProductFormChange('slug', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">分類</label>
                    <select
                      value={productForm.category_id}
                      onChange={(e) => handleProductFormChange('category_id', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">選擇分類</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">商品摘要</label>
                    <textarea
                      value={productForm.summary}
                      onChange={(e) => handleProductFormChange('summary', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">簡短描述</label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => handleProductFormChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">詳細內容 (HTML)</label>
                    <textarea
                      value={productForm.content}
                      onChange={(e) => handleProductFormChange('content', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                      rows={6}
                      placeholder="可輸入 HTML 格式內容"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  價格與庫存
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">原價格 *</label>
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={(e) => handleProductFormChange('price', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">特價 (選填)</label>
                    <input
                      type="number"
                      value={productForm.sale_price || ''}
                      onChange={(e) => handleProductFormChange('sale_price', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">成本價</label>
                    <input
                      type="number"
                      value={productForm.cost_price}
                      onChange={(e) => handleProductFormChange('cost_price', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">會員價 (選填)</label>
                    <input
                      type="number"
                      value={productForm.member_price || ''}
                      onChange={(e) => handleProductFormChange('member_price', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">庫存數量</label>
                    <input
                      type="number"
                      value={productForm.stock}
                      onChange={(e) => handleProductFormChange('stock', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">商品編號 (SKU)</label>
                    <input
                      type="text"
                      value={productForm.sku}
                      onChange={(e) => handleProductFormChange('sku', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  商品規格
                </h3>
                <div className="space-y-4">
                  {productForm.specifications.map((spec, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">規格名稱</label>
                            <input
                              type="text"
                              value={spec.name}
                              onChange={(e) => updateSpecification(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                              placeholder="例如：尺寸"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">選項 (用逗號分隔)</label>
                            <input
                              type="text"
                              value={Array.isArray(spec.options) ? spec.options.join(', ') : ''}
                              onChange={(e) => updateSpecification(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                              placeholder="例如：S, M, L, XL"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeSpecification(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addSpecification}
                    className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:text-slate-700 transition-colors"
                  >
                    + 新增規格
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">SEO 優化設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">SEO 標題</label>
                    <input
                      type="text"
                      value={productForm.seo_title}
                      onChange={(e) => handleProductFormChange('seo_title', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">SEO 描述</label>
                    <textarea
                      value={productForm.seo_description}
                      onChange={(e) => handleProductFormChange('seo_description', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">SEO 關鍵字 (用逗號分隔)</label>
                    <input
                      type="text"
                      value={productForm.seo_keywords}
                      onChange={(e) => handleProductFormChange('seo_keywords', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">社群分享圖片 (OG Image)</label>
                    <ImageUpload
                      label=""
                      value={productForm.og_image}
                      onChange={(url) => handleProductFormChange('og_image', url)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">社群分享標題</label>
                    <input
                      type="text"
                      value={productForm.og_title}
                      onChange={(e) => handleProductFormChange('og_title', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">社群分享描述</label>
                    <textarea
                      value={productForm.og_description}
                      onChange={(e) => handleProductFormChange('og_description', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">商品設定</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">上架時間</label>
                      <input
                        type="datetime-local"
                        value={productForm.published_at}
                        onChange={(e) => handleProductFormChange('published_at', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">下架時間</label>
                      <input
                        type="datetime-local"
                        value={productForm.unpublished_at}
                        onChange={(e) => handleProductFormChange('unpublished_at', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productForm.is_active}
                        onChange={(e) => handleProductFormChange('is_active', e.target.checked)}
                        className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                      />
                      <span className="text-sm font-medium text-slate-700">啟用商品</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productForm.is_hidden}
                        onChange={(e) => handleProductFormChange('is_hidden', e.target.checked)}
                        className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                      />
                      <span className="text-sm font-medium text-slate-700">隱藏商品</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productForm.is_featured}
                        onChange={(e) => handleProductFormChange('is_featured', e.target.checked)}
                        className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                      />
                      <span className="text-sm font-medium text-slate-700">精選商品</span>
                    </label>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>

            {productEditorMode === 'ai_cards' && (
            <div className="px-6 pb-6">
              <ProductPageBuilderEditor
                key={`product-page-builder-${editingProduct?.id || 'new'}`}
                content={productForm.content}
                productName={productForm.name}
                productSummary={productForm.summary || productForm.description}
                productImages={productForm.images}
                onContentChange={(nextValue) => handleProductFormChange('content', nextValue)}
              />
            </div>
            )}

            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white rounded-b-xl">
              <button
                onClick={closeProductForm}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveProduct}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                儲存商品
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingCategory ? '編輯分類' : '新增分類'}
              </h2>
              <button onClick={closeCategoryForm} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">分類名稱 *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => handleCategoryFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">網址代碼 (Slug)</label>
                <input
                  type="text"
                  value={categoryForm.slug}
                  onChange={(e) => handleCategoryFormChange('slug', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">上級分類</label>
                <select
                  value={categoryForm.parent_id || ''}
                  onChange={(e) => handleCategoryFormChange('parent_id', e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">無 (頂層分類)</option>
                  {categories
                    .filter((cat) => !editingCategory || cat.id !== editingCategory.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">分類描述</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => handleCategoryFormChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_active}
                    onChange={(e) => handleCategoryFormChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700">啟用此分類</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={closeCategoryForm}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveCategory}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                儲存分類
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
