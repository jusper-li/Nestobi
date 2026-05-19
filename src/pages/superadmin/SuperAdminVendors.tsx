import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Plus, Pencil, Trash2, X, Link, CheckCircle, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';
import { sanitizeText } from '../../lib/security';

interface Vendor {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  website: string;
  logo_url: string;
  description: string;
  note: string;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
  linked_display_name?: string;
}

const emptyForm = { name: '', description: '', contact_email: '', contact_phone: '', address: '', website: '', logo_url: '', note: '', is_active: true };

const SuperAdminVendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [linkModal, setLinkModal] = useState<Vendor | null>(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState<'success' | 'error' | null>(null);

  const fetchVendors = async () => {
    const { data } = await supabase.from('vendors').select('*').order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }
    const userIds = data.filter((v: any) => v.user_id).map((v: any) => v.user_id);
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('tbl_mn5wgzh0').select('user_id, display_name').in('user_id', userIds);
      profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
    }
    setVendors(data.map((v: any) => ({ ...v, linked_display_name: v.user_id ? profileMap[v.user_id] : undefined })));
    setLoading(false);
  };

  useEffect(() => { fetchVendors(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({ name: v.name, description: v.description, contact_email: v.contact_email, contact_phone: v.contact_phone, address: v.address, website: v.website, logo_url: v.logo_url, note: v.note, is_active: v.is_active });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      name: sanitizeText(form.name, 160),
      description: sanitizeText(form.description, 1000),
      contact_email: sanitizeText(form.contact_email, 160),
      contact_phone: sanitizeText(form.contact_phone, 80),
      address: sanitizeText(form.address, 260),
      website: sanitizeText(form.website, 1000),
      logo_url: sanitizeText(form.logo_url, 1000),
      note: sanitizeText(form.note, 1000),
      updated_at: new Date().toISOString()
    };
    if (editing) {
      await supabase.from('vendors').update(payload).eq('id', editing.id);
      await logAdminAction('update_vendor', 'vendors', editing.id, { name: payload.name });
    } else {
      const { data } = await supabase.from('vendors').insert(payload).select('id').maybeSingle();
      await logAdminAction('create_vendor', 'vendors', data?.id, { name: payload.name });
    }
    await fetchVendors();
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此廠商？此操作無法復原。')) return;
    await supabase.from('vendors').delete().eq('id', id);
    await logAdminAction('delete_vendor', 'vendors', id);
    await fetchVendors();
  };

  const handleLink = async () => {
    if (!linkModal || !linkEmail.trim()) return;
    if (!window.confirm('確定要將此帳號連結為廠商帳號？此帳號將取得廠商後台權限。')) return;
    setLinking(true);
    setLinkResult(null);

    const { data: authRow } = await supabase
      .from('tbl_user_auth')
      .select('user_id')
      .eq('user_id', linkEmail.trim())
      .maybeSingle();

    if (!authRow) {
      setLinkResult('error');
      setLinking(false);
      return;
    }

    await supabase.from('vendors').update({ user_id: authRow.user_id, updated_at: new Date().toISOString() }).eq('id', linkModal.id);
    await supabase.from('tbl_user_auth').update({ role: 'vendor', updated_at: new Date().toISOString() }).eq('user_id', authRow.user_id);
    await logAdminAction('link_vendor_user', 'vendors', linkModal.id, { user_id: authRow.user_id });

    setLinkResult('success');
    setLinking(false);
    await fetchVendors();
    setTimeout(() => { setLinkModal(null); setLinkEmail(''); setLinkResult(null); }, 1500);
  };

  const handleUnlink = async (vendor: Vendor) => {
    if (!vendor.user_id || !confirm('確定要解除廠商與帳號的關聯嗎？')) return;
    await supabase.from('vendors').update({ user_id: null, updated_at: new Date().toISOString() }).eq('id', vendor.id);
    await logAdminAction('unlink_vendor_user', 'vendors', vendor.id, { user_id: vendor.user_id });
    await fetchVendors();
  };

  const filtered = search ? vendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || (v.contact_email || '').toLowerCase().includes(search.toLowerCase())) : vendors;

  const setField = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl"><Store className="w-6 h-6 text-amber-700" /></div>
          <h1 className="text-2xl font-bold text-gray-900">廠商管理</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
          <Plus className="w-4 h-4" />新增廠商
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋廠商名稱或信箱…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {v.logo_url ? (
                    <img src={v.logo_url} alt={v.name} className="w-12 h-12 rounded-xl object-contain border border-gray-100 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Store className="w-6 h-6 text-amber-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{v.name}</p>
                    <p className="text-xs text-gray-400 truncate">{v.contact_email}</p>
                    <p className="text-xs text-gray-400">{v.address}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(v)} className="p-2 hover:bg-amber-50 rounded-xl text-amber-600 transition"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(v.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v.is_active ? '啟用' : '停用'}</span>
                  {v.user_id ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                      <Link className="w-3 h-3" />{v.linked_display_name || '已關聯'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">未關聯帳號</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {v.user_id ? (
                    <button onClick={() => handleUnlink(v)} className="text-xs text-red-500 hover:underline">解除關聯</button>
                  ) : (
                    <button onClick={() => { setLinkModal(v); setLinkEmail(''); setLinkResult(null); }} className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg font-medium transition">
                      <Link className="w-3 h-3" />關聯帳號
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editing ? '編輯廠商' : '新增廠商'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: '廠商名稱 *', key: 'name', col: 'full' },
                  { label: '聯絡信箱', key: 'contact_email', col: 'half' },
                  { label: '聯絡電話', key: 'contact_phone', col: 'half' },
                  { label: '地址', key: 'address', col: 'full' },
                  { label: '網站', key: 'website', col: 'half' },
                  { label: 'Logo 網址', key: 'logo_url', col: 'half' },
                ].map(f => (
                  <div key={f.key} className={f.col === 'full' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type="text" value={(form as any)[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">廠商描述</label>
                  <textarea rows={3} value={form.description} onChange={e => setField('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                  <textarea rows={2} value={form.note} onChange={e => setField('note', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} className="w-4 h-4 rounded accent-amber-500" />
                <span className="text-sm text-gray-700">廠商狀態啟用</span>
              </label>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center gap-1.5">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {editing ? '儲存變更' : '建立廠商'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">關聯廠商帳號</h3>
              <button onClick={() => setLinkModal(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-1">將「{linkModal.name}」關聯至指定用戶帳號，該用戶角色將變更為廠商。</p>
            <p className="text-xs text-gray-400 mb-4">請至用戶管理頁面複製用戶的 User ID。</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">用戶 User ID</label>
              <input type="text" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} placeholder="貼上用戶 UUID…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            {linkResult === 'error' && <p className="text-sm text-red-500 mb-3">找不到此 User ID，請確認後重試。</p>}
            {linkResult === 'success' && (
              <div className="flex items-center gap-2 text-emerald-700 text-sm mb-3">
                <CheckCircle className="w-4 h-4" />關聯成功！
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setLinkModal(null)} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">取消</button>
              <button onClick={handleLink} disabled={linking || !linkEmail.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center gap-1.5">
                {linking ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Link className="w-4 h-4" />}
                關聯帳號
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminVendors;
