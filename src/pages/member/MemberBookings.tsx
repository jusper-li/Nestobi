import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, BedDouble, Calendar, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../../lib/utils';

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_price: number;
  status: string;
  special_requests: string;
  tbl_rooms: { name: string; location: string; image_url: string } | null;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const copy: Record<UiLang, Record<string, string>> = {
  'zh-TW': {
    title: '我的訂房',
    noData: '目前沒有訂房紀錄',
    room: '房型',
    people: '人',
    cancel: '取消訂房',
    canceling: '取消中...',
    confirmCancel: '確定要取消這筆訂房嗎？',
  },
  en: {
    title: 'My Bookings',
    noData: 'No bookings yet',
    room: 'Room',
    people: 'guests',
    cancel: 'Cancel Booking',
    canceling: 'Cancelling...',
    confirmCancel: 'Are you sure you want to cancel this booking?',
  },
  ja: {
    title: '宿泊予約',
    noData: '宿泊予約はまだありません',
    room: '部屋タイプ',
    people: '名',
    cancel: '予約をキャンセル',
    canceling: 'キャンセル中...',
    confirmCancel: 'この予約をキャンセルしますか？',
  },
  ko: {
    title: '내 숙소 예약',
    noData: '숙소 예약 내역이 없습니다',
    room: '객실',
    people: '명',
    cancel: '예약 취소',
    canceling: '취소 중...',
    confirmCancel: '이 예약을 취소하시겠습니까?',
  },
};

export default function MemberBookings() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = (lang === 'ja' || lang === 'ko' || lang === 'en' ? lang : 'zh-TW') as UiLang;
  const t = copy[locale];
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('tbl_bookings')
        .select('*, tbl_rooms(name, location, image_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setBookings((data as Booking[]) || []);
      setLoading(false);
    };
    fetchBookings();
  }, [user]);

  const handleCancel = async (id: string) => {
    if (!window.confirm(t.confirmCancel)) return;
    setCancelId(id);
    try {
      await supabase.from('tbl_bookings').update({ status: 'cancelled' }).eq('id', id);
      setBookings(prev => prev.map(item => (item.id === id ? { ...item, status: 'cancelled' } : item)));
    } finally {
      setCancelId(null);
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
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <BedDouble className="h-5 w-5 text-[#2C1F10]" />
        {t.title}
      </h2>
      {bookings.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <BedDouble className="mx-auto mb-4 h-14 w-14 text-gray-200" />
          <p className="text-gray-400">{t.noData}</p>
        </div>
      ) : (
        bookings.map((booking, index) => (
          <motion.div
            key={booking.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <div className="flex flex-col gap-0 sm:flex-row">
              <img
                src={booking.tbl_rooms?.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=200'}
                alt={booking.tbl_rooms?.name || t.room}
                className="h-32 w-full flex-shrink-0 object-cover sm:h-auto sm:w-36"
              />
              <div className="flex-1 p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{booking.tbl_rooms?.name || t.room}</h3>
                    <p className="text-sm text-gray-500">{booking.tbl_rooms?.location}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {getStatusLabel(booking.status, lang)}
                  </span>
                </div>
                <div className="mb-3 flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDate(booking.check_in_date, locale === 'en' ? 'en-US' : 'zh-TW')} ~ {formatDate(booking.check_out_date, locale === 'en' ? 'en-US' : 'zh-TW')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    {booking.guests} {t.people}
                  </div>
                </div>
                {booking.special_requests && (
                  <div className="mb-3 flex items-start gap-1 text-sm text-gray-500">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span className="text-xs">{booking.special_requests}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#2C1F10]">{formatCurrency(booking.total_price)}</p>
                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancelId === booking.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      {cancelId === booking.id ? t.canceling : t.cancel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

