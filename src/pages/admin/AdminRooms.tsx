import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, BedDouble, MapPin, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { logAdminAction } from '../../lib/auditLog';

interface Room { id: string; name: string; location: string; room_type: string; price_per_night: number; capacity: number; is_available: boolean; image_url: string; }

const TYPE_LABELS: Record<string, string> = { single: '單人房', double: '雙人房', suite: '套房', family: '家庭房', villa: '別墅' };

const AdminRooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase.from('tbl_rooms').select('id, name, location, room_type, price_per_night, capacity, is_available, image_url').order('name');
      setRooms(data || []);
      setLoading(false);
    };
    fetchRooms();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此房型？')) return;
    await supabase.from('tbl_rooms').delete().eq('id', id);
    await logAdminAction('delete_room', 'tbl_rooms', id);
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const handleToggleAvailable = async (id: string, current: boolean) => {
    await supabase.from('tbl_rooms').update({ is_available: !current }).eq('id', id);
    await logAdminAction(current ? 'disable_room' : 'enable_room', 'tbl_rooms', id, { is_available: !current });
    setRooms(prev => prev.map(r => r.id === id ? { ...r, is_available: !current } : r));
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">房間管理</h1>
        <Link to="/admin/rooms/new" className="flex items-center gap-1.5 bg-[#C09A6A] hover:bg-[#8B6840] text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm">
          <Plus className="w-4 h-4" />新增房型
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">房型</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">類型</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">每晚</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">容納</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">狀態</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rooms.map((room, i) => (
                <motion.tr key={room.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={room.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=80'} alt={room.name} className="w-12 h-10 object-cover rounded-lg flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{room.name}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" />{room.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs bg-[#F0E4C8] text-[#2C1F10] px-2 py-0.5 rounded-full">{TYPE_LABELS[room.room_type] || room.room_type}</span></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(room.price_per_night)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{room.capacity} 人</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleAvailable(room.id, room.is_available)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${room.is_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {room.is_available ? '可預訂' : '已停用'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/rooms/${room.id}/inventory`} title="設備清點" className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><ClipboardList className="w-4 h-4" /></Link>
                      <Link to={`/admin/rooms/${room.id}`} title="編輯" className="p-1.5 text-gray-400 hover:text-[#2C1F10] hover:bg-[#F0E4C8] rounded-lg transition"><Pencil className="w-4 h-4" /></Link>
                      <button onClick={() => handleDelete(room.id)} title="刪除" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {rooms.length === 0 && <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2"><BedDouble className="w-10 h-10 opacity-20" /><p>暫無房型資料</p></div>}
        </div>
      </div>
    </div>
  );
};

export default AdminRooms;
