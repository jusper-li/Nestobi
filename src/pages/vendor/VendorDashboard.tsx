import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BedDouble, Package, ShoppingBag, DollarSign, TrendingUp, AlertCircle,
  Store, ArrowRight, LogIn, LogOut, AlertTriangle, PackageCheck,
  CheckCircle2, Calendar, BarChart3, ClipboardList, RefreshCcw,
  Tv, Droplets, Sofa, ChevronRight, BedSingle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

type Period = 'today' | 'week' | 'month';

interface Room {
  id: string;
  name: string;
  room_type: string;
  location: string;
  is_available: boolean;
}

interface RoomInventorySummary {
  total: number;
  confirmed: number;
  issues: number;
  needRestock: number;
  cleaning: number;
}

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  tbl_rooms?: { name: string };
}

interface Alert {
  roomId: string;
  roomName: string;
  category: string;
  itemName: string;
  status: string;
}

const PERIOD_LABELS: Record<Period, string> = { today: '今日', week: '本週', month: '本月' };

const today = () => new Date().toISOString().split('T')[0];
const weekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
};
const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const periodStart = (p: Period) => p === 'today' ? today() : p === 'week' ? weekStart() : monthStart();

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '3c': <Tv className="w-3 h-3" />,
  cleaning: <Droplets className="w-3 h-3" />,
  bedding: <BedSingle className="w-3 h-3" />,
  furniture: <Sofa className="w-3 h-3" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  '3c': '3C家電', cleaning: '清潔用品', bedding: '寢具換洗', furniture: '軟裝設施',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: '單人房', double: '雙人房', suite: '套房', deluxe: '豪華房', family: '家庭房',
};

const VendorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);
  const [period, setPeriod] = useState<Period>('week');
  const [refreshing, setRefreshing] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, RoomInventorySummary>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [periodStats, setPeriodStats] = useState({ revenue: 0, bookings: 0, checkins: 0 });
  const [todayCheckins, setTodayCheckins] = useState<Booking[]>([]);
  const [todayCheckouts, setTodayCheckouts] = useState<Booking[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);

  const loadData = async (vid: string, p: Period) => {
    const start = periodStart(p);
    const todayStr = today();

    const [
      { data: roomData },
      { data: invItems },
      { data: allBookings },
      { data: checkinsData },
      { data: checkoutsData },
      { data: recentData },
    ] = await Promise.all([
      supabase.from('tbl_rooms').select('id, name, room_type, location, is_available').eq('vendor_id', vid).order('name'),
      supabase.from('room_inventory_items').select('room_id, category, name, status').in('room_id',
        (await supabase.from('tbl_rooms').select('id').eq('vendor_id', vid)).data?.map((r: any) => r.id) || []
      ),
      supabase.from('tbl_bookings').select('total_price, status, tbl_rooms!inner(vendor_id)').eq('tbl_rooms.vendor_id', vid).gte('created_at', start),
      supabase.from('tbl_bookings').select('id, check_in_date, check_out_date, total_price, status, tbl_rooms(name)').eq('tbl_rooms.vendor_id', vid).eq('check_in_date', todayStr).neq('status', 'cancelled').order('check_in_date'),
      supabase.from('tbl_bookings').select('id, check_in_date, check_out_date, total_price, status, tbl_rooms(name)').eq('tbl_rooms.vendor_id', vid).eq('check_out_date', todayStr).neq('status', 'cancelled').order('check_out_date'),
      supabase.from('tbl_bookings').select('id, check_in_date, check_out_date, total_price, status, tbl_rooms(name)').eq('tbl_rooms.vendor_id', vid).order('created_at', { ascending: false }).limit(6),
    ]);

    const roomList = (roomData || []) as Room[];
    setRooms(roomList);

    const invMap: Record<string, RoomInventorySummary> = {};
    roomList.forEach(r => { invMap[r.id] = { total: 0, confirmed: 0, issues: 0, needRestock: 0, cleaning: 0 }; });
    const rawAlerts: Alert[] = [];
    (invItems || []).forEach((item: any) => {
      if (!invMap[item.room_id]) return;
      invMap[item.room_id].total++;
      if (item.status === '確認') invMap[item.room_id].confirmed++;
      if (item.status === '遺失' || item.status === '損壞') {
        invMap[item.room_id].issues++;
        const room = roomList.find(r => r.id === item.room_id);
        rawAlerts.push({ roomId: item.room_id, roomName: room?.name || '', category: item.category, itemName: item.name, status: item.status });
      }
      if (item.status === '待補充') invMap[item.room_id].needRestock++;
      if (item.status === '清潔中') invMap[item.room_id].cleaning++;
    });
    setInventoryMap(invMap);
    setAlerts(rawAlerts.slice(0, 8));

    const bookingList = allBookings || [];
    const revenue = bookingList.filter((b: any) => b.status === 'completed').reduce((s: number, b: any) => s + (b.total_price || 0), 0);
    const totalBookings = bookingList.length;
    const checkinCount = bookingList.filter((b: any) => b.status !== 'cancelled').length;
    setPeriodStats({ revenue, bookings: totalBookings, checkins: checkinCount });

    setTodayCheckins((checkinsData || []) as unknown as Booking[]);
    setTodayCheckouts((checkoutsData || []) as unknown as Booking[]);
    setRecentBookings((recentData || []) as unknown as Booking[]);
  };

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: vendor } = await supabase.from('vendors').select('id, name').eq('user_id', user.id).maybeSingle();
      if (!vendor) { setNoVendor(true); setLoading(false); return; }
      setVendorId(vendor.id);
      setVendorName(vendor.name);
      await loadData(vendor.id, period);
      setLoading(false);
    };
    init();
  }, [user]);

  useEffect(() => {
    if (!vendorId) return;
    loadData(vendorId, period);
  }, [period]);

  const handleRefresh = async () => {
    if (!vendorId) return;
    setRefreshing(true);
    await loadData(vendorId, period);
    setRefreshing(false);
  };

  const totalIssues = Object.values(inventoryMap).reduce((s, v) => s + v.issues, 0);
  const totalRestock = Object.values(inventoryMap).reduce((s, v) => s + v.needRestock, 0);
  const availableRooms = rooms.filter(r => r.is_available).length;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (noVendor) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-yellow-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">尚未關聯廠商帳號</h2>
      <p className="text-gray-500 max-w-sm">請聯絡管理員將您的帳號與廠商資料進行關聯後，即可使用廠商後台。</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 rounded-xl">
            <Store className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{vendorName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
          </div>
        </div>
        <button onClick={handleRefresh}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 border border-gray-200 transition ${refreshing ? 'opacity-50' : ''}`}>
          <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {(totalIssues > 0 || totalRestock > 0) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-red-700">需要立即處理</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {totalIssues > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />{totalIssues} 件設備異常（損壞/遺失）
              </span>
            )}
            {totalRestock > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full">
                <PackageCheck className="w-3 h-3" />{totalRestock} 件設備待補充
              </span>
            )}
            <Link to="/vendor/housekeeping" className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 ml-auto">
              前往處理 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-gray-900 text-sm">營運報表</span>
          </div>
          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            {(['today', 'week', 'month'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${period === p ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y sm:divide-y-0 divide-gray-100">
          {[
            { icon: <DollarSign className="w-4 h-4" />, label: `${PERIOD_LABELS[period]}營收`, value: formatCurrency(periodStats.revenue), color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: <ShoppingBag className="w-4 h-4" />, label: `${PERIOD_LABELS[period]}訂單`, value: `${periodStats.bookings} 筆`, color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: <BedDouble className="w-4 h-4" />, label: '房間總數', value: `${rooms.length} 間`, color: 'text-slate-600', bg: 'bg-slate-50' },
            { icon: <CheckCircle2 className="w-4 h-4" />, label: '開放販售', value: `${availableRooms} 間`, color: 'text-teal-600', bg: 'bg-teal-50' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg} ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
                <p className={`text-lg font-bold leading-tight mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-green-500" />
              <span className="font-semibold text-sm text-gray-900">今日入住</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{todayCheckins.length}</span>
            </div>
            <Link to="/vendor/orders" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition">全部 <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          {todayCheckins.length === 0 ? (
            <div className="py-10 text-center text-gray-300">
              <LogIn className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm text-gray-400">今日無入住安排</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayCheckins.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <LogIn className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.tbl_rooms?.name || '—'}</p>
                    <p className="text-xs text-gray-400">退房：{formatDate(b.check_out_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.total_price)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-sm text-gray-900">今日退房</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{todayCheckouts.length}</span>
            </div>
            <Link to="/vendor/orders" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition">全部 <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          {todayCheckouts.length === 0 ? (
            <div className="py-10 text-center text-gray-300">
              <LogOut className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm text-gray-400">今日無退房安排</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayCheckouts.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.tbl_rooms?.name || '—'}</p>
                    <p className="text-xs text-gray-400">入住：{formatDate(b.check_in_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.total_price)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-teal-500" />
            <span className="font-semibold text-sm text-gray-900">房間狀態總覽</span>
          </div>
          <Link to="/vendor/housekeeping" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition">
            房務管理 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {rooms.length === 0 ? (
          <div className="py-12 text-center">
            <BedDouble className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">尚無房間資料</p>
            <Link to="/vendor/rooms" className="inline-flex items-center gap-1 mt-3 text-xs text-emerald-600 font-medium">
              新增房間 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:gap-3 p-3">
            {rooms.map((room, i) => {
              const inv = inventoryMap[room.id] || { total: 0, confirmed: 0, issues: 0, needRestock: 0, cleaning: 0 };
              const hasIssue = inv.issues > 0;
              const hasRestock = inv.needRestock > 0;
              const allGood = inv.total > 0 && inv.issues === 0 && inv.needRestock === 0;
              const healthScore = inv.total > 0 ? Math.round((inv.confirmed / inv.total) * 100) : 0;

              return (
                <motion.div key={room.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Link to={`/vendor/housekeeping/${room.id}`}
                    className={`block p-4 rounded-xl border transition hover:shadow-sm group
                      ${hasIssue ? 'border-red-200 bg-red-50/40 hover:bg-red-50' :
                        hasRestock ? 'border-yellow-200 bg-yellow-50/40 hover:bg-yellow-50' :
                          allGood ? 'border-green-200 bg-green-50/40 hover:bg-green-50' :
                            'border-gray-200 bg-gray-50/40 hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{room.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{ROOM_TYPE_LABELS[room.room_type] || room.room_type}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${room.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {room.is_available ? '開放' : '停售'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-3">
                      {hasIssue && (
                        <span className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                          <AlertTriangle className="w-3 h-3" />{inv.issues} 件異常
                        </span>
                      )}
                      {hasRestock && (
                        <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">
                          <PackageCheck className="w-3 h-3" />待補 {inv.needRestock}
                        </span>
                      )}
                      {allGood && (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" />狀態良好
                        </span>
                      )}
                      {inv.total === 0 && (
                        <span className="text-xs text-gray-400">尚未建立清單</span>
                      )}
                    </div>

                    {inv.total > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>設備確認 {inv.confirmed}/{inv.total}</span>
                          <span className={`font-semibold ${healthScore >= 80 ? 'text-green-600' : healthScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{healthScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${healthScore >= 80 ? 'bg-green-500' : healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${healthScore}%` }} />
                        </div>
                      </div>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-red-100 bg-red-50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-sm text-red-700">設備異常明細</span>
              <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">{alerts.length}</span>
            </div>
            <Link to="/vendor/housekeeping" className="text-xs text-red-600 hover:text-red-700 flex items-center gap-0.5 font-medium transition">
              前往處理 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs ${a.status === '遺失' ? 'bg-red-400' : 'bg-orange-400'}`}>
                  {CATEGORY_ICONS[a.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.roomName} — {a.itemName}</p>
                  <p className="text-xs text-gray-400">{CATEGORY_LABELS[a.category]}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.status === '遺失' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-sm text-gray-900">最近訂單</span>
          </div>
          <Link to="/vendor/orders" className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition">
            查看全部 <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">尚無訂單紀錄</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentBookings.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BedDouble className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{b.tbl_rooms?.name || '—'}</p>
                  <p className="text-xs text-gray-400">{formatDate(b.check_in_date)} — {formatDate(b.check_out_date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.total_price)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/vendor/rooms', icon: <BedDouble className="w-5 h-5 text-emerald-600" />, label: '房間管理', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { to: '/vendor/housekeeping', icon: <ClipboardList className="w-5 h-5 text-teal-600" />, label: '房務管理', bg: 'bg-teal-50', border: 'border-teal-200' },
          { to: '/vendor/products', icon: <Package className="w-5 h-5 text-blue-600" />, label: '商品管理', bg: 'bg-blue-50', border: 'border-[#D5CDB8]' },
          { to: '/vendor/orders', icon: <ShoppingBag className="w-5 h-5 text-amber-600" />, label: '訂單管理', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map((item, i) => (
          <Link key={i} to={item.to}
            className={`flex items-center gap-2.5 p-3.5 rounded-2xl border transition hover:shadow-sm hover:brightness-95 ${item.bg} ${item.border}`}>
            {item.icon}
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default VendorDashboard;
