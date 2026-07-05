import { useEffect, useState } from 'react';
import { Plus, Globe, X, Save, CreditCard as Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface Language {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
}

export default function LanguageManagement() {
  const { t } = useLanguage();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [languageForm, setLanguageForm] = useState({
    code: '',
    name: '',
    is_default: false,
    is_active: true,
  });

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      const { data, error } = await supabase.from('languages').select('*').order('is_default', { ascending: false });
      if (error) throw error;
      setLanguages(data || []);
    } catch (error) {
      console.error('Failed to load languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveLanguage = async () => {
    try {
      if (editingLanguage) {
        const { error } = await supabase.from('languages').update(languageForm).eq('id', editingLanguage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('languages').insert([languageForm]);
        if (error) throw error;
      }

      await loadLanguages();
      closeForm();
    } catch (error) {
      console.error('Failed to save language:', error);
      alert(t('language_management.save_failed', '儲存失敗'));
    }
  };

  const deleteLanguage = async (id: string) => {
    if (!confirm(t('language_management.delete_confirm', '確定要刪除此語系嗎？'))) return;

    try {
      const { error } = await supabase.from('languages').delete().eq('id', id);
      if (error) throw error;
      await loadLanguages();
    } catch (error) {
      console.error('Failed to delete language:', error);
    }
  };

  const openForm = (language?: Language) => {
    if (language) {
      setEditingLanguage(language);
      setLanguageForm({
        code: language.code,
        name: language.name,
        is_default: language.is_default,
        is_active: language.is_active,
      });
    } else {
      setEditingLanguage(null);
      setLanguageForm({
        code: '',
        name: '',
        is_default: false,
        is_active: true,
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingLanguage(null);
  };

  if (loading) {
    return <div className="p-6">{t('common.loading', '載入中...')}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('language_management.title', '語系管理')}</h1>
          <p className="text-slate-600 mt-2">{t('language_management.subtitle', '管理多國語言與翻譯')}</p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          {t('language_management.add', '新增語系')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {languages.map((lang) => (
          <div key={lang.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                {lang.is_default && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {t('language_management.default', '預設')}
                  </span>
                )}
                {lang.is_active ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    {t('language_management.active', '啟用')}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {t('language_management.inactive', '停用')}
                  </span>
                )}
              </div>
            </div>

            <h3 className="mb-1 text-lg font-bold text-slate-900">{lang.name}</h3>
            <p className="mb-4 text-sm text-slate-600">{lang.code}</p>

            <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => openForm(lang)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Edit className="w-4 h-4" />
                {t('common.edit', '編輯')}
              </button>
              {!lang.is_default && (
                <button
                  onClick={() => deleteLanguage(lang.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete', '刪除')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingLanguage ? t('language_management.edit', '編輯語系') : t('language_management.add', '新增語系')}
              </h2>
              <button onClick={closeForm} className="rounded-lg p-2 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('language_management.code', '語系代碼')} *</label>
                <input
                  type="text"
                  value={languageForm.code}
                  onChange={(e) => setLanguageForm({ ...languageForm, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  placeholder={t('language_management.code_placeholder', '例如: zh-TW, en, ja')}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('language_management.name', '語系名稱')} *</label>
                <input
                  type="text"
                  value={languageForm.name}
                  onChange={(e) => setLanguageForm({ ...languageForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder={t('language_management.name_placeholder', '例如: 繁體中文, English')}
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={languageForm.is_default}
                    onChange={(e) => setLanguageForm({ ...languageForm, is_default: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700">{t('language_management.set_default', '設為預設語系')}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={languageForm.is_active}
                    onChange={(e) => setLanguageForm({ ...languageForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700">{t('language_management.enable_language', '啟用此語系')}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button
                onClick={closeForm}
                className="rounded-lg px-4 py-2 text-slate-700 transition-colors hover:bg-slate-100"
              >
                {t('common.cancel', '取消')}
              </button>
              <button
                onClick={saveLanguage}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
              >
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
