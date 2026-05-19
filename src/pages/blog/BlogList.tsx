import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  Coffee,
  Loader2,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { useProgressiveList } from '../../hooks/useProgressiveList';
import { BLOG_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { fetchPublicList, fetchSnapshotList, readCachedList, withRetry, writeCachedList } from '../../lib/listData';
import { supabase } from '../../lib/supabase';
import {
  getBlogPostCategoryIds,
  getCategoryDepth,
  getDescendantCategoryIds,
  sortCategoriesForTree,
  type CategoryTreeItem,
} from '../../lib/categoryTree';

interface BlogCategory extends CategoryTreeItem {
  description?: string;
  is_active?: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string;
  author_name: string;
  tags: string[];
  category: string;
  published_at: string;
  blog_post_category_links?: { category_id: string | null }[] | null;
}

interface AIBlogFilters {
  categories: string[];
  keywords: string[];
  summary: string;
}

const ALL_CATEGORY_ID = 'all';
const BLOG_POSTS_CACHE_KEY = 'nestobi:list:blog-posts:v3';
const BLOG_CATEGORIES_CACHE_KEY = 'nestobi:list:blog-categories:v2';
const BLOG_POSTS_SNAPSHOT_PATH = '/snapshots/blog-posts.json';
const BLOG_CATEGORIES_SNAPSHOT_PATH = '/snapshots/blog-categories.json';
const SYSTEM_BLOG_SLUGS = new Set(['system-store-locations']);

const DEFAULT_BLOG_CATEGORIES: BlogCategory[] = [
  { id: 'coffee-travel', name: '咖啡旅行', slug: 'coffee-travel', parent_id: null, display_order: 10 },
  { id: 'coffee-travel-japan-cafes', name: '日本各地咖啡廳介紹', slug: 'coffee-travel-japan-cafes', parent_id: 'coffee-travel', display_order: 11 },
  { id: 'japan-travel', name: '日本旅行', slug: 'japan-travel', parent_id: null, display_order: 20 },
  { id: 'japan-travel-food-souvenirs-menu', name: '美食/伴手禮/菜單中文翻譯', slug: 'japan-travel-food-souvenirs-menu', parent_id: 'japan-travel', display_order: 21 },
  { id: 'okinawa-travel', name: '沖繩美好旅行', slug: 'okinawa-travel', parent_id: null, display_order: 30 },
  { id: 'okinawa-local-guide', name: '在地人推薦', slug: 'okinawa-local-guide', parent_id: 'okinawa-travel', display_order: 31 },
  { id: 'home-coffee', name: '在宅咖啡', slug: 'home-coffee', parent_id: null, display_order: 40 },
  { id: 'home-coffee-basics', name: '咖啡新手的豆知識', slug: 'home-coffee-basics', parent_id: 'home-coffee', display_order: 41 },
  { id: 'craftsman-stories', name: '職人故事', slug: 'craftsman-stories', parent_id: null, display_order: 50 },
  { id: 'craftsman-stories-people', name: '那些堅持與努力的職人們', slug: 'craftsman-stories-people', parent_id: 'craftsman-stories', display_order: 51 },
];

function normalizeCategories(items: BlogCategory[]) {
  return items.length ? items : DEFAULT_BLOG_CATEGORIES;
}

function postSearchText(post: BlogPost): string {
  return [post.title, post.excerpt || '', ...(post.tags || []), post.category].join(' ').toLowerCase();
}

function applyAIFilters(posts: BlogPost[], filters: AIBlogFilters): BlogPost[] {
  return posts.filter(post => {
    if (SYSTEM_BLOG_SLUGS.has(post.slug)) return false;
    const searchText = postSearchText(post);
    if (filters.categories.length > 0 && !filters.categories.some(category => searchText.includes(category.toLowerCase()))) return false;
    if (filters.keywords.length > 0 && !filters.keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) return false;
    return true;
  });
}

async function fetchBlogPostsFromSupabase() {
  const baseQuery = supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image_url, author_name, tags, category, published_at, blog_post_category_links(category_id)')
    .eq('status', 'published')
    .neq('slug', 'system-store-locations')
    .order('published_at', { ascending: false })
    .limit(180);

  const { data, error } = await baseQuery;
  if (!error) return (data || []) as BlogPost[];

  const fallback = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image_url, author_name, tags, category, published_at')
    .eq('status', 'published')
    .neq('slug', 'system-store-locations')
    .order('published_at', { ascending: false })
    .limit(180);
  if (fallback.error) throw fallback.error;
  return (fallback.data || []) as BlogPost[];
}

async function fetchBlogCategoriesFromSupabase() {
  const { data, error } = await supabase
    .from('blog_categories')
    .select('id, name, slug, description, display_order, is_active, parent_id')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return normalizeCategories((data || []) as BlogCategory[]);
}

const BlogList: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>(DEFAULT_BLOG_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(ALL_CATEGORY_ID);
  const [aiFilters, setAiFilters] = useState<AIBlogFilters | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [dataNotice, setDataNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    let receivedFreshPosts = false;
    let receivedFreshCategories = false;
    const cachedPosts = readCachedList<BlogPost>(BLOG_POSTS_CACHE_KEY);
    const cachedCategories = readCachedList<BlogCategory>(BLOG_CATEGORIES_CACHE_KEY);
    const useSnapshotsOnly = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

    if (cachedCategories?.length) {
      setBlogCategories(normalizeCategories(cachedCategories));
    }

    if (cachedPosts?.length) {
      setPosts(cachedPosts);
      setLoading(false);
    }

    fetchSnapshotList<BlogCategory>(BLOG_CATEGORIES_SNAPSHOT_PATH)
      .then(snapshotCategories => {
        if (cancelled || receivedFreshCategories || snapshotCategories.length === 0 || cachedCategories?.length) return;
        setBlogCategories(normalizeCategories(snapshotCategories));
      })
      .catch(() => {});

    fetchSnapshotList<BlogPost>(BLOG_POSTS_SNAPSHOT_PATH)
      .then(snapshotPosts => {
        if (cancelled || receivedFreshPosts || snapshotPosts.length === 0 || cachedPosts?.length) return;
        setPosts(snapshotPosts);
        setLoading(false);
        setDataNotice('Supabase 連線暫時不穩，已改用快照文章加速顯示。');
      })
      .catch(() => {
        if (!cancelled && useSnapshotsOnly) setLoading(false);
      });

    if (useSnapshotsOnly) {
      return () => {
        cancelled = true;
      };
    }

    withRetry(() => fetchPublicList<BlogCategory>('blog-categories', fetchBlogCategoriesFromSupabase))
      .then(freshCategories => {
        if (cancelled) return;
        receivedFreshCategories = true;
        const normalized = normalizeCategories(freshCategories);
        setBlogCategories(normalized);
        writeCachedList(BLOG_CATEGORIES_CACHE_KEY, normalized);
      })
      .catch(() => {
        if (!cancelled) setBlogCategories(current => normalizeCategories(current));
      });

    withRetry(() => fetchPublicList<BlogPost>('blog-posts', fetchBlogPostsFromSupabase))
      .then(freshPosts => {
        if (cancelled) return;
        receivedFreshPosts = true;
        setPosts(freshPosts);
        writeCachedList(BLOG_POSTS_CACHE_KEY, freshPosts);
        setDataNotice('');
      })
      .catch(() => {
        if (cancelled) return;
        if (!cachedPosts?.length) setDataNotice('Supabase 連線暫時不穩，已改用快照文章加速顯示。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const orderedCategories = useMemo(() => sortCategoriesForTree(blogCategories), [blogCategories]);
  const categoryById = useMemo(() => new Map(blogCategories.map(category => [category.id, category])), [blogCategories]);
  const categoryIdsByName = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const category of blogCategories) {
      const ids = map.get(category.name) || [];
      ids.push(category.id);
      map.set(category.name, ids);
    }
    return map;
  }, [blogCategories]);

  const activeCategory = categoryId === ALL_CATEGORY_ID ? null : categoryById.get(categoryId) || null;
  const activePath = useMemo(() => {
    if (!activeCategory) return [] as BlogCategory[];
    const path = [activeCategory];
    let current = activeCategory;
    let guard = 0;

    while (current.parent_id && categoryById.has(current.parent_id) && guard < 8) {
      current = categoryById.get(current.parent_id)!;
      path.unshift(current);
      guard += 1;
    }

    return path;
  }, [activeCategory, categoryById]);
  const activeRoot = activePath[0] || null;

  const childCategories = useMemo(
    () => activeCategory ? orderedCategories.filter(category => category.parent_id === activeCategory.id) : [],
    [activeCategory, orderedCategories],
  );

  const handleCategoryChange = (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setAiFilters(null);
    setSearch('');
  };

  const clearAI = () => {
    setAiFilters(null);
    setAiError('');
    setSearch('');
    inputRef.current?.focus();
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      clearAI();
      return;
    }

    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-proxy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'blog-search', query: search }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'AI 搜尋失敗');
      setAiFilters(json.result);
      setCategoryId(ALL_CATEGORY_ID);
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : 'AI 搜尋失敗，請稍後再試');
    } finally {
      setAiLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (aiFilters) return applyAIFilters(posts, aiFilters);

    const selectedIds = categoryId === ALL_CATEGORY_ID ? null : getDescendantCategoryIds(blogCategories, categoryId);

    return posts.filter(post => {
      if (SYSTEM_BLOG_SLUGS.has(post.slug)) return false;
      if (!selectedIds) return true;

      const postCategoryIds = getBlogPostCategoryIds(post);
      for (const fallbackId of categoryIdsByName.get(post.category) || []) postCategoryIds.add(fallbackId);

      for (const id of postCategoryIds) {
        if (selectedIds.has(id)) return true;
      }

      return false;
    });
  }, [posts, categoryId, blogCategories, categoryIdsByName, aiFilters]);

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  const featured = filtered[0];
  const rest = useMemo(() => filtered.slice(1), [filtered]);
  const { visibleItems: visiblePosts, visibleCount, hasMore, sentinelRef, loadMore } = useProgressiveList(rest, { initialCount: 12, increment: 12 });

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <SEOHead
        title="咖啡旅行家 - 旅遊部落格"
        description="探索日本、沖繩與世界的咖啡旅途，分享咖啡廳、美食伴手禮、在宅咖啡與職人故事。"
        keywords="咖啡旅行家, 日本旅行, 沖繩旅行, 咖啡旅行, 在宅咖啡, 職人故事, Nestobi"
        ogType="blog"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: '咖啡旅行家',
          description: '探索日本、沖繩與世界的咖啡旅途，分享咖啡廳、美食伴手禮、在宅咖啡與職人故事。',
          publisher: { '@type': 'Organization', name: 'Nestobi 旅遊平台' },
          inLanguage: 'zh-TW',
        }}
      />
      <Navigation />

      <div className="relative overflow-hidden bg-[#2C1810] px-4 py-24 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: 'url(https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2C1810]/60 to-[#2C1810]/95" />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 flex items-center justify-center gap-2">
              <Coffee className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Coffee Traveler</span>
            </div>
            <h1 className="mb-4 font-serif text-4xl font-bold text-white md:text-5xl" style={{ letterSpacing: 0 }}>
              咖啡旅行家
            </h1>
            <div className="mx-auto mb-5 h-[2px] w-10 bg-amber-500" />
            <p className="mx-auto max-w-md text-base leading-relaxed text-amber-200/70">
              每一杯咖啡都是一段旅程的起點。探索在地咖啡文化，記錄旅途中的美好風景。
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mx-auto mt-8 max-w-lg">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Sparkles className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && handleSearch()}
                  placeholder="輸入任何描述，AI 幫您找文章"
                  className="w-full rounded-xl bg-white py-3.5 pl-11 pr-10 text-sm text-gray-800 shadow-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                {search && (
                  <button onClick={clearAI} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={aiLoading || !search.trim()}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-amber-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-amber-400 disabled:bg-amber-500/50"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                搜尋
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <AnimatePresence>
          {aiFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex flex-wrap items-center gap-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                <Sparkles className="h-4 w-4 flex-shrink-0 text-amber-600" />
                <span className="truncate text-sm font-medium text-amber-800">AI 理解：{aiFilters.summary}</span>
                {aiFilters.categories.length > 0 && (
                  <span className="flex-shrink-0 text-xs text-amber-600">分類 {aiFilters.categories.join('、')}</span>
                )}
              </div>
              <button
                onClick={clearAI}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-500 transition hover:bg-gray-50"
              >
                <X className="h-3.5 w-3.5" />
                清除結果
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {aiError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {aiError}
              <button onClick={() => setAiError('')} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {dataNotice && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {dataNotice}
          </div>
        )}

        {!aiFilters && (
          <div className="mb-8">
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoryChange(ALL_CATEGORY_ID)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  categoryId === ALL_CATEGORY_ID
                    ? 'bg-amber-800 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-amber-400 hover:text-amber-800'
                }`}
              >
                全部文章
              </button>
              {orderedCategories.filter(category => getCategoryDepth(category, blogCategories) === 0).map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                    activeRoot?.id === category.id
                      ? 'bg-amber-800 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:border-amber-400 hover:text-amber-800'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {childCategories.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <ChevronRight className="h-3 w-3" />
                      <span>次分類</span>
                    </div>
                    {childCategories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category.id)}
                        className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          categoryId === category.id
                            ? 'border-amber-700 bg-amber-700 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-amber-300 hover:text-amber-800'
                        }`}
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {category.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!aiFilters && categoryId !== ALL_CATEGORY_ID && activeCategory && (
          <div className="mb-5 flex items-center gap-1.5 text-xs text-gray-400">
            <button onClick={() => handleCategoryChange(ALL_CATEGORY_ID)} className="transition hover:text-amber-700">全部文章</button>
            {activePath.map((category, index) => (
              <React.Fragment key={category.id}>
                <ChevronRight className="h-3 w-3" />
                {index === activePath.length - 1 ? (
                  <span className="font-medium text-amber-700">{category.name}</span>
                ) : (
                  <button onClick={() => handleCategoryChange(category.id)} className="transition hover:text-amber-700">{category.name}</button>
                )}
              </React.Fragment>
            ))}
            <span className="ml-auto text-gray-300">已顯示 {Math.min(visibleCount + (featured ? 1 : 0), filtered.length)} / {filtered.length} 篇</span>
          </div>
        )}

        {aiLoading ? (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <div className="h-48 bg-gray-100" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-1/3 rounded bg-gray-100" />
                  <div className="h-4 w-full rounded bg-gray-100" />
                  <div className="h-4 w-3/4 rounded bg-gray-100" />
                  <div className="h-3 w-1/2 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-28">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-28 text-center text-gray-400">
            <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-20" />
            {aiFilters ? (
              <>
                <p className="mb-1 text-sm font-medium">找不到符合的文章</p>
                <p className="mb-4 text-xs">試著換個關鍵字，或瀏覽所有文章。</p>
                <button onClick={clearAI} className="text-xs text-amber-700 underline underline-offset-2">瀏覽所有文章</button>
              </>
            ) : (
              <>
                <p className="mb-1 text-sm font-medium">此分類暫無文章</p>
                <button onClick={() => handleCategoryChange(ALL_CATEGORY_ID)} className="mx-auto mt-2 block text-xs text-amber-700 underline underline-offset-2">
                  瀏覽所有文章
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {aiFilters && (
              <p className="mb-6 text-xs text-gray-400">找到 <span className="font-semibold text-gray-600">{filtered.length}</span> 篇文章</p>
            )}

            {featured && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                <Link to={`/blog/${featured.slug}`} className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant transition-all duration-300 hover:shadow-card-hover">
                  <div className="md:grid md:grid-cols-2">
                    <div className="h-64 overflow-hidden md:h-auto">
                      <img
                        src={featured.cover_image_url || BLOG_FALLBACK_IMAGE}
                        alt={featured.title}
                        loading="eager"
                        decoding="async"
                        onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col justify-center p-8 md:p-10">
                      <div className="mb-5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{featured.category}</span>
                        <span className="text-xs tracking-wide text-gray-400">{aiFilters ? '最相關文章' : '精選文章'}</span>
                      </div>
                      <h2 className="mb-3 font-serif text-2xl font-bold text-charcoal transition-colors group-hover:text-amber-800 md:text-3xl" style={{ letterSpacing: 0 }}>
                        {featured.title}
                      </h2>
                      <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-gray-500">{featured.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(featured.published_at)}
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold text-amber-800 transition-all group-hover:gap-2.5">
                          閱讀全文 <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
              {visiblePosts.map((post, index) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 11) * 0.025 }}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="group mb-6 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant card-lift"
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '340px' }}
                  >
                    <div className="h-48 overflow-hidden">
                      <img
                        src={post.cover_image_url || BLOG_FALLBACK_IMAGE}
                        alt={post.title}
                        loading={index < 6 ? 'eager' : 'lazy'}
                        decoding="async"
                        onError={event => useFallbackImage(event, BLOG_FALLBACK_IMAGE)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{post.category}</span>
                      </div>
                      <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-charcoal transition-colors group-hover:text-amber-800" style={{ letterSpacing: 0 }}>
                        {post.title}
                      </h3>
                      <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-gray-500">{post.excerpt}</p>
                      {post.tags?.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {post.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-xs text-gray-400">
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                        <span>{post.author_name}</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(post.published_at)}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                <button onClick={loadMore} className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-5 py-2 text-sm font-bold text-amber-800 shadow-sm transition hover:bg-amber-50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  載入更多文章
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BlogList;
