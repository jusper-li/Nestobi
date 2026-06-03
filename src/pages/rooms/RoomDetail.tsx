import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Heart, MapPin, Star, Users } from 'lucide-react';
import Footer from '../../components/Footer';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMemberFavorite } from '../../hooks/useMemberFavorite';
import { getTranslationRuntimeState, translateHotelsOnDemand, translateRoomsOnDemand } from '../../lib/contentTranslations';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { ROOM_FALLBACK_IMAGE, useFallbackImage } from '../../lib/images';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface Hotel {
  id: string;
  name: string;
  city: string;
  star_rating: number;
  checkin_time?: string;
  checkout_time?: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  room_type: string;
  capacity: number;
  min_capacity?: number;
  price_per_night: number;
  weekend_price?: number;
  floor?: string;
  image_url: string;
  images?: string[];
  location: string;
  is_available: boolean;
  amenities: string[];
  hotels?: Hotel | null;
}

interface RoomReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const ROOM_TYPE_LABELS: Record<string, { 'zh-TW': string; en: string; ja: string; ko: string }> = {
  single: { 'zh-TW': '單人房', en: 'Single', ja: 'シングル', ko: '싱글' },
  double: { 'zh-TW': '雙人房', en: 'Double', ja: 'ダブル', ko: '더블' },
  suite: { 'zh-TW': '套房', en: 'Suite', ja: 'スイート', ko: '스위트' },
  deluxe: { 'zh-TW': '豪華房', en: 'Deluxe', ja: 'デラックス', ko: '디럭스' },
  family: { 'zh-TW': '家庭房', en: 'Family', ja: 'ファミリー', ko: '패밀리' },
  villa: { 'zh-TW': 'Villa', en: 'Villa', ja: 'ヴィラ', ko: '빌라' },
};

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const shouldTranslate = pickByLang(locale, '0', '1', '1', '1') === '1';
  const t4 = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [room, setRoom] = useState<Room | null>(null);
  const [displayRoom, setDisplayRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [translationNotice, setTranslationNotice] = useState('');
  const [reviews, setReviews] = useState<RoomReview[]>([]);
  const { isFavorite, loading: favoriteLoading, toggleFavorite } = useMemberFavorite(user?.id, 'room', id);

  useEffect(() => {
    let cancelled = false;
    const fetchRoom = async () => {
      const { data } = await supabase
        .from('tbl_rooms')
        .select('*, hotels(id,name,city,star_rating,checkin_time,checkout_time)')
        .eq('id', id)
        .maybeSingle();
      if (cancelled) return;
      setRoom((data || null) as Room | null);
      setLoading(false);
    };
    if (id) void fetchRoom();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const fetchReviews = async () => {
      if (!id) {
        setReviews([]);
        return;
      }
      const { data } = await supabase
        .from('room_reviews')
        .select('id,rating,comment,created_at')
        .eq('room_id', id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);
      if (!cancelled) setReviews((data || []) as RoomReview[]);
    };
    void fetchReviews();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    if (!room) return () => { cancelled = true; };

    if (!shouldTranslate) {
      setDisplayRoom(room);
      setTranslationNotice('');
      return () => {
        cancelled = true;
      };
    }

    setDisplayRoom(room);
    const runtime = getTranslationRuntimeState();
    setTranslationNotice(
      runtime.tableUnavailable || runtime.isLocalProxyMode
        ? t4(
            '先顯示原文內容，翻譯快取尚未就緒。',
            'Showing source content first. Translation cache is not ready yet.',
            '原文を先に表示しています。翻訳キャッシュはまだ準備中です。',
            '원문을 먼저 표시합니다. 번역 캐시가 아직 준비되지 않았습니다.',
          )
        : t4('翻譯房型內容中...', 'Translating room content...', '客室内容を翻訳中...', '객실 내용을 번역하는 중...'),
    );

    (async () => {
      const [translatedRoom] = await translateRoomsOnDemand([room], locale);
      if (cancelled) return;
      let next = translatedRoom || room;
      if (next.hotels?.id) {
        const [translatedHotel] = await translateHotelsOnDemand([next.hotels], locale);
        if (!cancelled && translatedHotel) next = { ...next, hotels: translatedHotel };
      }
      if (!cancelled) {
        setDisplayRoom(next);
        setTranslationNotice('');
      }
    })().catch(() => {
      if (!cancelled) {
        setTranslationNotice(t4('翻譯暫時不可用，先顯示原文。', 'Translation is temporarily unavailable. Showing source content.', '翻訳は一時的に利用できません。原文を表示します。', '번역을 일시적으로 사용할 수 없어 원문을 표시합니다.'));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [room, locale, shouldTranslate]);

  const currentRoom = displayRoom || room;

  const gallery = useMemo(() => {
    if (!currentRoom) return [];
    const imgs = currentRoom.images && currentRoom.images.length > 0 ? [...currentRoom.images] : [];
    if (currentRoom.image_url && !imgs.includes(currentRoom.image_url)) imgs.unshift(currentRoom.image_url);
    return imgs.length ? imgs : [ROOM_FALLBACK_IMAGE];
  }, [currentRoom]);

  const cover = activeImage || gallery[0] || ROOM_FALLBACK_IMAGE;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h2 className="mb-4 text-xl font-bold">{t4('找不到房間資料', 'Room not found', '客室が見つかりません', '객실을 찾을 수 없습니다')}</h2>
          <Link to="/rooms" className="inline-flex items-center gap-2 rounded-xl bg-[#C09A6A] px-5 py-3 font-semibold text-white">
            <ArrowLeft className="h-4 w-4" />
            {t4('返回住宿列表', 'Back to Room List', '客室一覧に戻る', '객실 목록으로 돌아가기')}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const guestLabel =
    currentRoom.min_capacity && currentRoom.min_capacity !== currentRoom.capacity
      ? `${currentRoom.min_capacity}-${currentRoom.capacity}`
      : `${currentRoom.capacity}`;
  const roomType = ROOM_TYPE_LABELS[currentRoom.room_type];
  const typeLabel = roomType ? pickByLang(locale, roomType['zh-TW'], roomType.en, roomType.ja, roomType.ko) : currentRoom.room_type;
  const favoriteLabel = isFavorite
    ? t4('已收藏', 'Favorited', 'お気に入り済み', '찜 완료')
    : t4('加入收藏', 'Add Favorite', 'お気に入りに追加', '찜하기');
  const reviewsTitle = t4('房型評價', 'Room Reviews', '客室レビュー', '객실 리뷰');
  const noReviews = t4('目前尚無評價', 'No reviews yet', 'レビューはまだありません', '아직 리뷰가 없습니다');
  const loginToFavorite = t4('請先登入後再收藏', 'Please sign in to save favorites.', 'お気に入りにはログインが必要です。', '찜하려면 먼저 로그인해 주세요.');
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const handleFavorite = async () => {
    if (!user) {
      window.alert(loginToFavorite);
      navigate('/auth/login');
      return;
    }
    await toggleFavorite();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead title={currentRoom.name} description={`${currentRoom.name} - ${currentRoom.location || ''}`} ogImage={cover} />
      <Navigation />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {translationNotice && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{translationNotice}</div>
        )}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
          <Link to="/rooms">{t4('住宿列表', 'Room List', '客室一覧', '객실 목록')}</Link>
          <ChevronRightMini />
          <span className="max-w-[220px] truncate">{currentRoom.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section>
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <img src={cover} alt={currentRoom.name} onError={event => useFallbackImage(event, ROOM_FALLBACK_IMAGE)} className="h-[280px] w-full object-cover md:h-[420px]" />
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {gallery.map(image => (
                  <button key={image} type="button" onClick={() => setActiveImage(image)} className={`overflow-hidden rounded-xl border ${cover === image ? 'border-[#8B6840]' : 'border-gray-200'}`}>
                    <img src={image} alt={currentRoom.name} className="h-16 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-[#F3E7D5] px-3 py-1 text-xs font-semibold text-[#8B6840]">{typeLabel}</span>
              {currentRoom.hotels?.name && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Building2 className="h-3.5 w-3.5" />
                  {currentRoom.hotels.name}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-[#2C1F10]">{currentRoom.name}</h1>
            <p className="mt-3 text-gray-600">{currentRoom.description || t4('尚無房型描述', 'No description yet.', '客室説明はまだありません。', '객실 설명이 아직 없습니다.')}</p>

            <div className="mt-5 grid gap-3 text-sm text-gray-600">
              <div className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{currentRoom.location || currentRoom.hotels?.city || t4('位置資訊不足', 'Location unavailable', '位置情報なし', '위치 정보 없음')}</div>
              <div className="inline-flex items-center gap-2"><Users className="h-4 w-4" />{guestLabel} {t4('人', 'guests', '名', '명')}</div>
              <div className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" />{t4('入住', 'Check-in', 'チェックイン', '체크인')} {currentRoom.hotels?.checkin_time || '15:00'} / {t4('退房', 'Check-out', 'チェックアウト', '체크아웃')} {currentRoom.hotels?.checkout_time || '11:00'}</div>
            </div>

            <div className="mt-6 border-t pt-5">
              <div className="text-4xl font-bold text-[#2C1F10]">{formatCurrency(currentRoom.price_per_night)}</div>
              {currentRoom.weekend_price ? <p className="mt-1 text-sm text-gray-500">{t4('假日', 'Weekend', '週末', '주말')} {formatCurrency(currentRoom.weekend_price)}</p> : null}
            </div>

            {currentRoom.hotels?.star_rating ? (
              <div className="mt-4 flex gap-0.5">
                {Array.from({ length: currentRoom.hotels.star_rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
              </div>
            ) : null}

            {currentRoom.amenities?.length ? (
              <div className="mt-6">
                <h2 className="mb-3 text-sm font-semibold text-gray-700">{t4('房型設施', 'Amenities', '客室設備', '객실 편의시설')}</h2>
                <div className="flex flex-wrap gap-2">
                  {currentRoom.amenities.map(item => (
                    <span key={item} className="rounded-full bg-[#F5EBD8] px-3 py-1 text-xs text-[#5B452B]">{item}</span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <Link to={`/booking/${currentRoom.id}`} className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#C09A6A] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105">
                {t4('立即訂房', 'Book Now', '今すぐ予約', '지금 예약')}
              </Link>
              <Link to="/rooms" className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
                {t4('返回列表', 'Back', '一覧へ戻る', '목록으로')}
              </Link>
            </div>
            <button type="button" onClick={() => void handleFavorite()} disabled={favoriteLoading} className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${isFavorite ? 'border-pink-200 bg-pink-50 text-pink-600' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              {favoriteLabel}
            </button>
          </section>
        </div>
        <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[#2C1F10]">{reviewsTitle}</h2>
            {reviews.length > 0 ? (
              <div className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-3 py-1 text-sm font-semibold text-yellow-700">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {averageRating.toFixed(1)}
              </div>
            ) : null}
          </div>
          {reviews.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {reviews.map(review => (
                <article key={review.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="mb-2 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  {review.comment ? <p className="text-sm leading-6 text-gray-700">{review.comment}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{noReviews}</p>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}

function ChevronRightMini() {
  return <span className="text-gray-300">/</span>;
}
