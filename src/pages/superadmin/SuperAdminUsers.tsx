import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, UserCheck, UserX, Plus, X, Save, Eye, EyeOff, Phone, Globe, FileText, BedDouble, ShoppingBag, Award, Calendar, Mail, Coffee } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate, formatDateTime, formatCurrency, getStatusLabel, getStatusColor } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../lib/auditLog';

interface UserRow {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  display_name?: string;
  email?: string;
}

interface UserDetail {
  profile: any;
  bookings: any[];
  orders: any[];
  invoices: any[];
  points: any[];
  totalPoints: number;
}

const ROLE_OPTIONS = ['user', 'vendor', 'admin', 'superadmin'] as const;
const ROLE_LABELS: Record<string, string> = {
  user: '一般會員',
  vendor: '商家',
  admin: '管理員',
  superadmin: '超級管理員',
};
const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-amber-100 text-amber-700',
  admin: 'bg-blue-100 text-blue-700',
  vendor: 'bg-emerald-100 text-emerald-700',
  user: 'bg-gray-100 text-gray-600',
};

const PAGE_SIZE = 20;

const SuperAdminUsers: React.FC = () => {
  const location = useLocation();
  const initialParams = new URLSearchParams(location.search);
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialParams.get('q') || '');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', display_name: '', role: 'user' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'bookings' | 'orders' | 'invoices' | 'points'>('profile');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get('q') || '');
  }, [location.search]);

  const fetchEmails = async (userIds: string[]): Promise<Record<string, string>> => {
    try {
      const validUserIds = Array.from(new Set(userIds.filter(Boolean)));
      if (validUserIds.length === 0) return {};
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return {};
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_ids: validUserIds }),
      });
      if (!res.ok) return {};
      const { emails } = await res.json();
      return emails || {};
    } catch {
      return {};
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from('tbl_user_auth').select('*', { count: 'exact' });
    if (roleFilter !== 'all') query = query.eq('role', roleFilter);
    query = query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await query;
    if (!data) {
      setLoading(false);
      return;
    }

    const userIds = data.map((user: any) => user.user_id);
    const [{ data: profiles }, emailMap] = await Promise.all([
      supabase.from('tbl_mn5wgzh0').select('user_id, display_name').in('user_id', userIds),
      fetchEmails(userIds),
    ]);
    const profileMap = Object.fromEntries((profiles || []).map((profile: any) => [profile.user_id, profile.display_name]));

    const rows = data.map((user: any) => ({ ...user, display_name: profileMap[user.user_id] || '', email: emailMap[user.user_id] || '' }));
    const filtered = search
      ? rows.filter((user: UserRow) =>
          (user.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
          (user.email || '').toLowerCase().includes(search.toLowerCase()) ||
          user.user_id.includes(search))
      : rows;

    setUsers(filtered as UserRow[]);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) {
      setCreateError('請輸入電子郵件與密碼');
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError('密碼至少需要 6 個字元');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '建立會員失敗');
      setShowCreate(false);
      setCreateForm({ email: '', password: '', display_name: '', role: 'user' });
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || '建立會員失敗');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (user: UserRow) => {
    setViewUser(user);
    setDetail(null);
    setDetailLoading(true);
    setDetailTab('profile');

    const [profileRes, bookingsRes, ordersRes, invoicesRes, pointsRes] = await Promise.all([
      supabase.from('tbl_mn5wgzh0').select('*').eq('user_id', user.user_id).maybeSingle(),
      supabase.from('tbl_bookings').select('*, tbl_rooms(name)').eq('user_id', user.user_id).order('created_at', { ascending: false }).limit(10),
      supabase.from('orders').select('*').eq('user_id', user.user_id).order('created_at', { ascending: false }).limit(10),
      supabase
        .from('invoices')
        .select('id,order_id,user_id,invoice_status,invoice_number,invoice_random_number,invoice_date,buyer_name,buyer_email,buyer_identifier,carrier_type,carrier_number,love_code,tax_type,sales_amount,tax_amount,total_amount,ezpay_trade_no,error_message,created_at,updated_at')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('points').select('*').eq('user_id', user.user_id).order('created_at', { ascending: false }).limit(20),
    ]);

    const pts = (pointsRes.data || []) as any[];
    const totalPoints = pts.reduce((sum: number, point: any) => sum + (point.transaction_type === 'earned' ? point.amount : point.transaction_type === 'spent' ? -point.amount : 0), 0);
    setDetail({
      profile: profileRes.data,
      bookings: bookingsRes.data || [],
      orders: ordersRes.data || [],
      invoices: invoicesRes.data || [],
      points: pts,
      totalPoints,
    });
    setDetailLoading(false);
  };

  const updateRole = async (userId: string, role: string) => {
    if (userId === currentUser?.id) return;
    if (!window.confirm(`確定要將角色改為「${ROLE_LABELS[role] || role}」嗎？`)) return;
    setUpdating(userId);
    await supabase.from('tbl_user_auth').update({ role, updated_at: new Date().toISOString() }).eq('user_id', userId);
    await logAdminAction('update_user_role', 'tbl_user_auth', userId, { role });
    await fetchUsers();
    setUpdating(null);
  };

  const toggleActive = async (userId: string, current: boolean) => {
    if (userId === currentUser?.id) return;
    if (!window.confirm(`確定要${current ? '停用' : '啟用'}這位會員嗎？`)) return;
    setUpdating(userId);
    await supabase.from('tbl_user_auth').update({ is_active: !current, updated_at: new Date().toISOString() }).eq('user_id', userId);
    await logAdminAction(current ? 'deactivate_user' : 'activate_user', 'tbl_user_auth', userId);
    await fetchUsers();
    setUpdating(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2"><Users className="h-6 w-6 text-amber-700" /></div>
        <h1 className="text-2xl font-bold text-gray-900">會員管理</h1>
        <span className="ml-1 text-sm text-gray-400">共 {total} 筆</span>
        <div className="flex-1" />
        <button onClick={() => { setShowCreate(true); setCreateError(''); }} className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600">
          <Plus className="h-4 w-4" />
          新增會員
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-900">新增會員</h3>
                <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4 p-6">
                {createError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{createError}</div>}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">電子郵件</label>
                  <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="user@example.com" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">密碼</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="至少 6 個字元" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">顯示名稱</label>
                  <input type="text" value={createForm.display_name} onChange={e => setCreateForm({ ...createForm, display_name: e.target.value })} placeholder="可留空" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">角色</label>
                  <select value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40">
                    {ROLE_OPTIONS.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
                <button onClick={() => setShowCreate(false)} className="rounded-xl px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100">取消</button>
                <button onClick={handleCreateUser} disabled={creating} className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50">
                  {creating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
                  建立
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="搜尋姓名、電子郵件或會員 ID"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0); }} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
          <option value="all">所有角色</option>
          {ROLE_OPTIONS.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" /></div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gray-400"><Users className="mx-auto mb-2 h-10 w-10 opacity-20" /><p className="text-sm">找不到符合條件的會員</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-500">會員</th>
                  <th className="hidden px-5 py-3 text-left font-medium text-gray-500 md:table-cell">會員 ID</th>
                  <th className="px-5 py-3 text-center font-medium text-gray-500">角色</th>
                  <th className="px-5 py-3 text-center font-medium text-gray-500">狀態</th>
                  <th className="hidden px-5 py-3 text-left font-medium text-gray-500 lg:table-cell">建立時間</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <motion.tr
                    key={user.user_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`border-b border-gray-50 last:border-0 ${user.user_id === currentUser?.id ? 'bg-amber-50/30' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                          {user.display_name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{user.display_name || '未命名會員'}</p>
                          {user.email && <p className="truncate text-xs text-gray-400">{user.email}</p>}
                          {user.user_id === currentUser?.id && <span className="text-xs text-amber-600">(你)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3.5 md:table-cell">
                      <button onClick={() => navigator.clipboard.writeText(user.user_id)} title="複製會員 ID" className="group flex items-center gap-1 transition hover:text-amber-600">
                        <code className="font-mono text-xs text-gray-400 group-hover:text-amber-600">{user.user_id.slice(-12)}</code>
                        <span className="text-xs text-gray-300 opacity-0 transition group-hover:opacity-100 group-hover:text-amber-400">複製</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {user.user_id === currentUser?.id ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={updating === user.user_id}
                          onChange={e => updateRole(user.user_id, e.target.value)}
                          className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 ${ROLE_COLORS[user.role]}`}
                        >
                          {ROLE_OPTIONS.map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {user.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="hidden px-5 py-3.5 text-xs text-gray-400 lg:table-cell">{formatDate(user.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDetail(user)} className="rounded-xl p-2 text-amber-600 transition hover:bg-amber-50" title="查看詳情">
                          <Eye className="h-4 w-4" />
                        </button>
                        {user.user_id !== currentUser?.id && (
                          <button
                            onClick={() => toggleActive(user.user_id, user.is_active)}
                            disabled={updating === user.user_id}
                            className={`rounded-xl p-2 transition disabled:opacity-50 ${user.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={user.is_active ? '停用' : '啟用'}
                          >
                            {updating === user.user_id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewUser(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
              <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${ROLE_COLORS[viewUser.role] || 'bg-gray-100 text-gray-600'}`}>
                    {viewUser.display_name?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{viewUser.display_name || '未命名會員'}</h3>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[viewUser.role]}`}>{ROLE_LABELS[viewUser.role]}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${viewUser.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{viewUser.is_active ? '啟用' : '停用'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewUser(null)} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
              </div>

              <div className="flex flex-shrink-0 border-b border-gray-100 px-6">
                {([
                  { key: 'profile', label: '會員資料', icon: <Users className="h-3.5 w-3.5" /> },
                  { key: 'bookings', label: '訂房紀錄', icon: <BedDouble className="h-3.5 w-3.5" /> },
                  { key: 'orders', label: '訂單紀錄', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
                  { key: 'invoices', label: '發票紀錄', icon: <FileText className="h-3.5 w-3.5" /> },
                  { key: 'points', label: '點數紀錄', icon: <Award className="h-3.5 w-3.5" /> },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key)}
                    className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition ${detailTab === tab.key ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {detailLoading ? (
                  <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" /></div>
                ) : !detail ? null : detailTab === 'profile' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem icon={<Mail className="h-4 w-4" />} label="電子郵件" value={viewUser.email || '-'} />
                      <InfoItem icon={<Calendar className="h-4 w-4" />} label="建立時間" value={formatDateTime(viewUser.created_at)} />
                      <div className="col-span-2">
                        <InfoItem icon={<FileText className="h-4 w-4" />} label="會員 ID" value={viewUser.user_id} mono />
                      </div>
                    </div>
                    {detail.profile ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoItem icon={<Users className="h-4 w-4" />} label="顯示名稱" value={detail.profile.display_name || '-'} />
                          <InfoItem icon={<Phone className="h-4 w-4" />} label="手機" value={detail.profile.phone || '-'} />
                          <InfoItem icon={<Globe className="h-4 w-4" />} label="國籍" value={detail.profile.nationality || '-'} />
                          <InfoItem icon={<Globe className="h-4 w-4" />} label="偏好語言" value={detail.profile.preferred_language || '-'} />
                          <div className="col-span-2">
                            <InfoItem icon={<FileText className="h-4 w-4" />} label="簡介" value={detail.profile.bio || '-'} />
                          </div>
                        </div>
                        {(detail.profile.coffee_profile_label || detail.profile.coffee_profile_summary) && (
                          <div className="mt-4 rounded-2xl border border-[#eadfce] bg-gradient-to-br from-[#fff9f0] to-white p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#8a5a22]">
                              <Coffee className="h-4 w-4" />
                              咖啡測驗結果
                            </div>
                            <p className="text-base font-bold text-[#3b2a19]">{detail.profile.coffee_profile_label || '-'}</p>
                            {detail.profile.coffee_profile_summary && <p className="mt-2 text-sm leading-7 text-gray-700">{detail.profile.coffee_profile_summary}</p>}
                            {detail.profile.coffee_profile_key && <p className="mt-3 text-xs text-gray-400">代號：{detail.profile.coffee_profile_key}</p>}
                            {detail.profile.coffee_profile_scores && Object.keys(detail.profile.coffee_profile_scores).length > 0 && (
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {Object.entries(detail.profile.coffee_profile_scores).map(([key, value]) => (
                                  <div key={key} className="rounded-xl border border-[#f0e6d6] bg-white px-3 py-2 text-sm text-gray-700">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                                      <span className="font-semibold text-[#8a5a22]">{String(value)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">沒有會員資料</div>
                    )}
                  </div>
                ) : detailTab === 'bookings' ? (
                  detail.bookings.length === 0 ? (
                    <div className="py-10 text-center text-gray-400"><BedDouble className="mx-auto mb-2 h-8 w-8 opacity-30" /><p className="text-sm">沒有訂房紀錄</p></div>
                  ) : (
                    <div className="space-y-3">
                      {detail.bookings.map((booking: any) => (
                        <div key={booking.id} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{booking.tbl_rooms?.name || 'Room'}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{formatDate(booking.check_in_date)} ~ {formatDate(booking.check_out_date)} / {booking.guests} 位</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(booking.total_price)}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : detailTab === 'orders' ? (
                  detail.orders.length === 0 ? (
                    <div className="py-10 text-center text-gray-400"><ShoppingBag className="mx-auto mb-2 h-8 w-8 opacity-30" /><p className="text-sm">沒有訂單紀錄</p></div>
                  ) : (
                    <div className="space-y-3">
                      {detail.orders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm font-medium text-gray-900">#{order.id.slice(-8).toUpperCase()}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                            <div className="mt-0.5 flex justify-end gap-1">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.payment_status)}`}>{getStatusLabel(order.payment_status)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : detailTab === 'invoices' ? (
                  detail.invoices.length === 0 ? (
                    <div className="py-10 text-center text-gray-400"><FileText className="mx-auto mb-2 h-8 w-8 opacity-30" /><p className="text-sm">沒有發票紀錄</p></div>
                  ) : (
                    <div className="space-y-3">
                      {detail.invoices.map((invoice: any) => (
                        <div key={invoice.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${invoice.invoice_status === 'issued'
                                  ? 'bg-green-100 text-green-700'
                                  : invoice.invoice_status === 'failed'
                                    ? 'bg-red-100 text-red-600'
                                    : invoice.invoice_status === 'cancelled'
                                      ? 'bg-gray-200 text-gray-600'
                                      : invoice.invoice_status === 'allowance'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {invoice.invoice_status || 'pending'}
                                </span>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500">
                                  {invoice.tax_type || '一般'}
                                </span>
                              </div>
                              <p className="mt-3 text-sm font-semibold text-gray-900">{invoice.invoice_number || '尚未開立發票號碼'}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {invoice.invoice_date ? formatDateTime(invoice.invoice_date) : '未開立'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.total_amount || 0)}</p>
                              <p className="text-xs text-gray-500">{invoice.buyer_email || '-'}</p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <InfoItem icon={<FileText className="h-4 w-4" />} label="買受人統編" value={invoice.buyer_identifier || '-'} mono />
                            <InfoItem
                              icon={<FileText className="h-4 w-4" />}
                              label="載具 / 愛心碼"
                              value={[invoice.carrier_type || '', invoice.carrier_number || '', invoice.love_code || ''].filter(Boolean).join(' / ') || '-'}
                              mono
                            />
                            <InfoItem icon={<FileText className="h-4 w-4" />} label="ezPay 交易序號" value={invoice.ezpay_trade_no || '-'} mono />
                            <InfoItem icon={<FileText className="h-4 w-4" />} label="開立金額" value={`${formatCurrency(invoice.sales_amount || 0)} / 稅額 ${formatCurrency(invoice.tax_amount || 0)}`} />
                          </div>

                          {invoice.error_message && (
                            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                              {invoice.error_message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between rounded-xl bg-amber-50 p-4">
                      <span className="text-sm font-medium text-amber-800">總點數</span>
                      <span className="text-lg font-bold text-amber-700">{detail.totalPoints.toLocaleString()}</span>
                    </div>
                    {detail.points.length === 0 ? (
                      <div className="py-10 text-center text-gray-400"><Award className="mx-auto mb-2 h-8 w-8 opacity-30" /><p className="text-sm">沒有點數紀錄</p></div>
                    ) : (
                      <div className="space-y-2">
                        {detail.points.map((point: any) => (
                          <div key={point.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-gray-50">
                            <div>
                              <p className="text-sm text-gray-900">{point.description || '點數紀錄'}</p>
                              <p className="text-xs text-gray-400">{formatDateTime(point.created_at)}</p>
                            </div>
                            <span className={`text-sm font-semibold ${point.transaction_type === 'earned' ? 'text-green-600' : point.transaction_type === 'spent' ? 'text-red-500' : 'text-gray-400'}`}>
                              {point.transaction_type === 'earned' ? '+' : point.transaction_type === 'spent' ? '-' : ''}{point.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(current => current - 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-40">上一頁</button>
          <span className="text-sm text-gray-500">第 {page + 1} 頁 / 共 {Math.ceil(total / PAGE_SIZE)} 頁</span>
          <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(current => current + 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-40">下一頁</button>
        </div>
      )}
    </div>
  );
};

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string; mono?: boolean }> = ({ icon, label, value, mono }) => (
  <div className="rounded-xl bg-gray-50 p-3">
    <div className="mb-1 flex items-center gap-1.5 text-gray-400">{icon}<span className="text-xs">{label}</span></div>
    <p className={`text-sm text-gray-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value}</p>
  </div>
);

export default SuperAdminUsers;
