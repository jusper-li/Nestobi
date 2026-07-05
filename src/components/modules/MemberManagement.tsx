import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Edit,
  Eye,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  total_spent?: number | null;
  order_count?: number | null;
  created_at: string;
  updated_at?: string | null;
}

interface OrderLite {
  id: string;
  member_id: string | null;
  total_amount: number;
  status: string;
  created_at: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

const currency = (value: number) =>
  new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);

const dateTime = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('zh-TW', { hour12: false });
};

export default function MemberManagement() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    is_active: true,
  });

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, ordersRes] = await Promise.all([
        supabase.from('members').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('id, member_id, total_amount, status, created_at'),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (ordersRes.error) {
        console.warn('Orders unavailable in member module:', ordersRes.error.message);
      }

      setMembers((membersRes.data || []) as Member[]);
      setOrders((ordersRes.data || []) as OrderLite[]);
    } catch (error) {
      console.error('Failed to load members:', error);
      alert(t('member_management.load_failed', '載入會員資料失敗。'));
    } finally {
      setLoading(false);
    }
  };

  const memberStats = useMemo(() => {
    const map = new Map<string, { orderCount: number; totalSpent: number }>();

    for (const order of orders) {
      if (!order.member_id) continue;
      const current = map.get(order.member_id) || { orderCount: 0, totalSpent: 0 };
      current.orderCount += 1;
      current.totalSpent += Number(order.total_amount || 0);
      map.set(order.member_id, current);
    }

    return map;
  }, [orders]);

  const enrichedMembers = useMemo(
    () =>
      members.map((member) => {
        const stats = memberStats.get(member.id);
        return {
          ...member,
          order_count: Number(member.order_count ?? stats?.orderCount ?? 0),
          total_spent: Number(member.total_spent ?? stats?.totalSpent ?? 0),
        };
      }),
    [memberStats, members]
  );

  const filteredMembers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return enrichedMembers.filter((member) => {
      const byStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && member.is_active) ||
        (statusFilter === 'inactive' && !member.is_active);

      if (!byStatus) return false;
      if (!query) return true;

      const searchable = [member.name, member.email, member.phone || ''].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [enrichedMembers, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const total = enrichedMembers.length;
    const active = enrichedMembers.filter((m) => m.is_active).length;
    const inactive = total - active;
    const totalRevenue = enrichedMembers.reduce((acc, cur) => acc + Number(cur.total_spent || 0), 0);
    return { total, active, inactive, totalRevenue };
  }, [enrichedMembers]);

  const saveMember = async () => {
    if (!memberForm.name.trim() || !memberForm.email.trim()) {
      alert(t('member_management.require_name_email', '請輸入會員姓名與 Email。'));
      return;
    }

    setSaving(true);
    try {
      if (editingMember) {
        const { error } = await supabase
          .from('members')
          .update({
            name: memberForm.name.trim(),
            email: memberForm.email.trim(),
            phone: memberForm.phone.trim() || null,
            is_active: memberForm.is_active,
          })
          .eq('id', editingMember.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('members').insert([
          {
            name: memberForm.name.trim(),
            email: memberForm.email.trim(),
            phone: memberForm.phone.trim() || null,
            is_active: memberForm.is_active,
            total_spent: 0,
            order_count: 0,
          },
        ]);
        if (error) throw error;
      }

      await loadData();
      closeForm();
    } catch (error) {
      console.error('Failed to save member:', error);
      alert(t('member_management.save_failed', '儲存會員資料失敗。'));
    } finally {
      setSaving(false);
    }
  };

  const toggleMemberStatus = async (member: Member) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Failed to toggle member status:', error);
      alert(t('member_management.toggle_failed', '切換會員狀態失敗。'));
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm(t('member_management.delete_confirm', '確定要刪除這位會員嗎？此操作無法復原。'))) return;
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Failed to delete member:', error);
      alert(t('member_management.delete_failed', '刪除會員失敗。'));
    }
  };

  const openForm = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setMemberForm({
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        is_active: member.is_active,
      });
    } else {
      setEditingMember(null);
      setMemberForm({
        name: '',
        email: '',
        phone: '',
        is_active: true,
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingMember(null);
  };

  const exportCsv = () => {
    const header = [
      t('member_management.csv_name', '姓名'),
      'Email',
      t('member_management.csv_phone', '電話'),
      t('member_management.csv_status', '狀態'),
      t('member_management.csv_orders', '訂單數'),
      t('member_management.csv_spent', '累積消費'),
      t('member_management.csv_created_at', '建立時間'),
    ];
    const rows = filteredMembers.map((member) => [
      member.name,
      member.email,
      member.phone || '',
      member.is_active ? t('member_management.active', '活躍') : t('member_management.inactive', '停用'),
      String(member.order_count || 0),
      String(member.total_spent || 0),
      dateTime(member.created_at),
    ]);

    const csv = [header, ...rows]
      .map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedMemberOrders = useMemo(() => {
    if (!viewingMember) return [];
    return orders
      .filter((order) => order.member_id === viewingMember.id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [orders, viewingMember]);

  if (loading) return <div className="p-6">{t('common.loading', '載入中...')}</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('member_management.title', '會員管理')}</h1>
          <p className="mt-2 text-slate-600">{t('member_management.subtitle', '會員資料、狀態、消費與訂單關聯管理。')}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh', '重新整理')}
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          >
            <Download className="h-4 w-4" />
            {t('member_management.export_csv', '匯出 CSV')}
          </button>
          <button onClick={() => openForm()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" />
            {t('member_management.add_member', '新增會員')}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t('member_management.total_members', '會員總數')}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t('member_management.active_members', '活躍會員')}</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{summary.active}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t('member_management.inactive_members', '停用會員')}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-700">{summary.inactive}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t('member_management.total_spent', '累積消費')}</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{currency(summary.totalRevenue)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('member_management.search_placeholder', '搜尋姓名 / Email / 電話')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          >
            <option value="all">{t('member_management.filter_all', '全部狀態')}</option>
            <option value="active">{t('member_management.filter_active', '僅活躍')}</option>
            <option value="inactive">{t('member_management.filter_inactive', '僅停用')}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('member_management.column_member', '會員')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('member_management.column_contact', '聯絡方式')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('member_management.column_orders', '訂單數')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('member_management.column_spent', '累積消費')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('member_management.column_status', '狀態')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{t('member_management.column_created_at', '建立時間')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">{t('member_management.column_actions', '操作')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-white">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{member.name || t('member_management.unnamed_member', '未命名會員')}</p>
                        <p className="text-xs text-slate-500">ID: {member.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-sm text-slate-700">
                      <p className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {member.email || '-'}
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {member.phone || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-900">{member.order_count || 0}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{currency(Number(member.total_spent || 0))}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {member.is_active ? t('member_management.active', '活躍') : t('member_management.inactive', '停用')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{dateTime(member.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setViewingMember(member)}
                        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        title={t('member_management.view_member', '查看會員')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openForm(member)}
                        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        title={t('member_management.edit_member', '編輯會員')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void toggleMemberStatus(member)}
                        className={`rounded-lg p-2 ${member.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        title={member.is_active ? t('member_management.deactivate_member', '停用會員') : t('member_management.activate_member', '啟用會員')}
                      >
                        {member.is_active ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => void deleteMember(member.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title={t('member_management.delete_member', '刪除會員')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                    {t('member_management.empty_state', '沒有符合條件的會員資料。')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingMember ? t('member_management.edit_member_title', '編輯會員') : t('member_management.add_member_title', '新增會員')}
              </h2>
              <button onClick={closeForm} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('member_management.name', '會員姓名')} *</label>
                <input
                  type="text"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('member_management.phone', '電話')}</label>
                <input
                  type="tel"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={memberForm.is_active}
                  onChange={(e) => setMemberForm({ ...memberForm, is_active: e.target.checked })}
                />
                <span className="text-sm font-medium text-slate-700">{t('member_management.enable_member', '啟用會員')}</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={closeForm} className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">
                {t('common.cancel', '取消')}
              </button>
              <button
                onClick={() => void saveMember()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? t('common.saving', '儲存中...') : t('member_management.save_member', '儲存會員')}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t('member_management.detail_title', '會員明細')}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {viewingMember.name} · {viewingMember.email}
                </p>
              </div>
              <button onClick={() => setViewingMember(null)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard
                  label={t('member_management.status_label', '會員狀態')}
                  value={viewingMember.is_active ? t('member_management.active', '活躍') : t('member_management.inactive', '停用')}
                />
                <InfoCard label={t('member_management.created_at', '建立時間')} value={dateTime(viewingMember.created_at)} />
                <InfoCard label={t('member_management.updated_at', '更新時間')} value={dateTime(viewingMember.updated_at || null)} />
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">
                    {t('member_management.related_orders', '關聯訂單')} ({selectedMemberOrders.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-slate-500">{t('member_management.order_number', '訂單編號')}</th>
                        <th className="px-4 py-2 text-left text-xs text-slate-500">{t('member_management.created_at', '建立時間')}</th>
                        <th className="px-4 py-2 text-left text-xs text-slate-500">{t('member_management.status', '狀態')}</th>
                        <th className="px-4 py-2 text-right text-xs text-slate-500">{t('member_management.amount', '金額')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedMemberOrders.map((order) => (
                        <tr key={order.id}>
                          <td className="px-4 py-3 text-sm text-slate-900">{order.id.slice(0, 12)}...</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{dateTime(order.created_at)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{order.status || '-'}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">{currency(Number(order.total_amount || 0))}</td>
                        </tr>
                      ))}
                      {selectedMemberOrders.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                            {t('member_management.no_related_orders', '此會員目前沒有關聯訂單。')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
