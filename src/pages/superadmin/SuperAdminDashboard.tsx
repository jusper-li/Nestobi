import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  BedDouble,
  ShoppingBag,
  DollarSign,
  Shield,
  RefreshCcw,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';
import AdminPageHeader from '../../components/superadmin/AdminPageHeader';

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

const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalBookings: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [
      { count: usrCount },
      { count: bkCount },
      { count: ordCount },
      { data: revenue },
      { data: adminsData },
    ] = await Promise.all([
      supabase.from('tbl_user_auth').select('*', { count: 'exact', head: true }),
      supabase.from('tbl_bookings').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
      supabase.from('tbl_user_auth').select('*').in('role', ['admin', 'superadmin']).order('created_at', { ascending: false }),
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
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const ROLE_COLORS: Record<string, string> = {
    superadmin: 'bg-amber-100 text-amber-700',
    admin: 'bg-[#F0E4C8] text-[#2C1F10]',
    user: 'bg-gray-100 text-gray-600',
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="超級管理員總覽"
        description="集中查看會員、住宿、商店訂單與已收營收；詳細操作請進入對應管理頁。"
        icon={<Shield className="h-6 w-6" />}
        actions={
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" />
            重新整理
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { to: '/superadmin/users', icon: <Users className="h-5 w-5 text-blue-600" />, label: '使用者總數', value: stats.totalUsers, color: 'bg-blue-50' },
          { to: '/superadmin/rooms', icon: <BedDouble className="h-5 w-5 text-teal-600" />, label: '住宿訂單數', value: stats.totalBookings, color: 'bg-teal-50' },
          { to: '/superadmin/orders', icon: <ShoppingBag className="h-5 w-5 text-amber-600" />, label: '商店訂單數', value: stats.totalOrders, color: 'bg-amber-50' },
          { to: '/superadmin/revenue', icon: <DollarSign className="h-5 w-5 text-green-600" />, label: '已收總營收', value: formatCurrency(stats.totalRevenue), color: 'bg-green-50' },
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
          >
            <Link to={stat.to} className="block p-5" aria-label={`前往${stat.label}`}>
              <div className="flex items-start justify-between gap-3">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>{stat.icon}</div>
                <ArrowRight className="h-4 w-4 text-gray-300 transition group-hover:translate-x-1 group-hover:text-amber-600" />
              </div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="max-w-4xl rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <Shield className="h-5 w-5 text-amber-600" />
            超級管理員與管理員
          </h3>
          {admins.length === 0 ? (
            <p className="py-4 text-center text-gray-400">目前沒有管理員資料</p>
          ) : (
            <div className="space-y-3">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
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

          <div className="mt-5 grid gap-3 border-t border-gray-100 pt-5 sm:grid-cols-2">
            <Link to="/superadmin/users" className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-amber-300 hover:bg-amber-50">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-amber-600" />管理會員角色</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/superadmin/permissions" className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-amber-300 hover:bg-amber-50">
              <span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-amber-600" />設定功能權限</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
