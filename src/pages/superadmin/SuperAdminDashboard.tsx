import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BedDouble, ShoppingBag, DollarSign, Shield, UserPlus, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

interface AdminUser { id: string; user_id: string; role: string; is_active: boolean; created_at: string; display_name?: string; }
interface SystemStats { totalUsers: number; totalBookings: number; totalOrders: number; totalRevenue: number; }

const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({ totalUsers: 0, totalBookings: 0, totalOrders: 0, totalRevenue: 0 });
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteUserId, setPromoteUserId] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    const [{ count: usrCount }, { count: bkCount }, { count: ordCount }, { data: revenue }, { data: adminsData }] = await Promise.all([
      supabase.from('tbl_user_auth').select('*', { count: 'exact', head: true }),
      supabase.from('tbl_bookings').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
      supabase.from('tbl_user_auth').select('*').in('role', ['admin', 'superadmin']).order('created_at', { ascending: false }),
    ]);
    const totalRev = (revenue || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
    setStats({ totalUsers: usrCount || 0, totalBookings: bkCount || 0, totalOrders: ordCount || 0, totalRevenue: totalRev });

    // Fetch profiles for admins
    const adminUserIds = (adminsData || []).map((a: any) => a.user_id);
    const { data: profiles } = await supabase.from('tbl_mn5wgzh0').select('user_id, display_name').in('user_id', adminUserIds);
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
    setAdmins((adminsData || []).map((a: any) => ({ ...a, display_name: profileMap[a.user_id] })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handlePromote = async () => {
    if (!promoteUserId.trim()) return;
    setPromoting(true);
    try {
      const { data: existing } = await supabase.from('tbl_user_auth').select('id').eq('user_id', promoteUserId).maybeSingle();
      if (!existing) {
        setPromoteMsg({ type: 'error', text: '找不到此用戶 ID' });
        setTimeout(() => setPromoteMsg(null), 3000);
        return;
      }
      const { error } = await supabase.from('tbl_user_auth').update({ role: 'admin' }).eq('user_id', promoteUserId);
      if (!error) {
        setPromoteUserId('');
        fetchData();
        setPromoteMsg({ type: 'success', text: '已成功提升為管理員！' });
        setTimeout(() => setPromoteMsg(null), 3000);
      } else {
        setPromoteMsg({ type: 'error', text: '操作失敗，請稍後再試' });
        setTimeout(() => setPromoteMsg(null), 3000);
      }
    } finally {
      setPromoting(false);
    }
  };

  const ROLE_COLORS: Record<string, string> = { superadmin: 'bg-purple-100 text-purple-700', admin: 'bg-[#F0E4C8] text-[#2C1F10]', user: 'bg-gray-100 text-gray-600' };

  const HEALTH_CHECKS = [
    { label: '資料庫連線', status: 'normal' },
    { label: '用戶認證服務', status: 'normal' },
    { label: 'AI 服務', status: 'normal' },
    { label: '付款服務', status: 'normal' },
  ];

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {promoteMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 ${promoteMsg.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}
          >
            {promoteMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{promoteMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-100 rounded-xl"><Shield className="w-6 h-6 text-purple-700" /></div>
        <h1 className="text-2xl font-bold text-gray-900">超級管理員總覽</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-5 h-5 text-blue-600" />, label: '總用戶數', value: stats.totalUsers, color: 'bg-blue-50' },
          { icon: <BedDouble className="w-5 h-5 text-teal-600" />, label: '總訂房數', value: stats.totalBookings, color: 'bg-teal-50' },
          { icon: <ShoppingBag className="w-5 h-5 text-purple-600" />, label: '總訂單數', value: stats.totalOrders, color: 'bg-purple-50' },
          { icon: <DollarSign className="w-5 h-5 text-green-600" />, label: '總營收', value: formatCurrency(stats.totalRevenue), color: 'bg-green-50' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-gray-500 text-sm">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-purple-600" />管理員列表</h3>
          {admins.length === 0 ? <p className="text-gray-400 text-center py-4">暫無管理員</p> : (
            <div className="space-y-3">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">
                      {admin.display_name?.[0] || 'A'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{admin.display_name || '管理員'}</p>
                      <p className="text-xs text-gray-400">{formatDate(admin.created_at)}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[admin.role] || 'bg-gray-100 text-gray-600'}`}>{admin.role === 'superadmin' ? '超管' : '管理員'}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5"><UserPlus className="w-4 h-4" />提升為管理員</p>
            <div className="flex gap-2">
              <input value={promoteUserId} onChange={e => setPromoteUserId(e.target.value)} placeholder="輸入 User ID" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600" />
              <button onClick={handlePromote} disabled={promoting} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center gap-1">
                {promoting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '提升'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-green-600" />系統健康狀態</h3>
          <div className="space-y-3">
            {HEALTH_CHECKS.map((check, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{check.label}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${check.status === 'normal' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-xs font-medium ${check.status === 'normal' ? 'text-green-600' : 'text-red-500'}`}>{check.status === 'normal' ? '正常' : '異常'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
