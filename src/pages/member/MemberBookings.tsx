import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, BedDouble, Calendar, ChevronDown, ChevronUp, Download, ExternalLink, Home, Mail, MapPin, MessageCircle, Phone, Receipt, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { translateRoomsOnDemand } from '../../lib/contentTranslations';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { dateDiffInDays, formatCurrency, formatDate, formatDateTime, getStatusColor, getStatusLabel } from '../../lib/utils';

interface Booking {
  id: string;
  room_id: string | null;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_price: number;
  status: string;
  special_requests: string;
  created_at: string;
  updated_at: string;
  tbl_rooms: {
    name: string;
    location: string;
    image_url: string;
    price_per_night: number;
    vendors: { name: string; contact_phone: string; address: string } | null;
    hotels: { name: string; address: string; phone: string; email: string; line_id?: string | null } | null;
  } | null;
}

type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';

export default function MemberBookings() {
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as UiLang;
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);
  const dateLocale = pickByLang(locale, 'zh-TW', 'en-US', 'ja-JP', 'ko-KR');
  const t = {
    title: pick('我的訂房', 'My Bookings', '予約', '내 예약'),
    noData: pick('目前沒有訂房資料', 'No bookings yet', '予約はまだありません', '예약 내역이 없습니다'),
    bookingInfo: pick('訂房資訊', 'Booking Info', '予約情報', '예약 정보'),
    propertyInfo: pick('房源資訊', 'Property Info', '宿泊施設情報', '숙소 정보'),
    paymentInfo: pick('付款資訊', 'Payment Info', '支払い情報', '결제 정보'),
    timeline: pick('狀態追蹤', 'Status Timeline', 'ステータス履歴', '상태 추적'),
    orderNo: pick('訂單編號', 'Order No.', '注文番号', '주문 번호'),
    bookingDate: pick('訂房日期', 'Booked On', '予約日', '예약일'),
    checkIn: pick('入住日期', 'Check-in', 'チェックイン', '체크인'),
    checkOut: pick('退房日期', 'Check-out', 'チェックアウト', '체크아웃'),
    nights: pick('住宿天數', 'Nights', '宿泊数', '숙박일수'),
    guestName: pick('房客姓名', 'Guest Name', '宿泊者名', '투숙객 이름'),
    phone: pick('聯絡電話', 'Phone', '電話番号', '연락처'),
    email: pick('Email', 'Email', 'Email', 'Email'),
    guests: pick('入住人數', 'Guests', '宿泊人数', '투숙 인원'),
    extraBeds: pick('加床人數', 'Extra Beds', 'エキストラベッド人数', '추가 침대 인원'),
    host: pick('房東名稱', 'Host', 'ホスト名', '호스트 이름'),
    propertyPhone: pick('民宿電話', 'Property Phone', '宿泊施設電話', '숙소 전화'),
    address: pick('地址', 'Address', '住所', '주소'),
    navigate: pick('導航前往', 'Navigate', 'ナビで行く', '길찾기'),
    contactHost: pick('聯絡房東', 'Contact Host', 'ホストに連絡', '호스트 문의'),
    lineService: pick('LINE客服', 'LINE Support', 'LINEサポート', 'LINE 고객지원'),
    roomPrice: pick('房價', 'Room Rate', '宿泊料金', '객실 요금'),
    cleaningFee: pick('清潔費', 'Cleaning Fee', '清掃料金', '청소비'),
    serviceFee: pick('服務費', 'Service Fee', 'サービス料', '서비스 수수료'),
    discount: pick('折扣', 'Discount', '割引', '할인'),
    coupon: pick('優惠券', 'Coupon', 'クーポン', '쿠폰'),
    total: pick('總金額', 'Total', '合計金額', '총 금액'),
    paymentMethod: pick('付款方式', 'Payment Method', '支払い方法', '결제 방식'),
    paymentTime: pick('付款時間', 'Payment Time', '支払い時間', '결제 시간'),
    invoice: pick('發票', 'Invoice', '領収書', '영수증'),
    onlinePayment: pick('線上付款', 'Online Payment', 'オンライン決済', '온라인 결제'),
    notIssued: pick('尚未開立', 'Not issued', '未発行', '미발행'),
    noCoupon: pick('未使用', 'Not used', '未使用', '사용 안 함'),
    included: pick('已包含', 'Included', '含まれています', '포함됨'),
    noExtraBed: pick('0 人', '0 guests', '0名', '0명'),
    pendingPayment: pick('待付款確認', 'Pending payment confirmation', '支払い確認待ち', '결제 확인 대기'),
    viewOrder: pick('查看訂單', 'View Order', '注文を見る', '주문 보기'),
    viewDetails: pick('查看明細', 'View Details', '詳細を見る', '상세 보기'),
    hideDetails: pick('收合明細', 'Hide Details', '詳細を閉じる', '상세 접기'),
    cancel: pick('取消訂房', 'Cancel Booking', '予約をキャンセル', '예약 취소'),
    cancelling: pick('取消中...', 'Cancelling...', 'キャンセル中...', '취소 중...'),
    modifyDates: pick('修改日期', 'Modify Dates', '日程を変更', '날짜 변경'),
    bookAgain: pick('再次預訂', 'Book Again', '再予約', '다시 예약'),
    downloadInvoice: pick('下載發票', 'Download Invoice', '領収書をダウンロード', '영수증 다운로드'),
    specialRequests: pick('特殊需求', 'Special Requests', '特別リクエスト', '특별 요청'),
    room: pick('房型', 'Room', '部屋', '객실'),
    unknownGuest: pick('旅人', 'Traveler', '旅行者', '여행자'),
    confirmCancel: pick('確定要取消這筆訂房嗎？', 'Cancel this booking?', 'この予約をキャンセルしますか？', '이 예약을 취소하시겠어요?'),
    nightUnit: pick('晚', 'nights', '泊', '박'),
    guestUnit: pick('人', 'guests', '名', '명'),
  };

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('tbl_bookings')
        .select('*, tbl_rooms(name, location, image_url, price_per_night, vendors(name, contact_phone, address), hotels(name, address, phone, email, line_id))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      const rows = ((data as Booking[]) || []);
      if (locale === 'zh-TW') {
        setBookings(rows);
      } else {
        const rooms = rows
          .filter(item => item.room_id && item.tbl_rooms)
          .map(item => ({
            id: item.room_id as string,
            name: item.tbl_rooms?.name || '',
            description: '',
            location: item.tbl_rooms?.location || '',
            amenities: [],
          }));
        const translatedRooms = await translateRoomsOnDemand(rooms, locale);
        const translatedById = new Map(translatedRooms.map(room => [room.id, room]));
        setBookings(rows.map(item => {
          const translated = item.room_id ? translatedById.get(item.room_id) : null;
          if (!translated || !item.tbl_rooms) return item;
          return {
            ...item,
            tbl_rooms: {
              ...item.tbl_rooms,
              name: translated.name || item.tbl_rooms.name,
              location: translated.location || item.tbl_rooms.location,
            },
          };
        }));
      }
      setLoading(false);
    };
    void fetchBookings();
  }, [locale, user]);

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

  const timelineSteps = [
    { key: 'ordered', label: pick('已下訂', 'Booked', '予約済み', '예약됨') },
    { key: 'paid', label: pick('已付款', 'Paid', '支払い済み', '결제 완료') },
    { key: 'confirmed', label: pick('房東確認', 'Host Confirmed', 'ホスト確認済み', '호스트 확인') },
    { key: 'upcoming', label: pick('即將入住', 'Upcoming Stay', '宿泊予定', '곧 체크인') },
    { key: 'completed', label: pick('已完成入住', 'Stay Completed', '宿泊完了', '투숙 완료') },
  ];

  const isStepDone = (booking: Booking, step: string) => {
    if (booking.status === 'cancelled') return step === 'ordered';
    if (booking.status === 'completed') return true;
    if (booking.status === 'confirmed') return ['ordered', 'paid', 'confirmed', 'upcoming'].includes(step);
    return step === 'ordered';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2C1F10] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
        bookings.map((booking, index) => {
          const nights = dateDiffInDays(booking.check_in_date, booking.check_out_date);
          const room = booking.tbl_rooms;
          const hotel = room?.hotels;
          const vendor = room?.vendors;
          const address = hotel?.address || room?.location || vendor?.address || '';
          const phone = hotel?.phone || vendor?.contact_phone || '';
          const hostName = hotel?.name || vendor?.name || room?.name || t.room;
          const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || hostName)}`;
          const paid = booking.status !== 'pending' && booking.status !== 'cancelled';
          const isExpanded = expandedId === booking.id;

          return (
            <motion.article key={booking.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
                <img src={room?.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500'} alt={room?.name || t.room} className="h-56 w-full object-cover lg:h-full" />
                <div className="space-y-5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">#{booking.id.slice(-10).toUpperCase()}</p>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">{room?.name || t.room}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-gray-500"><MapPin className="h-4 w-4" />{address || room?.location || '-'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status, lang)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm sm:hidden">
                    <Info label={t.checkIn} value={formatDate(booking.check_in_date, dateLocale)} />
                    <Info label={t.checkOut} value={formatDate(booking.check_out_date, dateLocale)} />
                    <Info label={t.nights} value={`${nights} ${t.nightUnit}`} />
                    <Info label={t.total} value={formatCurrency(booking.total_price)} strong />
                  </div>

                  <button type="button" onClick={() => setExpandedId(isExpanded ? null : booking.id)} className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-sm font-medium text-gray-600 sm:hidden">
                    {isExpanded ? t.hideDetails : t.viewDetails}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <div className={`${isExpanded ? 'block' : 'hidden'} space-y-5 sm:block`}>
                    <section>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Calendar className="h-4 w-4 text-[#C09A6A]" />{t.bookingInfo}</h4>
                    <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <Info label={t.orderNo} value={`#${booking.id.slice(-10).toUpperCase()}`} />
                      <Info label={t.bookingDate} value={formatDate(booking.created_at, dateLocale)} />
                      <Info label={t.checkIn} value={formatDate(booking.check_in_date, dateLocale)} />
                      <Info label={t.checkOut} value={formatDate(booking.check_out_date, dateLocale)} />
                      <Info label={t.nights} value={`${nights} ${t.nightUnit}`} />
                      <Info label={t.guestName} value={profile?.display_name || t.unknownGuest} />
                      <Info label={t.phone} value={profile?.phone || '-'} />
                      <Info label={t.email} value={user?.email || '-'} />
                      <Info label={t.guests} value={`${booking.guests} ${t.guestUnit}`} />
                      <Info label={t.extraBeds} value={t.noExtraBed} />
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Home className="h-4 w-4 text-[#0D9488]" />{t.propertyInfo}</h4>
                    <div className="grid gap-3 text-sm md:grid-cols-3">
                      <Info label={t.host} value={hostName} />
                      <Info label={t.propertyPhone} value={phone || '-'} />
                      <Info label={t.address} value={address || '-'} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C1F10] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#5A3E1B]"><MapPin className="h-4 w-4" />{t.navigate}</a>
                      <a href={phone ? `tel:${phone}` : '/contact'} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-white"><Phone className="h-4 w-4" />{t.contactHost}</a>
                      <Link to="/contact" className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50"><MessageCircle className="h-4 w-4" />{t.lineService}</Link>
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Receipt className="h-4 w-4 text-orange-500" />{t.paymentInfo}</h4>
                    <div className="grid gap-2 rounded-xl border border-gray-100 p-4 text-sm sm:grid-cols-2">
                      <Info label={t.roomPrice} value={formatCurrency(booking.total_price)} />
                      <Info label={t.cleaningFee} value={t.included} />
                      <Info label={t.serviceFee} value={t.included} />
                      <Info label={t.discount} value={formatCurrency(0)} />
                      <Info label={t.coupon} value={t.noCoupon} />
                      <Info label={t.total} value={formatCurrency(booking.total_price)} strong />
                      <Info label={t.paymentMethod} value={t.onlinePayment} />
                      <Info label={t.paymentTime} value={paid ? formatDateTime(booking.updated_at, dateLocale) : t.pendingPayment} />
                      <Info label={t.invoice} value={t.notIssued} />
                    </div>
                  </section>

                  {booking.special_requests && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{t.specialRequests}: {booking.special_requests}</span>
                    </div>
                    )}

                    <section>
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">{t.timeline}</h4>
                    <div className="grid gap-2 sm:grid-cols-5">
                      {timelineSteps.map(step => {
                        const done = isStepDone(booking, step.key);
                        return (
                          <div key={step.key} className={`rounded-xl border px-3 py-2 text-xs font-medium ${done ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                            <span className="mr-1">{done ? '\u2713' : '\u25cb'}</span>{step.label}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                    <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><ExternalLink className="h-4 w-4" />{t.viewOrder}</button>
                    {booking.status === 'confirmed' && (
                      <button type="button" onClick={() => handleCancel(booking.id)} disabled={cancelId === booking.id} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"><AlertCircle className="h-4 w-4" />{cancelId === booking.id ? t.cancelling : t.cancel}</button>
                    )}
                    <Link to={booking.room_id ? `/booking/${booking.room_id}` : '/rooms'} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Calendar className="h-4 w-4" />{t.modifyDates}</Link>
                    <Link to={booking.room_id ? `/booking/${booking.room_id}` : '/rooms'} className="inline-flex items-center gap-1.5 rounded-lg bg-[#C09A6A] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#8B6840]"><RotateCcw className="h-4 w-4" />{t.bookAgain}</Link>
                    <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-400"><Download className="h-4 w-4" />{t.downloadInvoice}</button>
                    {hotel?.email && <a href={`mailto:${hotel.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Mail className="h-4 w-4" />{hotel.email}</a>}
                  </div>
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })
      )}
    </div>
  );
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-0.5 truncate ${strong ? 'font-bold text-[#2C1F10]' : 'font-medium text-gray-800'}`}>{value}</p>
    </div>
  );
}
