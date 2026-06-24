import { useEffect, useState } from 'react';
import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';
import { sanitizeText } from '../../lib/security';

interface VendorFormData {
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  website: string;
  logo_url: string;
  note: string;
  is_active: boolean;
}

const emptyForm: VendorFormData = {
  name: '',
  description: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  website: '',
  logo_url: '',
  note: '',
  is_active: true,
};

export default function SuperAdminVendorEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<VendorFormData>(emptyForm);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      const { data, error: loadError } = await supabase
        .from('vendors')
        .select('name,description,contact_email,contact_phone,address,website,logo_url,note,is_active')
        .eq('id', id)
        .maybeSingle();

      if (loadError) {
        setError(loadError.message);
      } else if (data) {
        setForm({
          name: data.name || '',
          description: data.description || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          address: data.address || '',
          website: data.website || '',
          logo_url: data.logo_url || '',
          note: data.note || '',
          is_active: Boolean(data.is_active),
        });
      } else {
        setError('找不到供應商資料。');
      }
      setLoading(false);
    };

    load();
  }, [id]);

  const setField = (key: keyof VendorFormData, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');

    const payload = {
      name: sanitizeText(form.name, 160),
      description: sanitizeText(form.description, 1000),
      contact_email: sanitizeText(form.contact_email, 160),
      contact_phone: sanitizeText(form.contact_phone, 80),
      address: sanitizeText(form.address, 260),
      website: sanitizeText(form.website, 1000),
      logo_url: sanitizeText(form.logo_url, 1000),
      note: sanitizeText(form.note, 1000),
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase.from('vendors').update(payload).eq('id', id);
    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await logAdminAction('update_vendor', 'vendors', id, { name: payload.name });
    setSaving(false);
    navigate(`/superadmin/vendors/detail/${id}`);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(`/superadmin/vendors/detail/${id}`)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
          返回詳情
        </button>
        <div className="rounded-xl bg-amber-100 p-2">
          <Store className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">編輯供應商</h1>
          <p className="text-sm text-gray-500">{id}</p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSave} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: '名稱', key: 'name', type: 'text', required: true },
            { label: 'Email', key: 'contact_email', type: 'email' },
            { label: '電話', key: 'contact_phone', type: 'text' },
            { label: '網站', key: 'website', type: 'url' },
            { label: 'Logo', key: 'logo_url', type: 'url' },
          ].map(field => (
            <div key={field.key} className={field.key === 'name' ? 'md:col-span-2' : ''}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
              <input
                type={field.type}
                required={field.required}
                value={(form as any)[field.key] || ''}
                onChange={e => setField(field.key as keyof VendorFormData, e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">地址</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setField('address', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">介紹</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">備註</label>
            <textarea
              rows={3}
              value={form.note}
              onChange={e => setField('note', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
          啟用供應商
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(`/superadmin/vendors/detail/${id}`)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            取消
          </button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60">
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
            儲存變更
          </button>
        </div>
      </form>
    </div>
  );
}
