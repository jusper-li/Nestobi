import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Pencil, Trash2, X, Save, Phone, Mail,
  UserCheck, UserX, AlertCircle, Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeText } from '../../lib/security';

interface StaffMember {
  id: string;
  vendor_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  is_active: boolean;
  notes: string;
  created_at: string;
}

const ROLE_OPTIONS = ['房務員', '清潔員', '房務主管', '前台', '維修員', '保全', '其他'];
const ROLE_COLORS: Record<string, string> = {
  '房務主管': 'bg-amber-100 text-amber-700',
  '前台': 'bg-blue-100 text-blue-700',
  '房務員': 'bg-teal-100 text-teal-700',
  '清潔員': 'bg-green-100 text-green-700',
  '維修員': 'bg-orange-100 text-orange-700',
  '保全': 'bg-slate-100 text-slate-700',
  '其他': 'bg-gray-100 text-gray-600',
};

const EMPTY_FORM = { name: '', role: '房務員', phone: '', email: '', is_active: true, notes: '' };

interface StaffModalProps {
  open: boolean;
  editItem: StaffMember | null;
  vendorId: string;
  onClose: () => void;
  onSaved: () => void;
}

const StaffModal: React.FC<StaffModalProps> = ({ open, editItem, vendorId, onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editItem) {
      setForm({ name: editItem.name, role: editItem.role, phone: editItem.phone, email: editItem.email, is_active: editItem.is_active, notes: editItem.notes });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editItem, open]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      vendor_id: vendorId,
      name: sanitizeText(form.name, 120),
      role: sanitizeText(form.role, 80),
      phone: sanitizeText(form.phone, 60),
      email: sanitizeText(form.email, 160),
      is_active: form.is_active,
      notes: sanitizeText(form.notes, 500),
      updated_at: new Date().toISOString(),
    };
    if (editItem) {
      await supabase.from('vendor_staff').update(payload).eq('id', editItem.id).eq('vendor_id', vendorId);
    } else {
      await supabase.from('vendor_staff').insert(payload);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', duration: 0.3 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 rounded-xl">
                  <Users className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{editItem ? '編輯人員' : '新增管理人員'}</h3>
                  <p className="text-xs text-gray-400">填寫人員基本資料</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名 <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="輸入姓名"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">職位</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500 bg-white">
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">電話</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="0912-345-678"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="staff@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">備註</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    rows={2} placeholder="備注或特殊說明（選填）"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 focus:border-teal-500 resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                      className={`w-10 h-6 rounded-full flex items-center transition-colors ${form.is_active ? 'bg-teal-500' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${form.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm text-gray-700">在職中</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">取消</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {editItem ? '儲存變更' : '新增人員'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const VendorStaff: React.FC = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modal, setModal] = useState<{ open: boolean; editItem: StaffMember | null }>({ open: false, editItem: null });
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchStaff = async (vid: string) => {
    const { data } = await supabase.from('vendor_staff').select('*').eq('vendor_id', vid).order('created_at', { ascending: false });
    setStaff((data || []) as StaffMember[]);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('vendors').select('id').eq('user_id', user.id).maybeSingle().then(async ({ data }) => {
      if (!data) { setNoVendor(true); setLoading(false); return; }
      setVendorId(data.id);
      await fetchStaff(data.id);
      setLoading(false);
    });
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!vendorId || !confirm('確定要刪除此人員資料？')) return;
    setDeleting(id);
    await supabase.from('vendor_staff').delete().eq('id', id).eq('vendor_id', vendorId);
    setStaff(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
  };

  const toggleActive = async (member: StaffMember) => {
    if (!vendorId) return;
    await supabase.from('vendor_staff').update({ is_active: !member.is_active, updated_at: new Date().toISOString() }).eq('id', member.id).eq('vendor_id', vendorId);
    setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active: !s.is_active } : s));
  };

  const filtered = staff.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    const matchActive = activeFilter === 'all' || (activeFilter === 'active' ? s.is_active : !s.is_active);
    return matchSearch && matchRole && matchActive;
  });

  const activeCount = staff.filter(s => s.is_active).length;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (noVendor) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <AlertCircle className="w-12 h-12 text-yellow-400 mb-3" />
      <p className="text-gray-600">帳號尚未關聯廠商，請聯絡管理員。</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-xl">
            <Users className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">管理人員</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              共 {staff.length} 位人員，{activeCount} 位在職
            </p>
          </div>
        </div>
        <button
          onClick={() => setModal({ open: true, editItem: null })}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />新增人員
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜尋姓名或職位…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
          <option value="all">全部職位</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-4 py-2.5 text-sm font-medium transition ${activeFilter === f ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {f === 'all' ? '全部' : f === 'active' ? '在職' : '離職'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">
            {staff.length === 0 ? '尚無人員資料，點擊上方按鈕新增' : '找不到符合條件的人員'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">人員</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">職位</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium hidden sm:table-cell">聯絡方式</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium hidden lg:table-cell">備註</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-medium">狀態</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member, i) => (
                  <motion.tr key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-600'}`}>
                          {member.name[0] || '?'}
                        </div>
                        <span className="font-medium text-gray-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-600'}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {member.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="w-3 h-3" />{member.phone}
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />{member.email}
                          </div>
                        )}
                        {!member.phone && !member.email && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-gray-400 line-clamp-1 max-w-[160px]">{member.notes || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {member.is_active ? '在職' : '離職'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleActive(member)}
                          title={member.is_active ? '標記為離職' : '標記為在職'}
                          className={`p-2 rounded-xl transition ${member.is_active ? 'hover:bg-gray-100 text-gray-400' : 'hover:bg-green-50 text-green-600'}`}>
                          {member.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setModal({ open: true, editItem: member })}
                          className="p-2 hover:bg-teal-50 rounded-xl text-teal-600 transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(member.id)} disabled={deleting === member.id}
                          className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition disabled:opacity-40">
                          {deleting === member.id
                            ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vendorId && (
        <StaffModal
          open={modal.open}
          editItem={modal.editItem}
          vendorId={vendorId}
          onClose={() => setModal(p => ({ ...p, open: false }))}
          onSaved={() => fetchStaff(vendorId)}
        />
      )}
    </div>
  );
};

export default VendorStaff;
