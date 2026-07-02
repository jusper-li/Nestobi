import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Save, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import VendorPageShell from '../../components/vendor/VendorPageShell';

interface VendorData {
  id: string;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  website: string;
  logo_url: string;
  note: string;
}

type VendorForm = Partial<VendorData>;

const EMPTY_FORM: VendorForm = {
  name: '',
  description: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  website: '',
  logo_url: '',
  note: '',
};

const FIELD_GROUPS: Array<{ key: keyof VendorForm; label: string; type: string; span?: 'full' | 'half' }> = [
  { key: 'name', label: '廠商名稱 *', type: 'text', span: 'full' },
  { key: 'contact_email', label: '聯絡信箱', type: 'email', span: 'half' },
  { key: 'contact_phone', label: '聯絡電話', type: 'tel', span: 'half' },
  { key: 'address', label: '地址', type: 'text', span: 'full' },
  { key: 'website', label: '網站', type: 'url', span: 'half' },
  { key: 'logo_url', label: 'Logo 網址', type: 'url', span: 'half' },
];

const VendorProfile: React.FC = () => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [form, setForm] = useState<VendorForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noVendor, setNoVendor] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  const initials = useMemo(() => (form.name || user?.email || 'V').slice(0, 1).toUpperCase(), [form.name, user?.email]);

  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const loadVendor = async () => {
      setLoading(true);
      const { data } = await supabase.from('vendors').select('*').eq('user_id', user.id).maybeSingle();

      if (!mounted) return;
      if (!data) {
        setNoVendor(true);
        setLoading(false);
        return;
      }

      const vendorRow = data as VendorData;
      setVendor(vendorRow);
      setForm({
        name: vendorRow.name,
        description: vendorRow.description,
        contact_email: vendorRow.contact_email,
        contact_phone: vendorRow.contact_phone,
        address: vendorRow.address,
        website: vendorRow.website,
        logo_url: vendorRow.logo_url,
        note: vendorRow.note,
      });
      setLoading(false);
    };

    loadVendor().catch(() => setLoading(false));
    return () => { mounted = false; };
  }, [user]);

  const setField = (key: keyof VendorForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!vendor) return;
    setSaving(true);
    await supabase
      .from('vendors')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', vendor.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (newPw.length < 6) {
      setPwError('新密碼至少需要 6 碼。');
      return;
    }

    if (newPw !== confirmPw) {
      setPwError('新密碼與確認密碼不一致。');
      return;
    }

    setPwLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPw,
      });

      if (signInErr) {
        setPwError('目前密碼驗證失敗。');
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;

      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (error) {
      setPwError(error instanceof Error ? error.message : '更新密碼失敗，請稍後再試。');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <VendorPageShell
        title="廠商資料"
        subtitle="統一維護廠商基本資料與登入密碼。"
        icon={<Store className="h-4 w-4" />}
      >
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </VendorPageShell>
    );
  }

  if (noVendor) {
    return (
      <VendorPageShell
        title="廠商資料"
        subtitle="統一維護廠商基本資料與登入密碼。"
        icon={<Store className="h-4 w-4" />}
      >
        <div className="flex min-h-[48vh] flex-col items-center justify-center text-center">
          <AlertCircle className="mb-3 h-12 w-12 text-yellow-400" />
          <p className="text-gray-600">找不到廠商資料，請聯絡管理員。</p>
        </div>
      </VendorPageShell>
    );
  }

  return (
    <VendorPageShell
      title="廠商資料"
      subtitle="統一維護廠商基本資料與登入密碼。"
      icon={<Store className="h-4 w-4" />}
    >
      <div className="space-y-6">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          {form.logo_url ? (
            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white text-xl font-bold text-emerald-700">
                <img
                  src={form.logo_url}
                  alt="Vendor logo"
                  className="h-full w-full object-contain"
                  onError={event => {
                    (event.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                {!form.logo_url ? initials : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">{form.name}</p>
                <p className="truncate text-sm text-gray-400">{form.contact_email || user?.email}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {FIELD_GROUPS.map(field => (
              <div key={String(field.key)} className={field.span === 'full' ? 'md:col-span-2' : ''}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
                <input
                  type={field.type}
                  value={String(form[field.key] || '')}
                  onChange={e => setField(field.key, e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">廠商簡介</label>
              <textarea
                rows={4}
                value={form.description || ''}
                onChange={e => setField('description', e.target.value)}
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">備註</label>
              <textarea
                rows={2}
                value={form.note || ''}
                onChange={e => setField('note', e.target.value)}
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition shadow-sm disabled:opacity-60 ${
                saved ? 'bg-green-100 text-green-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? '已儲存' : '儲存變更'}
            </button>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold text-gray-800">
            <Lock className="h-4 w-4 text-emerald-600" />
            變更密碼
          </h3>
          <p className="text-sm text-gray-500">登入帳號：{user?.email}</p>

          {pwSuccess ? (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              密碼已更新
            </motion.div>
          ) : null}
          {pwError ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pwError}</div> : null}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">目前密碼</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  required
                  placeholder="請輸入目前密碼"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">新密碼</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    required
                    placeholder="至少 6 碼"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">確認新密碼</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  required
                  placeholder="再次輸入新密碼"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {pwLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : '更新密碼'}
            </button>
          </form>
        </motion.section>
      </div>
    </VendorPageShell>
  );
};

export default VendorProfile;
