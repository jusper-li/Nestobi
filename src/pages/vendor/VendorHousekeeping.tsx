import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList, BedDouble, MapPin, CheckCircle2, AlertTriangle,
  PackageCheck, Search, ArrowRight, AlertCircle, Hotel,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Room {
  id: string;
  name: string;
  room_type: string;
  location: string;
  is_available: boolean;
  image_url: string;
  hotel_id?: string;
}

interface RoomStats {
  total: number;
  confirmed: number;
  issues: number;
  needRestock: number;
}

interface HotelOption {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: '單人房', double: '雙人房', suite: '套房', deluxe: '豪華房', family: '家庭房',
};

const VendorHousekeeping: React.FC = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, RoomStats>>({});
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);
  const [search, setSearch] = useState('');

  const fetchRooms = async (vid: string, hotelId: string | null) => {
    let q = supabase
      .from('tbl_rooms')
      .select('id, name, room_type, location, is_available, image_url, hotel_id')
      .eq('vendor_id', vid);
    if (hotelId) q = q.eq('hotel_id', hotelId);
    else q = q.is('hotel_id', null);
    const { data: roomData } = await q.order('created_at', { ascending: false });

    const roomList = (roomData || []) as Room[];
    setRooms(roomList);

    if (roomList.length > 0) {
      const roomIds = roomList.map(r => r.id);
      const { data: items } = await supabase
        .from('room_inventory_items')
        .select('room_id, status')
        .in('room_id', roomIds);

      const map: Record<string, RoomStats> = {};
      roomList.forEach(r => { map[r.id] = { total: 0, confirmed: 0, issues: 0, needRestock: 0 }; });
      (items || []).forEach((item: any) => {
        if (!map[item.room_id]) return;
        map[item.room_id].total++;
        if (item.status === '確認') map[item.room_id].confirmed++;
        if (item.status === '遺失' || item.status === '損壞') map[item.room_id].issues++;
        if (item.status === '待補充') map[item.room_id].needRestock++;
      });
      setStatsMap(map);
    } else {
      setStatsMap({});
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('vendors').select('id').eq('user_id', user.id).maybeSingle().then(async ({ data }) => {
      if (!data) { setNoVendor(true); setLoading(false); return; }
      setVendorId(data.id);

      const { data: hotelData } = await supabase
        .from('hotels')
        .select('id, name, city, is_active')
        .eq('vendor_id', data.id)
        .order('created_at', { ascending: true });
      const hotelList = (hotelData || []) as HotelOption[];
      setHotels(hotelList);

      const firstHotelId = hotelList[0]?.id ?? null;
      setSelectedHotelId(firstHotelId);
      await fetchRooms(data.id, firstHotelId);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (vendorId !== null) fetchRooms(vendorId, selectedHotelId);
  }, [selectedHotelId]);

  const filtered = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
            <ClipboardList className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">房務管理</h1>
            <p className="text-sm text-gray-400 mt-0.5">管理各房間設備清點與維護狀態</p>
          </div>
        </div>
      </div>

      {/* Hotel selector */}
      {hotels.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Hotel className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">尚未建立飯店</p>
            <p className="text-xs text-amber-600 mt-0.5">請先至「飯店管理」建立飯店，再新增房間</p>
          </div>
          <a href="/vendor/hotels" className="flex-shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition">前往建立</a>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-1 flex items-center gap-1 overflow-x-auto">
          {hotels.map(h => (
            <button key={h.id} onClick={() => setSelectedHotelId(h.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${selectedHotelId === h.id ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Hotel className="w-4 h-4" />
              {h.name}
              {h.city && <span className={`text-xs ${selectedHotelId === h.id ? 'text-teal-200' : 'text-gray-400'}`}>· {h.city}</span>}
              {!h.is_active && <span className={`text-xs ${selectedHotelId === h.id ? 'text-teal-200' : 'text-gray-400'}`}>(停用)</span>}
            </button>
          ))}
        </div>
      )}

      {selectedHotelId && hotels.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Hotel className="w-4 h-4 text-teal-500" />
          <span>目前顯示：<span className="font-medium text-gray-800">{hotels.find(h => h.id === selectedHotelId)?.name}</span> 的房間</span>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋房間名稱或地點…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-14 text-center">
          <BedDouble className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">
            {rooms.length === 0 ? '此飯店尚無房間，請先至「房間管理」新增房間' : '找不到符合條件的房間'}
          </p>
          {rooms.length === 0 && (
            <Link to="/vendor/rooms" className="inline-flex items-center gap-1.5 mt-4 text-sm text-emerald-600 font-medium hover:underline">
              前往房間管理 <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((room, i) => {
            const stats = statsMap[room.id] || { total: 0, confirmed: 0, issues: 0, needRestock: 0 };
            const hasIssues = stats.issues > 0;
            const needsRestock = stats.needRestock > 0;

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="relative">
                  {room.image_url ? (
                    <img src={room.image_url} alt={room.name} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center">
                      <BedDouble className="w-10 h-10 text-teal-300" />
                    </div>
                  )}
                  {(hasIssues || needsRestock) && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      {hasIssues && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />{stats.issues} 問題
                        </span>
                      )}
                      {needsRestock && !hasIssues && (
                        <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <PackageCheck className="w-3 h-3" />待補充
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-1.5">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{room.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${room.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {room.is_available ? '開放' : '停售'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <MapPin className="w-3 h-3" />
                    <span>{room.location || ROOM_TYPE_LABELS[room.room_type] || room.room_type}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: '設備', value: stats.total, color: 'text-gray-600', bg: 'bg-gray-50' },
                      { label: '確認', value: stats.confirmed, icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-green-600', bg: 'bg-green-50' },
                      { label: '異常', value: stats.issues + stats.needRestock, icon: <AlertTriangle className="w-3 h-3" />, color: stats.issues + stats.needRestock > 0 ? 'text-red-600' : 'text-gray-400', bg: stats.issues + stats.needRestock > 0 ? 'bg-red-50' : 'bg-gray-50' },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-400">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <Link
                    to={`/vendor/housekeeping/${room.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition"
                  >
                    <ClipboardList className="w-4 h-4" />
                    設備清點
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorHousekeeping;
