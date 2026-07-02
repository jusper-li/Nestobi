import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { motion } from 'framer-motion';
import { Coins, Heart, Headphones, MessageSquare, Plus, RefreshCw, Search, Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { refundOrder } from '../../lib/orderRefund';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';

type Mode = 'vendor' | 'admin' | 'superadmin';
type Tab = 'afterSales' | 'reviews' | 'favorites' | 'points';
type ReviewKind = 'product' | 'room';

interface EngagementManagementProps {
  mode: Mode;
}

interface AfterSalesItem {
  id: string;
  user_id: string;
  order_id: string;
  request_type: string;
  status: string;
  message: string;
  created_at: string;
  orders?: {
    id: string;
    purchase_records?: {
      products?: TargetInfo | null;
    }[];
  } | null;
}

interface ReviewItem {
  id: string;
  kind: ReviewKind;
  user_id: string;
  target_id: string;
  target_name: string;
  vendor_name: string;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
}

interface FavoriteItem {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string;
  target_name: string;
  vendor_name: string;
  created_at: string;
}

interface PointItem {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  source_type: string | null;
  description: string | null;
  created_at: string;
  expires_at: string | null;
  vendors?: { name?: string | null } | null;
}

interface PointMember {
  user_id: string;
  role: string;
}

interface TargetInfo {
  id: string;
  name?: string | null;
  title?: string | null;
  vendor_id?: string | null;
  vendors?: { name?: string | null } | null;
}

const AFTER_SALES_STATUSES = ['pending', 'processing', 'resolved', 'rejected', 'cancelled'];
const REVIEW_STATUSES = ['published', 'hidden'];

export default function EngagementManagement({ mode }: EngagementManagementProps) {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const t = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');

  const labels = {
    title: mode === 'vendor'
      ? t('廠商連動管理', 'Engagement Management', '連動管理', '연동 관리')
      : t('連動管理', 'Linked Management', '連動管理', '연동 관리'),
    subtitle: mode === 'vendor'
      ? t('管理與你商品、房間相關的售後、評價、收藏與點數紀錄。', 'Manage after-sales, reviews, favorites, and point records linked to your listings.', '商品・部屋に紐づくアフターサービス、レビュー、お気に入り、ポイント履歴を管理します。', '내 상품과 객실에 연결된 사후 서비스, 리뷰, 즐겨찾기, 포인트 기록을 관리합니다.')
      : t('統一管理商品、文章、房間、廠商與會員互動資料。', 'Manage interaction data across products, articles, rooms, vendors, and members.', '商品、記事、部屋、事業者、会員の連動データを管理します。', '상품, 글, 객실, 업체, 회원 상호작용 데이터를 통합 관리합니다.'),
    afterSales: t('售後服務', 'After-sales', 'アフターサービス', '사후 서비스'),
    reviews: t('評價', 'Reviews', 'レビュー', '리뷰'),
    favorites: t('收藏', 'Favorites', 'お気に入り', '즐겨찾기'),
    points: t('點數管理', 'Points', 'ポイント管理', '포인트 관리'),
    search: t('搜尋 ID、項目、會員或廠商', 'Search ID, item, member, or vendor', 'ID、項目、会員、事業者を検索', 'ID, 항목, 회원, 업체 검색'),
    noData: t('目前沒有資料', 'No data yet', 'データはまだありません', '아직 데이터가 없습니다'),
    request: t('申請', 'Request', '申請', '신청'),
    target: t('連動項目', 'Linked Item', '連動項目', '연동 항목'),
    vendor: t('廠商', 'Vendor', '事業者', '업체'),
    status: t('狀態', 'Status', '状態', '상태'),
    createdAt: t('建立時間', 'Created', '作成日時', '생성 시간'),
    member: t('會員', 'Member', '会員', '회원'),
    comment: t('備註', 'Comment', '備考', '비고'),
    rating: t('評分', 'Rating', '評価', '평점'),
    type: t('類型', 'Type', '種類', '유형'),
    refresh: t('重新整理', 'Refresh', '更新', '새로고침'),
    product: t('商品', 'Product', '商品', '상품'),
    room: t('房間', 'Room', '部屋', '객실'),
    blogPost: t('文章', 'Article', '記事', '글'),
    hotel: t('旅宿', 'Hotel', '宿泊施設', '숙소'),
    return: t('退貨', 'Return', '返品', '반품'),
    refund: t('退款', 'Refund', '返金', '환불'),
    published: t('已公開', 'Published', '公開中', '공개됨'),
    hidden: t('已隱藏', 'Hidden', '非表示', '숨김'),
    pending: t('待處理', 'Pending', '保留中', '대기 중'),
    processing: t('處理中', 'Processing', '処理中', '처리 중'),
    resolved: t('已完成', 'Resolved', '完了', '완료'),
    rejected: t('已拒絕', 'Rejected', '却下', '거절됨'),
    cancelled: t('已取消', 'Cancelled', 'キャンセル済み', '취소됨'),
    saved: t('已更新', 'Updated', '更新しました', '업데이트됨'),
    failed: t('更新失敗', 'Update failed', '更新に失敗しました', '업데이트 실패'),
    refundFailed: t('退款失敗', 'Refund failed', '返金に失敗しました', '환불 실패'),
    unknown: t('未命名項目', 'Unnamed item', '未命名項目', '이름 없는 항목'),
    amount: t('點數', 'Points', 'ポイント', '포인트'),
    source: t('來源', 'Source', 'ソース', '출처'),
    expiresAt: t('到期時間', 'Expires', '有効期限', '만료 시간'),
    addPoints: t('新增點數調整', 'Add point adjustment', 'ポイント調整を追加', '포인트 조정 추가'),
    memberId: t('會員 User ID', 'Member User ID', '会員 User ID', '회원 User ID'),
    adjustmentType: t('調整類型', 'Adjustment type', '調整タイプ', '조정 유형'),
    earned: t('增加點數', 'Add points', 'ポイントを追加', '포인트 추가'),
    spent: t('扣除點數', 'Deduct points', 'ポイントを差し引く', '포인트 차감'),
    reason: t('原因備註', 'Reason', '理由', '사유'),
    reasonPlaceholder: t('例如：客服補償、活動贈點、人工扣回', 'Example: support credit, campaign bonus, manual correction', '例：補償、キャンペーン付与、手動修正', '예: 고객 보상, 이벤트 적립, 수동 정정'),
    expiresOn: t('到期日', 'Expires on', '有効期限', '만료일'),
    saveAdjustment: t('儲存調整', 'Save adjustment', '調整を保存', '조정 저장'),
    selectMember: t('選擇會員', 'Select member', '会員を選択', '회원 선택'),
    manual: t('人工調整', 'Manual', '手動調整', '수동 조정'),
    booking: t('訂房', 'Booking', '予約', '예약'),
    order: t('訂單', 'Order', '注文', '주문'),
    redemption: t('點數折抵', 'Redemption', 'ポイント利用', '포인트 사용'),
    invalidAdjustment: t('請選擇會員並輸入大於 0 的點數', 'Select a member and enter points greater than 0', '会員を選択し、0より大きいポイントを入力してください', '회원을 선택하고 0보다 큰 포인트를 입력하세요'),
  };

  const [tab, setTab] = useState<Tab>(mode === 'vendor' ? 'afterSales' : 'afterSales');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [afterSales, setAfterSales] = useState<AfterSalesItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [points, setPoints] = useState<PointItem[]>([]);
  const [pointMembers, setPointMembers] = useState<PointMember[]>([]);
  const [pointSaving, setPointSaving] = useState(false);
  const [pointForm, setPointForm] = useState({
    userId: '',
    amount: '',
    direction: 'earned' as 'earned' | 'spent',
    description: '',
    expiresAt: '',
  });

  const statusLabel = (status: string) => ({
    pending: labels.pending,
    processing: labels.processing,
    resolved: labels.resolved,
    rejected: labels.rejected,
    cancelled: labels.cancelled,
    published: labels.published,
    hidden: labels.hidden,
  }[status] || status);

  const typeLabel = (type: string) => ({
    product: labels.product,
    room: labels.room,
    blog_post: labels.blogPost,
    hotel: labels.hotel,
    return: labels.return,
    refund: labels.refund,
    manual: labels.manual,
    booking: labels.booking,
    order: labels.order,
    redemption: labels.redemption,
  }[type] || type);

  const loadData = async () => {
    setLoading(true);
    const [afterSalesRes, productReviewsRes, roomReviewsRes, favoritesRes, pointsRes, membersRes] = await Promise.all([
      supabase
        .from('after_sales_requests')
        .select('id,user_id,order_id,request_type,status,message,created_at,orders(id,purchase_records(products(id,name,vendor_id,vendors(name))))')
        .order('created_at', { ascending: false }),
      supabase
        .from('product_reviews')
        .select('id,user_id,product_id,rating,comment,status,created_at,products(id,name,vendor_id,vendors(name))')
        .order('created_at', { ascending: false }),
      supabase
        .from('room_reviews')
        .select('id,user_id,room_id,rating,comment,status,created_at,tbl_rooms(id,name,vendor_id,vendors(name))')
        .order('created_at', { ascending: false }),
      supabase
        .from('member_favorites')
        .select('id,user_id,target_type,target_id,created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('points')
        .select('id,user_id,amount,transaction_type,source_type,description,created_at,expires_at,vendors(name)')
        .order('created_at', { ascending: false }),
      mode === 'superadmin'
        ? supabase.from('tbl_user_auth').select('user_id,role').order('created_at', { ascending: false }).limit(300)
        : Promise.resolve({ data: [] }),
    ]);

    setAfterSales(((afterSalesRes.data || []) as unknown as any[]).map(item => {
      const order = Array.isArray(item.orders) ? item.orders[0] : item.orders;
      return {
        ...item,
        orders: order ? {
          ...order,
          purchase_records: (order.purchase_records || []).map((record: any) => ({
            ...record,
            products: Array.isArray(record.products) ? record.products[0] : record.products,
          })),
        } : null,
      } as AfterSalesItem;
    }));

    const productReviews = ((productReviewsRes.data || []) as any[]).map(row => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      return toReview(row, 'product', product);
    });
    const roomReviews = ((roomReviewsRes.data || []) as any[]).map(row => {
      const room = Array.isArray(row.tbl_rooms) ? row.tbl_rooms[0] : row.tbl_rooms;
      return toReview(row, 'room', room);
    });
    setReviews([...productReviews, ...roomReviews].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)));

    setFavorites(await hydrateFavorites((favoritesRes.data || []) as FavoriteItem[]));
    setPoints(((pointsRes.data || []) as unknown as any[]).map(row => ({
      ...row,
      vendors: Array.isArray(row.vendors) ? row.vendors[0] : row.vendors,
    })) as PointItem[]);
    setPointMembers((membersRes.data || []) as PointMember[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [mode]);

  const toReview = (row: any, kind: ReviewKind, target: TargetInfo | null): ReviewItem => ({
    id: row.id,
    kind,
    user_id: row.user_id,
    target_id: kind === 'product' ? row.product_id : row.room_id,
    target_name: target?.name || labels.unknown,
    vendor_name: target?.vendors?.name || '',
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    created_at: row.created_at,
  });

  const hydrateFavorites = async (rows: FavoriteItem[]) => {
    const grouped = rows.reduce<Record<string, string[]>>((acc, row) => {
      acc[row.target_type] = acc[row.target_type] || [];
      acc[row.target_type].push(row.target_id);
      return acc;
    }, {});
    const [products, rooms, posts, hotels] = await Promise.all([
      grouped.product?.length ? supabase.from('products').select('id,name,vendor_id,vendors(name)').in('id', grouped.product) : Promise.resolve({ data: [] }),
      grouped.room?.length ? supabase.from('tbl_rooms').select('id,name,vendor_id,vendors(name)').in('id', grouped.room) : Promise.resolve({ data: [] }),
      grouped.blog_post?.length ? supabase.from('blog_posts').select('id,title').in('id', grouped.blog_post) : Promise.resolve({ data: [] }),
      grouped.hotel?.length ? supabase.from('hotels').select('id,name,vendor_id,vendors(name)').in('id', grouped.hotel) : Promise.resolve({ data: [] }),
    ]);
    const map = new Map<string, TargetInfo>();
    [...(products.data || []), ...(rooms.data || []), ...(posts.data || []), ...(hotels.data || [])].forEach((item: any) => map.set(item.id, item));
    return rows.map(row => {
      const target = map.get(row.target_id);
      return {
        ...row,
        target_name: target?.name || target?.title || labels.unknown,
        vendor_name: target?.vendors?.name || '',
      };
    });
  };

  const updateAfterSalesStatus = async (item: AfterSalesItem, status: string) => {
    setBusy(item.id);
    try {
      if (status === 'resolved' && item.request_type === 'refund') {
        await refundOrder(item.order_id);
      }

      const { error } = await supabase.from('after_sales_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', item.id);
      if (error) throw error;

      setMessage(labels.saved);
      setAfterSales(prev => prev.map(row => row.id === item.id ? { ...row, status } : row));
    } catch (error) {
      setMessage(status === 'resolved' && item.request_type === 'refund' ? labels.refundFailed : labels.failed);
      console.error('[EngagementManagement] updateAfterSalesStatus failed:', error);
    } finally {
      setBusy(null);
    }
  };

  const updateReviewStatus = async (item: ReviewItem, status: string) => {
    setBusy(item.id);
    const table = item.kind === 'product' ? 'product_reviews' : 'room_reviews';
    const { error } = await supabase.from(table).update({ status, updated_at: new Date().toISOString() }).eq('id', item.id);
    setBusy(null);
    if (error) {
      setMessage(labels.failed);
      return;
    }
    setMessage(labels.saved);
    setReviews(prev => prev.map(review => review.id === item.id ? { ...review, status } : review));
  };

  const createPointAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode !== 'superadmin') return;

    const amount = Math.trunc(Math.abs(Number(pointForm.amount)));
    if (!pointForm.userId || amount <= 0) {
      setMessage(labels.invalidAdjustment);
      return;
    }

    setPointSaving(true);
    const signedAmount = pointForm.direction === 'spent' ? -amount : amount;
    const { error } = await supabase.from('points').insert({
      user_id: pointForm.userId,
      amount: signedAmount,
      transaction_type: pointForm.direction,
      source_type: 'manual',
      description: pointForm.description.trim() || labels.manual,
      expires_at: pointForm.expiresAt ? new Date(`${pointForm.expiresAt}T23:59:59`).toISOString() : null,
    });

    setPointSaving(false);
    if (error) {
      setMessage(labels.failed);
      return;
    }

    setMessage(labels.saved);
    setPointForm({ userId: pointForm.userId, amount: '', direction: 'earned', description: '', expiresAt: '' });
    await loadData();
  };

  const visibleAfterSales = useMemo(() => filterRows(afterSales, search, item => [
    item.id,
    item.order_id,
    item.user_id,
    item.request_type,
    item.status,
    ...(item.orders?.purchase_records || []).map(record => record.products?.name || ''),
    ...(item.orders?.purchase_records || []).map(record => record.products?.vendors?.name || ''),
  ]), [afterSales, search]);

  const visibleReviews = useMemo(() => filterRows(reviews, search, item => [
    item.id,
    item.user_id,
    item.target_name,
    item.vendor_name,
    item.status,
    item.kind,
    item.comment || '',
  ]), [reviews, search]);

  const visibleFavorites = useMemo(() => filterRows(favorites, search, item => [
    item.id,
    item.user_id,
    item.target_type,
    item.target_name,
    item.vendor_name,
  ]), [favorites, search]);

  const visiblePoints = useMemo(() => filterRows(points, search, item => [
    item.id,
    item.user_id,
    item.source_type || '',
    item.transaction_type,
    item.description || '',
    item.vendors?.name || '',
  ]), [points, search]);

  const stats = [
    { label: labels.afterSales, value: afterSales.length, icon: <Headphones className="h-5 w-5" /> },
    { label: labels.reviews, value: reviews.length, icon: <MessageSquare className="h-5 w-5" /> },
    { label: labels.favorites, value: favorites.length, icon: <Heart className="h-5 w-5" /> },
    { label: labels.points, value: points.length, icon: <Coins className="h-5 w-5" /> },
  ];

  const tabOptions = mode === 'vendor'
    ? [
        ['afterSales', labels.afterSales, Headphones, afterSales.length] as const,
        ['reviews', labels.reviews, MessageSquare, reviews.length] as const,
        ['favorites', labels.favorites, Heart, favorites.length] as const,
      ]
    : [
        ['afterSales', labels.afterSales, Headphones, afterSales.length] as const,
        ['reviews', labels.reviews, MessageSquare, reviews.length] as const,
        ['favorites', labels.favorites, Heart, favorites.length] as const,
        ['points', labels.points, Coins, points.length] as const,
      ];

  const activeCount = tab === 'afterSales'
    ? visibleAfterSales.length
    : tab === 'reviews'
      ? visibleReviews.length
      : tab === 'favorites'
        ? visibleFavorites.length
        : visiblePoints.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{labels.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {(mode === 'vendor' ? stats.slice(0, 3) : stats).map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">{stat.icon}</div>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabOptions.map(([key, label, Icon, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  tab === key
                    ? 'border-amber-200 bg-amber-50 text-amber-900 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-amber-200 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${tab === key ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder={labels.search} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <button type="button" onClick={() => void loadData()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" />
              {labels.refresh}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">顯示 {activeCount} 筆</span>
          {search.trim() ? <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800">搜尋：{search.trim()}</span> : null}
          <button type="button" onClick={() => void loadData()} className="ml-auto inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-600 transition hover:bg-gray-50">
            <RefreshCw className="h-3.5 w-3.5" />
            {labels.refresh}
          </button>
        </div>
      </div>

      {message ? <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div> : null}

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>
        ) : tab === 'afterSales' ? (
          <AfterSalesTable rows={visibleAfterSales} labels={labels} dateLocale={dateLocale} busy={busy} typeLabel={typeLabel} statusLabel={statusLabel} onStatusChange={updateAfterSalesStatus} />
        ) : tab === 'reviews' ? (
          <ReviewsTable rows={visibleReviews} labels={labels} dateLocale={dateLocale} busy={busy} typeLabel={typeLabel} statusLabel={statusLabel} onStatusChange={updateReviewStatus} />
        ) : tab === 'favorites' ? (
          <FavoritesTable rows={visibleFavorites} labels={labels} dateLocale={dateLocale} typeLabel={typeLabel} />
        ) : (
          <>
            {mode === 'superadmin' ? (
              <PointAdjustmentPanel
                form={pointForm}
                labels={labels}
                members={pointMembers}
                saving={pointSaving}
                onChange={setPointForm}
                onSubmit={createPointAdjustment}
              />
            ) : null}
            <PointsTable rows={visiblePoints} labels={labels} dateLocale={dateLocale} typeLabel={typeLabel} />
          </>
        )}
      </div>
    </div>
  );
}

function filterRows<T>(rows: T[], search: string, picker: (row: T) => string[]) {
  const query = search.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter(row => picker(row).some(value => value.toLowerCase().includes(query)));
}

function PointAdjustmentPanel({ form, labels, members, saving, onChange, onSubmit }: {
  form: { userId: string; amount: string; direction: 'earned' | 'spent'; description: string; expiresAt: string };
  labels: Record<string, string>;
  members: PointMember[];
  saving: boolean;
  onChange: (form: { userId: string; amount: string; direction: 'earned' | 'spent'; description: string; expiresAt: string }) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="border-b border-gray-100 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Plus className="h-4 w-4 text-amber-700" />
        <h2 className="font-semibold text-gray-900">{labels.addPoints}</h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <label className="space-y-1 lg:col-span-2">
          <span className="text-xs font-medium text-gray-500">{labels.memberId}</span>
          <select value={form.userId} onChange={event => onChange({ ...form, userId: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300">
            <option value="">{labels.selectMember}</option>
            {members.map(member => (
              <option key={member.user_id} value={member.user_id}>
                {member.user_id} ({member.role})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-500">{labels.adjustmentType}</span>
          <select value={form.direction} onChange={event => onChange({ ...form, direction: event.target.value as 'earned' | 'spent' })} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300">
            <option value="earned">{labels.earned}</option>
            <option value="spent">{labels.spent}</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-500">{labels.amount}</span>
          <input type="number" min={1} step={1} value={form.amount} onChange={event => onChange({ ...form, amount: event.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-500">{labels.expiresOn}</span>
          <input type="date" value={form.expiresAt} onChange={event => onChange({ ...form, expiresAt: event.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
        </label>
      </div>
      <div className="mt-3 flex flex-col gap-3 lg:flex-row">
        <input value={form.description} onChange={event => onChange({ ...form, description: event.target.value })} placeholder={labels.reasonPlaceholder} className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60">
          {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus className="h-4 w-4" />}
          {labels.saveAdjustment}
        </button>
      </div>
    </form>
  );
}

function AfterSalesTable({ rows, labels, dateLocale, busy, typeLabel, statusLabel, onStatusChange }: {
  rows: AfterSalesItem[];
  labels: Record<string, string>;
  dateLocale: string;
  busy: string | null;
  typeLabel: (type: string) => string;
  statusLabel: (status: string) => string;
  onStatusChange: (item: AfterSalesItem, status: string) => Promise<void>;
}) {
  if (rows.length === 0) return <EmptyState labels={labels} />;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <Th>{labels.request}</Th>
            <Th>{labels.target}</Th>
            <Th>{labels.member}</Th>
            <Th>{labels.status}</Th>
            <Th>{labels.createdAt}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(row => {
            const records = row.orders?.purchase_records || [];
            const names = records.map(record => record.products?.name).filter(Boolean).join(', ') || row.order_id.slice(-10).toUpperCase();
            const vendor = records.map(record => record.products?.vendors?.name).filter(Boolean)[0] || '';
            return (
              <tr key={row.id} className="hover:bg-gray-50">
                <Td><p className="font-semibold text-gray-900">{typeLabel(row.request_type)}</p><p className="font-mono text-xs text-gray-400">#{row.id.slice(-8)}</p></Td>
                <Td><p className="font-medium text-gray-800">{names}</p><p className="text-xs text-gray-400">{vendor}</p></Td>
                <Td><span className="font-mono text-xs text-gray-500">{row.user_id.slice(-8)}</span></Td>
                <Td>
                  <select value={row.status} disabled={busy === row.id} onChange={event => void onStatusChange(row, event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-300">
                    {AFTER_SALES_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </select>
                </Td>
                <Td>{formatDateTime(row.created_at, dateLocale)}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.map(row => {
          const records = row.orders?.purchase_records || [];
          const names = records.map(record => record.products?.name).filter(Boolean).join(', ') || row.order_id.slice(-10).toUpperCase();
          const vendor = records.map(record => record.products?.vendors?.name).filter(Boolean)[0] || '';
          return (
            <div key={row.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{typeLabel(row.request_type)}</p>
                  <p className="mt-1 text-xs text-gray-400">#{row.id.slice(-8)} · {formatDateTime(row.created_at, dateLocale)}</p>
                </div>
                <select value={row.status} disabled={busy === row.id} onChange={event => void onStatusChange(row, event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-300">
                  {AFTER_SALES_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">{names}</p>
                {vendor ? <p>{vendor}</p> : null}
                <p className="text-xs text-gray-400">{labels.member}：<span className="font-mono">{row.user_id.slice(-8)}</span></p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ReviewsTable({ rows, labels, dateLocale, busy, typeLabel, statusLabel, onStatusChange }: {
  rows: ReviewItem[];
  labels: Record<string, string>;
  dateLocale: string;
  busy: string | null;
  typeLabel: (type: string) => string;
  statusLabel: (status: string) => string;
  onStatusChange: (item: ReviewItem, status: string) => Promise<void>;
}) {
  if (rows.length === 0) return <EmptyState labels={labels} />;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <Th>{labels.target}</Th>
            <Th>{labels.rating}</Th>
            <Th>{labels.comment}</Th>
            <Th>{labels.status}</Th>
            <Th>{labels.createdAt}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              <Td><p className="font-semibold text-gray-900">{row.target_name}</p><p className="text-xs text-gray-400">{typeLabel(row.kind)} {row.vendor_name ? `/ ${row.vendor_name}` : ''}</p></Td>
              <Td><span className="inline-flex items-center gap-1 font-semibold text-yellow-700"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{row.rating}</span></Td>
              <Td><p className="max-w-sm whitespace-pre-wrap text-gray-600">{row.comment || '-'}</p></Td>
              <Td>
                <select value={row.status} disabled={busy === row.id} onChange={event => void onStatusChange(row, event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-300">
                  {REVIEW_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
              </Td>
              <Td>{formatDateTime(row.created_at, dateLocale)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.map(row => (
          <div key={row.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{row.target_name}</p>
                <p className="mt-1 text-xs text-gray-400">{typeLabel(row.kind)}{row.vendor_name ? ` · ${row.vendor_name}` : ''}</p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-yellow-700"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{row.rating}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">{row.comment || '-'}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <select value={row.status} disabled={busy === row.id} onChange={event => void onStatusChange(row, event.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-300">
                {REVIEW_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
              <span className="text-xs text-gray-400">{formatDateTime(row.created_at, dateLocale)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function FavoritesTable({ rows, labels, dateLocale, typeLabel }: {
  rows: FavoriteItem[];
  labels: Record<string, string>;
  dateLocale: string;
  typeLabel: (type: string) => string;
}) {
  if (rows.length === 0) return <EmptyState labels={labels} />;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <Th>{labels.target}</Th>
            <Th>{labels.type}</Th>
            <Th>{labels.vendor}</Th>
            <Th>{labels.member}</Th>
            <Th>{labels.createdAt}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              <Td><p className="font-semibold text-gray-900">{row.target_name}</p><p className="font-mono text-xs text-gray-400">#{row.target_id.slice(-8)}</p></Td>
              <Td>{typeLabel(row.target_type)}</Td>
              <Td>{row.vendor_name || '-'}</Td>
              <Td><span className="font-mono text-xs text-gray-500">{row.user_id.slice(-8)}</span></Td>
              <Td>{formatDateTime(row.created_at, dateLocale)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.map(row => (
          <div key={row.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="font-semibold text-gray-900">{row.target_name}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-gray-100 px-2.5 py-1">{typeLabel(row.target_type)}</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">{row.vendor_name || '-'}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>{labels.member}：<span className="font-mono">{row.user_id.slice(-8)}</span></span>
              <span>{formatDateTime(row.created_at, dateLocale)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PointsTable({ rows, labels, dateLocale, typeLabel }: {
  rows: PointItem[];
  labels: Record<string, string>;
  dateLocale: string;
  typeLabel: (type: string) => string;
}) {
  if (rows.length === 0) return <EmptyState labels={labels} />;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <Th>{labels.member}</Th>
            <Th>{labels.amount}</Th>
            <Th>{labels.source}</Th>
            <Th>{labels.comment}</Th>
            <Th>{labels.vendor}</Th>
            <Th>{labels.expiresAt}</Th>
            <Th>{labels.createdAt}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              <Td><span className="font-mono text-xs text-gray-500">{row.user_id.slice(-8)}</span></Td>
              <Td><span className={`font-bold ${row.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{row.amount >= 0 ? '+' : ''}{row.amount.toLocaleString()} NP</span></Td>
              <Td>{row.source_type ? typeLabel(row.source_type) : '-'}</Td>
              <Td>{row.description || '-'}</Td>
              <Td>{row.vendors?.name || '-'}</Td>
              <Td>{row.expires_at ? formatDateTime(row.expires_at, dateLocale) : '-'}</Td>
              <Td>{formatDateTime(row.created_at, dateLocale)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.map(row => (
          <div key={row.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-xs text-gray-500">{row.user_id.slice(-8)}</span>
              <span className={`font-bold ${row.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{row.amount >= 0 ? '+' : ''}{row.amount.toLocaleString()} NP</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-gray-100 px-2.5 py-1">{row.source_type ? typeLabel(row.source_type) : '-'}</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">{row.vendors?.name || '-'}</span>
            </div>
            <p className="mt-3 text-sm text-gray-600">{row.description || '-'}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>{row.expires_at ? formatDateTime(row.expires_at, dateLocale) : '-'}</span>
              <span>{formatDateTime(row.created_at, dateLocale)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function EmptyState({ labels }: { labels: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Heart className="mb-3 h-10 w-10 text-gray-200" />
      <p className="text-sm text-gray-400">{labels.noData}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-3 align-top text-gray-600">{children}</td>;
}
