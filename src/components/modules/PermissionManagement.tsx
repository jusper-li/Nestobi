import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCheck, CreditCard as Edit, Mail, Save, Search, ShieldCheck, Trash2, User, UserPlus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  last_login_at: string | null;
}

interface RoleWithPermissions extends Role {
  permissions: string[];
  userCount: number;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: '儀錶板',
  members: '會員管理',
  products: '商品管理',
  orders: '訂單管理',
  articles: '文章管理',
  stores: '門市管理',
  faq: 'Q&A 管理',
  homepage: '首頁管理',
  payments: '金流管理',
  social: '社群管理',
  languages: '語系管理',
  seo: 'SEO 管理',
  permissions: '權限管理',
  'ai-chat': 'AI 客服聊天',
  'ai-analytics': 'AI 用量分析',
  'ai-training': 'AI 學習分析',
  'knowledge-base': '知識庫管理',
  'static-pages': '靜態頁面',
};

const ACTION_LABELS: Record<string, string> = {
  read: '讀取',
  view: '檢視',
  list: '列表',
  write: '寫入',
  create: '新增',
  update: '更新',
  edit: '編輯',
  delete: '刪除',
  remove: '移除',
  manage: '管理',
};

const ROLE_TEMPLATES = [
  { key: 'super', label: '超級管理員', matcher: (_m: string, _a: string) => true },
  { key: 'editor', label: '內容編輯', matcher: (m: string, a: string) => ['articles', 'faq', 'homepage', 'seo', 'social', 'static-pages'].includes(m) && a !== 'delete' },
  { key: 'sales', label: '客服銷售', matcher: (m: string, _a: string) => ['orders', 'members', 'products', 'ai-chat', 'knowledge-base'].includes(m) },
  { key: 'viewer', label: '唯讀監看', matcher: (_m: string, a: string) => ['read', 'view', 'list'].includes(a) },
];

const moduleToZh = (value: string) => MODULE_LABELS[value] || value;
const actionToZh = (value: string) => ACTION_LABELS[value] || value;
const dateText = (value?: string | null) => (value ? new Date(value).toLocaleString('zh-TW', { hour12: false }) : '-');
const getPermissionHint = (moduleName: string, actionName: string, fallback?: string) =>
  fallback?.trim() || `允許在「${moduleToZh(moduleName)}」執行「${actionToZh(actionName)}」操作。`;

export default function PermissionManagement() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [loading, setLoading] = useState(true);

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoaded, setAdminsLoaded] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsWarning, setAdminsWarning] = useState('');
  const [adminKeyword, setAdminKeyword] = useState('');
  const [adminActiveFilter, setAdminActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [adminRoleMap, setAdminRoleMap] = useState<Record<string, string[]>>({});

  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', is_active: true, role_ids: [] as string[] });

  const [savingRole, setSavingRole] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    void loadCoreData();
  }, []);

  const loadCoreData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, rolePermsRes, adminRolesRes] = await Promise.all([
        supabase.from('roles').select('*').order('name'),
        supabase.from('permissions').select('*').order('module, action'),
        supabase.from('role_permissions').select('role_id, permission_id'),
        supabase.from('admin_roles').select('admin_id, role_id'),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;

      const rolePermissions = rolePermsRes.data || [];
      const adminRoles = adminRolesRes.data || [];

      const roleCounts = adminRoles.reduce((acc: Record<string, number>, row: any) => {
        acc[row.role_id] = (acc[row.role_id] || 0) + 1;
        return acc;
      }, {});

      const nextRoleMap = adminRoles.reduce((acc: Record<string, string[]>, row: any) => {
        if (!acc[row.admin_id]) acc[row.admin_id] = [];
        acc[row.admin_id].push(row.role_id);
        return acc;
      }, {});

      const nextRoles: RoleWithPermissions[] = (rolesRes.data || []).map((role: any) => ({
        ...role,
        permissions: rolePermissions.filter((rp: any) => rp.role_id === role.id).map((rp: any) => rp.permission_id),
        userCount: roleCounts[role.id] || 0,
      }));

      setRoles(nextRoles);
      setPermissions((permsRes.data || []) as Permission[]);
      setAdminRoleMap(nextRoleMap);
      if (!selectedRoleId && nextRoles.length > 0) setSelectedRoleId(nextRoles[0].id);
    } catch (error) {
      console.error('Failed to load permission data:', error);
      alert('載入權限資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    setAdminsLoading(true);
    setAdminsWarning('');
    try {
      const { data, error } = await supabase.rpc('get_admins_with_roles');
      if (error) throw error;
      const rows = (data || []) as Array<{
        id: string;
        email: string;
        name: string;
        is_active: boolean;
        last_login_at: string | null;
        role_ids?: string[];
      }>;
      setAdmins(rows.map((row) => ({ id: row.id, email: row.email, name: row.name, is_active: row.is_active, last_login_at: row.last_login_at })));
      const nextMap: Record<string, string[]> = {};
      rows.forEach((row) => {
        nextMap[row.id] = row.role_ids || [];
      });
      setAdminRoleMap((prev) => ({ ...prev, ...nextMap }));
      setAdminsLoaded(true);
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403 || error?.code === '42501') {
        setAdminsWarning('目前帳號無法讀取管理員清單，請先確認 Supabase RLS 與 RPC 權限。');
      } else {
        setAdminsWarning(`載入管理員失敗：${error?.message || '未知錯誤'}`);
      }
      setAdminsLoaded(false);
    } finally {
      setAdminsLoading(false);
    }
  };

  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!grouped[perm.module]) grouped[perm.module] = [];
      grouped[perm.module].push(perm);
    });
    return grouped;
  }, [permissions]);

  const roleNameMap = useMemo(
    () => roles.reduce((acc: Record<string, string>, role) => ({ ...acc, [role.id]: role.name }), {}),
    [roles]
  );

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const filteredAdmins = useMemo(() => {
    const keyword = adminKeyword.trim().toLowerCase();
    return admins.filter((admin) => {
      const keywordMatch = !keyword || admin.name.toLowerCase().includes(keyword) || admin.email.toLowerCase().includes(keyword);
      const activeMatch = adminActiveFilter === 'all' || (adminActiveFilter === 'active' ? admin.is_active : !admin.is_active);
      return keywordMatch && activeMatch;
    });
  }, [admins, adminKeyword, adminActiveFilter]);

  const saveRole = async () => {
    setRoleError('');
    if (!roleForm.name.trim()) {
      setRoleError('請輸入角色名稱');
      return;
    }
    const duplicate = roles.some((role) => role.name.trim().toLowerCase() === roleForm.name.trim().toLowerCase() && role.id !== editingRole?.id);
    if (duplicate) {
      setRoleError('角色名稱已存在，請改用其他名稱');
      return;
    }
    setSavingRole(true);
    try {
      if (editingRole) {
        const { error } = await supabase.from('roles').update(roleForm).eq('id', editingRole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('roles').insert([roleForm]);
        if (error) throw error;
      }
      await loadCoreData();
      setShowRoleForm(false);
      setEditingRole(null);
    } catch (error: any) {
      if (error?.code === '23505') setRoleError('角色名稱已存在');
      else if (error?.status === 403 || error?.code === '42501') setRoleError('權限不足，無法建立/更新角色');
      else setRoleError(error?.message || '儲存角色失敗');
    } finally {
      setSavingRole(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm('確定要刪除此角色嗎？')) return;
    try {
      const { error } = await supabase.from('roles').delete().eq('id', roleId);
      if (error) throw error;
      await loadCoreData();
    } catch {
      alert('刪除角色失敗');
    }
  };

  const togglePermission = async (permissionId: string) => {
    if (!selectedRoleId) return;
    const has = selectedRole?.permissions.includes(permissionId);
    try {
      if (has) {
        const { error } = await supabase.from('role_permissions').delete().eq('role_id', selectedRoleId).eq('permission_id', permissionId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('role_permissions').insert([{ role_id: selectedRoleId, permission_id: permissionId }]);
        if (error) throw error;
      }
      await loadCoreData();
    } catch {
      alert('更新權限失敗');
    }
  };

  const setModulePermissions = async (module: string, enable: boolean) => {
    if (!selectedRoleId) return;
    const modulePerms = groupedPermissions[module] || [];
    try {
      if (enable) {
        const toInsert = modulePerms
          .filter((perm) => !(selectedRole?.permissions || []).includes(perm.id))
          .map((perm) => ({ role_id: selectedRoleId, permission_id: perm.id }));
        if (toInsert.length > 0) {
          const { error } = await supabase.from('role_permissions').insert(toInsert);
          if (error) throw error;
        }
      } else {
        const permIds = modulePerms.map((perm) => perm.id);
        if (permIds.length > 0) {
          const { error } = await supabase.from('role_permissions').delete().eq('role_id', selectedRoleId).in('permission_id', permIds);
          if (error) throw error;
        }
      }
      await loadCoreData();
    } catch {
      alert('批次更新模組權限失敗');
    }
  };

  const applyRoleTemplate = async (templateKey: string) => {
    if (!selectedRoleId) return;
    const template = ROLE_TEMPLATES.find((item) => item.key === templateKey);
    if (!template) return;
    try {
      await supabase.from('role_permissions').delete().eq('role_id', selectedRoleId);
      const matched = permissions
        .filter((perm) => template.matcher(perm.module, perm.action))
        .map((perm) => ({ role_id: selectedRoleId, permission_id: perm.id }));
      if (matched.length > 0) {
        const { error } = await supabase.from('role_permissions').insert(matched);
        if (error) throw error;
      }
      await loadCoreData();
    } catch {
      alert('套用角色模板失敗');
    }
  };

  const saveAdmin = async () => {
    setAdminError('');
    if (!adminForm.name.trim() || !adminForm.email.trim()) {
      setAdminError('請填寫管理員名稱與 Email');
      return;
    }
    setSavingAdmin(true);
    try {
      const { error } = await supabase.rpc('create_admin_with_roles', {
        p_email: adminForm.email.trim().toLowerCase(),
        p_name: adminForm.name.trim(),
        p_is_active: adminForm.is_active,
        p_role_ids: adminForm.role_ids,
      });
      if (error) throw error;
      setShowAdminForm(false);
      await loadCoreData();
      await loadAdmins();
    } catch (error: any) {
      if (error?.code === '23505') setAdminError('此 Email 已存在');
      else if (error?.status === 403 || error?.code === '42501') setAdminError('權限不足，無法新增管理員');
      else setAdminError(error?.message || '新增管理員失敗');
    } finally {
      setSavingAdmin(false);
    }
  };

  const toggleAdminRole = async (adminId: string, roleId: string) => {
    const current = adminRoleMap[adminId] || [];
    const has = current.includes(roleId);
    try {
      const { error } = await supabase.rpc('set_admin_role', { p_admin_id: adminId, p_role_id: roleId, p_enable: !has });
      if (error) throw error;
      await loadCoreData();
      if (adminsLoaded) await loadAdmins();
    } catch {
      alert('更新管理員角色失敗');
    }
  };

  const toggleAdminActive = async (admin: AdminUser) => {
    try {
      const { error } = await supabase.rpc('set_admin_active', { p_admin_id: admin.id, p_is_active: !admin.is_active });
      if (error) throw error;
      await loadAdmins();
    } catch {
      alert('更新管理員狀態失敗');
    }
  };

  const deleteAdmin = async (adminId: string) => {
    if (!confirm('確定要刪除此管理員嗎？')) return;
    try {
      const { error } = await supabase.rpc('delete_admin_with_roles', { p_admin_id: adminId });
      if (error) throw error;
      await loadAdmins();
      await loadCoreData();
    } catch {
      alert('刪除管理員失敗');
    }
  };

  if (loading) return <div className="p-6">載入權限資料中...</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">權限與管理員</h1>
        <p className="mt-2 text-slate-600">可管理角色、功能權限，以及新增/管理後台管理員。</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">角色清單</h3>
            <button
              onClick={() => {
                setEditingRole(null);
                setRoleForm({ name: '', description: '' });
                setRoleError('');
                setShowRoleForm(true);
              }}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800"
            >
              新增角色
            </button>
          </div>
          <div className="space-y-2">
            {roles.map((role) => (
              <div
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`cursor-pointer rounded-lg border p-3 ${selectedRoleId === role.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-slate-900">{role.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRole(role);
                        setRoleForm({ name: role.name, description: role.description || '' });
                        setRoleError('');
                        setShowRoleForm(true);
                      }}
                      className="p-1 text-slate-600 hover:text-slate-900"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteRole(role.id);
                      }}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{role.description || '尚未填寫描述'}</p>
                <p className="mt-1 text-xs text-slate-400">{role.userCount} 位管理員</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-bold text-slate-900">功能權限 - {selectedRole?.name || '請選擇角色'}</h3>
            {ROLE_TEMPLATES.map((item) => (
              <button
                key={item.key}
                onClick={() => void applyRoleTemplate(item.key)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                套用{item.label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h4 className="mr-auto flex items-center gap-2 font-semibold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-slate-500" />
                    {moduleToZh(module)} <span className="text-xs text-slate-400">({module})</span>
                  </h4>
                  <button onClick={() => void setModulePermissions(module, true)} className="rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50">
                    全選
                  </button>
                  <button onClick={() => void setModulePermissions(module, false)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                    清空
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {perms.map((perm) => (
                    <label key={perm.id} className="rounded-md border border-slate-200 p-2 hover:bg-slate-50">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedRole?.permissions.includes(perm.id) || false}
                          onChange={() => void togglePermission(perm.id)}
                          className="mt-1 h-4 w-4"
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-800">
                            {actionToZh(perm.action)} <span className="text-xs text-slate-400">({perm.action})</span>
                          </div>
                          <div className="text-xs text-slate-500">{getPermissionHint(perm.module, perm.action, perm.description)}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h3 className="font-bold text-slate-900">管理員管理</h3>
            <p className="text-sm text-slate-500">可載入現有管理員、調整角色與啟用狀態。</p>
          </div>
          <button onClick={() => void loadAdmins()} disabled={adminsLoading} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60">
            {adminsLoading ? '載入中...' : '載入管理員'}
          </button>
          <button
            onClick={() => {
              setAdminForm({ name: '', email: '', is_active: true, role_ids: [] });
              setAdminError('');
              setShowAdminForm(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            新增管理員
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={adminKeyword}
              onChange={(e) => setAdminKeyword(e.target.value)}
              placeholder="搜尋名稱或 Email"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={adminActiveFilter}
            onChange={(e) => setAdminActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">全部狀態</option>
            <option value="active">僅啟用</option>
            <option value="inactive">僅停用</option>
          </select>
        </div>

        {adminsWarning && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {adminsWarning}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-slate-500">管理員</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500">角色</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500">狀態</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500">最後登入</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdmins.map((admin) => {
                const roleIds = adminRoleMap[admin.id] || [];
                return (
                  <tr key={admin.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{admin.name || '未命名管理員'}</div>
                          <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3 w-3" />
                            {admin.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {roleIds.length === 0 && <span className="text-xs text-slate-400">未指派角色</span>}
                        {roleIds.map((rid) => (
                          <span key={rid} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            {roleNameMap[rid] || rid}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {roles.map((role) => (
                          <label key={role.id} className="inline-flex items-center gap-1 text-xs text-slate-600">
                            <input type="checkbox" checked={roleIds.includes(role.id)} onChange={() => void toggleAdminRole(admin.id, role.id)} />
                            {role.name}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {admin.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{dateText(admin.last_login_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => void toggleAdminActive(admin)} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">
                          {admin.is_active ? '停用' : '啟用'}
                        </button>
                        <button onClick={() => void deleteAdmin(admin.id)} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAdmins.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    {adminsLoaded ? '目前沒有符合條件的管理員' : '請先點上方「載入管理員」'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showRoleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">{editingRole ? '編輯角色' : '新增角色'}</h2>
              <button onClick={() => setShowRoleForm(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">角色名稱 *</label>
                <input type="text" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">角色說明</label>
                <textarea value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" rows={3} />
              </div>
              {roleError && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{roleError}</div>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={() => setShowRoleForm(false)} className="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100">
                取消
              </button>
              <button onClick={() => void saveRole()} disabled={savingRole} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {savingRole ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">新增管理員</h2>
              <button onClick={() => setShowAdminForm(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">管理員名稱 *</label>
                <input type="text" value={adminForm.name} onChange={(e) => setAdminForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">管理員 Email *</label>
                <input type="email" value={adminForm.email} onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">指派角色</label>
                <div className="mb-2">
                  <button
                    onClick={() => setAdminForm((prev) => ({ ...prev, role_ids: roles.map((item) => item.id) }))}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                  >
                    <CheckCheck className="h-3 w-3" />
                    全選角色
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <label key={role.id} className="inline-flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm">
                      <input
                        type="checkbox"
                        checked={adminForm.role_ids.includes(role.id)}
                        onChange={() =>
                          setAdminForm((prev) => ({
                            ...prev,
                            role_ids: prev.role_ids.includes(role.id) ? prev.role_ids.filter((id) => id !== role.id) : [...prev.role_ids, role.id],
                          }))
                        }
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={adminForm.is_active} onChange={(e) => setAdminForm((prev) => ({ ...prev, is_active: e.target.checked }))} />
                建立後立即啟用
              </label>
              {adminError && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{adminError}</div>}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={() => setShowAdminForm(false)} className="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100">
                取消
              </button>
              <button onClick={() => void saveAdmin()} disabled={savingAdmin} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {savingAdmin ? '儲存中...' : '儲存管理員'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

