import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Save, X, BookOpen, Tag, TrendingUp, Search, Download, Upload, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface Knowledge {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

export default function KnowledgeBaseManagement() {
  const AUTO_SYNC_KEYWORD = '__auto_sync__';
  const [categories, setCategories] = useState<Category[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [filteredKnowledge, setFilteredKnowledge] = useState<Knowledge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [formData, setFormData] = useState({
    category_id: '',
    question: '',
    answer: '',
    keywords: '',
    priority: 0,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterKnowledge();
  }, [knowledge, selectedCategory, searchTerm]);

  const loadData = async () => {
    try {
      const [categoriesRes, knowledgeRes] = await Promise.all([
        supabase.from('knowledge_categories').select('*').order('name'),
        supabase.from('knowledge_base').select('*').order('created_at', { ascending: false })
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (knowledgeRes.error) throw knowledgeRes.error;

      setCategories(categoriesRes.data || []);
      setKnowledge(knowledgeRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromSiteData = async () => {
    setSyncing(true);
    try {
      const [productsRes, articlesRes, faqsRes, pagesRes, categoriesRes, knowledgeRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, slug, name, summary, description, content, price, sale_price, stock, is_active')
          .order('created_at', { ascending: false }),
        supabase
          .from('articles')
          .select('id, slug, title, excerpt, content, status, published_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('faqs')
          .select('id, question, answer, category, is_active')
          .order('sort_order', { ascending: true }),
        supabase
          .from('static_pages')
          .select('id, slug, title, meta_description, sections, is_published')
          .order('created_at', { ascending: true }),
        supabase.from('knowledge_categories').select('*'),
        supabase.from('knowledge_base').select('id, keywords'),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (articlesRes.error) throw articlesRes.error;
      if (faqsRes.error) throw faqsRes.error;
      if (pagesRes.error) throw pagesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (knowledgeRes.error) throw knowledgeRes.error;

      let categoryMap = new Map((categoriesRes.data || []).map((item) => [item.name, item.id]));

      const ensureCategory = async (name: string, description: string) => {
        const existingId = categoryMap.get(name);
        if (existingId) return existingId;
        const { data, error } = await supabase
          .from('knowledge_categories')
          .insert([{ name, description, is_active: true }])
          .select('id, name')
          .single();
        if (error) throw error;
        categoryMap.set(data.name, data.id);
        return data.id;
      };

      const productCategoryId = await ensureCategory('產品資訊', '商品資料自動同步');
      const articleCategoryId = await ensureCategory('文章專欄', '文章內容自動同步');
      const faqCategoryId = await ensureCategory('常見問題', 'FAQ 自動同步');
      const staticPageCategoryId = await ensureCategory('靜態頁面', '靜態頁內容自動同步');

      const existingAutoSyncIds = (knowledgeRes.data || [])
        .filter((item) => Array.isArray(item.keywords) && item.keywords.includes(AUTO_SYNC_KEYWORD))
        .map((item) => item.id);

      if (existingAutoSyncIds.length > 0) {
        const { error } = await supabase.from('knowledge_base').delete().in('id', existingAutoSyncIds);
        if (error) throw error;
      }

      const rows: Array<{
        category_id: string;
        question: string;
        answer: string;
        keywords: string[];
        priority: number;
        is_active: boolean;
      }> = [];

      (productsRes.data || []).forEach((item: any) => {
        rows.push({
          category_id: productCategoryId,
          question: `商品資訊｜${item.name}`,
          answer: `商品名稱：${item.name}\n商品代碼：${item.slug || '-'}\n售價：NT$${item.sale_price ?? item.price ?? 0}\n庫存：${item.stock ?? 0}\n摘要：${item.summary || '-'}\n描述：${item.description || '-'}\n內容：${item.content || '-'}`,
          keywords: [AUTO_SYNC_KEYWORD, 'product', item.slug || '', item.name || ''].filter(Boolean),
          priority: 35,
          is_active: item.is_active !== false,
        });
      });

      (articlesRes.data || []).forEach((item: any) => {
        rows.push({
          category_id: articleCategoryId,
          question: `文章內容｜${item.title}`,
          answer: `文章標題：${item.title}\n文章代碼：${item.slug || '-'}\n發佈狀態：${item.status || '-'}\n摘要：${item.excerpt || '-'}\n內容：${item.content || '-'}`,
          keywords: [AUTO_SYNC_KEYWORD, 'article', item.slug || '', item.title || ''].filter(Boolean),
          priority: 28,
          is_active: item.status === 'published',
        });
      });

      (faqsRes.data || []).forEach((item: any) => {
        rows.push({
          category_id: faqCategoryId,
          question: `FAQ｜${item.question}`,
          answer: `問題：${item.question}\n分類：${item.category || '一般'}\n回答：${item.answer || '-'}`,
          keywords: [AUTO_SYNC_KEYWORD, 'faq', item.category || '', item.question || ''].filter(Boolean),
          priority: 32,
          is_active: item.is_active !== false,
        });
      });

      (pagesRes.data || []).forEach((item: any) => {
        const sections = Array.isArray(item.sections)
          ? item.sections
              .map((section: any) => `${section?.title || ''}\n${section?.content || ''}`)
              .filter(Boolean)
              .join('\n\n')
          : '';
        rows.push({
          category_id: staticPageCategoryId,
          question: `靜態頁面｜${item.title}`,
          answer: `頁面標題：${item.title}\nSlug：${item.slug}\nSEO 描述：${item.meta_description || '-'}\n內容：${sections || '-'}`,
          keywords: [AUTO_SYNC_KEYWORD, 'static_page', item.slug || '', item.title || ''].filter(Boolean),
          priority: 24,
          is_active: item.is_published !== false,
        });
      });

      if (rows.length > 0) {
        const dedupedRows = Array.from(
          rows.reduce((map, row) => {
            const key = row.question.trim();
            if (!key) return map;
            map.set(key, row);
            return map;
          }, new Map<string, typeof rows[number]>()).values()
        );

        const { error } = await supabase
          .from('knowledge_base')
          .upsert(dedupedRows, { onConflict: 'question' });
        if (error) throw error;
      }

      await loadData();
      alert(`同步完成：商品 ${productsRes.data?.length || 0} 筆、文章 ${articlesRes.data?.length || 0} 筆、FAQ ${faqsRes.data?.length || 0} 筆、靜態頁 ${pagesRes.data?.length || 0} 筆`);
    } catch (error) {
      console.error('Knowledge sync failed:', error);
      alert(error instanceof Error ? `同步失敗：${error.message}` : '同步失敗');
    } finally {
      setSyncing(false);
    }
  };

  const filterKnowledge = () => {
    let filtered = knowledge;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(k => k.category_id === selectedCategory);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(k =>
        k.question.toLowerCase().includes(search) ||
        k.answer.toLowerCase().includes(search) ||
        k.keywords?.some(kw => kw.toLowerCase().includes(search))
      );
    }

    setFilteredKnowledge(filtered);
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingId(null);
    setFormData({
      category_id: categories[0]?.id || '',
      question: '',
      answer: '',
      keywords: '',
      priority: 0,
      is_active: true
    });
  };

  const handleEdit = (item: Knowledge) => {
    setEditingId(item.id);
    setShowAddForm(true);
    setFormData({
      category_id: item.category_id || '',
      question: item.question,
      answer: item.answer,
      keywords: item.keywords?.join(', ') || '',
      priority: item.priority,
      is_active: item.is_active
    });
  };

  const handleSave = async () => {
    try {
      const keywords = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const data = {
        category_id: formData.category_id || null,
        question: formData.question,
        answer: formData.answer,
        keywords,
        priority: formData.priority,
        is_active: formData.is_active
      };

      if (editingId) {
        const { error } = await supabase
          .from('knowledge_base')
          .update(data)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('knowledge_base')
          .insert([data]);

        if (error) throw error;
      }

      setShowAddForm(false);
      setEditingId(null);
      loadData();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('儲存失敗，請稍後再試');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這筆知識嗎？')) return;

    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('刪除失敗，請稍後再試');
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || '未分類';
  };

  const handleExport = () => {
    const exportData = knowledge.map(k => ({
      category: getCategoryName(k.category_id),
      question: k.question,
      answer: k.answer,
      keywords: k.keywords,
      priority: k.priority
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `knowledge-base-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        let successCount = 0;

        for (const item of importData) {
          const category = categories.find(c => c.name === item.category);
          if (!category) continue;

          const { error } = await supabase
            .from('knowledge_base')
            .insert([{
              category_id: category.id,
              question: item.question,
              answer: item.answer,
              keywords: item.keywords || [],
              priority: item.priority || 0,
              is_active: true
            }]);

          if (!error) successCount++;
        }

        alert(`成功匯入 ${successCount} 筆知識`);
        loadData();
      } catch (error) {
        console.error('Import failed:', error);
        alert('匯入失敗，請確認檔案格式正確');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (loading) {
    return <div className="p-6">載入中...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">知識庫管理</h1>
          <p className="text-slate-600 mt-2">管理 AI 客服的知識內容</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncFromSiteData}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            同步網站資料
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            匯出
          </button>
          <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            匯入
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增知識
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{knowledge.length}</div>
              <div className="text-sm text-slate-600">總知識數</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Tag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{categories.length}</div>
              <div className="text-sm text-slate-600">分類數</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {knowledge.filter(k => k.is_active).length}
              </div>
              <div className="text-sm text-slate-600">啟用中</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {knowledge.reduce((sum, k) => sum + k.usage_count, 0)}
              </div>
              <div className="text-sm text-slate-600">總使用次數</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋問題、答案或關鍵字..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">全部分類</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              {editingId ? '編輯知識' : '新增知識'}
            </h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">分類</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">問題</label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="輸入問題..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">答案</label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="輸入答案..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                關鍵字（用逗號分隔）
              </label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="例如：營業時間, 幾點, 開門"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  優先度（0-100）
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">狀態</label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="active">啟用</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                儲存
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  分類
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  問題
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  關鍵字
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  優先度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  使用次數
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredKnowledge.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    {searchTerm || selectedCategory !== 'all' ? '找不到符合的知識' : '尚未建立任何知識'}
                  </td>
                </tr>
              ) : (
                filteredKnowledge.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {getCategoryName(item.category_id)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 max-w-xs truncate">
                      {item.question}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex flex-wrap gap-1">
                        {item.keywords?.slice(0, 3).map((kw, idx) => (
                          <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                            {kw}
                          </span>
                        ))}
                        {item.keywords?.length > 3 && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                            +{item.keywords.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {item.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {item.usage_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        item.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
