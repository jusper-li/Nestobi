import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BedDouble, BookMarked, ChevronRight, Edit2, ExternalLink, Heart, MapPin, Receipt, Save, Settings, ShoppingBag, Star, Ticket, Trash2, User, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { BLOG_FALLBACK_IMAGE, PRODUCT_FALLBACK_IMAGE, ROOM_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  status: string;
  tbl_rooms: { name: string; location: string } | null;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface MemberValueStats {
  favorites: number;
  reviews: number;
  stamps: number;
  exploredCities: number;
}

interface FavoriteDetail {
  id: string;
  target_type: string;
  target_id: string;
  target_name: string;
  target_url: string;
  image_url: string;
  created_at: string;
}

interface ReviewDetail {
  id: string;
  kind: 'product' | 'room';
  target_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  target_name: string;
  target_url: string;
  image_url: string;
}

interface StampDetail {
  id: string;
  place_name: string;
  destination: string;
  visited_date: string | null;
}

type ValueToolKey = 'favorites' | 'coupons' | 'reviews' | 'footprint';
type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

export default function MemberDashboard() {
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t = {
    welcome: pick('歡迎回來', 'Welcome back', 'おかえりなさい', '다시 오신 것을 환영합니다'),
    points: pick('目前點數', 'Current points', '現在のポイント', '현재 포인트'),
    profile: pick('個人資料', 'Profile', 'プロフィール', '프로필'),
    bookings: pick('我的訂房', 'My Bookings', '予約', '내 예약'),
    orders: pick('我的訂單', 'My Orders', '注文', '내 주문'),
    purchases: pick('消費紀錄', 'Consumption Records', '利用履歴', '소비 내역'),
    myPoints: pick('我的點數', 'My Points', 'マイポイント', '내 포인트'),
    preferences: pick('偏好設定', 'Preferences', '設定', '설정'),
    passport: pick('旅遊護照', 'Travel Passport', 'トラベルパスポート', '트래블 패스포트'),
    recentBookings: pick('近期訂房', 'Recent Bookings', '最近の予約', '최근 예약'),
    recentOrders: pick('近期訂單', 'Recent Orders', '最近の注文', '최근 주문'),
    viewAll: pick('查看全部', 'View all', 'すべて表示', '전체 보기'),
    noBooking: pick('目前沒有訂房資料', 'No bookings yet', '予約はまだありません', '예약이 없습니다'),
    noOrders: pick('目前沒有訂單資料', 'No orders yet', '注文はまだありません', '주문이 없습니다'),
    room: pick('房型', 'Room', '部屋', '객실'),
    memberTools: pick('會員價值功能', 'Member Value Tools', '会員向け機能', '회원 가치 기능'),
    favorites: pick('我的收藏', 'My Favorites', 'お気に入り', '내 찜 목록'),
    coupons: pick('我的優惠券', 'My Coupons', 'マイクーポン', '내 쿠폰'),
    reviews: pick('我的評價', 'My Reviews', 'マイレビュー', '내 리뷰'),
    footprint: pick('旅遊足跡', 'Travel Footprint', '旅の足跡', '여행 발자취'),
    expand: pick('展開', 'Expand', '展開', '펼치기'),
    collapse: pick('收合', 'Collapse', '閉じる', '접기'),
    noFavorites: pick('目前沒有收藏', 'No favorites yet', 'お気に入りはまだありません', '아직 찜한 항목이 없습니다'),
    noReviews: pick('目前沒有評價', 'No reviews yet', 'レビューはまだありません', '아직 리뷰가 없습니다'),
    noFootprint: pick('目前沒有旅遊足跡', 'No travel footprints yet', '旅の足跡はまだありません', '아직 여행 발자취가 없습니다'),
    couponInfo: pick('目前點數可兌換優惠券', 'Coupons available from current points', '現在のポイントで交換可能なクーポン', '현재 포인트로 교환 가능한 쿠폰'),
    recentItems: pick('最近明細', 'Recent details', '最近の明細', '최근 내역'),
    viewDetail: pick('詳情', 'Details', '詳細', '상세'),
    edit: pick('編輯', 'Edit', '編集', '수정'),
    delete: pick('刪除', 'Delete', '削除', '삭제'),
    save: pick('儲存', 'Save', '保存', '저장'),
    cancel: pick('取消', 'Cancel', 'キャンセル', '취소'),
    rating: pick('評分', 'Rating', '評価', '평점'),
    comment: pick('評語', 'Comment', 'コメント', '리뷰'),
    removeFavoriteSuccess: pick('已移除收藏', 'Favorite removed', 'お気に入りを削除しました', '찜을 삭제했습니다'),
    updateReviewSuccess: pick('已更新評價', 'Review updated', 'レビューを更新しました', '리뷰를 수정했습니다'),
    deleteReviewSuccess: pick('已刪除評價', 'Review deleted', 'レビューを削除しました', '리뷰를 삭제했습니다'),
    actionFailed: pick('操作失敗，請稍後再試', 'Action failed. Please try again later.', '操作に失敗しました。後でもう一度お試しください', '작업에 실패했습니다. 잠시 후 다시 시도해주세요'),
    staysCount: pick('已入住', 'Stays', '宿泊済み', '숙박 완료'),
    citiesCount: pick('已探索城市', 'Cities explored', '探索した都市', '탐험한 도시'),
    nightsCount: pick('累積住宿晚數', 'Total nights', '累計宿泊数', '누적 숙박일'),
  };
  const [points, setPoints] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [valueStats, setValueStats] = useState<MemberValueStats>({
    favorites: 0,
    reviews: 0,
    stamps: 0,
    exploredCities: 0,
  });
  const [favoriteDetails, setFavoriteDetails] = useState<FavoriteDetail[]>([]);
  const [reviewDetails, setReviewDetails] = useState<ReviewDetail[]>([]);
  const [stampDetails, setStampDetails] = useState<StampDetail[]>([]);
  const [expandedTool, setExpandedTool] = useState<ValueToolKey | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: '' });
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.get('tool') === 'favorites') setExpandedTool('favorites');
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [
        { data: balance },
        { data: bks },
        { data: ords },
        favoritesRes,
        productReviewsRes,
        roomReviewsRes,
        { data: stamps },
        { data: recentFavorites },
        { data: recentProductReviews },
        { data: recentRoomReviews },
      ] = await Promise.all([
        supabase.from('member_point_balances').select('current_points').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('tbl_bookings')
          .select('*, tbl_rooms(name, location)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(2),
        supabase.from('member_favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('product_reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('room_reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('travel_passport').select('id,place_name,destination,visited_date').eq('user_id', user.id).order('visited_date', { ascending: false, nullsFirst: false }).limit(5),
        supabase.from('member_favorites').select('id,target_type,target_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('product_reviews').select('id,product_id,rating,comment,created_at,products(id,name,image_url)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('room_reviews').select('id,room_id,rating,comment,created_at,tbl_rooms(id,name,image_url)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);
      const passportRows = (stamps || []) as StampDetail[];
      const productReviewRows = ((recentProductReviews || []) as any[]).map(row => ({
        id: row.id,
        kind: 'product' as const,
        rating: row.rating,
        comment: row.comment,
        created_at: row.created_at,
        target_id: row.product_id,
        target_name: (Array.isArray(row.products) ? row.products[0]?.name : row.products?.name) || t.reviews,
        target_url: `/shop/${row.product_id}`,
        image_url: (Array.isArray(row.products) ? row.products[0]?.image_url : row.products?.image_url) || PRODUCT_FALLBACK_IMAGE,
      }));
      const roomReviewRows = ((recentRoomReviews || []) as any[]).map(row => ({
        id: row.id,
        kind: 'room' as const,
        rating: row.rating,
        comment: row.comment,
        created_at: row.created_at,
        target_id: row.room_id,
        target_name: (Array.isArray(row.tbl_rooms) ? row.tbl_rooms[0]?.name : row.tbl_rooms?.name) || t.room,
        target_url: `/rooms/${row.room_id}`,
        image_url: (Array.isArray(row.tbl_rooms) ? row.tbl_rooms[0]?.image_url : row.tbl_rooms?.image_url) || ROOM_FALLBACK_IMAGE,
      }));
      setPoints(Number(balance?.current_points || 0));
      setBookings((bks as Booking[]) || []);
      setOrders(ords || []);
      setValueStats({
        favorites: favoritesRes.count || 0,
        reviews: (productReviewsRes.count || 0) + (roomReviewsRes.count || 0),
        stamps: passportRows.length,
        exploredCities: new Set(passportRows.map(item => item.destination || '').filter(Boolean)).size,
      });
      setFavoriteDetails(await hydrateFavoriteDetails((recentFavorites || []) as FavoriteDetail[], pick));
      setReviewDetails([...productReviewRows, ...roomReviewRows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5));
      setStampDetails(passportRows);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const quickLinks = [
    { to: '/member/profile', icon: <User className="h-6 w-6" />, label: t.profile, color: 'bg-[#F0E4C8] text-[#2C1F10]' },
    { to: '/member/bookings', icon: <BedDouble className="h-6 w-6" />, label: t.bookings, color: 'bg-teal-50 text-[#0D9488]' },
    { to: '/member/orders', icon: <ShoppingBag className="h-6 w-6" />, label: t.orders, color: 'bg-purple-50 text-purple-600' },
    { to: '/member/purchases', icon: <Receipt className="h-6 w-6" />, label: t.purchases, color: 'bg-orange-50 text-orange-600' },
    { to: '/member/points', icon: <Star className="h-6 w-6" />, label: t.myPoints, color: 'bg-yellow-50 text-yellow-600' },
    { to: '/member/preferences', icon: <Settings className="h-6 w-6" />, label: t.preferences, color: 'bg-gray-50 text-gray-600' },
    { to: '/ai/passport', icon: <BookMarked className="h-6 w-6" />, label: t.passport, color: 'bg-amber-50 text-amber-700' },
  ];

  const completedBookings = bookings.filter(item => item.status === 'completed');
  const totalNights = completedBookings.reduce((sum, item) => {
    const start = new Date(item.check_in_date);
    const end = new Date(item.check_out_date);
    return sum + Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }, 0);

  const valueTools = [
    { key: 'favorites' as const, icon: <Heart className="h-5 w-5" />, label: t.favorites, value: String(valueStats.favorites), color: 'bg-pink-50 text-pink-600' },
    { key: 'coupons' as const, icon: <Ticket className="h-5 w-5" />, label: t.coupons, value: String(Math.max(0, Math.floor(points / 100))), color: 'bg-orange-50 text-orange-600' },
    { key: 'reviews' as const, icon: <Star className="h-5 w-5" />, label: t.reviews, value: String(valueStats.reviews), color: 'bg-yellow-50 text-yellow-700' },
    { key: 'footprint' as const, icon: <MapPin className="h-5 w-5" />, label: t.footprint, value: `${valueStats.stamps}/${totalNights}`, color: 'bg-teal-50 text-teal-700' },
  ];

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(''), 2600);
  };

  const handleRemoveFavorite = async (item: FavoriteDetail) => {
    if (!user || busyItemId) return;
    setBusyItemId(item.id);
    try {
      const { error } = await supabase
        .from('member_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('id', item.id);
      if (error) throw error;
      setFavoriteDetails(current => current.filter(favorite => favorite.id !== item.id));
      setValueStats(current => ({ ...current, favorites: Math.max(0, current.favorites - 1) }));
      showActionMessage(t.removeFavoriteSuccess);
    } catch {
      showActionMessage(t.actionFailed);
    } finally {
      setBusyItemId(null);
    }
  };

  const startEditReview = (item: ReviewDetail) => {
    setEditingReviewId(item.id);
    setReviewDraft({ rating: item.rating, comment: item.comment || '' });
  };

  const handleSaveReview = async (item: ReviewDetail) => {
    if (!user || busyItemId) return;
    setBusyItemId(item.id);
    const table = item.kind === 'product' ? 'product_reviews' : 'room_reviews';
    const rating = Math.max(1, Math.min(5, Number(reviewDraft.rating) || 1));
    const comment = reviewDraft.comment.trim();
    try {
      const { error } = await supabase
        .from(table)
        .update({ rating, comment, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('id', item.id);
      if (error) throw error;
      setReviewDetails(current => current.map(review => review.id === item.id ? { ...review, rating, comment } : review));
      setEditingReviewId(null);
      showActionMessage(t.updateReviewSuccess);
    } catch {
      showActionMessage(t.actionFailed);
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDeleteReview = async (item: ReviewDetail) => {
    if (!user || busyItemId) return;
    setBusyItemId(item.id);
    const table = item.kind === 'product' ? 'product_reviews' : 'room_reviews';
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', user.id)
        .eq('id', item.id);
      if (error) throw error;
      setReviewDetails(current => current.filter(review => review.id !== item.id));
      setValueStats(current => ({ ...current, reviews: Math.max(0, current.reviews - 1) }));
      if (editingReviewId === item.id) setEditingReviewId(null);
      showActionMessage(t.deleteReviewSuccess);
    } catch {
      showActionMessage(t.actionFailed);
    } finally {
      setBusyItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-r from-[#C09A6A] to-[#D4B488] p-6 text-white">
        <h1 className="mb-1 text-2xl font-bold">
          {t.welcome}，{profile?.display_name || 'Traveler'}！
        </h1>
        <p className="text-blue-100">
          {t.points}：<strong className="text-xl text-yellow-300">{points.toLocaleString()}</strong>
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {quickLinks.map((link, index) => (
          <motion.div key={link.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Link to={link.to} className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm transition hover:shadow-md">
              <div className={`rounded-xl p-3 ${link.color}`}>{link.icon}</div>
              <span className="text-sm font-medium text-gray-700">{link.label}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">{t.memberTools}</h2>
        {actionMessage ? (
          <div className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">{actionMessage}</div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-4">
          {valueTools.map(tool => (
            <div key={tool.key} className={`rounded-xl border transition hover:border-[#C09A6A] hover:shadow-sm ${expandedTool === tool.key ? 'border-[#C09A6A] bg-[#FFF9EF]' : 'border-gray-100 bg-white'}`}>
              <button
                type="button"
                onClick={() => setExpandedTool(current => current === tool.key ? null : tool.key)}
                className="w-full p-4 text-left"
              >
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tool.color}`}>{tool.icon}</div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{tool.label}</p>
                    <p className="mt-1 text-xl font-bold text-[#2C1F10]">{tool.value}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                    {expandedTool === tool.key ? t.collapse : t.expand}
                    <ChevronRight className={`h-3.5 w-3.5 transition ${expandedTool === tool.key ? 'rotate-90' : ''}`} />
                  </span>
                </div>
              </button>
              {expandedTool === tool.key ? (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  <p className="mb-3 text-sm font-semibold text-gray-900">{t.recentItems}</p>
                  {tool.key === 'favorites' ? (
                    favoriteDetails.length === 0 ? <EmptyValueText text={t.noFavorites} /> : (
                      <div className="space-y-2">
                        {favoriteDetails.map(item => (
                          <ValueRow
                            key={item.id}
                            title={item.target_name}
                            meta={`${favoriteTypeLabel(item.target_type, pick)} · ${formatDate(item.created_at, dateLocale)}`}
                            imageUrl={item.image_url}
                            fallbackImage={favoriteFallbackImage(item.target_type)}
                            to={item.target_url}
                            viewLabel={t.viewDetail}
                            actions={(
                              <button type="button" onClick={() => void handleRemoveFavorite(item)} disabled={busyItemId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-pink-100 px-2 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-50 disabled:opacity-50">
                                <Trash2 className="h-3.5 w-3.5" />
                                {t.delete}
                              </button>
                            )}
                          />
                        ))}
                      </div>
                    )
                  ) : tool.key === 'coupons' ? (
                    <ValueRow title={t.couponInfo} meta={`${Math.max(0, Math.floor(points / 100))} ${t.coupons} · ${points.toLocaleString()} NP`} />
                  ) : tool.key === 'reviews' ? (
                    reviewDetails.length === 0 ? <EmptyValueText text={t.noReviews} /> : (
                      <div className="space-y-2">
                        {reviewDetails.map(item => (
                          <ValueRow
                            key={item.id}
                            title={item.target_name}
                            meta={`${'★'.repeat(Math.max(1, Math.min(5, item.rating)))} · ${formatDate(item.created_at, dateLocale)}`}
                            note={item.comment || undefined}
                            imageUrl={item.image_url}
                            fallbackImage={item.kind === 'product' ? PRODUCT_FALLBACK_IMAGE : ROOM_FALLBACK_IMAGE}
                            to={item.target_url}
                            viewLabel={t.viewDetail}
                            actions={(
                              <>
                                <button type="button" onClick={() => startEditReview(item)} disabled={busyItemId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
                                  <Edit2 className="h-3.5 w-3.5" />
                                  {t.edit}
                                </button>
                                <button type="button" onClick={() => void handleDeleteReview(item)} disabled={busyItemId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-pink-100 px-2 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-50 disabled:opacity-50">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {t.delete}
                                </button>
                              </>
                            )}
                            editor={editingReviewId === item.id ? (
                              <div className="mt-3 space-y-2 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                                <label className="block text-xs font-semibold text-gray-600">
                                  {t.rating}
                                  <select value={reviewDraft.rating} onChange={event => setReviewDraft(current => ({ ...current, rating: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#C09A6A] focus:outline-none">
                                    {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value}</option>)}
                                  </select>
                                </label>
                                <label className="block text-xs font-semibold text-gray-600">
                                  {t.comment}
                                  <textarea value={reviewDraft.comment} onChange={event => setReviewDraft(current => ({ ...current, comment: event.target.value }))} rows={3} className="mt-1 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#C09A6A] focus:outline-none" />
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  <button type="button" onClick={() => void handleSaveReview(item)} disabled={busyItemId === item.id} className="inline-flex items-center gap-1 rounded-lg bg-[#2C1F10] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4A3520] disabled:opacity-50">
                                    <Save className="h-3.5 w-3.5" />
                                    {t.save}
                                  </button>
                                  <button type="button" onClick={() => setEditingReviewId(null)} disabled={busyItemId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
                                    <X className="h-3.5 w-3.5" />
                                    {t.cancel}
                                  </button>
                                </div>
                              </div>
                            ) : undefined}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    stampDetails.length === 0 ? <EmptyValueText text={t.noFootprint} /> : (
                      <div className="space-y-2">
                        {stampDetails.map(item => (
                          <ValueRow key={item.id} title={item.place_name} meta={`${item.destination}${item.visited_date ? ` · ${formatDate(item.visited_date, dateLocale)}` : ''}`} />
                        ))}
                      </div>
                    )
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
          <p>{t.staysCount}：<span className="font-semibold text-gray-900">{completedBookings.length}</span></p>
          <p>{t.citiesCount}：<span className="font-semibold text-gray-900">{valueStats.exploredCities}</span></p>
          <p>{t.nightsCount}：<span className="font-semibold text-gray-900">{totalNights}</span></p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <BedDouble className="h-5 w-5 text-[#2C1F10]" />
              {t.recentBookings}
            </h2>
            <Link to="/member/bookings" className="flex items-center gap-1 text-sm text-[#2C1F10] hover:underline">
              {t.viewAll}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">{t.noBooking}</p>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 2).map(item => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.tbl_rooms?.name || t.room}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(item.check_in_date, dateLocale)} ~ {formatDate(item.check_out_date, dateLocale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(item.status)}`}>{getStatusLabel(item.status, lang)}</span>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatCurrency(item.total_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <ShoppingBag className="h-5 w-5 text-[#0D9488]" />
              {t.recentOrders}
            </h2>
            <Link to="/member/orders" className="flex items-center gap-1 text-sm text-[#2C1F10] hover:underline">
              {t.viewAll}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">{t.noOrders}</p>
          ) : (
            <div className="space-y-3">
              {orders.map(item => (
                <div key={item.id} className="flex items-center justify-between border-b border-gray-50 py-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{item.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.created_at, dateLocale)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(item.status)}`}>{getStatusLabel(item.status, lang)}</span>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatCurrency(item.total_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function favoriteTypeLabel(type: string, pick: (zh: string, en: string, ja: string, ko: string) => string) {
  const labels: Record<string, string> = {
    product: pick('商品收藏', 'Product favorite', '商品のお気に入り', '상품 찜'),
    room: pick('房間收藏', 'Room favorite', '部屋のお気に入り', '객실 찜'),
    blog_post: pick('文章收藏', 'Article favorite', '記事のお気に入り', '글 찜'),
    hotel: pick('旅宿收藏', 'Hotel favorite', '宿泊施設のお気に入り', '숙소 찜'),
  };
  return labels[type] || pick('收藏項目', 'Favorite item', 'お気に入り項目', '찜 항목');
}

function favoriteFallbackImage(type: string) {
  if (type === 'product') return PRODUCT_FALLBACK_IMAGE;
  if (type === 'room' || type === 'hotel') return ROOM_FALLBACK_IMAGE;
  return BLOG_FALLBACK_IMAGE;
}

async function hydrateFavoriteDetails(rows: FavoriteDetail[], pick: (zh: string, en: string, ja: string, ko: string) => string) {
  const grouped = rows.reduce<Record<string, string[]>>((acc, item) => {
    acc[item.target_type] = acc[item.target_type] || [];
    acc[item.target_type].push(item.target_id);
    return acc;
  }, {});

  const [products, rooms, posts, hotels] = await Promise.all([
    grouped.product?.length ? supabase.from('products').select('id,name,image_url').in('id', grouped.product) : Promise.resolve({ data: [] }),
    grouped.room?.length ? supabase.from('tbl_rooms').select('id,name,image_url').in('id', grouped.room) : Promise.resolve({ data: [] }),
    grouped.blog_post?.length ? supabase.from('blog_posts').select('id,title,cover_image_url').in('id', grouped.blog_post) : Promise.resolve({ data: [] }),
    grouped.hotel?.length ? supabase.from('hotels').select('id,name,image_url').in('id', grouped.hotel) : Promise.resolve({ data: [] }),
  ]);

  const names = new Map<string, string>();
  const images = new Map<string, string>();
  (products.data || []).forEach((item: any) => names.set(`product:${item.id}`, item.name));
  (rooms.data || []).forEach((item: any) => names.set(`room:${item.id}`, item.name));
  (posts.data || []).forEach((item: any) => names.set(`blog_post:${item.id}`, item.title));
  (hotels.data || []).forEach((item: any) => names.set(`hotel:${item.id}`, item.name));
  (products.data || []).forEach((item: any) => images.set(`product:${item.id}`, item.image_url));
  (rooms.data || []).forEach((item: any) => images.set(`room:${item.id}`, item.image_url));
  (posts.data || []).forEach((item: any) => images.set(`blog_post:${item.id}`, item.cover_image_url));
  (hotels.data || []).forEach((item: any) => images.set(`hotel:${item.id}`, item.image_url));

  return rows.map(item => ({
    ...item,
    target_name: names.get(`${item.target_type}:${item.target_id}`) || favoriteTypeLabel(item.target_type, pick),
    target_url: favoriteTargetUrl(item.target_type, item.target_id),
    image_url: images.get(`${item.target_type}:${item.target_id}`) || favoriteFallbackImage(item.target_type),
  }));
}

function favoriteTargetUrl(type: string, id: string) {
  if (type === 'product') return `/shop/${id}`;
  if (type === 'room') return `/rooms/${id}`;
  if (type === 'blog_post') return `/blog/${id}`;
  if (type === 'hotel') return `/hotels/${id}`;
  return '';
}

function EmptyValueText({ text }: { text: string }) {
  return <p className="py-3 text-center text-sm text-gray-400">{text}</p>;
}

function ValueRow({
  title,
  meta,
  note,
  to,
  imageUrl,
  fallbackImage,
  viewLabel,
  actions,
  editor,
}: {
  title: string;
  meta: string;
  note?: string;
  to?: string;
  imageUrl?: string;
  fallbackImage?: string;
  viewLabel?: string;
  actions?: React.ReactNode;
  editor?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <div className="flex gap-3">
        {imageUrl ? (
          <Link to={to || '#'} className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 ${to ? '' : 'pointer-events-none'}`}>
            <img src={imageUrl} alt={title} onError={event => useFallbackImage(event, fallbackImage || imageUrl)} className="h-full w-full object-cover" />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            {to ? (
              <Link to={to} className="min-w-0 text-sm font-medium text-gray-900 hover:text-[#8B6840] hover:underline">
                {title}
              </Link>
            ) : (
              <p className="min-w-0 text-sm font-medium text-gray-900">{title}</p>
            )}
            <p className="shrink-0 text-right text-xs text-gray-400">{meta}</p>
          </div>
          {note ? <p className="mt-1 line-clamp-2 text-xs text-gray-500">{note}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {to ? (
              <Link to={to} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50">
                <ExternalLink className="h-3.5 w-3.5" />
                {viewLabel}
              </Link>
            ) : null}
            {actions}
          </div>
        </div>
      </div>
      {editor}
    </div>
  );
}


