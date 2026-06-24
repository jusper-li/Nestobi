import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, MapPin, Search, Store, Pencil, Plus, Trash2, AlertTriangle, Building2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface Room {
  id: string;
  name: string;
  location: string;
  room_type: string;
  price_per_night: number;
  weekend_price?: number;
  capacity: number;
  min_capacity?: number;
  floor?: string;
  is_available: boolean;
  image_url: string;
  images?: string[];
  vendor_id: string | null;
  vendors?: { name: string } | null;
  hotels?: { name: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  single: '單人房', double: '雙人房', suite: '套房', family: '家庭房', villa: '別墅',
};

const SuperAdminRooms: React.FC = () => {
  const location = useLocation();
  const initialParams = new URLSearchParams(location.search);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState('all');
  const [availFilter, setAvailFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRooms = async () => {
    const { data } = await supabase
      .from('tbl_rooms')
      .select('id, name, location, room_type, price_per_night, weekend_price, capacity, min_capacity, floor, is_available, image_url, images, vendor_id, vendors(name), hotels(name)')
      .order('name');
    setRooms((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get('q') || '');
  }, [location.search]);

  useEffect(() => { loadRooms(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('tbl_rooms').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    await loadRooms();
  };

  const types = ['all', ...Array.from(new Set(rooms.map(r => r.room_type).filter(Boolean)))];

  const filtered = rooms.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.name.toLowerCase().includes(q) || (r.location || '').toLowerCase().includes(q) || (r.vendors?.name || '').toLowerCase().includes(q) || (r.hotels?.name || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || r.room_type === typeFilter;
    const matchAvail = availFilter === 'all' || (availFilter === 'available' ? r.is_available : !r.is_available);
    return matchSearch && matchType && matchAvail;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl"><BedDouble className="w-6 h-6 text-amber-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">所有房間</h1>
            <p className="text-sm text-gray-400">跨廠商查看並管理所有房型</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/superadmin/rooms/new')}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />新增房型
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋房型名稱、地點或廠商…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="all">全部類型</option>
          {types.filter(t => t !== 'all').map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>
        <select
          value={availFilter}
          onChange={e => setAvailFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="all">全部狀態</option>
          <option value="available">可預訂</option>
          <option value="unavailable">已停用</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BedDouble className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p>找不到房型資料</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">房型</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">廠商 / 飯店</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">類型</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">平日 / 假日</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">容納</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">狀態</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((room, i) => {
                  const coverImg = (room.images && room.images.length > 0 ? room.images[0] : null) || room.image_url || 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?w=80';
                  return (
                  <motion.tr key={room.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-amber-50/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <img src={coverImg} alt={room.name} className="w-12 h-10 object-cover rounded-lg" />
                          {room.floor && (
                            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[9px] px-1 py-0.5 rounded font-bold leading-none">{room.floor}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{room.name}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="w-3 h-3" />{room.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Store className="w-3.5 h-3.5 text-amber-500" />
                          {room.vendors?.name || <span className="text-gray-300">未綁定廠商</span>}
                        </div>
                        {room.hotels?.name && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-700">
                            <Building2 className="w-3.5 h-3.5" />{room.hotels.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[room.room_type] || room.room_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs">{formatCurrency(room.price_per_night)}</p>
                      {room.weekend_price && room.weekend_price > 0 && (
                        <p className="text-xs text-gray-400">{formatCurrency(room.weekend_price)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {room.min_capacity && room.min_capacity !== room.capacity ? `${room.min_capacity}–${room.capacity}` : room.capacity} 人
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${room.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {room.is_available ? '可預訂' : '已停用'}
                      </span>
                    </td>
                                        <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/superadmin/rooms/detail/${room.id}`)}
                          className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg transition font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />查看
                        </button>
                        <button
                          onClick={() => navigate(`/superadmin/rooms/${room.id}`)}
                          className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition font-medium"
                        >
                          <Pencil className="w-3.5 h-3.5" />編輯
                        </button>
                        <button
                          onClick={() => setDeleteTarget(room)}
                          className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />刪除
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-xs text-gray-400 text-right">共 {filtered.length} / {rooms.length} 筆房型</p>
      )}

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">確認刪除房間</h3>
                  <p className="text-xs text-gray-400">此操作無法復原</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                確定要刪除 <span className="font-semibold text-gray-900">「{deleteTarget.name}」</span> 嗎？相關的庫存與定價資料也會一併移除。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? '刪除中…' : '確認刪除'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminRooms;


