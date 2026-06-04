import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import ThemeHeroCarousel from '../../components/ThemeHeroCarousel';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { useProgressiveList } from '../../hooks/useProgressiveList';
import {
  getTranslationRuntimeState,
  translateBlogCategoriesFromCacheOnly,
  translateBlogCategoriesOnDemand,
  translateBlogPostsFromCacheOnly,
  translateBlogPostsOnDemand,
} from '../../lib/contentTranslations';
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
  { id: 'coffee-travel-japan-cafes', name: '日本咖啡館', slug: 'coffee-travel-japan-cafes', parent_id: 'coffee-travel', display_order: 11 },
  { id: 'japan-travel', name: '日本旅行', slug: 'japan-travel', parent_id: null, display_order: 20 },
  { id: 'japan-travel-food-souvenirs-menu', name: '美食與伴手禮', slug: 'japan-travel-food-souvenirs-menu', parent_id: 'japan-travel', display_order: 21 },
  { id: 'okinawa-travel', name: '沖繩旅行', slug: 'okinawa-travel', parent_id: null, display_order: 30 },
  { id: 'okinawa-local-guide', name: '沖繩在地指南', slug: 'okinawa-local-guide', parent_id: 'okinawa-travel', display_order: 31 },
  { id: 'home-coffee', name: '居家咖啡', slug: 'home-coffee', parent_id: null, display_order: 40 },
  { id: 'home-coffee-basics', name: '咖啡入門', slug: 'home-coffee-basics', parent_id: 'home-coffee', display_order: 41 },
  { id: 'craftsman-stories', name: '職人故事', slug: 'craftsman-stories', parent_id: null, display_order: 50 },
  { id: 'craftsman-stories-people', name: '咖啡職人與店家', slug: 'craftsman-stories-people', parent_id: 'craftsman-stories', display_order: 51 },
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
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const dateLocale = pickByLang(normalizedLang, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [displayPosts, setDisplayPosts] = useState<BlogPost[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>(DEFAULT_BLOG_CATEGORIES);
  const [displayBlogCategories, setDisplayBlogCategories] = useState<BlogCategory[]>(DEFAULT_BLOG_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(ALL_CATEGORY_ID);
  const [aiFilters, setAiFilters] = useState<AIBlogFilters | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [dataNotice, setDataNotice] = useState('');
  const [translationNotice, setTranslationNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const labels = {
    pageTitle: t4('咖啡旅行家 - 文章', 'Coffee Traveler - Articles', 'Coffee Traveler - 記事', 'Coffee Traveler - 글'),
    pageDesc: t4('以咖啡為入口，探索日本、沖繩與旅途中的店家、風味和職人故事。', 'Explore shops, flavors, and craft stories across Japan, Okinawa, and the road through coffee.', 'コーヒーを入口に、日本、沖縄、旅先の店、味、職人の物語を探索します。', '커피를入口로 일본, 오키나와, 여행지의 매장, 맛, 장인 이야기를 탐험합니다.'),
    seoKeywords: t4('咖啡旅行家, 日本旅行, 沖繩咖啡, 咖啡文章, 旅行文章', 'coffee traveler, japan travel, okinawa coffee, coffee journal, travel articles', 'コーヒートラベラー, 日本旅行, 沖縄コーヒー, コーヒー記事, 旅行記事', '커피 여행가, 일본 여행, 오키나와 커피, 커피 글, 여행 글'),
    heroKicker: t4('文章主題首頁', 'Article Theme Home', '記事テーマホーム', '글 테마 홈'),
    heroTitle: t4('咖啡旅行家', 'Coffee Traveler', 'Coffee Traveler', 'Coffee Traveler'),
    heroDesc: t4('咖啡是一條旅行路線。從城市角落、地方店家到沖繩與日本街區，把每一杯背後的風景寫下來。', 'Coffee is a travel route. From city corners and local shops to Okinawa and Japan neighborhoods, collect the views behind every cup.', 'コーヒーは旅のルートです。街角やローカル店、沖縄と日本の街から、一杯の後ろにある景色を綴ります。', '커피는 여행 경로입니다. 도시의 골목, 로컬 매장, 오키나와와 일본 동네에서 한 잔 뒤의 풍경을 기록합니다.'),
    searchPlaceholder: t4('輸入想看的主題，AI 幫你找文章', 'Type any topic, AI will find articles', '見たいテーマを入力すると AI が記事を探します', '보고 싶은 주제를 입력하면 AI가 글을 찾아줍니다'),
    search: t4('搜尋', 'Search', '検索', '검색'),
    clear: t4('清除', 'Clear', 'クリア', '지우기'),
    all: t4('全部文章', 'All Articles', 'すべての記事', '전체 글'),
    subCategories: t4('子分類', 'Subcategories', 'サブカテゴリ', '하위 카테고리'),
    showingCount: t4('顯示', 'Showing', '表示', '표시'),
    found: t4('篇文章', 'articles found', '件の記事', '개 글'),
    featured: t4('精選文章', 'Featured Article', '注目記事', '추천 글'),
    mostRelevant: t4('最相關', 'Most Relevant', '最も関連', '가장 관련 있음'),
    readMore: t4('閱讀更多', 'Read More', '続きを読む', '더 읽기'),
    loadMore: t4('載入更多文章', 'Load More Articles', 'さらに記事を表示', '글 더 보기'),
    noResult: t4('找不到符合條件的文章', 'No matching articles found', '条件に合う記事が見つかりません', '조건에 맞는 글을 찾을 수 없습니다'),
    noResultHint: t4('試試其他關鍵字，或瀏覽全部文章。', 'Try another keyword or browse all articles.', '別のキーワードを試すか、すべての記事を見てください。', '다른 키워드를 시도하거나 전체 글을 둘러보세요.'),
    browseAll: t4('查看全部文章', 'Browse all articles', 'すべての記事を見る', '전체 글 보기'),
    noCategoryData: t4('這個分類目前沒有文章', 'No articles in this category', 'このカテゴリにはまだ記事がありません', '이 카테고리에는 아직 글이 없습니다'),
    aiSummary: t4('AI 摘要', 'AI Summary', 'AI要約', 'AI 요약'),
    aiCategories: t4('分類', 'Categories', 'カテゴリ', '카테고리'),
    dataNotice: t4('Supabase 暫時不穩，先顯示快照文章。', 'Supabase is temporarily unstable. Snapshot articles are displayed first.', 'Supabase が一時的に不安定なため、スナップショット記事を先に表示します。', 'Supabase가 일시적으로 불안정하여 스냅샷 글을 먼저 표시합니다.'),
    transCacheNotReady: t4('目前先顯示原文文章，翻譯快取尚未就緒。', 'Showing source articles first. Translation cache is not ready yet.', '翻訳キャッシュ未準備のため、原文記事を先に表示します。', '번역 캐시 준비 전이라 원문 글을 먼저 표시합니다.'),
    transSyncing: t4('正在背景同步文章翻譯...', 'Syncing article translations in background...', '記事翻訳をバックグラウンドで同期しています...', '글 번역을 백그라운드에서 동기화하는 중...'),
    transFallback: t4('目前顯示原文或快取文章。', 'Showing source/cached articles.', '原文またはキャッシュ記事を表示しています。', '원문 또는 캐시 글을 표시합니다.'),
    aiSearchFailed: t4('AI 搜尋失敗', 'AI search failed', 'AI検索に失敗しました', 'AI 검색 실패'),
    aiSearchRetry: t4('AI 搜尋暫時無法使用，請稍後再試。', 'AI search failed, please try again later.', 'AI検索は一時的に利用できません。後でもう一度お試しください。', 'AI 검색을 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.'),
  };

  useEffect(() => {
    let cancelled = false;
    let receivedFreshPosts = false;
    let receivedFreshCategories = false;
    const cachedPosts = readCachedList<BlogPost>(BLOG_POSTS_CACHE_KEY);
    const cachedCategories = readCachedList<BlogCategory>(BLOG_CATEGORIES_CACHE_KEY);
    const useSnapshotsOnly = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

    if (cachedCategories?.length) setBlogCategories(normalizeCategories(cachedCategories));
    if (cachedPosts?.length) {
      setPosts(cachedPosts);
      setDisplayPosts(cachedPosts);
      setLoading(false);
    }

    fetchSnapshotList<BlogCategory>(BLOG_CATEGORIES_SNAPSHOT_PATH).then(snapshotCategories => {
      if (cancelled || receivedFreshCategories || snapshotCategories.length === 0 || cachedCategories?.length) return;
      setBlogCategories(normalizeCategories(snapshotCategories));
    }).catch(() => {});

    fetchSnapshotList<BlogPost>(BLOG_POSTS_SNAPSHOT_PATH).then(snapshotPosts => {
      if (cancelled || receivedFreshPosts || snapshotPosts.length === 0 || cachedPosts?.length) return;
      setPosts(snapshotPosts);
      setDisplayPosts(snapshotPosts);
      setLoading(false);
      setDataNotice(labels.dataNotice);
    }).catch(() => {
      if (!cancelled && useSnapshotsOnly) setLoading(false);
    });

    if (useSnapshotsOnly) return () => { cancelled = true; };

    withRetry(() => fetchPublicList<BlogCategory>('blog-categories', fetchBlogCategoriesFromSupabase)).then(freshCategories => {
      if (cancelled) return;
      receivedFreshCategories = true;
      const normalized = normalizeCategories(freshCategories);
      setBlogCategories(normalized);
      writeCachedList(BLOG_CATEGORIES_CACHE_KEY, normalized);
    }).catch(() => {
      if (!cancelled) setBlogCategories(current => normalizeCategories(current));
    });

    withRetry(() => fetchPublicList<BlogPost>('blog-posts', fetchBlogPostsFromSupabase)).then(freshPosts => {
      if (cancelled) return;
      receivedFreshPosts = true;
      setPosts(freshPosts);
      setDisplayPosts(freshPosts);
      writeCachedList(BLOG_POSTS_CACHE_KEY, freshPosts);
      setDataNotice('');
    }).catch(() => {
      if (cancelled) return;
      if (!cachedPosts?.length) setDataNotice(labels.dataNotice);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [labels.dataNotice]);

  useEffect(() => {
    let cancelled = false;
    if (!blogCategories.length) {
      setDisplayBlogCategories(blogCategories);
      return () => { cancelled = true; };
    }
    setDisplayBlogCategories(blogCategories);
    translateBlogCategoriesFromCacheOnly(blogCategories, normalizedLang).then(translated => {
      if (!cancelled) setDisplayBlogCategories(translated as BlogCategory[]);
    }).catch(() => {});
    const runCategorySync = async () => {
      const batchSize = 3;
      for (let i = 0; i < blogCategories.length; i += batchSize) {
        if (cancelled) return;
        const batch = blogCategories.slice(i, i + batchSize);
        try {
          const translated = await translateBlogCategoriesOnDemand(batch, normalizedLang);
          if (cancelled) return;
          const byId = new Map((translated as BlogCategory[]).map(item => [item.id, item]));
          setDisplayBlogCategories(current => current.map(item => byId.get(item.id) || item));
        } catch {
          // keep best-effort behavior
        }
      }
    };
    void runCategorySync();
    return () => { cancelled = true; };
  }, [blogCategories, normalizedLang]);

  useEffect(() => {
    let cancelled = false;
    if (!posts.length) {
      setDisplayPosts(posts);
      setTranslationNotice('');
      return () => { cancelled = true; };
    }
    setDisplayPosts(posts);
    const runtime = getTranslationRuntimeState();
    setTranslationNotice(runtime.tableUnavailable || runtime.isLocalProxyMode ? labels.transCacheNotReady : labels.transSyncing);

    translateBlogPostsFromCacheOnly(posts, normalizedLang).then(translated => {
      if (!cancelled) setDisplayPosts(translated as BlogPost[]);
    }).catch(() => {});

    const runPostSync = async () => {
      const batchSize = 3;
      let hadError = false;
      for (let i = 0; i < posts.length; i += batchSize) {
        if (cancelled) return;
        const batch = posts.slice(i, i + batchSize);
        try {
          const translated = await translateBlogPostsOnDemand(batch, normalizedLang);
          if (cancelled) return;
          const byId = new Map((translated as BlogPost[]).map(item => [item.id, item]));
          setDisplayPosts(current => current.map(item => byId.get(item.id) || item));
        } catch {
          hadError = true;
        }
      }
      if (!cancelled) {
        setTranslationNotice(hadError ? labels.transFallback : '');
      }
    };
    void runPostSync();

    return () => { cancelled = true; };
  }, [posts, normalizedLang, labels.transCacheNotReady, labels.transFallback, labels.transSyncing]);

  const orderedCategories = useMemo(() => sortCategoriesForTree(displayBlogCategories), [displayBlogCategories]);
  const categoryById = useMemo(() => new Map(displayBlogCategories.map(category => [category.id, category])), [displayBlogCategories]);
  const categoryIdsByName = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const category of displayBlogCategories) {
      const ids = map.get(category.name) || [];
      ids.push(category.id);
      map.set(category.name, ids);
    }
    return map;
  }, [displayBlogCategories]);

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
  const childCategories = useMemo(() => activeCategory ? orderedCategories.filter(category => category.parent_id === activeCategory.id) : [], [activeCategory, orderedCategories]);

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
    if (!search.trim()) return clearAI();
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
      if (!res.ok) throw new Error(json.error || labels.aiSearchFailed);
      setAiFilters(json.result);
      setCategoryId(ALL_CATEGORY_ID);
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : labels.aiSearchRetry);
    } finally {
      setAiLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (aiFilters) return applyAIFilters(displayPosts, aiFilters);
    const selectedIds = categoryId === ALL_CATEGORY_ID ? null : getDescendantCategoryIds(displayBlogCategories, categoryId);
    return displayPosts.filter(post => {
      if (SYSTEM_BLOG_SLUGS.has(post.slug)) return false;
      if (!selectedIds) return true;
      const postCategoryIds = getBlogPostCategoryIds(post);
      for (const fallbackId of categoryIdsByName.get(post.category) || []) postCategoryIds.add(fallbackId);
      for (const id of postCategoryIds) if (selectedIds.has(id)) return true;
      return false;
    });
  }, [aiFilters, displayBlogCategories, categoryId, categoryIdsByName, displayPosts]);

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const featured = filtered[0];
  const rest = useMemo(() => filtered.slice(1), [filtered]);
  const { visibleItems: visiblePosts, visibleCount, hasMore, sentinelRef, loadMore } = useProgressiveList(rest, {
    initialCount: 12,
    increment: 12,
  });

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      <SEOHead
        title={labels.pageTitle}
        description={labels.pageDesc}
        keywords={labels.seoKeywords}
        ogType="blog"
      />
      <Navigation />

      <ThemeHeroCarousel
        themeKey="coffee_traveler"
        kicker={labels.heroKicker}
        title={labels.heroTitle}
        description={labels.heroDesc}
        accentClassName="text-amber-700"
      >
        <div className="rounded-3xl border border-white/12 bg-white/90 p-4 shadow-2xl backdrop-blur">
            <div className="relative flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Sparkles className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && handleSearch()}
                  placeholder={labels.searchPlaceholder}
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
                {labels.search}
              </button>
            </div>
          <p className="mt-3 text-sm font-semibold text-[#2C1F10]/70">{filtered.length} {labels.found}</p>
        </div>
      </ThemeHeroCarousel>
      <div className="mx-auto max-w-6xl px-4 py-10">
        {aiFilters && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <Sparkles className="h-4 w-4 flex-shrink-0 text-amber-600" />
              <span className="truncate text-sm font-medium text-amber-800">{labels.aiSummary}: {aiFilters.summary}</span>
              {aiFilters.categories.length > 0 && (
                <span className="flex-shrink-0 text-xs text-amber-600">{labels.aiCategories}: {aiFilters.categories.join(', ')}</span>
              )}
            </div>
            <button onClick={clearAI} className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-500 transition hover:bg-gray-50">
              <X className="h-3.5 w-3.5" />
              {labels.clear}
            </button>
          </div>
        )}

        {aiError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {aiError}
          </div>
        )}
        {dataNotice && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{dataNotice}</div>}
        {translationNotice && <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{translationNotice}</div>}

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
                {labels.all}
              </button>
              {orderedCategories
                .filter(category => getCategoryDepth(category, displayBlogCategories) === 0)
                .map(category => (
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

            {childCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <ChevronRight className="h-3 w-3" />
                  <span>{labels.subCategories}</span>
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
            )}
          </div>
        )}

        {!aiFilters && categoryId !== ALL_CATEGORY_ID && activeCategory && (
          <div className="mb-5 flex items-center gap-1.5 text-xs text-gray-400">
            <button onClick={() => handleCategoryChange(ALL_CATEGORY_ID)} className="transition hover:text-amber-700">
              {labels.all}
            </button>
            {activePath.map((category, index) => (
              <React.Fragment key={category.id}>
                <ChevronRight className="h-3 w-3" />
                {index === activePath.length - 1 ? (
                  <span className="font-medium text-amber-700">{category.name}</span>
                ) : (
                  <button onClick={() => handleCategoryChange(category.id)} className="transition hover:text-amber-700">
                    {category.name}
                  </button>
                )}
              </React.Fragment>
            ))}
            <span className="ml-auto text-gray-300">
              {labels.showingCount} {Math.min(visibleCount + (featured ? 1 : 0), filtered.length)} / {filtered.length}
            </span>
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
            <p className="mb-1 text-sm font-medium">{aiFilters ? labels.noResult : labels.noCategoryData}</p>
            <p className="mb-4 text-xs">{labels.noResultHint}</p>
            <button onClick={() => handleCategoryChange(ALL_CATEGORY_ID)} className="text-xs text-amber-700 underline underline-offset-2">
              {labels.browseAll}
            </button>
          </div>
        ) : (
          <>
            {aiFilters && (
              <p className="mb-6 text-xs text-gray-400">
                <span className="font-semibold text-gray-600">{filtered.length}</span> {labels.found}
              </p>
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
                        <span className="text-xs tracking-wide text-gray-400">{aiFilters ? labels.mostRelevant : labels.featured}</span>
                      </div>
                      <h2 className="mb-3 font-serif text-2xl font-bold text-charcoal transition-colors group-hover:text-amber-800 md:text-3xl">{featured.title}</h2>
                      <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-gray-500">{featured.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(featured.published_at)}
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold text-amber-800 transition-all group-hover:gap-2.5">
                          {labels.readMore} <ArrowRight className="h-3.5 w-3.5" />
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
                      <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-charcoal transition-colors group-hover:text-amber-800">{post.title}</h3>
                      <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-gray-500">{post.excerpt}</p>
                      {post.tags?.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {post.tags.slice(0, 3).map(tag => (
                            <span key={`${post.id}-${tag}`} className="flex items-center gap-1 text-xs text-gray-400">
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
                  {labels.loadMore}
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
