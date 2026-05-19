import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Building, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';

interface Vendor { id: string; name: string; description: string; contact_email: string; contact_phone: string; address: string; website: string; logo_url: string; note: string; is_active: boolean; }

const EMPTY: Partial<Vendor> = { name: '', description: '', contact_email: '', contact_phone: '', address: '', website: '', logo_url: '', note: '', is_active: true };

const AdminVendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<Vendor>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const fetchVendors = async () => {
    const { data } = await supabase.from('vendors').select('*').order('name');
    setVendors(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVendors(); }, []);

  const openAdd = () => { setEditing(EMPTY); setIsEdit(false); setShowModal(true); };
  const openEdit = (v: Vendor) => { setEditing(v); setIsEdit(true); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && editing.id) {
        await supabase.from('vendors').update(editing).eq('id', editing.id);
      } else {
        await supabase.from('vendors').insert(editing);
      }
      setShowModal(false);
      fetchVendors();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此廠商？')) return;
    await supabase.from('vendors').delete().eq('id', id);
    await logAdminAction('delete_vendor', 'vendors', id);
    setVendors(prev => prev.filter(v => v.id !== id));
  };

  const set = (key: keyof Vendor, value: any) => setEditing(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">廠商管理</h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#C09A6A] hover:bg-[#8B6840] text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm">
          <Plus className="w-4 h-4" />新增廠商
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">廠商名稱</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">聯絡信箱</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">電話</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">狀態</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendors.map((v, i) => (
                <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#F0E4C8] rounded-lg flex items-center justify-center"><Building className="w-4 h-4 text-[#2C1F10]" /></div>
                      <div><p className="font-medium text-gray-900 text-sm">{v.name}</p>{v.address && <p className="text-xs text-gray-400 truncate max-w-[160px]">{v.address}</p>}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.contact_email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.contact_phone}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{v.is_active ? '啟用' : '停用'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-[#2C1F10] hover:bg-[#F0E4C8] rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {vendors.length === 0 && <div className="text-center py-12 text-gray-400">暫無廠商資料</div>}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">{isEdit ? '編輯廠商' : '新增廠商'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {[['name', '廠商名稱', 'text', true], ['contact_email', '聯絡信箱', 'email', false], ['contact_phone', '電話', 'text', false], ['address', '地址', 'text', false], ['website', '官方網站', 'url', false]].map(([key, label, type, req]) => (
                <div key={key as string}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label as string}</label>
                  <input type={type as string} value={(editing as any)[key as string] || ''} onChange={e => set(key as keyof Vendor, e.target.value)} required={!!req} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                <textarea value={editing.note || ''} onChange={e => set('note', e.target.value)} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10] resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('is_active', !editing.is_active)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.is_active ? 'bg-[#C09A6A]' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${editing.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-700">啟用廠商</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">取消</button>
                <button type="submit" disabled={saving} className="flex-1 bg-[#C09A6A] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#8B6840] transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}儲存
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminVendors;
