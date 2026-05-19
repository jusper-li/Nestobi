import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee, Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, Search, Tag, Calendar, FolderOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';
import { getBlogPostCategoryIds, getCategoryOptionLabel, getDescendantCategoryIds, sortCategoriesForTree, type CategoryTreeItem } from '../../lib/categoryTree';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: 'draft' | 'published';
  author_name: string;
  tags: string[];
  published_at: string;
  created_at: string;
  updated_at: string;
  blog_post_category_links?: { category_id: string | null }[] | null;
}

interface BlogCategory extends CategoryTreeItem {
  display_order?: number | null;
  is_active?: boolean;
}

const SuperAdminBlog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, category, status, author_name, tags, published_at, created_at, updated_at, blog_post_category_links(category_id)')
      .order('created_at', { ascending: false });
    setPosts(data || []);
    const { data: cats } = await supabase
      .from('blog_categories')
      .select('id,name,slug,parent_id,display_order,is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    setCategories(sortCategoriesForTree((cats || []) as BlogCategory[]));
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleToggleStatus = async (post: BlogPost) => {
    setToggling(post.id);
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const update: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'published' && !post.published_at) {
      update.published_at = new Date().toISOString();
    }
    const { error } = await supabase.from('blog_posts').update(update).eq('id', post.id);
    if (!error) setPosts(ps => ps.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
    setToggling(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此文章？此操作無法復原。')) return;
    setDeleting(id);
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (!error) setPosts(ps => ps.filter(p => p.id !== id));
    if (!error) await logAdminAction('delete_blog_post', 'blog_posts', id);
    setDeleting(null);
  };

  const categoryIdsByName = new Map<string, string[]>();
  for (const category of categories) {
    const ids = categoryIdsByName.get(category.name) || [];
    ids.push(category.id);
    categoryIdsByName.set(category.name, ids);
  }
  const selectedCategoryIds = categoryFilter === 'all' ? null : getDescendantCategoryIds(categories, categoryFilter);

  const filtered = posts.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.includes(search) || p.category.includes(search);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const postCategoryIds = getBlogPostCategoryIds(p);
    for (const id of categoryIdsByName.get(p.category) || []) postCategoryIds.add(id);
    const matchCat = !selectedCategoryIds || [...postCategoryIds].some(id => selectedCategoryIds.has(id));
    return matchSearch && matchStatus && matchCat;
  });

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    draft: posts.filter(p => p.status === 'draft').length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Coffee className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">文章管理</h1>
            <p className="text-sm text-gray-500">咖啡旅行家部落格文章</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/superadmin/blog-categories"
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-medium text-sm transition"
          >
            <FolderOpen className="w-4 h-4" />分類管理
          </Link>
          <Link
            to="/superadmin/blog/new"
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />新增文章
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '全部文章', value: stats.total, color: 'text-gray-700' },
          { label: '已發布', value: stats.published, color: 'text-green-700' },
          { label: '草稿', value: stats.draft, color: 'text-yellow-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋文章標題、分類..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'published', 'draft'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs rounded-lg font-medium transition ${statusFilter === s ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s === 'all' ? '全部' : s === 'published' ? '已發布' : '草稿'}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 text-xs rounded-full font-medium transition border ${categoryFilter === 'all' ? 'bg-amber-700 text-white border-amber-700' : 'border-gray-200 text-gray-500 hover:border-amber-300'}`}
            >
              全部分類
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition border ${categoryFilter === c.id ? 'bg-amber-700 text-white border-amber-700' : 'border-gray-200 text-gray-500 hover:border-amber-300'}`}
              >
                {getCategoryOptionLabel(c, categories)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Coffee className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暫無文章</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {post.status === 'published' ? '已發布' : '草稿'}
                    </span>
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{post.category}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{post.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{post.author_name}</span>
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{post.tags?.slice(0, 2).join(', ') || '—'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.updated_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {post.status === 'published' && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                      title="前往文章"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleToggleStatus(post)}
                    disabled={toggling === post.id}
                    className={`p-2 rounded-lg transition ${post.status === 'published' ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={post.status === 'published' ? '設為草稿' : '發布'}
                  >
                    {toggling === post.id
                      ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      : post.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />
                    }
                  </button>
                  <Link
                    to={`/superadmin/blog/${post.id}`}
                    className="p-2 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                    title="編輯"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deleting === post.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="刪除"
                  >
                    {deleting === post.id
                      ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminBlog;
