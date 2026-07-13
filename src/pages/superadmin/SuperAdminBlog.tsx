import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleToggleStatus = async (post: BlogPost) => {
    setToggling(post.id);
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const update: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'published' && !post.published_at) {
      update.published_at = new Date().toISOString();
    }
    const { error } = await supabase.from('blog_posts').update(update).eq('id', post.id);
    if (!error) {
      setPosts(current => current.map(item => (item.id === post.id ? { ...item, status: newStatus } : item)));
    }
    setToggling(null);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('確定要刪除這篇文章嗎？')) return;
    setDeleting(postId);
    const { error } = await supabase.from('blog_posts').delete().eq('id', postId);
    if (!error) {
      setPosts(current => current.filter(item => item.id !== postId));
      await logAdminAction('delete_blog_post', 'blog_posts', postId);
    }
    setDeleting(null);
  };

  const categoryIdsByName = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const category of categories) {
      const ids = map.get(category.name) || [];
      ids.push(category.id);
      map.set(category.name, ids);
    }
    return map;
  }, [categories]);

  const selectedCategoryIds = categoryFilter === 'all' ? null : getDescendantCategoryIds(categories, categoryFilter);

  const filtered = useMemo(() => {
    return posts.filter(post => {
      const q = search.toLowerCase();
      const matchSearch = !search || post.title.toLowerCase().includes(q) || post.slug.includes(search) || post.category.includes(search);
      const matchStatus = statusFilter === 'all' || post.status === statusFilter;
      const postCategoryIds = getBlogPostCategoryIds(post);
      for (const categoryId of categoryIdsByName.get(post.category) || []) postCategoryIds.add(categoryId);
      const matchCategory = !selectedCategoryIds || [...postCategoryIds].some(id => selectedCategoryIds.has(id));
      return matchSearch && matchStatus && matchCategory;
    });
  }, [posts, search, statusFilter, selectedCategoryIds, categoryIdsByName]);

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const stats = {
    total: posts.length,
    published: posts.filter(post => post.status === 'published').length,
    draft: posts.filter(post => post.status === 'draft').length,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
            <Coffee className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">部落格管理</h1>
            <p className="text-sm text-gray-500">管理文章、發佈狀態與分類。</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/superadmin/blog-categories" className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            <FolderOpen className="h-4 w-4" />
            分類管理
          </Link>
          <Link to="/superadmin/blog/new" className="flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800">
            <Plus className="h-4 w-4" />
            新增文章
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: '文章總數', value: stats.total, color: 'text-gray-700' },
          { label: '已發佈', value: stats.published, color: 'text-green-700' },
          { label: '草稿', value: stats.draft, color: 'text-yellow-700' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-1 text-sm text-gray-500">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="搜尋文章"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'published', 'draft'] as const).map(value => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  statusFilter === value ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {value === 'all' ? '全部' : value === 'published' ? '已發佈' : '草稿'}
              </button>
            ))}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-3">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                categoryFilter === 'all' ? 'border-amber-700 bg-amber-700 text-white' : 'border-gray-200 text-gray-500 hover:border-amber-300'
              }`}
            >
              全部分類
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setCategoryFilter(category.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  categoryFilter === category.id ? 'border-amber-700 bg-amber-700 text-white' : 'border-gray-200 text-gray-500 hover:border-amber-300'
                }`}
              >
                {getCategoryOptionLabel(category, categories)}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-700 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Coffee className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">找不到符合條件的文章</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center gap-4 p-4 transition hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {post.status === 'published' ? '已發佈' : '草稿'}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{post.category}</span>
                  </div>
                  <h3 className="truncate text-sm font-semibold text-gray-900">{post.title}</h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                    <span>{post.author_name}</span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {post.tags?.slice(0, 2).join(', ') || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(post.updated_at)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {post.status === 'published' && (
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-700" title="開啟文章">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleToggleStatus(post)}
                    disabled={toggling === post.id}
                    className={`rounded-lg p-2 transition ${post.status === 'published' ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={post.status === 'published' ? '取消發佈' : '發佈'}
                  >
                    {toggling === post.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    ) : post.status === 'published' ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <Link to={`/superadmin/blog/${post.id}`} className="rounded-lg p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-700" title="編輯">
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deleting === post.id}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    title="刪除"
                  >
                    {deleting === post.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
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
