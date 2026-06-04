import { useEffect, useMemo, useState } from 'react';
import { Edit3, Image, Link as LinkIcon, Plus, Save, Trash2, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import type { ThemeKey } from '../../lib/themeBanners';

interface ThemeBannerRecord {
  id: string;
  theme_key: ThemeKey;
  title_zh: string;
  title_en: string;
  title_ja: string;
  title_ko: string;
  subtitle_zh: string;
  subtitle_en: string;
  subtitle_ja: string;
  subtitle_ko: string;
  image_url: string;
  link_url: string;
  link_label_zh: string;
  link_label_en: string;
  link_label_ja: string;
  link_label_ko: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const EMPTY_FORM: Omit<ThemeBannerRecord, 'id'> = {
  theme_key: 'home',
  title_zh: '',
  title_en: '',
  title_ja: '',
  title_ko: '',
  subtitle_zh: '',
  subtitle_en: '',
  subtitle_ja: '',
  subtitle_ko: '',
  image_url: '',
  link_url: '',
  link_label_zh: '',
  link_label_en: '',
  link_label_ja: '',
  link_label_ko: '',
  display_order: 10,
  is_active: true,
};

const TEXT_FIELDS = [
  ['title_zh', '標題 zh'],
  ['title_en', 'Title en'],
  ['title_ja', 'Title ja'],
  ['title_ko', 'Title ko'],
  ['subtitle_zh', '副標 zh'],
  ['subtitle_en', 'Subtitle en'],
  ['subtitle_ja', 'Subtitle ja'],
  ['subtitle_ko', 'Subtitle ko'],
  ['link_label_zh', '按鈕 zh'],
  ['link_label_en', 'Button en'],
  ['link_label_ja', 'Button ja'],
  ['link_label_ko', 'Button ko'],
] as const;

export default function SuperAdminThemeBanners() {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const t = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const [items, setItems] = useState<ThemeBannerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [themeFilter, setThemeFilter] = useState<ThemeKey | 'all'>('all');
  const [form, setForm] = useState<Omit<ThemeBannerRecord, 'id'>>(EMPTY_FORM);
  const [message, setMessage] = useState('');

  const themeOptions = useMemo(
    () => [
      { value: 'home' as const, label: t('首頁', 'Home', 'ホーム', '홈') },
      { value: 'nestopia' as const, label: t('Nestopia 住宿', 'Nestopia Stays', 'Nestopia 宿泊', 'Nestopia 숙소') },
      { value: 'genbon_travel' as const, label: t('根本在旅行', 'Genbon Travel', '根本在旅行', '근본재여행') },
      { value: 'coffee_traveler' as const, label: t('咖啡旅行家', 'Coffee Traveler', 'Coffee Traveler', 'Coffee Traveler') },
    ],
    [locale],
  );

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('theme_banners')
      .select('*')
      .order('theme_key', { ascending: true })
      .order('display_order', { ascending: true });
    if (error) {
      setMessage(error.message);
      setItems([]);
    } else {
      setItems((data || []) as ThemeBannerRecord[]);
      setMessage('');
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const filteredItems = items.filter(item => themeFilter === 'all' || item.theme_key === themeFilter);
  const themeName = (themeKey: ThemeKey) => themeOptions.find(option => option.value === themeKey)?.label || themeKey;

  const startCreate = (themeKey: ThemeKey = themeFilter === 'all' ? 'home' : themeFilter) => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, theme_key: themeKey });
    setMessage('');
  };

  const startEdit = (item: ThemeBannerRecord) => {
    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...nextForm } = item;
    setEditingId(item.id);
    setForm(nextForm);
    setMessage('');
  };

  const updateForm = (key: keyof Omit<ThemeBannerRecord, 'id'>, value: string | number | boolean) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!form.image_url.trim()) {
      setMessage(t('請先填入圖片網址。', 'Please enter an image URL first.', '先に画像URLを入力してください。', '먼저 이미지 URL을 입력해주세요.'));
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      image_url: form.image_url.trim(),
      link_url: form.link_url.trim(),
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.from('theme_banners').update(payload).eq('id', editingId)
      : await supabase.from('theme_banners').insert(payload);
    setSaving(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(t('Banner 已儲存。', 'Banner saved.', 'Banner を保存しました。', '배너가 저장되었습니다.'));
    setEditingId(null);
    setForm(EMPTY_FORM);
    await loadItems();
  };

  const remove = async (id: string) => {
    const ok = window.confirm(t('確定刪除這張 banner？', 'Delete this banner?', 'この Banner を削除しますか？', '이 배너를 삭제할까요?'));
    if (!ok) return;
    const { error } = await supabase.from('theme_banners').delete().eq('id', id);
    if (error) {
      setMessage(error.message);
      return;
    }
    await loadItems();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#8B6840]">{t('主題首頁', 'Theme home pages', 'テーマホーム', '테마 홈')}</p>
          <h1 className="text-2xl font-bold text-gray-900">{t('Banner 管理', 'Banner Management', 'Banner 管理', '배너 관리')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('管理三個主題頁的輪播圖片、文字、排序與連結。', 'Manage carousel images, text, order, and links for the three theme pages.', '3つのテーマページの画像、文字、順序、リンクを管理します。', '세 테마 페이지의 이미지, 문구, 순서, 링크를 관리합니다.')}
          </p>
        </div>
        <button type="button" onClick={() => startCreate()} className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-4 py-2 text-sm font-bold text-white hover:bg-[#8B6840]">
          <Plus className="h-4 w-4" />
          {t('新增 Banner', 'New Banner', 'Banner 追加', '배너 추가')}
        </button>
      </div>

      {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{message}</div>}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setThemeFilter('all')} className={`rounded-full px-4 py-2 text-sm font-semibold ${themeFilter === 'all' ? 'bg-[#2C1F10] text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t('全部', 'All', 'すべて', '전체')}
          </button>
          {themeOptions.map(option => (
            <button key={option.value} type="button" onClick={() => setThemeFilter(option.value)} className={`rounded-full px-4 py-2 text-sm font-semibold ${themeFilter === option.value ? 'bg-[#2C1F10] text-white' : 'bg-gray-100 text-gray-600'}`}>
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredItems.map(item => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                  <img src={item.image_url} alt={item.title_zh || item.title_en} className="h-44 w-full object-cover sm:h-full" />
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#8B6840]">{themeName(item.theme_key)}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {item.is_active ? t('啟用', 'Active', '有効', '활성') : t('停用', 'Inactive', '無効', '비활성')}
                      </span>
                      <span className="ml-auto text-xs font-semibold text-gray-400">#{item.display_order}</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{item.title_zh || item.title_en || item.id}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{item.subtitle_zh || item.subtitle_en}</p>
                    </div>
                    {item.link_url && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                        <LinkIcon className="h-3.5 w-3.5" />
                        <span className="truncate">{item.link_url}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                        <Edit3 className="h-3.5 w-3.5" />
                        {t('編輯', 'Edit', '編集', '편집')}
                      </button>
                      <button type="button" onClick={() => remove(item.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('刪除', 'Delete', '削除', '삭제')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{editingId ? t('編輯 Banner', 'Edit Banner', 'Banner 編集', '배너 편집') : t('新增 Banner', 'New Banner', 'Banner 追加', '배너 추가')}</h2>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">{t('主題', 'Theme', 'テーマ', '테마')}</span>
            <select value={form.theme_key} onChange={event => updateForm('theme_key', event.target.value as ThemeKey)} className="w-full rounded-xl border border-gray-200 px-3 py-2">
              {themeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold text-gray-700">{t('排序', 'Order', '順序', '순서')}</span>
            <input type="number" value={form.display_order} onChange={event => updateForm('display_order', Number(event.target.value))} className="w-full rounded-xl border border-gray-200 px-3 py-2" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><Image className="h-4 w-4" />{t('圖片網址', 'Image URL', '画像URL', '이미지 URL')}</span>
            <input value={form.image_url} onChange={event => updateForm('image_url', event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2" placeholder="https://..." />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"><LinkIcon className="h-4 w-4" />{t('連結', 'Link', 'リンク', '링크')}</span>
            <input value={form.link_url} onChange={event => updateForm('link_url', event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2" placeholder="/shop" />
          </label>
          {TEXT_FIELDS.map(([key, label]) => (
            <label key={key} className={`space-y-1 ${key.startsWith('subtitle') ? 'md:col-span-2' : ''}`}>
              <span className="text-sm font-semibold text-gray-700">{label}</span>
              {key.startsWith('subtitle') ? (
                <textarea value={String(form[key])} onChange={event => updateForm(key, event.target.value)} className="min-h-20 w-full rounded-xl border border-gray-200 px-3 py-2" />
              ) : (
                <input value={String(form[key])} onChange={event => updateForm(key, event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2" />
              )}
            </label>
          ))}
          <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
            <input type="checkbox" checked={form.is_active} onChange={event => updateForm('is_active', event.target.checked)} />
            <span className="text-sm font-semibold text-gray-700">{t('啟用', 'Active', '有効', '활성')}</span>
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#8B6840] disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? t('儲存中...', 'Saving...', '保存中...', '저장 중...') : t('儲存', 'Save', '保存', '저장')}
          </button>
        </div>
      </div>
    </div>
  );
}
