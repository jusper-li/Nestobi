import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';
import HtmlEditor from '../../components/HtmlEditor';
import { getCategoryOptionLabel, sortCategoriesForTree } from '../../lib/categoryTree';
import { sanitizeHtml, sanitizeText } from '../../lib/security';
import {
  DEFAULT_SUBSCRIPTION_PERIODS,
  SUBSCRIPTION_SPEC_NAME,
  extractSubscriptionPeriods,
  normalizeSubscriptionPeriodValue,
  type SubscriptionPlanMonths,
} from '../../lib/subscriptionPeriods';

interface ProductForm {
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  sku: string;
  category_id: string;
  vendor_id: string;
  is_active: boolean;
  specifications: Specification[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

interface Specification {
  name: string;
  options: string[];
}

const EMPTY: ProductForm = {
  name: '',
  description: '',
  price: 0,
  image_url: '',
  stock_quantity: 0,
  sku: '',
  category_id: '',
  vendor_id: '',
  is_active: true,
  specifications: [],
};

const isSubscriptionCategory = (slug?: string | null) =>
  Boolean(slug === 'dlal-subscription' || slug?.startsWith('subscription-'));

const normalizeSpecifications = (specifications: Specification[]) =>
  specifications
    .map((spec) => ({
      name: sanitizeText(spec.name || '', 80).trim(),
      options: Array.from(
        new Set(
          (spec.options || [])
            .map((option) => sanitizeText(option || '', 80).trim())
            .map((option) => normalizeSubscriptionPeriodValue(option) ?? option)
            .filter((option): option is string | number => Boolean(option))
            .map((option) => String(option))
        )
      ),
    }))
    .filter((spec) => spec.name.length > 0 && spec.options.length > 0);

const SuperAdminProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [descPreview, setDescPreview] = useState(false);
  const [subscriptionPeriods, setSubscriptionPeriods] = useState<SubscriptionPlanMonths[]>(DEFAULT_SUBSCRIPTION_PERIODS);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: cats }, { data: vds }] = await Promise.all([
        supabase.from('categories').select('id, name, slug, parent_id').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
      ]);

      setCategories(cats || []);
      setVendors(vds || []);

      if (!isNew && id) {
        const { data } = await supabase
          .from('products')
          .select('*, vendors(name)')
          .eq('id', id)
          .maybeSingle();

        if (data) {
          const { vendors: vendorObj, ...productData } = data as any;
          setForm({
            ...EMPTY,
            ...productData,
            specifications: Array.isArray(productData.specifications) ? productData.specifications : [],
          });
          setSubscriptionPeriods(extractSubscriptionPeriods(productData.specifications));
          setVendorName(vendorObj?.name || '');
        }
      }

      setLoading(false);
    };

    void fetchData();
  }, [id, isNew]);

  const setField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectedCategory = categories.find((category) => category.id === form.category_id);
  const subscriptionSpec = form.specifications.find((spec) => spec.name.trim() === SUBSCRIPTION_SPEC_NAME);
  const showSubscriptionSettings = isSubscriptionCategory(selectedCategory?.slug) || Boolean(subscriptionSpec);

  const toggleSubscriptionPeriod = (period: SubscriptionPlanMonths) => {
    setSubscriptionPeriods((prev) => (
      prev.includes(period)
        ? prev.filter((item) => item !== period)
        : [...prev, period]
    ));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const normalizedPeriods = subscriptionPeriods
        .map((period) => normalizeSubscriptionPeriodValue(period))
        .filter((period): period is SubscriptionPlanMonths => Boolean(period));
      const finalSubscriptionPeriods =
        normalizedPeriods.length > 0 ? Array.from(new Set(normalizedPeriods)) : DEFAULT_SUBSCRIPTION_PERIODS;

      const sanitizedSpecifications = normalizeSpecifications(form.specifications.filter((spec) => spec.name.trim() !== SUBSCRIPTION_SPEC_NAME));
      if (showSubscriptionSettings || subscriptionSpec) {
        sanitizedSpecifications.push({
          name: SUBSCRIPTION_SPEC_NAME,
          options: finalSubscriptionPeriods.map(String),
        });
      }

      const payload = {
        ...form,
        name: sanitizeText(form.name, 160),
        description: sanitizeHtml(form.description),
        sku: sanitizeText(form.sku, 80),
        image_url: sanitizeText(form.image_url, 1000),
        vendor_id: form.vendor_id || null,
        category_id: form.category_id || null,
        specifications: sanitizedSpecifications,
      };

      if (isNew) {
        const { data, error } = await supabase.from('products').insert(payload).select('id').maybeSingle();
        if (error) throw error;
        await logAdminAction('create_product', 'products', data?.id || null, {
          name: payload.name,
          vendor_id: payload.vendor_id,
          category_id: payload.category_id,
          price: payload.price,
        });
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', id);
        if (error) throw error;
        await logAdminAction('update_product', 'products', id || null, {
          name: payload.name,
          vendor_id: payload.vendor_id,
          category_id: payload.category_id,
          price: payload.price,
        });
      }

      navigate('/superadmin/products');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/superadmin/products')}
          className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? '新增商品' : '編輯商品'}</h1>
          {!isNew && vendorName && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
              <Store className="h-3.5 w-3.5" />
              <span>供應商：{vendorName}</span>
            </div>
          )}
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSave}
        className="space-y-5 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            <span className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-amber-500" />
              供應商
            </span>
          </label>
          <select
            value={form.vendor_id}
            onChange={(e) => setField('vendor_id', e.target.value)}
            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">請選擇供應商</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">商品名稱</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">售價（NT$）</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setField('price', Number(e.target.value))}
              min={0}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">庫存數量</label>
            <input
              type="number"
              value={form.stock_quantity}
              onChange={(e) => setField('stock_quantity', Number(e.target.value))}
              min={0}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setField('sku', e.target.value)}
              placeholder="例如：COFFEE-001"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">商品分類</label>
            <select
              value={form.category_id}
              onChange={(e) => setField('category_id', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">請選擇分類</option>
              {sortCategoriesForTree(categories).map((category) => (
                <option key={category.id} value={category.id}>{getCategoryOptionLabel(category, categories)}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">商品圖片網址</label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setField('image_url', e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {showSubscriptionSettings && (
            <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-amber-900">訂閱期數設定</h2>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    勾選這個商品允許的扣款期數。前台與 NewebPay 結帳只會顯示和接受這些選項。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubscriptionPeriods(DEFAULT_SUBSCRIPTION_PERIODS)}
                  className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  還原預設
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                {DEFAULT_SUBSCRIPTION_PERIODS.map((period) => {
                  const active = subscriptionPeriods.includes(period);
                  const label = period === 'NE' ? '月繳' : `${period} 個月`;

                  return (
                    <button
                      key={String(period)}
                      type="button"
                      onClick={() => toggleSubscriptionPeriod(period)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        active
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:text-amber-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-gray-600">
                未設定時，前台預設提供 3、6、12 個月與月繳。若你只想開放部分期數，只要保留要啟用的按鈕即可。
              </p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">商品描述</label>
            <HtmlEditor
              value={form.description}
              onChange={(value) => setField('description', value)}
              rows={8}
              placeholder="<p>請輸入商品介紹...</p>"
              preview={descPreview}
              onTogglePreview={() => setDescPreview((prev) => !prev)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setField('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-amber-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-gray-700">啟用商品</span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/superadmin/products')}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            儲存
          </button>
        </div>
      </motion.form>
    </div>
  );
};

export default SuperAdminProductForm;
