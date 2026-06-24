import React, { useState, useEffect } from 'react';
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
  points: any[];
  totalPoints: number;
}

const ROLE_OPTIONS = ['user', 'vendor', 'admin', 'superadmin'];
const ROLE_LABELS: Record<string, string> = { user: '一般用戶', vendor: '廠商', admin: '管理員', superadmin: '超管' };
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get('q') || '');
  }, [location.search]);

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) { setCreateError('請填寫信箱和密碼'); return; }
    if (createForm.password.length < 6) { setCreateError('密碼至少 6 個字元'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '建立失敗');
      setShowCreate(false);
      setCreateForm({ email: '', password: '', display_name: '', role: 'user' });
      fetchUsers();
    } catch (err: any) {
      setCreateError(err.message || '建立失敗');
    } finally {
      setCreating(false);
    }
  };

  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'bookings' | 'orders' | 'points'>('profile');

  const openDetail = async (u: UserRow) => {
    setViewUser(u);
    setDetail(null);
    setDetailLoading(true);
    setDetailTab('profile');
    const [profileRes, bookingsRes, ordersRes, pointsRes] = await Promise.all([
      supabase.from('tbl_mn5wgzh0').select('*').eq('user_id', u.user_id).maybeSingle(),
      supabase.from('tbl_bookings').select('*, tbl_rooms(name)').eq('user_id', u.user_id).order('created_at', { ascending: false }).limit(10),
      supabase.from('orders').select('*').eq('user_id', u.user_id).order('created_at', { ascending: false }).limit(10),
      supabase.from('points').select('*').eq('user_id', u.user_id).order('created_at', { ascending: false }).limit(20),
    ]);
    const pts = (pointsRes.data || []) as any[];
    const totalPoints = pts.reduce((sum: number, p: any) => sum + (p.transaction_type === 'earned' ? p.amount : p.transaction_type === 'spent' ? -p.amount : 0), 0);
    setDetail({
      profile: profileRes.data,
      bookings: bookingsRes.data || [],
      orders: ordersRes.data || [],
      points: pts,
      totalPoints,
    });
    setDetailLoading(false);
  };

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
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_ids: validUserIds }),
      });
      if (!res.ok) return {};
      const { emails } = await res.json();
      return emails || {};
    } catch { return {}; }
  };

  const fetchUsers = async () => {
    setLoading(true);
    let q = supabase.from('tbl_user_auth').select('*', { count: 'exact' });
    if (roleFilter !== 'all') q = q.eq('role', roleFilter);
    q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await q;
    if (!data) { setLoading(false); return; }

    const userIds = data.map((u: any) => u.user_id);
    const [{ data: profiles }, emailMap] = await Promise.all([
      supabase.from('tbl_mn5wgzh0').select('user_id, display_name').in('user_id', userIds),
      fetchEmails(userIds),
    ]);
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));

    const rows = data.map((u: any) => ({ ...u, display_name: profileMap[u.user_id] || '', email: emailMap[u.user_id] || '' }));
    const filtered = search ? rows.filter((u: UserRow) => (u.display_name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()) || u.user_id.includes(search)) : rows;

    setUsers(filtered as UserRow[]);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [roleFilter, page]);
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(t);
  }, [search]);

  const updateRole = async (userId: string, role: string) => {
    if (userId === currentUser?.id) return;
    if (!window.confirm(`確定要將此用戶角色改為 ${role}？`)) return;
    setUpdating(userId);
    await supabase.from('tbl_user_auth').update({ role, updated_at: new Date().toISOString() }).eq('user_id', userId);
    await logAdminAction('update_user_role', 'tbl_user_auth', userId, { role });
    await fetchUsers();
    setUpdating(null);
  };

  const toggleActive = async (userId: string, current: boolean) => {
    if (userId === currentUser?.id) return;
    if (!window.confirm(`確定要${current ? '停用' : '啟用'}此用戶帳號？`)) return;
    setUpdating(userId);
    await supabase.from('tbl_user_auth').update({ is_active: !current, updated_at: new Date().toISOString() }).eq('user_id', userId);
    await logAdminAction(current ? 'deactivate_user' : 'activate_user', 'tbl_user_auth', userId);
    await fetchUsers();
    setUpdating(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-amber-100 rounded-xl"><Users className="w-6 h-6 text-amber-700" /></div>
        <h1 className="text-2xl font-bold text-gray-900">用戶管理</h1>
        <span className="text-sm text-gray-400 ml-1">共 {total} 位用戶</span>
        <div className="flex-1" />
        <button onClick={() => { setShowCreate(true); setCreateError(''); }} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition shadow-sm">
          <Plus className="w-4 h-4" />新增會員
        </button>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">新增會員</h3>
                <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                {createError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{createError}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">信箱 *</label>
                  <input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="user@example.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密碼 *</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="至少 6 個字元" className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">顯示名稱</label>
                  <input type="text" value={createForm.display_name} onChange={e => setCreateForm({ ...createForm, display_name: e.target.value })} placeholder="選填" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                  <select value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 bg-white">
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition">取消</button>
                <button onClick={handleCreateUser} disabled={creating} className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition">
                  {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  建立
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="搜尋姓名、帳號或 User ID…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0); }}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="all">全部角色</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-20" /><p>找不到用戶</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-gray-500 font-medium">用戶</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium hidden md:table-cell">User ID</th>
                <th className="text-center px-5 py-3 text-gray-500 font-medium">角色</th>
                <th className="text-center px-5 py-3 text-gray-500 font-medium">狀態</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium hidden lg:table-cell">建立時間</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">操作</th>
              </tr></thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr key={u.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className={`border-b border-gray-50 last:border-0 ${u.user_id === currentUser?.id ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                          {u.display_name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{u.display_name || '（未設定）'}</p>
                          {u.email && <p className="text-xs text-gray-400 truncate">{u.email}</p>}
                          {u.user_id === currentUser?.id && <span className="text-xs text-amber-600">(目前登入)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <button onClick={() => navigator.clipboard.writeText(u.user_id)} title="點擊複製 User ID" className="group flex items-center gap-1 hover:text-amber-600 transition">
                        <code className="text-xs text-gray-400 font-mono group-hover:text-amber-600">{u.user_id.slice(-12)}</code>
                        <span className="text-xs text-gray-300 group-hover:text-amber-400 opacity-0 group-hover:opacity-100 transition">複製</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {u.user_id === currentUser?.id ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                      ) : (
                        <div className="relative inline-flex items-center">
                          <select value={u.role} disabled={updating === u.user_id}
                            onChange={e => updateRole(u.user_id, e.target.value)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 ${ROLE_COLORS[u.role]}`}>
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDetail(u)} className="p-2 rounded-xl transition text-xs font-medium hover:bg-amber-50 text-amber-600" title="查看資料">
                          <Eye className="w-4 h-4" />
                        </button>
                        {u.user_id !== currentUser?.id && (
                          <button onClick={() => toggleActive(u.user_id, u.is_active)} disabled={updating === u.user_id}
                            className={`p-2 rounded-xl transition text-xs font-medium disabled:opacity-50 ${u.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-600'}`}
                            title={u.is_active ? '停用帳號' : '啟用帳號'}>
                            {updating === u.user_id ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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

      {/* User Detail Modal */}
      <AnimatePresence>
        {viewUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setViewUser(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${ROLE_COLORS[viewUser.role] || 'bg-gray-100 text-gray-600'}`}>
                    {viewUser.display_name?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{viewUser.display_name || '（未設定）'}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[viewUser.role]}`}>{ROLE_LABELS[viewUser.role]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${viewUser.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{viewUser.is_active ? '啟用' : '停用'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewUser(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
                {([
                  { key: 'profile', label: '個人資料', icon: <Users className="w-3.5 h-3.5" /> },
                  { key: 'bookings', label: '訂房紀錄', icon: <BedDouble className="w-3.5 h-3.5" /> },
                  { key: 'orders', label: '訂單紀錄', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
                  { key: 'points', label: '點數紀錄', icon: <Award className="w-3.5 h-3.5" /> },
                ] as const).map(tab => (
                  <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition ${detailTab === tab.key ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {detailLoading ? (
                  <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>
                ) : !detail ? null : detailTab === 'profile' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem icon={<Mail className="w-4 h-4" />} label="帳號（信箱）" value={viewUser.email || '—'} />
                      <InfoItem icon={<Calendar className="w-4 h-4" />} label="建立時間" value={formatDateTime(viewUser.created_at)} />
                      <div className="col-span-2">
                        <InfoItem icon={<FileText className="w-4 h-4" />} label="User ID" value={viewUser.user_id} mono />
                      </div>
                    </div>
                    {detail.profile ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <InfoItem icon={<Users className="w-4 h-4" />} label="顯示名稱" value={detail.profile.display_name || '—'} />
                          <InfoItem icon={<Phone className="w-4 h-4" />} label="電話" value={detail.profile.phone || '—'} />
                          <InfoItem icon={<Globe className="w-4 h-4" />} label="國籍" value={detail.profile.nationality || '—'} />
                          <InfoItem icon={<Globe className="w-4 h-4" />} label="偏好語言" value={detail.profile.preferred_language || '—'} />
                          <div className="col-span-2">
                            <InfoItem icon={<FileText className="w-4 h-4" />} label="個人簡介" value={detail.profile.bio || '—'} />
                          </div>
                        </div>

                        {(detail.profile.coffee_profile_label || detail.profile.coffee_profile_summary) && (
                          <div className="mt-4 rounded-2xl border border-[#eadfce] bg-gradient-to-br from-[#fff9f0] to-white p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#8a5a22]">
                              <Coffee className="w-4 h-4" />
                              咖啡偏好輪廓
                            </div>
                            <p className="text-base font-bold text-[#3b2a19]">{detail.profile.coffee_profile_label || '—'}</p>
                            {detail.profile.coffee_profile_summary && (
                              <p className="mt-2 text-sm leading-7 text-gray-700">{detail.profile.coffee_profile_summary}</p>
                            )}
                            {detail.profile.coffee_profile_key && (
                              <p className="mt-3 text-xs text-gray-400">Key: {detail.profile.coffee_profile_key}</p>
                            )}
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
                      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-400 text-center">尚未建立個人資料</div>
                    )}
                  </div>
                ) : detailTab === 'bookings' ? (
                  detail.bookings.length === 0 ? (
                    <div className="text-center py-10 text-gray-400"><BedDouble className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">尚無訂房紀錄</p></div>
                  ) : (
                    <div className="space-y-3">
                      {detail.bookings.map((b: any) => (
                        <div key={b.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{b.tbl_rooms?.name || '房間'}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{formatDate(b.check_in_date)} ~ {formatDate(b.check_out_date)} / {b.guests} 位</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-sm text-gray-900">{formatCurrency(b.total_price)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(b.status)}`}>{getStatusLabel(b.status)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : detailTab === 'orders' ? (
                  detail.orders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400"><ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">尚無訂單紀錄</p></div>
                  ) : (
                    <div className="space-y-3">
                      {detail.orders.map((o: any) => (
                        <div key={o.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm font-mono">#{o.id.slice(-8).toUpperCase()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(o.created_at)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-sm text-gray-900">{formatCurrency(o.total_amount)}</p>
                            <div className="flex gap-1 mt-0.5 justify-end">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(o.status)}`}>{getStatusLabel(o.status)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(o.payment_status)}`}>{getStatusLabel(o.payment_status)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <>
                    <div className="bg-amber-50 rounded-xl p-4 mb-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-800">目前點數餘額</span>
                      <span className="text-lg font-bold text-amber-700">{detail.totalPoints.toLocaleString()} 點</span>
                    </div>
                    {detail.points.length === 0 ? (
                      <div className="text-center py-10 text-gray-400"><Award className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">尚無點數紀錄</p></div>
                    ) : (
                      <div className="space-y-2">
                        {detail.points.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50">
                            <div>
                              <p className="text-sm text-gray-900">{p.description || '點數異動'}</p>
                              <p className="text-xs text-gray-400">{formatDateTime(p.created_at)}</p>
                            </div>
                            <span className={`font-semibold text-sm ${p.transaction_type === 'earned' ? 'text-green-600' : p.transaction_type === 'spent' ? 'text-red-500' : 'text-gray-400'}`}>
                              {p.transaction_type === 'earned' ? '+' : p.transaction_type === 'spent' ? '-' : ''}{p.amount}
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
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-50">上一頁</button>
          <span className="text-sm text-gray-500">第 {page + 1} 頁 / 共 {Math.ceil(total / PAGE_SIZE)} 頁</span>
          <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-50">下一頁</button>
        </div>
      )}
    </div>
  );
};

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string; mono?: boolean }> = ({ icon, label, value, mono }) => (
  <div className="bg-gray-50 rounded-xl p-3">
    <div className="flex items-center gap-1.5 text-gray-400 mb-1">{icon}<span className="text-xs">{label}</span></div>
    <p className={`text-sm text-gray-900 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</p>
  </div>
);

export default SuperAdminUsers;
