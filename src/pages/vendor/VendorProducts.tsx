import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Link,
  Loader2,
  Package,
  Pencil,
  Plus,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import HtmlEditor from '../../components/HtmlEditor';
import MultiImageUpload from '../../components/MultiImageUpload';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';
import { getCategoryOptionLabel, getCategoryPath, sortCategoriesForTree } from '../../lib/categoryTree';
import { sanitizeHtml, sanitizeText } from '../../lib/security';
import { formatCurrency } from '../../lib/utils';

interface Product {
  id: string;
  category_id: string | null;
  vendor_id: string | null;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_url: string;
  images?: string[];
  sku: string;
  origin?: string;
  roast_level?: string;
  processing_method?: string;
  altitude?: string;
  variety?: string[];
  flavor_notes?: string[];
  weight_grams?: number;
  tags?: string[];
  source_url?: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

type ProductForm = {
  category_id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_url: string;
  images: string[];
  sku: string;
  origin: string;
  roast_level: string;
  processing_method: string;
  altitude: string;
  variety: string[];
  flavor_notes: string[];
  weight_grams: number;
  tags: string[];
  source_url: string;
  is_active: boolean;
};

interface BulkProductItem {
  key: string;
  selected: boolean;
  form: ProductForm;
}

const emptyForm: ProductForm = {
  category_id: '',
  name: '',
  description: '',
  price: 0,
  stock_quantity: 0,
  image_url: '',
  images: [],
  sku: '',
  origin: '',
  roast_level: '',
  processing_method: '',
  altitude: '',
  variety: [],
  flavor_notes: [],
  weight_grams: 0,
  tags: [],
  source_url: '',
  is_active: true,
};

const PRODUCT_SELECT = 'id,category_id,vendor_id,name,description,price,stock_quantity,image_url,images,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,is_active';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function arrayInput(value: string[]) {
  return value.join('、');
}

function splitArrayInput(value: string) {
  return value.split(/[、,，/／|｜]/).map(item => item.trim()).filter(Boolean);
}

function rawToForm(raw: Record<string, unknown>, fallbackCategoryId = ''): ProductForm {
  const imageUrl = String(raw.image_url || '');
  const images = toStringArray(raw.images);

  return {
    category_id: String(raw.category_id || fallbackCategoryId || ''),
    name: String(raw.name || ''),
    description: String(raw.description || ''),
    price: Number(raw.price) || 0,
    stock_quantity: Number(raw.stock_quantity) || 0,
    image_url: imageUrl,
    images: images.length > 0 ? images : (imageUrl ? [imageUrl] : []),
    sku: String(raw.sku || ''),
    origin: String(raw.origin || ''),
    roast_level: String(raw.roast_level || ''),
    processing_method: String(raw.processing_method || ''),
    altitude: String(raw.altitude || ''),
    variety: toStringArray(raw.variety),
    flavor_notes: toStringArray(raw.flavor_notes),
    weight_grams: Number(raw.weight_grams) || 0,
    tags: toStringArray(raw.tags),
    source_url: String(raw.source_url || ''),
    is_active: raw.is_active !== false,
  };
}

function extractScrapedProducts(data: unknown): Record<string, unknown>[] {
  if (!isRecord(data)) return [];
  if (Array.isArray(data.products)) return data.products.filter(isRecord);
  if (isRecord(data.result)) {
    if (Array.isArray(data.result.products)) return data.result.products.filter(isRecord);
    if (typeof data.result.name === 'string' && data.result.name.trim()) return [data.result];
  }
  return [];
}

function toProductPayload(form: ProductForm, vendorId: string) {
  const images = Array.from(new Set(form.images.map(image => sanitizeText(image, 1000)).filter(Boolean)));

  return {
    category_id: form.category_id || null,
    vendor_id: vendorId,
    name: sanitizeText(form.name, 160),
    description: sanitizeHtml(form.description),
    price: Number(form.price) || 0,
    stock_quantity: Number(form.stock_quantity) || 0,
    image_url: images[0] || sanitizeText(form.image_url, 1000) || '',
    images,
    sku: sanitizeText(form.sku, 80),
    origin: sanitizeText(form.origin, 120),
    roast_level: sanitizeText(form.roast_level, 80),
    processing_method: sanitizeText(form.processing_method, 120),
    altitude: sanitizeText(form.altitude, 80),
    variety: form.variety.map(item => sanitizeText(item, 80)).filter(Boolean),
    flavor_notes: form.flavor_notes.map(item => sanitizeText(item, 80)).filter(Boolean),
    weight_grams: Number(form.weight_grams) || 0,
    tags: form.tags.map(item => sanitizeText(item, 80)).filter(Boolean),
    source_url: sanitizeText(form.source_url, 1000),
    is_active: form.is_active,
    updated_at: new Date().toISOString(),
  };
}

export default function VendorProducts() {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [descPreview, setDescPreview] = useState(false);

  const [showScraper, setShowScraper] = useState(false);
  const [scraperUrl, setScraperUrl] = useState('');
  const [scraperStep, setScraperStep] = useState<'input' | 'loading' | 'review'>('input');
  const [scraperError, setScraperError] = useState('');
  const [scraperItems, setScraperItems] = useState<BulkProductItem[]>([]);
  const [scraperSaving, setScraperSaving] = useState(false);

  const [showParser, setShowParser] = useState(false);
  const [parserText, setParserText] = useState('');
  const [parserLoading, setParserLoading] = useState(false);
  const [parserError, setParserError] = useState('');

  const categoryById = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id,name,slug,parent_id').order('name', { ascending: true });
    setCategories((data || []) as Category[]);
    return (data || []) as Category[];
  };

  const fetchProducts = async (vid: string) => {
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('vendor_id', vid)
      .order('created_at', { ascending: false });
    setProducts((data || []) as Product[]);
  };

  useEffect(() => {
    if (!user) return;

    supabase.from('vendors').select('id').eq('user_id', user.id).maybeSingle().then(async ({ data }) => {
      if (!data) {
        setNoVendor(true);
        setLoading(false);
        return;
      }

      setVendorId(data.id);
      await Promise.all([fetchProducts(data.id), fetchCategories()]);
      setLoading(false);
    });
  }, [user]);

  const resetForm = () => {
    setForm(emptyForm);
    setDescPreview(false);
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm(rawToForm(product as unknown as Record<string, unknown>));
    setDescPreview(false);
    setShowModal(true);
  };

  const saveForms = async (forms: ProductForm[]) => {
    if (!vendorId) return;

    for (const item of forms) {
      const payload = toProductPayload(item, vendorId);
      if (!payload.name) continue;

      if (payload.source_url) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('source_url', payload.source_url)
          .eq('vendor_id', vendorId)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from('products').update(payload).eq('id', existing.id).eq('vendor_id', vendorId);
          await logAdminAction('update_product', 'products', existing.id, {
            name: payload.name,
            vendor_id: vendorId,
            source: 'bulk_import',
          });
          continue;
        }
      }

      await supabase.from('products').insert(payload);
      await logAdminAction('create_product', 'products', null, {
        name: payload.name,
        vendor_id: vendorId,
        source: 'bulk_import',
      });
    }

    await fetchProducts(vendorId);
  };

  const handleSave = async () => {
    if (!vendorId || !form.name.trim()) return;
    setSaving(true);

    const payload = toProductPayload(form, vendorId);
    if (editing) {
      await supabase.from('products').update(payload).eq('id', editing.id).eq('vendor_id', vendorId);
      await logAdminAction('update_product', 'products', editing.id, { name: payload.name, vendor_id: vendorId });
    } else {
      await supabase.from('products').insert(payload);
      await logAdminAction('create_product', 'products', null, { name: payload.name, vendor_id: vendorId });
    }

    await fetchProducts(vendorId);
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!vendorId || !confirm('確定要刪除這項商品嗎？')) return;
    await supabase.from('products').delete().eq('id', id).eq('vendor_id', vendorId);
    await logAdminAction('delete_product', 'products', id, { vendor_id: vendorId });
    await fetchProducts(vendorId);
  };

  const openScraper = () => {
    setScraperUrl('');
    setScraperStep('input');
    setScraperError('');
    setScraperItems([]);
    setShowScraper(true);
  };

  const handleScrape = async () => {
    if (!scraperUrl.trim()) {
      setScraperError('請輸入商品頁或分類頁網址');
      return;
    }

    setScraperError('');
    setScraperStep('loading');
    setScraperItems([]);

    try {
      const targetUrl = scraperUrl.trim();
      const isDlalUrl = /^https:\/\/(?:www\.)?dlalshop\.com\/(?:categories|products)\//i.test(targetUrl);
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke(isDlalUrl ? 'scrape-dlal-products' : 'scrape-url', {
        body: isDlalUrl ? { url: targetUrl, limit: 80 } : { url: targetUrl, type: 'product', bulk: true, limit: 80 },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (error) throw new Error(error.message || '解析失敗');
      if (data?.error) throw new Error(data.error);

      await fetchCategories();
      const rawProducts = extractScrapedProducts(data);
      if (rawProducts.length === 0) throw new Error('未找到商品資料，請確認網址');

      setScraperItems(rawProducts.map((product, index) => ({
        key: `${Date.now()}-${index}`,
        selected: true,
        form: rawToForm(product),
      })));
      setScraperStep('review');
    } catch (error) {
      setScraperError(error instanceof Error ? error.message : '網址解析失敗，請確認網址是否正確');
      setScraperStep('input');
    }
  };

  const handleScraperSave = async () => {
    const selected = scraperItems.filter(item => item.selected && item.form.name.trim()).map(item => item.form);
    if (selected.length === 0) return;

    setScraperSaving(true);
    try {
      await saveForms(selected);
      await logAdminAction('bulk_import_products', 'products', null, {
        count: selected.length,
        vendor_id: vendorId,
        source: 'scraper',
      });
      setShowScraper(false);
    } finally {
      setScraperSaving(false);
    }
  };

  const handleParseText = async () => {
    if (!parserText.trim()) {
      setParserError('請輸入商品資料');
      return;
    }

    setParserLoading(true);
    setParserError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('parse-listing', {
        body: { type: 'product', mode: 'text', content: parserText.trim() },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (error) throw new Error(error.message || '解析失敗');
      if (data?.error) throw new Error(data.error);
      const parsed = rawToForm((data.result || {}) as Record<string, unknown>);
      setEditing(null);
      setForm(parsed);
      setDescPreview(false);
      setShowParser(false);
      setShowModal(true);
    } catch (error) {
      setParserError(error instanceof Error ? error.message : '解析失敗');
    } finally {
      setParserLoading(false);
    }
  };

  const selectedCount = scraperItems.filter(item => item.selected).length;
  const allSelected = scraperItems.length > 0 && selectedCount === scraperItems.length;

  const setField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm(current => ({ ...current, [key]: value }));
  const setBulkField = <K extends keyof ProductForm>(key: string, field: K, value: ProductForm[K]) => {
    setScraperItems(current => current.map(item => item.key === key ? { ...item, form: { ...item.form, [field]: value } } : item));
  };

  if (loading) return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>;

  if (noVendor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <AlertCircle className="mb-3 h-12 w-12 text-yellow-400" />
        <p className="text-gray-600">尚未建立廠商資料，請先在後台建立廠商帳號。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2"><Package className="h-6 w-6 text-emerald-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
            <p className="text-xs font-medium text-gray-500">支援單品網址與分類列表批次匯入</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setParserText(''); setParserError(''); setShowParser(true); }} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50">
            <FileText className="h-4 w-4" />文字匯入
          </button>
          <button onClick={openScraper} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50">
            <Sparkles className="h-4 w-4" />網址批次匯入
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700">
            <Plus className="h-4 w-4" />新增商品
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <Package className="mx-auto mb-3 h-12 w-12 text-gray-200" />
          <p className="mb-4 text-gray-400">目前沒有商品，貼上分類頁即可批次匯入。</p>
          <button onClick={openScraper} className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            <Sparkles className="h-4 w-4" />使用 AI 批次匯入商品<ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left font-medium text-gray-500">商品</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">分類</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">價格</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">庫存</th>
                <th className="px-5 py-3 text-center font-medium text-gray-500">狀態</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <motion.tr key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="h-11 w-11 rounded-xl object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100"><Package className="h-5 w-5 text-gray-300" /></div>}
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-medium text-gray-900">{product.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {product.source_url && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">已連來源</span>}
                          {product.images && product.images.length > 1 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{product.images.length} 張圖</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{product.category_id && categoryById.get(product.category_id) ? getCategoryPath(categoryById.get(product.category_id)!, categories) : '-'}</td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-900">{formatCurrency(product.price)}</td>
                  <td className="px-5 py-4 text-right text-gray-600">{product.stock_quantity}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{product.is_active ? '上架' : '停用'}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(product)} className="rounded-xl p-2 text-emerald-600 transition hover:bg-emerald-50"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(product.id)} className="rounded-xl p-2 text-red-500 transition hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900">{editing ? '編輯商品' : '新增商品'}</h3>
              <button onClick={() => setShowModal(false)} className="rounded-xl p-2 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="商品名稱 *"><input value={form.name} onChange={event => setField('name', event.target.value)} className="input" /></Field>
              <Field label="SKU"><input value={form.sku} onChange={event => setField('sku', event.target.value)} className="input" /></Field>
              <Field label="分類">
                <select value={form.category_id} onChange={event => setField('category_id', event.target.value)} className="input">
                  <option value="">未分類</option>
                  {sortCategoriesForTree(categories).map(category => <option key={category.id} value={category.id}>{getCategoryOptionLabel(category, categories)}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="價格 (NT$)"><input type="number" min={0} value={form.price} onChange={event => setField('price', Number(event.target.value))} className="input" /></Field>
                <Field label="庫存"><input type="number" min={0} value={form.stock_quantity} onChange={event => setField('stock_quantity', Number(event.target.value))} className="input" /></Field>
              </div>
              <div className="md:col-span-2">
                <Field label="商品圖片">
                  <MultiImageUpload values={form.images} onChange={images => setForm(current => ({ ...current, images, image_url: images[0] || current.image_url }))} accentClass="ring-emerald-500" storageFolder="products" />
                </Field>
              </div>
              <Field label="產地"><input value={form.origin} onChange={event => setField('origin', event.target.value)} className="input" /></Field>
              <Field label="烘焙度"><input value={form.roast_level} onChange={event => setField('roast_level', event.target.value)} className="input" /></Field>
              <Field label="處理法"><input value={form.processing_method} onChange={event => setField('processing_method', event.target.value)} className="input" /></Field>
              <Field label="標高 / 海拔"><input value={form.altitude} onChange={event => setField('altitude', event.target.value)} className="input" /></Field>
              <Field label="重量 (g)"><input type="number" min={0} value={form.weight_grams} onChange={event => setField('weight_grams', Number(event.target.value))} className="input" /></Field>
              <Field label="來源網址"><input value={form.source_url} onChange={event => setField('source_url', event.target.value)} className="input" /></Field>
              <Field label="豆種（以頓號分隔）"><input value={arrayInput(form.variety)} onChange={event => setField('variety', splitArrayInput(event.target.value))} className="input" /></Field>
              <Field label="風味（以頓號分隔）"><input value={arrayInput(form.flavor_notes)} onChange={event => setField('flavor_notes', splitArrayInput(event.target.value))} className="input" /></Field>
              <div className="md:col-span-2">
                <Field label="標籤（以頓號分隔）"><input value={arrayInput(form.tags)} onChange={event => setField('tags', splitArrayInput(event.target.value))} className="input" /></Field>
              </div>
              <div className="md:col-span-2">
                <Field label="商品描述">
                  <HtmlEditor value={form.description} onChange={value => setField('description', value)} rows={8} preview={descPreview} onTogglePreview={() => setDescPreview(value => !value)} accentClass="focus:ring-emerald-500" />
                </Field>
              </div>
              <label className="flex cursor-pointer items-center gap-2 md:col-span-2">
                <input type="checkbox" checked={form.is_active} onChange={event => setField('is_active', event.target.checked)} className="h-4 w-4 rounded accent-emerald-600" />
                <span className="text-sm text-gray-700">上架販售</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 p-5">
              <button onClick={() => setShowModal(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? '儲存變更' : '新增商品'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showScraper && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">AI 批次爬蟲上架</h3>
                </div>
                <button onClick={() => setShowScraper(false)} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <StepBar step={scraperStep} />
              <div className="flex-1 overflow-y-auto">
                {scraperStep === 'input' && (
                  <div className="space-y-4 p-6">
                    <p className="text-sm leading-6 text-gray-500">貼上商品頁或分類列表頁。分類頁會自動收集所有商品、下載圖片並上傳到正式站 Storage，完成後可勾選要上架的商品。</p>
                    {scraperError && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />{scraperError}</div>}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">商品頁或分類頁網址</label>
                      <div className="relative">
                        <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input value={scraperUrl} onChange={event => setScraperUrl(event.target.value)} onKeyDown={event => event.key === 'Enter' && handleScrape()} placeholder="https://www.dlalshop.com/categories/shop-for-coffee" className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                  </div>
                )}
                {scraperStep === 'loading' && (
                  <div className="flex flex-col items-center justify-center gap-4 p-14">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
                    <div className="text-center">
                      <p className="font-medium text-gray-800">正在解析商品與上傳圖片</p>
                      <p className="mt-1 text-sm text-gray-400">分類頁商品較多時需要一點時間。</p>
                    </div>
                  </div>
                )}
                {scraperStep === 'review' && (
                  <div className="space-y-4 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />發現 <strong>{scraperItems.length}</strong> 件商品，已選 <strong>{selectedCount}</strong> 件</span>
                      <button onClick={() => setScraperItems(items => items.map(item => ({ ...item, selected: !allSelected })))} className="text-xs font-bold underline underline-offset-2">{allSelected ? '取消全選' : '全選'}</button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {scraperItems.map(item => (
                        <div key={item.key} className={`rounded-2xl border p-4 transition ${item.selected ? 'border-emerald-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                          <div className="flex gap-3">
                            <button onClick={() => setScraperItems(items => items.map(current => current.key === item.key ? { ...current, selected: !current.selected } : current))} className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${item.selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300 bg-white'}`}>
                              {item.selected && <CheckCircle className="h-3.5 w-3.5" />}
                            </button>
                            {item.form.image_url ? <img src={item.form.image_url} alt={item.form.name} className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" /> : <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100"><ImageIcon className="h-6 w-6 text-gray-300" /></div>}
                            <div className="min-w-0 flex-1 space-y-2">
                              <input value={item.form.name} onChange={event => setBulkField(item.key, 'name', event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                              <div className="grid grid-cols-2 gap-2">
                                <input type="number" min={0} value={item.form.price} onChange={event => setBulkField(item.key, 'price', Number(event.target.value))} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                <input type="number" min={0} value={item.form.stock_quantity} onChange={event => setBulkField(item.key, 'stock_quantity', Number(event.target.value))} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {item.form.category_id && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{categoryById.get(item.form.category_id) ? getCategoryPath(categoryById.get(item.form.category_id)!, categories) : '分類'}</span>}
                                {item.form.images.length > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{item.form.images.length} 張圖</span>}
                                {item.form.tags.slice(0, 3).map(tag => <span key={tag} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{tag}</span>)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                {scraperStep === 'review' && <button onClick={() => setScraperStep('input')} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">重新解析</button>}
                <button onClick={() => setShowScraper(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                {scraperStep === 'input' && <button onClick={handleScrape} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"><Sparkles className="h-4 w-4" />開始解析</button>}
                {scraperStep === 'review' && <button onClick={handleScraperSave} disabled={scraperSaving || selectedCount === 0} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60">{scraperSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}匯入 {selectedCount} 件商品</button>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showParser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-2"><Upload className="h-5 w-5 text-emerald-600" /><h3 className="font-semibold text-gray-900">文字匯入商品</h3></div>
                <button onClick={() => setShowParser(false)} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <div className="space-y-4 p-6">
                {parserError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{parserError}</div>}
                <textarea value={parserText} onChange={event => setParserText(event.target.value)} rows={9} placeholder="貼上商品名稱、價格、規格、風味、庫存等資料..." className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button onClick={() => setShowParser(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
                <button onClick={handleParseText} disabled={parserLoading || !parserText.trim()} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60">{parserLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" />}解析</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(229 231 235);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(31 41 55);
          outline: none;
        }
        .input:focus {
          box-shadow: 0 0 0 2px rgb(16 185 129 / 0.45);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function StepBar({ step }: { step: 'input' | 'loading' | 'review' }) {
  const steps = [
    { key: 'input', label: '輸入網址' },
    { key: 'loading', label: '解析中' },
    { key: 'review', label: '確認商品' },
  ] as const;

  return (
    <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-6 py-3">
      {steps.map((item, index) => (
        <React.Fragment key={item.key}>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === item.key ? 'text-emerald-700' : step === 'review' && item.key !== 'review' ? 'text-emerald-500' : 'text-gray-400'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${step === item.key ? 'bg-emerald-600 text-white' : step === 'review' && item.key !== 'review' ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
              {step === 'review' && item.key !== 'review' ? <CheckCircle className="h-3.5 w-3.5" /> : index + 1}
            </span>
            {item.label}
          </div>
          {index < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
        </React.Fragment>
      ))}
    </div>
  );
}
