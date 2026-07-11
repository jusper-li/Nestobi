import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  BedDouble,
  ShoppingBag,
  DollarSign,
  Shield,
  UserPlus,
  Activity,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { logAdminAction } from '../../lib/auditLog';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  display_name?: string;
}

interface SystemStats {
  totalUsers: number;
  totalBookings: number;
  totalOrders: number;
  totalRevenue: number;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  details?: Record<string, unknown> | null;
  actor_user_id?: string | null;
}

const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalBookings: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteUserId, setPromoteUserId] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);

  const fetchData = async () => {
    const [
      { count: usrCount },
      { count: bkCount },
      { count: ordCount },
      { data: revenue },
      { data: adminsData },
      { data: logsData },
    ] = await Promise.all([
      supabase.from('tbl_user_auth').select('*', { count: 'exact', head: true }),
      supabase.from('tbl_bookings').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
      supabase.from('tbl_user_auth').select('*').in('role', ['admin', 'superadmin']).order('created_at', { ascending: false }),
      supabase
        .from('admin_activity_logs')
        .select('id,action,entity_type,entity_id,details,actor_user_id,created_at')
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    const totalRev = (revenue || []).reduce((sum: number, row: any) => sum + (row.total_amount || 0), 0);
    setStats({
      totalUsers: usrCount || 0,
      totalBookings: bkCount || 0,
      totalOrders: ordCount || 0,
      totalRevenue: totalRev,
    });

    const adminUserIds = (adminsData || []).map((admin: any) => admin.user_id);
    const { data: profiles } = await supabase
      .from('tbl_mn5wgzh0')
      .select('user_id, display_name')
      .in('user_id', adminUserIds);

    const profileMap = Object.fromEntries((profiles || []).map((profile: any) => [profile.user_id, profile.display_name]));
    setAdmins((adminsData || []).map((admin: any) => ({ ...admin, display_name: profileMap[admin.user_id] })));
    setRecentLogs((logsData || []) as ActivityLog[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePromote = async () => {
    if (!promoteUserId.trim()) return;
    setPromoting(true);
    try {
      const { data: existing } = await supabase.from('tbl_user_auth').select('id').eq('user_id', promoteUserId).maybeSingle();
      if (!existing) {
        setPromoteMsg({ type: 'error', text: '找不到這個 User ID' });
        setTimeout(() => setPromoteMsg(null), 3000);
        return;
      }

      const { error } = await supabase.from('tbl_user_auth').update({ role: 'admin' }).eq('user_id', promoteUserId);
      if (!error) {
        await logAdminAction('promote_admin', 'tbl_user_auth', promoteUserId, { role: 'admin' });
        setPromoteUserId('');
        await fetchData();
        setPromoteMsg({ type: 'success', text: '已成功提升為管理員' });
        setTimeout(() => setPromoteMsg(null), 3000);
      } else {
        setPromoteMsg({ type: 'error', text: '提升失敗，請稍後再試' });
        setTimeout(() => setPromoteMsg(null), 3000);
      }
    } finally {
      setPromoting(false);
    }
  };

  const ROLE_COLORS: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700',
    admin: 'bg-[#F0E4C8] text-[#2C1F10]',
    user: 'bg-gray-100 text-gray-600',
  };

  const HEALTH_CHECKS = [
    { label: '資料庫連線', status: 'normal' },
    { label: '用戶認證服務', status: 'normal' },
    { label: 'AI 服務', status: 'normal' },
    { label: '付款服務', status: 'normal' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {promoteMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl px-5 py-3 shadow-lg ${
              promoteMsg.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            } text-white`}
          >
            {promoteMsg.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{promoteMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-xl bg-purple-100 p-2">
          <Shield className="h-6 w-6 text-purple-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">超級管理員總覽</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: <Users className="h-5 w-5 text-blue-600" />, label: '使用者總數', value: stats.totalUsers, color: 'bg-blue-50' },
          { icon: <BedDouble className="h-5 w-5 text-teal-600" />, label: '住宿訂單數', value: stats.totalBookings, color: 'bg-teal-50' },
          { icon: <ShoppingBag className="h-5 w-5 text-purple-600" />, label: '商店訂單數', value: stats.totalOrders, color: 'bg-purple-50' },
          { icon: <DollarSign className="h-5 w-5 text-green-600" />, label: '已收總營收', value: formatCurrency(stats.totalRevenue), color: 'bg-green-50' },
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl bg-white p-5 shadow-sm"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>{stat.icon}</div>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <Shield className="h-5 w-5 text-purple-600" />
            超級管理員與管理員
          </h3>
          {admins.length === 0 ? (
            <p className="py-4 text-center text-gray-400">目前沒有管理員資料</p>
          ) : (
            <div className="space-y-3">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                      {admin.display_name?.[0] || 'A'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{admin.display_name || '未命名管理員'}</p>
                      <p className="text-xs text-gray-400">{formatDate(admin.created_at)}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[admin.role] || 'bg-gray-100 text-gray-600'}`}>
                    {admin.role === 'superadmin' ? '超級管理員' : '管理員'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <UserPlus className="h-4 w-4" />
              提升為管理員
            </p>
            <div className="flex gap-2">
              <input
                value={promoteUserId}
                onChange={e => setPromoteUserId(e.target.value)}
                placeholder="輸入 User ID"
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                onClick={handlePromote}
                disabled={promoting}
                className="flex items-center gap-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-60"
              >
                {promoting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : '提升'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <Activity className="h-5 w-5 text-green-600" />
            系統健康狀態
          </h3>
          <div className="space-y-3">
            {HEALTH_CHECKS.map((check, index) => (
              <div key={index} className="flex items-center justify-between border-b border-gray-50 py-2.5 last:border-0">
                <span className="text-sm text-gray-700">{check.label}</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${check.status === 'normal' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-xs font-medium ${check.status === 'normal' ? 'text-green-600' : 'text-red-500'}`}>
                    {check.status === 'normal' ? '正常' : '異常'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900">
            <Activity className="h-5 w-5 text-green-600" />
            最近活動紀錄
          </h3>
          <button type="button" onClick={fetchData} className="text-sm font-medium text-green-700 hover:text-green-800">
            重新整理
          </button>
        </div>
        {recentLogs.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">目前沒有活動紀錄</p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map(log => (
              <div key={log.id} className="rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{log.action.replace(/_/g, ' ')}</p>
                  <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {log.entity_type}
                  {log.entity_id ? ` · ${log.entity_id}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
