import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';
import HtmlEditor from '../../components/HtmlEditor';
import { getCategoryOptionLabel, sortCategoriesForTree } from '../../lib/categoryTree';
import { sanitizeHtml, sanitizeText } from '../../lib/security';

interface ProductForm { name: string; description: string; price: number; image_url: string; stock_quantity: number; sku: string; category_id: string; vendor_id: string; is_active: boolean; }
interface Category { id: string; name: string; slug: string; parent_id: string | null; }
interface Vendor { id: string; name: string; }

const EMPTY: ProductForm = { name: '', description: '', price: 0, image_url: '', stock_quantity: 0, sku: '', category_id: '', vendor_id: '', is_active: true };

const AdminProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [descPreview, setDescPreview] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: cats }, { data: vds }] = await Promise.all([supabase.from('categories').select('id, name, slug, parent_id'), supabase.from('vendors').select('id, name').eq('is_active', true)]);
      setCategories(cats || []);
      setVendors(vds || []);
      if (!isNew && id) {
        const { data } = await supabase.from('products').select('*').eq('id', id).single();
        if (data) setForm({ ...EMPTY, ...data });
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const set = (key: keyof ProductForm, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: sanitizeText(form.name, 160),
        description: sanitizeHtml(form.description),
        sku: sanitizeText(form.sku, 80),
        image_url: sanitizeText(form.image_url, 1000),
        vendor_id: form.vendor_id || null,
        category_id: form.category_id || null,
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
      navigate('/admin/products');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/products" className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold text-gray-900">{isNew ? '新增商品' : '編輯商品'}</h1>
      </div>

      <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">商品名稱</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">價格（NT$）</label>
            <input type="number" value={form.price} onChange={e => set('price', Number(e.target.value))} min={0} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">庫存數量</label>
            <input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', Number(e.target.value))} min={0} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input type="text" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="商品編號" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">商品分類</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2C1F10]">
              <option value="">請選擇分類</option>
              {sortCategoriesForTree(categories).map(c => <option key={c.id} value={c.id}>{getCategoryOptionLabel(c, categories)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所屬廠商</label>
            <select value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2C1F10]">
              <option value="">請選擇廠商</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">圖片網址</label>
            <input type="url" value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">商品描述</label>
            <HtmlEditor
              value={form.description}
              onChange={v => set('description', v)}
              rows={8}
              placeholder="<p>在這裡輸入商品介紹...</p>"
              preview={descPreview}
              onTogglePreview={() => setDescPreview(p => !p)}
              accentClass="focus:ring-[#2C1F10]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set('is_active', !form.is_active)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-[#C09A6A]' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-gray-700">上架販售</span>
        </div>

        <div className="flex gap-3">
          <Link to="/admin/products" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition text-center">取消</Link>
          <button type="submit" disabled={saving} className="flex-1 bg-[#C09A6A] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#8B6840] transition disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}儲存
          </button>
        </div>
      </motion.form>
    </div>
  );
};

export default AdminProductForm;
