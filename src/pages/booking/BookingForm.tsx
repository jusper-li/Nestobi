import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, FileText, MapPin, Users } from 'lucide-react';
import Navigation from '../../components/Navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { dateDiffInDays, formatCurrency, formatDate } from '../../lib/utils';

const SEND_EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

interface Room {
  id: string;
  name: string;
  vendor_id: string | null;
  price_per_night: number;
  image_url: string | null;
  location: string | null;
  capacity: number;
}

const DAY_LABELS: Record<number, { zh: string; en: string; ja: string; ko: string }> = {
  0: { zh: '週日', en: 'Sun', ja: '日', ko: '일' },
  1: { zh: '週一', en: 'Mon', ja: '月', ko: '월' },
  2: { zh: '週二', en: 'Tue', ja: '火', ko: '화' },
  3: { zh: '週三', en: 'Wed', ja: '水', ko: '수' },
  4: { zh: '週四', en: 'Thu', ja: '木', ko: '목' },
  5: { zh: '週五', en: 'Fri', ja: '金', ko: '금' },
  6: { zh: '週六', en: 'Sat', ja: '土', ko: '토' },
};

function calcNightPrices(checkIn: string, checkOut: string, basePrice: number, dayPrices: Record<number, number>) {
  const rows: { date: string; day: number; price: number }[] = [];
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const cursor = new Date(start);
  while (cursor < end) {
    const dow = cursor.getDay();
    rows.push({
      date: cursor.toISOString().split('T')[0],
      day: dow,
      price: dayPrices[dow] > 0 ? dayPrices[dow] : basePrice,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}

const BookingForm: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const t = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [room, setRoom] = useState<Room | null>(null);
  const [dayPrices, setDayPrices] = useState<Record<number, number>>({});
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [availablePoints, setAvailablePoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);

  useEffect(() => {
    const fetchRoom = async () => {
      const [{ data }, { data: prices }] = await Promise.all([
        supabase.from('tbl_rooms').select('id,name,vendor_id,price_per_night,image_url,location,capacity').eq('id', roomId).single(),
        supabase.from('tbl_room_day_prices').select('day_of_week,price').eq('room_id', roomId),
      ]);

      setRoom((data as Room) || null);
      if (prices) {
        const mapping: Record<number, number> = {};
        prices.forEach((p: { day_of_week: number; price: number }) => {
          mapping[p.day_of_week] = Number(p.price);
        });
        setDayPrices(mapping);
      }
      setFetchLoading(false);
    };
    if (roomId) void fetchRoom();
  }, [roomId]);

  useEffect(() => {
    const fetchPointBalance = async () => {
      if (!user) {
        setAvailablePoints(0);
        return;
      }
      const { data } = await supabase.from('member_point_balances').select('current_points').eq('user_id', user.id).maybeSingle();
      setAvailablePoints(Number(data?.current_points || 0));
    };
    void fetchPointBalance();
  }, [user]);

  const nights = checkIn && checkOut ? dateDiffInDays(checkIn, checkOut) : 0;
  const nightBreakdown = useMemo(
    () => (nights > 0 && room ? calcNightPrices(checkIn, checkOut, room.price_per_night, dayPrices) : []),
    [checkIn, checkOut, nights, room, dayPrices],
  );
  const totalPrice = nightBreakdown.reduce((sum, row) => sum + row.price, 0);
  const maxPointUse = Math.max(0, Math.min(availablePoints, totalPrice));
  const pointDiscount = Math.max(0, Math.min(pointsToUse, maxPointUse));
  const payableTotal = Math.max(0, totalPrice - pointDiscount);
  const paymentMethod = pointDiscount >= totalPrice && totalPrice > 0 ? 'points' : pointDiscount > 0 ? 'points_online' : 'online';
  const hasVariablePricing = Object.values(dayPrices).some(v => v > 0);
  const pointsEarned = Math.floor(payableTotal / 100) * 10;

  const dayLabel = (day: number) => {
    const item = DAY_LABELS[day];
    return pickByLang(locale, item.zh, item.en, item.ja, item.ko);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !room) {
      setError(t('請先登入再預訂。', 'Please sign in before booking.', '予約前にログインしてください。', '예약 전에 로그인해 주세요.'));
      return;
    }
    if (nights <= 0) {
      setError(t('請確認退房日期晚於入住日期。', 'Check-out date must be after check-in date.', 'チェックアウト日はチェックイン日より後にしてください。', '체크아웃 날짜는 체크인 날짜 이후여야 합니다.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: booking, error: bookingErr } = await supabase
        .from('tbl_bookings')
        .insert({
          user_id: user.id,
          room_id: room.id,
          check_in_date: checkIn,
          check_out_date: checkOut,
          guests,
          total_price: payableTotal,
          subtotal_price: totalPrice,
          points_discount: pointDiscount,
          payment_method: paymentMethod,
          payment_status: 'paid',
          status: 'confirmed',
          special_requests: specialRequests,
        })
        .select()
        .single();

      if (bookingErr) throw bookingErr;

      if (pointsEarned > 0) {
        await supabase.from('points').insert({
          user_id: user.id,
          amount: pointsEarned,
          transaction_type: 'earn',
          reference_id: booking.id,
          source_type: 'booking',
          source_id: booking.id,
          vendor_id: room.vendor_id,
          description: t(`訂房回饋點數 - ${room.name}`, `Booking reward points - ${room.name}`, `宿泊予約ポイント還元 - ${room.name}`, `예약 보상 포인트 - ${room.name}`),
        });
      }

      if (pointDiscount > 0) {
        await supabase.from('points').insert({
          user_id: user.id,
          amount: -pointDiscount,
          transaction_type: 'spent',
          reference_id: booking.id,
          source_type: 'booking',
          source_id: booking.id,
          vendor_id: room.vendor_id,
          description: t('使用點數折抵', 'Points redemption', 'ポイント利用', '포인트 사용'),
        });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email) {
        const { data: profile } = await supabase.from('tbl_mn5wgzh0').select('display_name').eq('user_id', user.id).maybeSingle();
        void fetch(SEND_EMAIL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: 'booking-confirmation',
            to: session.user.email,
            data: {
              displayName: profile?.display_name || '',
              roomName: room.name,
              location: room.location,
              checkIn: formatDate(checkIn),
              checkOut: formatDate(checkOut),
              guests,
              totalPrice: payableTotal,
              nights,
              pointsEarned,
            },
          }),
        });
      }

      setSuccess(true);
    } catch {
      setError(t('預訂失敗，請稍後再試。', 'Booking failed. Please try again later.', '予約に失敗しました。しばらくして再試行してください。', '예약에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex justify-center py-32">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">{t('預訂成功！', 'Booking Confirmed!', '予約が完了しました！', '예약이 완료되었습니다!')}</h2>
            <p className="mb-1 text-gray-500">
              {t('本次獲得', 'You earned', '獲得ポイント', '획득 포인트')} <strong className="text-[#2C1F10]">{pointsEarned}</strong> {t('點', 'pts', 'pt', '점')}
            </p>
            <p className="mb-8 text-gray-500">
              {t('總金額', 'Total', '合計', '총액')}: <strong>{formatCurrency(payableTotal)}</strong>
            </p>
            <button onClick={() => navigate('/member')} className="rounded-xl bg-[#C09A6A] px-8 py-3 font-semibold text-white transition hover:bg-[#8B6840]">
              {t('前往會員中心', 'Go to Member Center', '会員センターへ', '회원 센터로 이동')}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('立即預訂', 'Book Now', '今すぐ予約', '지금 예약')}</h1>

        {room && (
          <div className="mb-6 flex gap-4 rounded-2xl bg-white p-5 shadow-md">
            <img
              src={room.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=200'}
              alt={room.name}
              className="h-20 w-24 flex-shrink-0 rounded-xl object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{room.name}</h3>
              <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {room.location || '-'}
              </div>
              <p className="mt-1 font-semibold text-[#2C1F10]">
                {formatCurrency(room.price_per_night)} / {t('晚', 'night', '泊', '박')}
              </p>
            </div>
          </div>
        )}

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow-md">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t('入住日期', 'Check-in', 'チェックイン', '체크인')}
                </span>
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={e => setCheckIn(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {t('退房日期', 'Check-out', 'チェックアウト', '체크아웃')}
                </span>
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={e => setCheckOut(e.target.value)}
                required
                min={checkIn || new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" />
                {t('入住人數', 'Guests', '人数', '인원')}
              </span>
            </label>
            <input
              type="number"
              value={guests}
              onChange={e => setGuests(Number(e.target.value))}
              min={1}
              max={room?.capacity || 10}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {t('特殊需求（選填）', 'Special requests (optional)', '特別リクエスト（任意）', '특별 요청 (선택)')}
              </span>
            </label>
            <textarea
              value={specialRequests}
              onChange={e => setSpecialRequests(e.target.value)}
              rows={3}
              placeholder={t('例如：加床、嬰兒床、延後入住時間...', 'e.g. extra bed, baby cot, late check-in...', '例：エキストラベッド、ベビーベッド、遅めのチェックイン...', '예: 엑스트라 베드, 아기 침대, 늦은 체크인...')}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2C1F10]"
            />
          </div>

          {nights > 0 && room && (
            <div className="space-y-1 rounded-xl bg-[#F0E4C8] p-4">
              {hasVariablePricing ? (
                nightBreakdown.map((row, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600">
                    <span>
                      {row.date} ({dayLabel(row.day)})
                    </span>
                    <span>{formatCurrency(row.price)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    {formatCurrency(room.price_per_night)} × {nights} {t('晚', 'nights', '泊', '박')}
                  </span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-sm text-green-600">
                <span>{t('回饋點數', 'Reward points', '獲得ポイント', '리워드 포인트')}</span>
                <span>+{pointsEarned}</span>
              </div>
              <div className="space-y-2 pt-2">
                <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
                  <span>{t('使用點數折抵', 'Use points', 'ポイント利用', '포인트 사용')}</span>
                  <span>{t('可用', 'Available', '利用可能', '사용 가능')} {availablePoints.toLocaleString()} NP</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={maxPointUse}
                  value={pointsToUse}
                  onChange={event => setPointsToUse(Math.max(0, Math.min(Number(event.target.value || 0), maxPointUse)))}
                  className="w-full rounded-lg border border-[#D5CDB8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#C09A6A]"
                />
                {pointDiscount > 0 ? (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>{t('點數折抵', 'Point discount', 'ポイント割引', '포인트 할인')}</span>
                    <span>-{formatCurrency(pointDiscount)}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex justify-between border-t border-[#D5CDB8] pt-2 text-lg font-bold text-gray-900">
                <span>{t('總金額', 'Total', '合計', '총액')}</span>
                <span className="text-[#2C1F10]">{formatCurrency(payableTotal)}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C09A6A] py-3 font-semibold text-white shadow-md transition hover:bg-[#8B6840] disabled:opacity-60"
          >
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t('確認預訂', 'Confirm Booking', '予約を確定', '예약 확정')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;
