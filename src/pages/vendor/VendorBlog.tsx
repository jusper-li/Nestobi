import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink, Search, Tag, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../lib/auditLog';

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
}

const VendorBlog: React.FC = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('vendors').select('id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setVendorId(data.id);
    });
  }, [user]);

  const fetchPosts = useCallback(async (vid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('blog_posts')
      .select('id, title, slug, category, status, author_name, tags, published_at, created_at, updated_at')
      .eq('vendor_id', vid)
      .order('created_at', { ascending: false });
    setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (vendorId) fetchPosts(vendorId);
  }, [vendorId, fetchPosts]);

  const handleToggleStatus = async (post: BlogPost) => {
    if (!vendorId) return;
    setToggling(post.id);
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const update: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'published' && !post.published_at) {
      update.published_at = new Date().toISOString();
    }
    const { error } = await supabase.from('blog_posts').update(update).eq('id', post.id).eq('vendor_id', vendorId);
    if (!error) {
      setPosts(ps => ps.map(p => p.id === post.id ? { ...p, status: newStatus, published_at: update.published_at as string || p.published_at } : p));
      await logAdminAction(newStatus === 'published' ? 'publish_blog_post' : 'unpublish_blog_post', 'blog_posts', post.id, {
        status: newStatus,
        title: post.title,
        vendor_id: vendorId,
      });
    }
    setToggling(null);
  };

  const handleDelete = async (id: string) => {
    if (!vendorId || !confirm('確定要刪除此文章？此操作無法復原。')) return;
    setDeleting(id);
    const { error } = await supabase.from('blog_posts').delete().eq('id', id).eq('vendor_id', vendorId);
    if (!error) {
      setPosts(ps => ps.filter(p => p.id !== id));
      await logAdminAction('delete_blog_post', 'blog_posts', id, { vendor_id: vendorId });
    }
    setDeleting(null);
  };

  const filtered = posts.filter(p => {
    const matchSearch = p.title.includes(search) || p.slug.includes(search) || p.category.includes(search);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
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
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">文章管理</h1>
            <p className="text-sm text-gray-500">管理您的咖啡旅行家文章</p>
          </div>
        </div>
        {vendorId && (
          <Link
            to="/vendor/blog/new"
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />新增文章
          </Link>
        )}
      </div>

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
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋文章標題、分類..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'published', 'draft'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs rounded-lg font-medium transition ${statusFilter === s ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s === 'all' ? '全部' : s === 'published' ? '已發布' : '草稿'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{posts.length === 0 ? '尚無文章，點擊「新增文章」開始撰寫' : '找不到符合條件的文章'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {post.status === 'published' ? '已發布' : '草稿'}
                    </span>
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{post.category}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{post.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{post.tags?.slice(0, 2).join(', ') || '—'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.updated_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {post.status === 'published' && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
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
                    to={`/vendor/blog/${post.id}`}
                    className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
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

export default VendorBlog;
