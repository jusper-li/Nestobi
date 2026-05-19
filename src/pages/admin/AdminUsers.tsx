import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { logAdminAction } from '../../lib/auditLog';

interface UserRow { id: string; user_id: string; role: string; is_active: boolean; created_at: string; display_name: string | null; }

const ROLES = ['user', 'admin', 'superadmin'];

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: authUsers } = await supabase.from('tbl_user_auth').select('*').order('created_at', { ascending: false });
      if (!authUsers) { setLoading(false); return; }
      const userIds = authUsers.map((u: any) => u.user_id);
      const { data: profiles } = await supabase.from('tbl_mn5wgzh0').select('user_id, display_name').in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      setUsers(authUsers.map((u: any) => ({ ...u, display_name: profileMap[u.user_id] || null })));
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (id: string, newRole: string) => {
    if (!window.confirm(`確定要將此用戶角色改為 ${newRole}？`)) return;
    await supabase.from('tbl_user_auth').update({ role: newRole }).eq('id', id);
    await logAdminAction('update_user_role', 'tbl_user_auth', id, { role: newRole });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    if (!window.confirm(`確定要${current ? '停用' : '啟用'}此用戶帳號？`)) return;
    await supabase.from('tbl_user_auth').update({ is_active: !current }).eq('id', id);
    await logAdminAction(current ? 'deactivate_user' : 'activate_user', 'tbl_user_auth', id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !current } : u));
  };

  const ROLE_COLORS: Record<string, string> = { user: 'bg-gray-100 text-gray-600', admin: 'bg-[#F0E4C8] text-[#2C1F10]', superadmin: 'bg-purple-100 text-purple-700' };
  const ROLE_LABELS: Record<string, string> = { user: '一般用戶', admin: '管理員', superadmin: '超級管理員' };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">用戶管理</h1>
        <span className="text-sm text-gray-500">{users.length} 位用戶</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">用戶</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">角色</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">狀態</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">加入日期</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user, i) => (
                <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#F0E4C8] rounded-full flex items-center justify-center text-[#2C1F10] font-bold text-sm flex-shrink-0">
                        {user.display_name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{user.display_name || '未設定名稱'}</p>
                        <p className="text-xs text-gray-400 font-mono">{user.user_id.slice(-10)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={user.role} onChange={e => handleRoleChange(user.id, e.target.value)} className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 focus:outline-none focus:ring-1 focus:ring-[#2C1F10] ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(user.id, user.is_active)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${user.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                      {user.is_active ? '啟用' : '停用'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(user.id, user.is_active)} className={`text-xs px-3 py-1 rounded-lg border transition ${user.is_active ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {user.is_active ? '停用' : '啟用'}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2"><Users className="w-10 h-10 opacity-20" /><p>暫無用戶資料</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
