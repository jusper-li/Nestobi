import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Save, Users, CheckSquare, Square, Check, AlertCircle,
  ChevronDown, ChevronUp, RefreshCw, UserPlus, Search, X, UserCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  display_name?: string;
}

interface SearchUser {
  user_id: string;
  role: string;
  is_active: boolean;
  display_name?: string;
}

interface PermissionGroup {
  group: string;
  items: { key: string; label: string; description: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: '房間與訂房',
    items: [
      { key: 'manage_rooms', label: '房間管理', description: '新增、編輯、刪除房間及庫存' },
      { key: 'manage_bookings', label: '訂房管理', description: '查看並處理所有訂房紀錄' },
    ],
  },
  {
    group: '商品與訂單',
    items: [
      { key: 'manage_products', label: '商品管理', description: '新增、編輯、下架商品' },
      { key: 'manage_orders', label: '訂單管理', description: '查看並處理所有商品訂單' },
    ],
  },
  {
    group: '會員與廠商',
    items: [
      { key: 'manage_users', label: '用戶管理', description: '查看會員資料與帳號狀態' },
      { key: 'manage_vendors', label: '廠商管理', description: '審核並管理合作廠商帳號' },
    ],
  },
  {
    group: '內容管理',
    items: [
      { key: 'manage_blog', label: '部落格管理', description: '發佈與編輯咖啡旅行家文章' },
      { key: 'manage_static_pages', label: '靜態頁面', description: '編輯關於我們、隱私政策等頁面' },
    ],
  },
  {
    group: '數據與分析',
    items: [
      { key: 'view_ai', label: 'AI 用量分析', description: '查看 AI 功能使用統計數據' },
      { key: 'view_reports', label: '查看報表', description: '存取營收與業務統計報表' },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

const ROLE_LABELS: Record<string, string> = { user: '一般用戶', vendor: '廠商', admin: '管理員', superadmin: '超管' };
const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-amber-100 text-amber-700',
  admin: 'bg-blue-100 text-blue-700',
  vendor: 'bg-emerald-100 text-emerald-700',
  user: 'bg-gray-100 text-gray-500',
};

function AddAdminModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [promoted, setPromoted] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data: authRows } = await supabase
        .from('tbl_user_auth')
        .select('user_id, role, is_active')
        .neq('role', 'admin')
        .neq('role', 'superadmin')
        .limit(30);

      if (!authRows?.length) { setResults([]); setSearching(false); return; }

      const userIds = authRows.map((u: any) => u.user_id);
      const { data: profiles } = await supabase
        .from('tbl_mn5wgzh0')
        .select('user_id, display_name')
        .in('user_id', userIds)
        .ilike('display_name', `%${query.trim()}%`);

      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      const matched = authRows
        .filter((u: any) => profileMap[u.user_id])
        .map((u: any) => ({ ...u, display_name: profileMap[u.user_id] }));

      setResults(matched as SearchUser[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const promoteToAdmin = async (user: SearchUser) => {
    if (!window.confirm(`確定要將「${user.display_name || user.user_id}」設為管理員？`)) return;
    setPromoting(user.user_id);
    await supabase
      .from('tbl_user_auth')
      .update({ role: 'admin', updated_at: new Date().toISOString() })
      .eq('user_id', user.user_id);

    const defaultPerms = ALL_PERMISSION_KEYS.map(k => ({
      user_id: user.user_id,
      permission: k,
      granted: false,
    }));
    await supabase.from('user_permissions').upsert(defaultPerms, { onConflict: 'user_id,permission' });
    await logAdminAction('promote_admin', 'tbl_user_auth', user.user_id, {
      display_name: user.display_name,
      previous_role: user.role,
    });

    setPromoted(prev => new Set([...prev, user.user_id]));
    setPromoting(null);
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2C1F10]/10 rounded-xl">
              <UserPlus className="w-5 h-5 text-[#2C1F10]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">新增管理員</h2>
              <p className="text-xs text-gray-400">搜尋現有用戶並升級為管理員</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#2C1F10] border-t-transparent rounded-full animate-spin" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="輸入用戶姓名搜尋…"
              className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2C1F10]/30 focus:border-[#2C1F10]"
            />
          </div>
        </div>

        <div className="px-6 pb-6 max-h-72 overflow-y-auto">
          {!query.trim() ? (
            <div className="text-center py-8 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">輸入姓名以搜尋用戶</p>
            </div>
          ) : results.length === 0 && !searching ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">找不到符合的用戶</p>
              <p className="text-xs mt-1">確認姓名是否正確，或該用戶已是管理員</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(user => {
                const isPromoted = promoted.has(user.user_id);
                const isPromoting = promoting === user.user_id;
                return (
                  <div
                    key={user.user_id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      isPromoted ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-500'}`}>
                        {(user.display_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{user.display_name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => !isPromoted && promoteToAdmin(user)}
                      disabled={isPromoting || isPromoted}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:cursor-not-allowed ${
                        isPromoted
                          ? 'bg-green-100 text-green-700'
                          : 'bg-[#C09A6A] hover:bg-[#8B6840] text-white disabled:opacity-60'
                      }`}
                    >
                      {isPromoting
                        ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : isPromoted
                        ? <Check className="w-3.5 h-3.5" />
                        : <UserCheck className="w-3.5 h-3.5" />}
                      {isPromoted ? '已設定' : '設為管理員'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const Permissions: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savedUsers, setSavedUsers] = useState<Set<string>>(new Set());
  const [errorUsers, setErrorUsers] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: adminUsers } = await supabase
      .from('tbl_user_auth')
      .select('*')
      .eq('role', 'admin')
      .order('created_at');

    if (!adminUsers?.length) {
      setAdmins([]);
      setPermissions({});
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const userIds = adminUsers.map((u: any) => u.user_id);
    const { data: profiles } = await supabase
      .from('tbl_mn5wgzh0')
      .select('user_id, display_name')
      .in('user_id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
    const adminList: AdminUser[] = adminUsers.map((u: any) => ({
      ...u,
      display_name: profileMap[u.user_id],
    }));
    setAdmins(adminList);

    const { data: perms } = await supabase
      .from('user_permissions')
      .select('user_id, permission, granted')
      .in('user_id', userIds);

    const permMap: Record<string, Record<string, boolean>> = {};
    adminList.forEach((u) => {
      permMap[u.user_id] = {};
      ALL_PERMISSION_KEYS.forEach(k => { permMap[u.user_id][k] = false; });
    });
    (perms || []).forEach((p: any) => {
      if (permMap[p.user_id]) permMap[p.user_id][p.permission] = p.granted;
    });
    setPermissions(permMap);
    setExpandedUsers(prev => {
      const next = new Set(prev);
      adminList.forEach(u => next.add(u.user_id));
      return next;
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const togglePermission = (userId: string, perm: string) => {
    setPermissions(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [perm]: !prev[userId]?.[perm] },
    }));
  };

  const selectAll = (userId: string) => {
    setPermissions(prev => {
      const all: Record<string, boolean> = {};
      ALL_PERMISSION_KEYS.forEach(k => { all[k] = true; });
      return { ...prev, [userId]: all };
    });
  };

  const deselectAll = (userId: string) => {
    setPermissions(prev => {
      const none: Record<string, boolean> = {};
      ALL_PERMISSION_KEYS.forEach(k => { none[k] = false; });
      return { ...prev, [userId]: none };
    });
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleSave = async (userId: string) => {
    const userPerms = permissions[userId] || {};
    const grantedCount = Object.values(userPerms).filter(Boolean).length;
    if (!window.confirm(`確定要儲存此管理員的權限設定？目前將授權 ${grantedCount} / ${ALL_PERMISSION_KEYS.length} 項功能。`)) return;

    setSavingUserId(userId);
    setErrorUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
    try {
      const upsertData = Object.entries(userPerms).map(([permission, granted]) => ({
        user_id: userId,
        permission,
        granted,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('user_permissions').delete().eq('user_id', userId);
      if (upsertData.length > 0) {
        await supabase.from('user_permissions').insert(upsertData);
      }
      await logAdminAction('update_admin_permissions', 'user_permissions', userId, {
        granted_permissions: Object.entries(userPerms).filter(([, granted]) => granted).map(([permission]) => permission),
      });
      setSavedUsers(prev => new Set([...prev, userId]));
      setTimeout(() => {
        setSavedUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
      }, 3000);
    } catch {
      setErrorUsers(prev => new Set([...prev, userId]));
    } finally {
      setSavingUserId(null);
    }
  };

  const revokeAdmin = async (userId: string) => {
    if (!window.confirm('確定要撤銷此帳號的管理員權限？')) return;
    await supabase
      .from('tbl_user_auth')
      .update({ role: 'user', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    await supabase.from('user_permissions').delete().eq('user_id', userId);
    await logAdminAction('revoke_admin', 'tbl_user_auth', userId);
    await fetchData();
  };

  const getGrantedCount = (userId: string) =>
    Object.values(permissions[userId] || {}).filter(Boolean).length;

  const getAvatar = (name?: string) =>
    (name || 'A').charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2C1F10]/10 rounded-xl">
            <Shield className="w-6 h-6 text-[#2C1F10]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">權限設定</h1>
            <p className="text-gray-500 text-sm mt-0.5">管理各管理員帳號的功能存取權限</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            重新整理
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#C09A6A] hover:bg-[#8B6840] rounded-xl transition"
          >
            <UserPlus className="w-4 h-4" />
            新增管理員
          </button>
        </div>
      </div>

      <div className="bg-[#2C1F10]/5 border border-[#2C1F10]/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-[#2C1F10] mt-0.5 flex-shrink-0" />
        <p className="text-sm text-[#2C1F10]">
          超級管理員自動擁有所有權限，以下設定僅適用於一般管理員帳號。權限變更後，管理員需重新登入才能生效。
        </p>
      </div>

      {admins.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">目前沒有管理員帳號</p>
          <p className="text-gray-400 text-sm mt-1">點擊「新增管理員」將現有用戶升級為管理員</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#C09A6A] hover:bg-[#8B6840] rounded-xl transition"
          >
            <UserPlus className="w-4 h-4" />
            新增管理員
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {admins.map((admin, i) => {
            const grantedCount = getGrantedCount(admin.user_id);
            const isExpanded = expandedUsers.has(admin.user_id);
            const isSaving = savingUserId === admin.user_id;
            const isSaved = savedUsers.has(admin.user_id);
            const isError = errorUsers.has(admin.user_id);
            const allGranted = grantedCount === ALL_PERMISSION_KEYS.length;

            return (
              <motion.div
                key={admin.user_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-5 flex items-center gap-4">
                  <button
                    onClick={() => toggleExpanded(admin.user_id)}
                    className="flex items-center gap-4 flex-1 min-w-0 text-left"
                  >
                    <div className="w-11 h-11 bg-gradient-to-br from-[#2C1F10] to-[#1A1208] rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {getAvatar(admin.display_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {admin.display_name || '管理員'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          admin.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {admin.is_active ? '啟用中' : '已停用'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {admin.user_id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{grantedCount} / {ALL_PERMISSION_KEYS.length}</p>
                        <p className="text-xs text-gray-400">已授權</p>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-5 h-5 text-gray-400" />
                        : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </button>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 px-6 pb-6 pt-4">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => selectAll(admin.user_id)}
                              disabled={allGranted}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />全選
                            </button>
                            <button
                              onClick={() => deselectAll(admin.user_id)}
                              disabled={grantedCount === 0}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Square className="w-3.5 h-3.5" />全不選
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => revokeAdmin(admin.user_id)}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"
                            >
                              <X className="w-3.5 h-3.5" />撤銷管理員
                            </button>
                            <button
                              onClick={() => handleSave(admin.user_id)}
                              disabled={isSaving}
                              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${
                                isSaved
                                  ? 'bg-green-500 text-white'
                                  : isError
                                  ? 'bg-red-500 text-white'
                                  : 'bg-[#C09A6A] hover:bg-[#8B6840] text-white'
                              }`}
                            >
                              {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : isSaved ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              {isSaved ? '已儲存' : isError ? '儲存失敗' : '儲存權限'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-5">
                          {PERMISSION_GROUPS.map(group => (
                            <div key={group.group}>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                                {group.group}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {group.items.map(perm => {
                                  const isGranted = permissions[admin.user_id]?.[perm.key] || false;
                                  return (
                                    <label
                                      key={perm.key}
                                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition select-none ${
                                        isGranted
                                          ? 'border-[#2C1F10]/40 bg-[#2C1F10]/5'
                                          : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                                      }`}
                                    >
                                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                                        isGranted ? 'bg-[#C09A6A]' : 'bg-white border-2 border-gray-300'
                                      }`}>
                                        {isGranted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                      </div>
                                      <input
                                        type="checkbox"
                                        checked={isGranted}
                                        onChange={() => togglePermission(admin.user_id, perm.key)}
                                        className="sr-only"
                                      />
                                      <div>
                                        <p className={`text-sm font-semibold ${isGranted ? 'text-[#2C1F10]' : 'text-gray-700'}`}>
                                          {perm.label}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">{perm.description}</p>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {isError && (
                          <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            儲存失敗，請稍後再試
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <AddAdminModal
            onClose={() => setShowAddModal(false)}
            onAdded={() => { fetchData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Permissions;
