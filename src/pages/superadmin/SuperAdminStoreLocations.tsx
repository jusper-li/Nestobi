import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Clock,
  Image,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  DEFAULT_STORE_LOCATIONS,
  createEmptyStoreLocation,
  fetchStoreLocations,
  normalizeStoreLocation,
  saveStoreLocations,
  storeLocationToSearchText,
  type StoreLocation,
} from '../../lib/storeLocations';
import { STORE_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `store-${Date.now()}`;
}

export default function SuperAdminStoreLocations() {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<StoreLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const rows = await fetchStoreLocations(true);
      setLocations(rows.map((row, index) => normalizeStoreLocation(row, index)));
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : '讀取門市資料失敗' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLocations(); }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return locations.map((location, index) => ({ location, index }));

    return locations
      .map((location, index) => ({ location, index }))
      .filter(({ location }) => storeLocationToSearchText(location).includes(query));
  }, [locations, search]);

  const openNew = () => {
    setEditingIndex(null);
    setDraft(createEmptyStoreLocation(locations.length));
    setStatus(null);
  };

  const openEdit = (location: StoreLocation, index: number) => {
    setEditingIndex(index);
    setDraft(normalizeStoreLocation(location, index));
    setStatus(null);
  };

  const closeEditor = () => {
    setEditingIndex(null);
    setDraft(null);
    setUploading(false);
  };

  const updateDraft = <K extends keyof StoreLocation>(key: K, value: StoreLocation[K]) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const updateHours = (key: keyof StoreLocation['hours'], value: string) => {
    setDraft(prev => prev ? { ...prev, hours: { ...prev.hours, [key]: value } } : prev);
  };

  const handleUpload = async (file: File) => {
    if (!draft) return;
    setUploading(true);
    setStatus(null);
    const ext = file.name.split('.').pop() || 'webp';
    const safeSlug = slugify(draft.slug || draft.name_en || draft.name);
    const fileName = `stores/${safeSlug}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('site-assets')
      .upload(fileName, file, { upsert: true, contentType: file.type || undefined });

    if (error) {
      setStatus({ type: 'error', message: `圖片上傳失敗：${error.message}` });
    } else {
      const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
      updateDraft('image_url', data.publicUrl);
      setStatus({ type: 'success', message: '圖片已上傳並帶入欄位。' });
    }
    setUploading(false);
  };

  const applyDraft = () => {
    if (!draft || !draft.name.trim() || !draft.slug.trim()) {
      setStatus({ type: 'error', message: '門市名稱與 slug 必填。' });
      return;
    }

    const normalized = normalizeStoreLocation(draft, editingIndex ?? locations.length);
    setLocations(prev => {
      const next = [...prev];
      if (editingIndex === null) next.push(normalized);
      else next[editingIndex] = normalized;
      return next.map((row, index) => ({ ...row, sort_order: index }));
    });
    setStatus({ type: 'info', message: '已更新草稿，請按「儲存全部」寫入正式資料。' });
    closeEditor();
  };

  const handleDelete = (index: number) => {
    const target = locations[index];
    if (!target || !confirm(`確定移除「${target.name}」？儲存後會同步到正式資料。`)) return;
    setLocations(prev => prev.filter((_, idx) => idx !== index).map((row, order) => ({ ...row, sort_order: order })));
    setStatus({ type: 'info', message: '已移除草稿，請按「儲存全部」寫入正式資料。' });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= locations.length) return;

    setLocations(prev => {
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next.map((row, order) => ({ ...row, sort_order: order }));
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const backend = await saveStoreLocations(locations);
      setStatus({
        type: 'success',
        message: backend === 'store_locations'
          ? '門市據點已儲存到 store_locations 資料表。'
          : '門市據點已儲存到系統資料列，等正式資料表建立後會自動切換。',
      });
      await loadLocations();
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : '儲存門市資料失敗' });
    } finally {
      setSaving(false);
    }
  };

  const restoreDefaults = () => {
    if (!confirm('要用 DLAL 門市來源資料覆蓋目前草稿嗎？')) return;
    setLocations(DEFAULT_STORE_LOCATIONS.map((row, index) => normalizeStoreLocation(row, index)));
    setStatus({ type: 'info', message: '已還原來源資料草稿，請按「儲存全部」寫入正式資料。' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-9 w-9 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">門市據點管理</h1>
          <p className="mt-1 text-sm text-gray-500">維護前台門市據點、營業時間、電話、地圖與照片。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/vendor/store-admin"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            <Users className="h-4 w-4" />
            門市管理員
          </Link>
          <button
            onClick={restoreDefaults}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300"
          >
            <RefreshCcw className="h-4 w-4" />
            還原來源資料
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            <Plus className="h-4 w-4" />
            新增門市
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            儲存全部
          </button>
        </div>
      </div>

      {status && (
        <div className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          status.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : status.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-sky-200 bg-sky-50 text-sky-700'
        }`}>
          {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="搜尋門市、地址、電話"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500">
          共 {locations.length} 間，啟用 {locations.filter(location => location.is_active).length} 間
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map(({ location, index }) => (
          <article key={`${location.slug}-${index}`} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
            location.is_active ? 'border-gray-100' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="grid sm:grid-cols-[180px_1fr]">
              <div className="aspect-[4/3] bg-gray-100 sm:aspect-auto">
                <img
                  src={location.image_url || STORE_FALLBACK_IMAGE}
                  alt={location.name}
                  className="h-full w-full object-cover"
                  onError={event => useFallbackImage(event, STORE_FALLBACK_IMAGE)}
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-amber-700">{location.city} / {location.district}</p>
                    <h2 className="mt-1 font-bold text-gray-900">{location.name || '未命名門市'}</h2>
                    <p className="mt-0.5 text-xs text-gray-500">{location.name_en}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    location.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {location.is_active ? '啟用' : '停用'}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />{location.address}</p>
                  <p className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />{location.hours.primary}</p>
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2">
                  <div className="flex gap-1">
                    <button onClick={() => handleMove(index, 'up')} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50" title="上移">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleMove(index, 'down')} className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50" title="下移">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(location, index)} className="rounded-lg border border-gray-200 p-2 text-amber-700 transition hover:bg-amber-50" title="編輯">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(index)} className="rounded-lg border border-red-100 p-2 text-red-500 transition hover:bg-red-50" title="刪除">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
            onClick={event => { if (event.target === event.currentTarget) closeEditor(); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
                <h2 className="font-bold text-gray-900">{editingIndex === null ? '新增門市' : '編輯門市'}</h2>
                <button onClick={closeEditor} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">中文名稱</span>
                  <input value={draft.name} onChange={event => updateDraft('name', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">英文名稱</span>
                  <input value={draft.name_en} onChange={event => updateDraft('name_en', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Slug</span>
                  <input
                    value={draft.slug}
                    onChange={event => updateDraft('slug', slugify(event.target.value))}
                    onBlur={() => updateDraft('slug', slugify(draft.slug || draft.name_en || draft.name))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">城市</span>
                    <input value={draft.city} onChange={event => updateDraft('city', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">區域</span>
                    <input value={draft.district} onChange={event => updateDraft('district', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                  </label>
                </div>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">地址</span>
                  <input value={draft.address} onChange={event => updateDraft('address', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">電話</span>
                  <input value={draft.phone} onChange={event => updateDraft('phone', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">主要營業時間</span>
                  <input value={draft.hours.primary} onChange={event => updateHours('primary', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">補充營業時間</span>
                  <input value={draft.hours.secondary || ''} onChange={event => updateHours('secondary', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">備註</span>
                  <input value={draft.hours.note || ''} onChange={event => updateHours('note', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">地圖 URL</span>
                  <input value={draft.map_url} onChange={event => updateDraft('map_url', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                </label>
                <div className="md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">門市照片</span>
                  <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                      <img src={draft.image_url || STORE_FALLBACK_IMAGE} alt="" className="h-full w-full object-cover" onError={event => useFallbackImage(event, STORE_FALLBACK_IMAGE)} />
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Image className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input value={draft.image_url} onChange={event => updateDraft('image_url', event.target.value)} className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          上傳
                          <input type="file" accept="image/*" className="hidden" onChange={event => {
                            const file = event.target.files?.[0];
                            if (file) handleUpload(file);
                            event.currentTarget.value = '';
                          }} />
                        </label>
                      </div>
                      <input
                        value={draft.source_image_url || ''}
                        onChange={event => updateDraft('source_image_url', event.target.value)}
                        placeholder="來源圖片 URL"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      />
                    </div>
                  </div>
                </div>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">來源 URL</span>
                  <input value={draft.source_url} onChange={event => updateDraft('source_url', event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20" />
                </label>
                <label className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 md:col-span-2">
                  <input type="checkbox" checked={draft.is_active} onChange={event => updateDraft('is_active', event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                  <span className="text-sm font-medium text-gray-700">啟用並顯示在前台</span>
                </label>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
                <button onClick={closeEditor} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">取消</button>
                <button onClick={applyDraft} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
                  <Save className="h-4 w-4" />
                  套用草稿
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
