import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, CreditCard as Edit, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

export default function FAQManagement() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    category: 'general',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadFaqs();
  }, []);

  const loadFaqs = async () => {
    try {
      const { data, error } = await supabase.from('faqs').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error('Failed to load FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFaq = async () => {
    try {
      if (editingFaq) {
        const { error } = await supabase.from('faqs').update(faqForm).eq('id', editingFaq.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faqs').insert([faqForm]);
        if (error) throw error;
      }

      await loadFaqs();
      closeForm();
    } catch (error) {
      console.error('Failed to save FAQ:', error);
      alert(t('faq_management.save_failed', 'FAQ 儲存失敗，請稍後再試。'));
    }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm(t('faq_management.delete_confirm', '確定要刪除這則 FAQ 嗎？'))) return;

    try {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
      await loadFaqs();
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
    }
  };

  const openForm = (faq?: FAQ) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqForm({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sort_order: faq.sort_order,
        is_active: faq.is_active,
      });
    } else {
      setEditingFaq(null);
      setFaqForm({
        question: '',
        answer: '',
        category: 'general',
        sort_order: 0,
        is_active: true,
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingFaq(null);
  };

  const filteredFaqs = useMemo(
    () =>
      faqs.filter(
        (faq) => faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [faqs, searchTerm]
  );

  if (loading) {
    return <div className="p-6">{t('common.loading', '載入中...')}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('faq_management.title', 'FAQ 管理')}</h1>
          <p className="mt-2 text-slate-600">{t('faq_management.subtitle', '編輯常見問題與公開說明內容。')}</p>
        </div>
        <button onClick={() => openForm()} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800">
          <Plus className="h-4 w-4" />
          {t('faq_management.add', '新增 FAQ')}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('faq_management.search_placeholder', '搜尋 FAQ...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredFaqs.map((faq) => (
            <div key={faq.id} className="p-6 hover:bg-slate-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{faq.category}</span>
                    {faq.is_active && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">{t('faq_management.active', '啟用中')}</span>}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900">{faq.question}</h3>
                  <p className="text-slate-600">{faq.answer}</p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <button onClick={() => openForm(faq)} className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteFaq(faq.id)} className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-2xl font-bold text-slate-900">{editingFaq ? t('faq_management.edit', '編輯 FAQ') : t('faq_management.add', '新增 FAQ')}</h2>
              <button onClick={closeForm} className="rounded-lg p-2 transition-colors hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('faq_management.question', '問題')} *</label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('faq_management.answer', '回答')} *</label>
                <textarea
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('faq_management.category', '分類')}</label>
                  <input
                    type="text"
                    value={faqForm.category}
                    onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('faq_management.sort_order', '排序')}</label>
                  <input
                    type="number"
                    value={faqForm.sort_order}
                    onChange={(e) => setFaqForm({ ...faqForm, sort_order: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={faqForm.is_active}
                    onChange={(e) => setFaqForm({ ...faqForm, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700">{t('faq_management.is_active', '啟用')}</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 p-6">
              <button onClick={closeForm} className="rounded-lg px-4 py-2 text-slate-700 transition-colors hover:bg-slate-100">
                {t('common.cancel', '取消')}
              </button>
              <button onClick={saveFaq} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800">
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
