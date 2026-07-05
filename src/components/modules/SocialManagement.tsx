import { useEffect, useMemo, useState } from 'react';
import { Facebook, Globe, Instagram, Link as LinkIcon, Save, Search, Trash2, Twitter, X, Youtube } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface Social {
  id: string;
  platform: string;
  username: string;
  url: string;
  is_active: boolean;
  sort_order?: number | null;
  created_at?: string;
}

const PLATFORM_ICONS: Record<string, any> = {
  Facebook,
  Instagram,
  Twitter,
  YouTube: Youtube,
  LINE: Globe,
};

const PLATFORM_OPTIONS = ['Facebook', 'Instagram', 'Twitter', 'YouTube', 'LINE'];

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function SocialManagement() {
  const { t } = useLanguage();
  const [socials, setSocials] = useState<Social[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSocial, setEditingSocial] = useState<Social | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formError, setFormError] = useState('');

  const [socialForm, setSocialForm] = useState({
    platform: 'Facebook',
    username: '',
    url: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    void loadSocials();
  }, []);

  const loadSocials = async () => {
    setLoading(true);
    try {
      const primary = await supabase
        .from('social_accounts')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('platform', { ascending: true });

      if (!primary.error) {
        setSocials((primary.data || []) as Social[]);
        return;
      }

      if (primary.error.code !== '42703') throw primary.error;

      const fallback = await supabase.from('social_accounts').select('*').order('platform', { ascending: true });
      if (fallback.error) throw fallback.error;
      setSocials((fallback.data || []) as Social[]);
    } catch (error) {
      console.error('Failed to load social links:', error);
      alert(t('social_management.load_failed', '載入社群資料失敗'));
    } finally {
      setLoading(false);
    }
  };

  const filteredSocials = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return socials.filter((item) => {
      const matchKey =
        !key ||
        item.platform.toLowerCase().includes(key) ||
        item.username.toLowerCase().includes(key) ||
        item.url.toLowerCase().includes(key);
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? item.is_active : !item.is_active);
      return matchKey && matchStatus;
    });
  }, [socials, keyword, statusFilter]);

  const openForm = (social?: Social) => {
    setFormError('');
    if (social) {
      setEditingSocial(social);
      setSocialForm({
        platform: social.platform,
        username: social.username,
        url: social.url,
        is_active: social.is_active,
        sort_order: social.sort_order ?? 0,
      });
    } else {
      const maxOrder = socials.reduce((max, row) => Math.max(max, row.sort_order ?? 0), 0);
      setEditingSocial(null);
      setSocialForm({
        platform: 'Facebook',
        username: '',
        url: '',
        is_active: true,
        sort_order: maxOrder + 1,
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSocial(null);
    setFormError('');
  };

  const saveSocial = async () => {
    setFormError('');
    if (!socialForm.platform.trim() || !socialForm.username.trim() || !socialForm.url.trim()) {
      setFormError(t('social_management.fill_required', '請完整填寫平台、帳號與連結'));
      return;
    }
    if (!isValidUrl(socialForm.url.trim())) {
      setFormError(t('social_management.invalid_url', '請輸入正確的網址（需包含 http:// 或 https://）'));
      return;
    }

    const duplicate = socials.find(
      (item) =>
        item.id !== editingSocial?.id &&
        item.platform === socialForm.platform &&
        item.username.trim().toLowerCase() === socialForm.username.trim().toLowerCase()
    );
    if (duplicate) {
      setFormError(t('social_management.duplicate', '同平台與帳號已存在，請改用不同帳號或直接編輯原資料'));
      return;
    }

    setSaving(true);
    try {
      if (editingSocial) {
        const { error } = await supabase.from('social_accounts').update(socialForm).eq('id', editingSocial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('social_accounts').insert([socialForm]);
        if (error) throw error;
      }
      await loadSocials();
      closeForm();
    } catch (error: any) {
      console.error('Failed to save social link:', error);
      setFormError(error?.message || t('social_management.save_failed', '儲存失敗'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (social: Social) => {
    try {
      const { error } = await supabase.from('social_accounts').update({ is_active: !social.is_active }).eq('id', social.id);
      if (error) throw error;
      await loadSocials();
    } catch {
      alert(t('social_management.toggle_failed', '更新啟用狀態失敗'));
    }
  };

  const moveOrder = async (social: Social, direction: 'up' | 'down') => {
    const hasSortOrder = socials.some((item) => typeof item.sort_order === 'number');
    if (!hasSortOrder) {
      alert(t('social_management.sort_missing', '目前資料表尚未建立 sort_order 欄位，暫時無法排序。'));
      return;
    }

    const rows = [...socials].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const index = rows.findIndex((row) => row.id === social.id);
    if (index < 0) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= rows.length) return;

    const current = rows[index];
    const target = rows[swapIndex];
    try {
      const { error: e1 } = await supabase.from('social_accounts').update({ sort_order: target.sort_order ?? 0 }).eq('id', current.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('social_accounts').update({ sort_order: current.sort_order ?? 0 }).eq('id', target.id);
      if (e2) throw e2;
      await loadSocials();
    } catch {
      alert(t('social_management.sort_failed', '排序更新失敗'));
    }
  };

  const deleteSocial = async (social: Social) => {
    if (!confirm(t('social_management.delete_confirm', `確定要刪除 ${social.platform} / ${social.username} 嗎？`))) return;
    try {
      const { error } = await supabase.from('social_accounts').delete().eq('id', social.id);
      if (error) throw error;
      await loadSocials();
    } catch {
      alert(t('social_management.delete_failed', '刪除社群連結失敗'));
    }
  };

  if (loading) {
    return <div className="p-6">{t('social_management.loading', '載入社群資料中...')}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">{t('social_management.title', '社群管理')}</h1>
        <p className="mt-2 text-slate-600">{t('social_management.subtitle', '管理前台顯示的社群連結、排序與啟用狀態。')}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={() => openForm()} className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
          {t('social_management.add', '新增社群')}
        </button>
        <button onClick={() => void loadSocials()} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100">
          {t('social_management.reload', '重新載入')}
        </button>
        <label className="ml-auto flex min-w-[240px] items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('social_management.search_placeholder', '搜尋平台 / 帳號 / 網址')}
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">{t('social_management.filter_all', '全部狀態')}</option>
          <option value="active">{t('social_management.filter_active', '僅啟用')}</option>
          <option value="inactive">{t('social_management.filter_inactive', '僅停用')}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredSocials.map((social) => {
          const Icon = PLATFORM_ICONS[social.platform] || LinkIcon;
          return (
            <div key={social.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{social.platform}</h3>
                    <p className="text-sm text-slate-600">{social.username}</p>
                    <p className="text-xs text-slate-400">
                      {t('social_management.sort_order', '排序：')}
                      {social.sort_order ?? 0}
                    </p>
                  </div>
                </div>
                {social.is_active ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    {t('social_management.active', '啟用中')}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                    {t('social_management.inactive', '已停用')}
                  </span>
                )}
              </div>

              <div className="mb-4 flex items-start gap-2 text-sm text-slate-600">
                <LinkIcon className="mt-0.5 h-4 w-4 text-slate-400" />
                <a href={social.url} target="_blank" rel="noopener noreferrer" className="break-all hover:text-slate-900">
                  {social.url}
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openForm(social)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
                  {t('common.edit', '編輯')}
                </button>
                <button onClick={() => void toggleActive(social)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
                  {social.is_active ? t('social_management.deactivate', '停用') : t('social_management.activate', '啟用')}
                </button>
                <button onClick={() => void moveOrder(social, 'up')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
                  {t('common.move_up', '上移')}
                </button>
                <button onClick={() => void moveOrder(social, 'down')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
                  {t('common.move_down', '下移')}
                </button>
                <button onClick={() => void deleteSocial(social)} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                  {t('common.delete', '刪除')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSocials.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          {t('social_management.empty', '目前沒有符合條件的社群資料。')}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingSocial ? t('social_management.edit_title', '編輯社群連結') : t('social_management.add_title', '新增社群連結')}
              </h2>
              <button onClick={closeForm} className="rounded-lg p-2 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('social_management.platform', '平台')} *</label>
                <select
                  value={socialForm.platform}
                  onChange={(e) => setSocialForm({ ...socialForm, platform: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {PLATFORM_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('social_management.username', '帳號名稱')} *</label>
                <input
                  type="text"
                  value={socialForm.username}
                  onChange={(e) => setSocialForm({ ...socialForm, username: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="@sonpin"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('social_management.url', '連結網址')} *</label>
                <input
                  type="url"
                  value={socialForm.url}
                  onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('social_management.sort_order', '排序')}</label>
                <input
                  type="number"
                  value={socialForm.sort_order}
                  onChange={(e) => setSocialForm({ ...socialForm, sort_order: Number(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={socialForm.is_active}
                  onChange={(e) => setSocialForm({ ...socialForm, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">{t('social_management.enable', '啟用此社群連結')}</span>
              </label>

              {formError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={closeForm} className="rounded-lg px-4 py-2 text-slate-700 hover:bg-slate-100">
                {t('common.cancel', '取消')}
              </button>
              <button
                onClick={() => void saveSocial()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? t('common.saving', '儲存中...') : t('common.save', '儲存')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
