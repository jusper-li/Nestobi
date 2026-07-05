import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, CreditCard as Edit, Trash2, MapPin, X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MultiImageUpload from '../MultiImageUpload';
import { useLanguage } from '../../contexts/LanguageContext';

interface Store {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string | null;
  opening_hours: any;
  is_active: boolean;
  location: any;
  images: string[];
}

export default function StoreManagement() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const [storeForm, setStoreForm] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    opening_hours: {},
    is_active: true,
    location: {},
    images: [] as string[],
  });

  useEffect(() => {
    void loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase.from('stores').select('*').order('name');
      if (error) throw error;
      setStores((data || []) as Store[]);
    } catch (error) {
      console.error('Failed to load stores:', error);
      alert(t('store_management.load_failed', '載入門市資料失敗'));
    } finally {
      setLoading(false);
    }
  };

  const saveStore = async () => {
    try {
      if (!storeForm.name.trim()) {
        alert(t('store_management.require_name', '請填寫門市名稱'));
        return;
      }
      if (!storeForm.city.trim()) {
        alert(t('store_management.require_city', '請填寫縣市'));
        return;
      }
      if (!storeForm.address.trim()) {
        alert(t('store_management.require_address', '請填寫地址'));
        return;
      }
      if (!storeForm.phone.trim()) {
        alert(t('store_management.require_phone', '請填寫電話'));
        return;
      }

      const payload = {
        ...storeForm,
        email: storeForm.email.trim() || null,
      };

      if (editingStore) {
        const { error } = await supabase.from('stores').update(payload).eq('id', editingStore.id).select();
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stores').insert([payload]).select();
        if (error) throw error;
      }

      await loadStores();
      closeForm();
      alert(t('store_management.save_success', '儲存成功'));
    } catch (error) {
      console.error('Failed to save store:', error);
      alert(`${t('store_management.save_failed', '儲存失敗')}: ${error instanceof Error ? error.message : t('common.unknown_error', '未知錯誤')}`);
    }
  };

  const deleteStore = async (id: string) => {
    if (!confirm(t('store_management.delete_confirm', '確定要刪除此門市嗎？'))) return;
    try {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw error;
      await loadStores();
    } catch (error) {
      console.error('Failed to delete store:', error);
      alert(t('store_management.delete_failed', '刪除門市失敗'));
    }
  };

  const openForm = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setStoreForm({
        name: store.name,
        city: store.city,
        address: store.address,
        phone: store.phone,
        email: store.email || '',
        opening_hours: store.opening_hours || {},
        is_active: store.is_active,
        location: store.location || {},
        images: store.images || [],
      });
    } else {
      setEditingStore(null);
      setStoreForm({
        name: '',
        city: '',
        address: '',
        phone: '',
        email: '',
        opening_hours: {},
        is_active: true,
        location: {},
        images: [],
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingStore(null);
  };

  const filteredStores = useMemo(
    () =>
      stores.filter((store) =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.city.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [searchTerm, stores]
  );

  if (loading) {
    return <div className="p-6">{t('common.loading', '載入中...')}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('store_management.title', '門市管理')}</h1>
          <p className="mt-2 text-slate-600">{t('store_management.subtitle', '管理所有實體門市資訊')}</p>
        </div>
        <button onClick={() => openForm()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 transition-colors">
          <Plus className="h-4 w-4" />
          {t('store_management.add', '新增門市')}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('store_management.search_placeholder', '搜尋門市...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredStores.map((store) => (
            <div key={store.id} className="overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md">
              {store.images && store.images.length > 0 ? (
                <div className="aspect-video w-full overflow-hidden bg-slate-100">
                  <img src={store.images[0]} alt={store.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-slate-900">
                  <MapPin className="h-12 w-12 text-white" />
                </div>
              )}

              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <h3 className="text-lg font-bold text-slate-900">{store.name}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      store.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {store.is_active ? t('store_management.open', '營業中') : t('store_management.closed', '已停業')}
                  </span>
                </div>

                <div className="mb-4 space-y-2 text-sm text-slate-600">
                  <p>{store.city}</p>
                  <p>{store.address}</p>
                  <p>{store.phone}</p>
                  {store.email && <p>{store.email}</p>}
                </div>

                <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
                  <button
                    onClick={() => openForm(store)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Edit className="h-4 w-4" />
                    {t('common.edit', '編輯')}
                  </button>
                  <button
                    onClick={() => void deleteStore(store.id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('common.delete', '刪除')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 py-8">
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">{editingStore ? t('store_management.edit_title', '編輯門市') : t('store_management.add_title', '新增門市')}</h2>
              <button onClick={closeForm} className="rounded-lg p-2 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-16rem)] space-y-4 overflow-y-auto p-6">
              <div>
                <MultiImageUpload
                  images={storeForm.images}
                  onImagesChange={(newImages: string[]) => {
                    setStoreForm({ ...storeForm, images: newImages });
                  }}
                  bucket="store-images"
                  label={t('store_management.images', '門市圖片')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('store_management.name', '門市名稱')} *</label>
                  <input
                    type="text"
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('store_management.city', '縣市')} *</label>
                  <input
                    type="text"
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('store_management.address', '地址')} *</label>
                <input
                  type="text"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('store_management.phone', '電話')} *</label>
                  <input
                    type="tel"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('store_management.email', '電子郵件')}</label>
                  <input
                    type="email"
                    value={storeForm.email}
                    onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={storeForm.is_active}
                  onChange={(e) => setStoreForm({ ...storeForm, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">{t('store_management.open', '營業中')}</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={closeForm} className="rounded-lg px-4 py-2 text-slate-700 transition-colors hover:bg-slate-100">
                {t('common.cancel', '取消')}
              </button>
              <button onClick={() => void saveStore()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800">
                <Save className="h-4 w-4" />
                {t('common.save', '儲存')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
