import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Tv, Droplets, BedDouble, Sofa, Plus, Pencil, Trash2,
  X, Save, AlertTriangle, CheckCircle2, Search, RotateCcw, PackageCheck,
  Layers, ChevronDown, Minus,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';

type Category = '3c' | 'cleaning' | 'bedding' | 'furniture';
type Status = '檢查' | '確認' | '遺失' | '損壞' | '清潔中' | '待補充' | '補充完畢';

interface InventoryItem {
  id: string;
  room_id: string;
  category: Category;
  name: string;
  quantity: number;
  status: Status;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Room { id: string; name: string; location: string; room_type: string; }

const CATEGORIES: { key: Category; label: string; icon: React.ReactNode; color: string; bg: string; border: string; presets: { name: string; qty: number }[] }[] = [
  {
    key: '3c', label: '3C家電', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-[#D5CDB8]',
    icon: <Tv className="w-5 h-5" />,
    presets: [
      { name: '電視', qty: 1 }, { name: '冰箱', qty: 1 }, { name: '冷氣', qty: 1 },
      { name: '吹風機', qty: 1 }, { name: '音響', qty: 1 }, { name: '檯燈', qty: 2 },
      { name: '電話', qty: 1 }, { name: '保險箱', qty: 1 }, { name: '咖啡機', qty: 1 }, { name: '熱水壺', qty: 1 },
    ],
  },
  {
    key: 'cleaning', label: '清潔用品', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200',
    icon: <Droplets className="w-5 h-5" />,
    presets: [
      { name: '沐浴乳', qty: 2 }, { name: '洗髮精', qty: 2 }, { name: '潤髮乳', qty: 1 },
      { name: '牙刷', qty: 2 }, { name: '牙膏', qty: 1 }, { name: '洗手乳', qty: 1 },
      { name: '衛生紙', qty: 4 }, { name: '毛巾', qty: 4 }, { name: '刮鬍刀', qty: 1 }, { name: '浴帽', qty: 2 },
    ],
  },
  {
    key: 'bedding', label: '寢具換洗', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
    icon: <BedDouble className="w-5 h-5" />,
    presets: [
      { name: '枕頭', qty: 2 }, { name: '棉被', qty: 1 }, { name: '床單', qty: 1 },
      { name: '枕套', qty: 2 }, { name: '浴巾', qty: 2 }, { name: '浴袍', qty: 2 },
    ],
  },
  {
    key: 'furniture', label: '軟裝設施', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200',
    icon: <Sofa className="w-5 h-5" />,
    presets: [
      { name: '床', qty: 1 }, { name: '桌椅', qty: 1 }, { name: '窗簾', qty: 1 },
      { name: '地毯', qty: 1 }, { name: '衣櫃', qty: 1 }, { name: '沙發', qty: 1 },
      { name: '書桌', qty: 1 }, { name: '迷你吧', qty: 1 },
    ],
  },
];

const STATUSES: { value: Status; label: Status; color: string; dot: string }[] = [
  { value: '檢查',    label: '檢查',    color: 'bg-gray-100 text-gray-600',        dot: 'bg-gray-400' },
  { value: '確認',    label: '確認',    color: 'bg-green-100 text-green-700',      dot: 'bg-green-500' },
  { value: '遺失',    label: '遺失',    color: 'bg-red-100 text-red-700',          dot: 'bg-red-500' },
  { value: '損壞',    label: '損壞',    color: 'bg-orange-100 text-orange-700',    dot: 'bg-orange-500' },
  { value: '清潔中',  label: '清潔中',  color: 'bg-blue-100 text-blue-700',        dot: 'bg-blue-500' },
  { value: '待補充',  label: '待補充',  color: 'bg-yellow-100 text-yellow-700',    dot: 'bg-yellow-500' },
  { value: '補充完畢', label: '補充完畢', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
];

const statusStyle = (status: Status) => STATUSES.find(s => s.value === status) ?? STATUSES[0];

interface QuickAddModalProps {
  open: boolean;
  categoryKey: Category;
  roomId: string;
  existingNames: string[];
  onClose: () => void;
  onSaved: (items: InventoryItem[]) => void;
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({ open, categoryKey, roomId, existingNames, onClose, onSaved }) => {
  const cat = CATEGORIES.find(c => c.key === categoryKey)!;
  const [checked, setChecked] = useState<Record<string, number>>({});
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setChecked({}); setCustomName(''); setCustomQty(1); }
  }, [open, categoryKey]);

  const toggle = (name: string, defaultQty: number) => {
    setChecked(prev => {
      if (name in prev) { const next = { ...prev }; delete next[name]; return next; }
      return { ...prev, [name]: defaultQty };
    });
  };

  const setQty = (name: string, qty: number) => {
    setChecked(prev => ({ ...prev, [name]: Math.max(1, qty) }));
  };

  const checkedCount = Object.keys(checked).length + (customName.trim() ? 1 : 0);

  const handleSave = async () => {
    const entries: { name: string; qty: number }[] = Object.entries(checked).map(([name, qty]) => ({ name, qty }));
    if (customName.trim()) entries.push({ name: customName.trim(), qty: customQty });
    if (entries.length === 0) return;
    setSaving(true);
    const rows = entries.map(e => ({
      room_id: roomId,
      category: categoryKey,
      name: e.name,
      quantity: e.qty,
      status: '檢查' as Status,
      notes: '',
      updated_at: new Date().toISOString(),
    }));
    const { data } = await supabase.from('room_inventory_items').insert(rows).select();
    await logAdminAction('create_room_inventory_batch', 'room_inventory_items', roomId, { count: rows.length, categoryKey });
    if (data) onSaved(data as InventoryItem[]);
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg z-10 flex flex-col max-h-[92vh]">

            <div className={`flex items-center justify-between px-5 py-4 border-b ${cat.border} ${cat.bg} rounded-t-3xl sm:rounded-t-2xl`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl bg-white/60 border ${cat.border} ${cat.color}`}>{cat.icon}</div>
                <div>
                  <h3 className={`font-bold text-sm ${cat.color}`}>{cat.label}</h3>
                  <p className="text-xs text-gray-500">勾選要新增的設備</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-xl transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4">
              <div className="grid grid-cols-1 gap-2">
                {cat.presets.map(p => {
                  const isExisting = existingNames.includes(p.name);
                  const isChecked = p.name in checked;
                  return (
                    <div key={p.name}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 border transition cursor-pointer select-none
                        ${isExisting ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100' :
                          isChecked ? `${cat.bg} ${cat.border}` : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      onClick={() => !isExisting && toggle(p.name, p.qty)}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition
                        ${isChecked ? `${cat.color.replace('text-', 'bg-').replace('-600', '-500')} border-transparent` : 'border-gray-300 bg-white'}`}>
                        {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`flex-1 text-sm font-medium ${isChecked ? cat.color : 'text-gray-700'}`}>{p.name}</span>
                      {isExisting && <span className="text-xs text-gray-400">已存在</span>}
                      {isChecked && (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setQty(p.name, (checked[p.name] || 1) - 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className={`w-8 text-center text-sm font-bold ${cat.color}`}>{checked[p.name]}</span>
                          <button onClick={() => setQty(p.name, (checked[p.name] || 1) + 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">自訂設備</p>
                <div className="flex gap-2">
                  <input value={customName} onChange={e => setCustomName(e.target.value)}
                    placeholder="輸入設備名稱…"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]/30 focus:border-[#2C1F10]" />
                  <div className="flex items-center gap-1 border border-gray-200 rounded-xl px-2">
                    <button onClick={() => setCustomQty(q => Math.max(1, q - 1))}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-gray-700">{customQty}</span>
                    <button onClick={() => setCustomQty(q => q + 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-gray-100">
              <button onClick={handleSave} disabled={saving || checkedCount === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#C09A6A] hover:bg-[#8B6840] text-white rounded-xl text-sm font-semibold transition disabled:opacity-40">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />}
                {checkedCount > 0 ? `新增 ${checkedCount} 項設備` : '請勾選設備'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface EditModalProps {
  open: boolean;
  item: InventoryItem;
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
}

const EditModal: React.FC<EditModalProps> = ({ open, item, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: item.name, quantity: item.quantity, status: item.status, notes: item.notes });
  const [saving, setSaving] = useState(false);
  const cat = CATEGORIES.find(c => c.key === item.category)!;

  useEffect(() => {
    if (open) setForm({ name: item.name, quantity: item.quantity, status: item.status, notes: item.notes });
  }, [open, item]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('room_inventory_items')
      .update({ ...form, name: form.name.trim(), updated_at: new Date().toISOString() })
      .eq('id', item.id).select().maybeSingle();
    if (data) onSaved(data as InventoryItem);
    await logAdminAction('update_room_inventory_item', 'room_inventory_items', item.id, { room_id: item.room_id, name: form.name.trim() });
    setSaving(false);
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
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${cat.bg} border ${cat.border} ${cat.color}`}>{cat.icon}</div>
                <div>
                  <p className="text-xs text-gray-400">{cat.label}</p>
                  <h3 className="font-semibold text-gray-900">編輯設備</h3>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">設備名稱</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]/30 focus:border-[#2C1F10]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">數量</label>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                    <button onClick={() => setForm(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                      className="text-gray-400 hover:text-gray-600 transition"><Minus className="w-4 h-4" /></button>
                    <span className="flex-1 text-center font-bold text-gray-800">{form.quantity}</span>
                    <button onClick={() => setForm(p => ({ ...p, quantity: p.quantity + 1 }))}
                      className="text-gray-400 hover:text-gray-600 transition"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">狀態</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Status }))}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]/30 focus:border-[#2C1F10] bg-white">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">備註</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="備註說明（選填）"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]/30 focus:border-[#2C1F10] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">取消</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#C09A6A] hover:bg-[#8B6840] text-white rounded-xl text-sm font-medium transition disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                儲存變更
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const StatusDropdown: React.FC<{ item: InventoryItem; onUpdate: (item: InventoryItem) => void }> = ({ item, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const style = statusStyle(item.status);

  const handleSelect = async (status: Status) => {
    setOpen(false);
    const { data } = await supabase.from('room_inventory_items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', item.id).select().maybeSingle();
    if (data) onUpdate(data as InventoryItem);
    await logAdminAction('update_room_inventory_status', 'room_inventory_items', item.id, { room_id: item.room_id, status });
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition hover:opacity-80 ${style.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {item.status}
        <ChevronDown className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30 min-w-[120px]">
              {STATUSES.map(s => (
                <button key={s.value} onClick={() => handleSelect(s.value)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 transition ${item.status === s.value ? 'font-semibold' : ''}`}>
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminRoomInventory: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [quickAdd, setQuickAdd] = useState<{ open: boolean; category: Category }>({ open: false, category: '3c' });
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const fetchData = useCallback(async () => {
    if (!roomId) return;
    const [{ data: roomData }, { data: itemData }] = await Promise.all([
      supabase.from('tbl_rooms').select('id, name, location, room_type').eq('id', roomId).maybeSingle(),
      supabase.from('room_inventory_items').select('*').eq('room_id', roomId).order('category').order('created_at'),
    ]);
    setRoom(roomData as Room);
    setItems((itemData || []) as InventoryItem[]);
    setLoading(false);
  }, [roomId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此設備紀錄？')) return;
    await supabase.from('room_inventory_items').delete().eq('id', id);
    await logAdminAction('delete_room_inventory_item', 'room_inventory_items', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleQuickSaved = (saved: InventoryItem[]) => {
    setItems(prev => [...prev, ...saved]);
  };

  const handleEditSaved = (saved: InventoryItem) => {
    setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
  };

  const handleStatusUpdate = (updated: InventoryItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const filtered = items.filter(i => {
    const matchCat = activeCategory === 'all' || i.category === activeCategory;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.notes.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const stats = {
    total: items.length,
    confirmed: items.filter(i => i.status === '確認').length,
    missing: items.filter(i => i.status === '遺失').length,
    damaged: items.filter(i => i.status === '損壞').length,
    needRestock: items.filter(i => i.status === '待補充').length,
  };

  const existingNamesByCategory = (cat: Category) => items.filter(i => i.category === cat).map(i => i.name);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!room) return (
    <div className="text-center py-20 text-gray-400">
      <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-40" />
      <p>找不到房間資料</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/rooms" className="p-2 text-gray-400 hover:text-[#2C1F10] hover:bg-[#F0E4C8] rounded-xl transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{room.name} — 設備清點</h1>
          <p className="text-sm text-gray-400 mt-0.5">{room.location}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: '設備總計', value: stats.total, icon: <Layers className="w-4 h-4" />, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: '確認正常', value: stats.confirmed, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '設備遺失', value: stats.missing, icon: <Search className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50' },
          { label: '設備損壞', value: stats.damaged, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: '待補充', value: stats.needRestock, icon: <PackageCheck className="w-4 h-4" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 flex items-center gap-3`}>
            <div className={s.color}>{s.icon}</div>
            <div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜尋設備名稱或備註…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]/30 focus:border-[#2C1F10]" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setActiveCategory('all')}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition ${activeCategory === 'all' ? 'bg-[#C09A6A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            全部
          </button>
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setActiveCategory(c.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${activeCategory === c.key ? 'bg-[#C09A6A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {c.icon}<span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {CATEGORIES.filter(c => activeCategory === 'all' || activeCategory === c.key).map(cat => {
          const catItems = filtered.filter(i => i.category === cat.key);
          return (
            <motion.div key={cat.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className={`flex items-center justify-between px-5 py-3.5 border-b border-gray-100 ${cat.bg} border-l-4 ${cat.border}`}>
                <div className="flex items-center gap-2.5">
                  <span className={cat.color}>{cat.icon}</span>
                  <span className={`font-semibold text-sm ${cat.color}`}>{cat.label}</span>
                  <span className="text-xs text-gray-400">({catItems.length} 項)</span>
                </div>
                <button onClick={() => setQuickAdd({ open: true, category: cat.key })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition bg-white border ${cat.border} ${cat.color} shadow-sm hover:brightness-95`}>
                  <Plus className="w-3.5 h-3.5" />新增
                </button>
              </div>

              {catItems.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-gray-300 gap-2">
                  <RotateCcw className="w-8 h-8 opacity-30" />
                  <p className="text-sm text-gray-400">尚無{cat.label}設備紀錄</p>
                  <button onClick={() => setQuickAdd({ open: true, category: cat.key })}
                    className="text-xs text-[#2C1F10] underline underline-offset-2 hover:opacity-70 transition">
                    立即勾選新增
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {catItems.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">× {item.quantity}</span>
                          {item.notes && (
                            <span className="text-xs text-gray-400 truncate max-w-[200px]">— {item.notes}</span>
                          )}
                        </div>
                      </div>
                      <StatusDropdown item={item} onUpdate={handleStatusUpdate} />
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setEditItem(item)}
                          className="p-1.5 text-gray-400 hover:text-[#2C1F10] hover:bg-[#F0E4C8] rounded-lg transition">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {quickAdd.open && roomId && (
        <QuickAddModal
          open={quickAdd.open}
          categoryKey={quickAdd.category}
          roomId={roomId}
          existingNames={existingNamesByCategory(quickAdd.category)}
          onClose={() => setQuickAdd(p => ({ ...p, open: false }))}
          onSaved={handleQuickSaved}
        />
      )}

      {editItem && (
        <EditModal
          open={!!editItem}
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
};

export default AdminRoomInventory;
