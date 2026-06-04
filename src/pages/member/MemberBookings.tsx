import { useEffect, useState, type ReactNode } from 'react';
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
    subtitle: pick('查看入住日期、住宿聯絡方式、付款資訊與訂房狀態。', 'Review stay dates, host contacts, payment details, and booking status.', '宿泊日、連絡先、支払い情報、予約状況を確認できます。', '숙박 날짜, 연락처, 결제 정보와 예약 상태를 확인하세요.'),
    count: pick('筆訂房', 'bookings', '件の予約', '건의 예약'),
    noData: pick('目前沒有訂房資料', 'No bookings yet', '予約はまだありません', '예약 내역이 없습니다'),
    bookingInfo: pick('訂房資訊', 'Booking Info', '予約情報', '예약 정보'),
    propertyInfo: pick('住宿資訊', 'Property Info', '宿泊施設情報', '숙소 정보'),
    paymentInfo: pick('付款資訊', 'Payment Info', '支払い情報', '결제 정보'),
    timeline: pick('狀態流程', 'Status Timeline', 'ステータス', '상태 흐름'),
    orderNo: pick('訂房編號', 'Order No.', '予約番号', '예약 번호'),
    bookingDate: pick('訂房日期', 'Booked On', '予約日', '예약일'),
    checkIn: pick('入住日期', 'Check-in', 'チェックイン', '체크인'),
    checkOut: pick('退房日期', 'Check-out', 'チェックアウト', '체크아웃'),
    nights: pick('住宿天數', 'Nights', '泊数', '숙박일'),
    guestName: pick('入住人', 'Guest Name', '宿泊者名', '투숙객'),
    phone: pick('會員電話', 'Phone', '電話番号', '전화번호'),
    email: pick('會員 Email', 'Email', 'メール', '이메일'),
    guests: pick('入住人數', 'Guests', '人数', '인원'),
    extraBeds: pick('加床數', 'Extra Beds', '追加ベッド', '추가 침대'),
    host: pick('住宿單位', 'Host', 'ホスト', '호스트'),
    propertyPhone: pick('住宿電話', 'Property Phone', '施設電話', '숙소 전화'),
    address: pick('地址', 'Address', '住所', '주소'),
    navigate: pick('導航', 'Navigate', 'ナビ', '길찾기'),
    contactHost: pick('聯絡住宿', 'Contact Host', 'ホストに連絡', '호스트 연락'),
    lineService: pick('LINE 客服', 'LINE Support', 'LINE サポート', 'LINE 고객센터'),
    roomPrice: pick('房費', 'Room Rate', '宿泊料金', '객실 요금'),
    cleaningFee: pick('清潔費', 'Cleaning Fee', '清掃料金', '청소비'),
    serviceFee: pick('服務費', 'Service Fee', 'サービス料', '서비스 수수료'),
    discount: pick('折扣', 'Discount', '割引', '할인'),
    coupon: pick('優惠券', 'Coupon', 'クーポン', '쿠폰'),
    total: pick('總金額', 'Total', '合計', '총액'),
    paymentMethod: pick('付款方式', 'Payment Method', '支払い方法', '결제 수단'),
    paymentTime: pick('付款時間', 'Payment Time', '支払い時間', '결제 시간'),
    invoice: pick('發票', 'Invoice', '請求書', '영수증'),
    onlinePayment: pick('線上付款', 'Online Payment', 'オンライン決済', '온라인 결제'),
    notIssued: pick('尚未開立', 'Not issued', '未発行', '미발행'),
    noCoupon: pick('未使用', 'Not used', '未使用', '미사용'),
    included: pick('已包含', 'Included', '含まれています', '포함'),
    noExtraBed: pick('0 張', '0 beds', '0台', '0개'),
    pendingPayment: pick('等待付款確認', 'Pending payment confirmation', '支払い確認待ち', '결제 확인 대기'),
    viewOrder: pick('查看訂單', 'View Order', '注文を見る', '주문 보기'),
    viewDetails: pick('查看明細', 'View Details', '詳細を見る', '상세 보기'),
    hideDetails: pick('收合明細', 'Hide Details', '詳細を閉じる', '상세 닫기'),
    cancel: pick('取消訂房', 'Cancel Booking', '予約をキャンセル', '예약 취소'),
    cancelling: pick('取消中...', 'Cancelling...', 'キャンセル中...', '취소 중...'),
    modifyDates: pick('修改日期', 'Modify Dates', '日付を変更', '날짜 변경'),
    bookAgain: pick('再次預訂', 'Book Again', '再予約', '다시 예약'),
    downloadInvoice: pick('下載發票', 'Download Invoice', '請求書をダウンロード', '영수증 다운로드'),
    specialRequests: pick('特殊需求', 'Special Requests', '特別リクエスト', '특별 요청'),
    room: pick('房型', 'Room', '客室', '객실'),
    unknownGuest: pick('旅客', 'Traveler', '旅行者', '여행자'),
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
    { key: 'ordered', label: pick('已訂房', 'Booked', '予約済み', '예약됨') },
    { key: 'paid', label: pick('已付款', 'Paid', '支払い済み', '결제됨') },
    { key: 'confirmed', label: pick('住宿已確認', 'Host Confirmed', 'ホスト確認済み', '호스트 확인') },
    { key: 'upcoming', label: pick('即將入住', 'Upcoming Stay', '宿泊予定', '체크인 예정') },
    { key: 'completed', label: pick('住宿完成', 'Stay Completed', '宿泊完了', '숙박 완료') },
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
    <div className="space-y-5 lg:space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:flex lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 lg:text-2xl">
            <BedDouble className="h-5 w-5 text-[#2C1F10]" />
            {t.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{t.subtitle}</p>
        </div>
        <div className="mt-4 inline-flex items-baseline gap-2 rounded-xl bg-[#F7F1E8] px-4 py-3 text-[#2C1F10] lg:mt-0">
          <span className="text-2xl font-bold">{bookings.length}</span>
          <span className="text-sm font-medium">{t.count}</span>
        </div>
      </div>

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
            <motion.article key={booking.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
                <div className="relative min-h-56 bg-gray-100 lg:min-h-full">
                  <img src={room?.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500'} alt={room?.name || t.room} className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <div className="min-w-0 space-y-5 p-5 lg:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">#{booking.id.slice(-10).toUpperCase()}</p>
                      <h3 className="mt-1 text-xl font-bold leading-snug text-gray-900 lg:text-2xl">{room?.name || t.room}</h3>
                      <p className="mt-2 flex items-start gap-1.5 text-sm leading-6 text-gray-500">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{address || room?.location || '-'}</span>
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status, lang)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Info label={t.checkIn} value={formatDate(booking.check_in_date, dateLocale)} prominent />
                    <Info label={t.checkOut} value={formatDate(booking.check_out_date, dateLocale)} prominent />
                    <Info label={t.nights} value={`${nights} ${t.nightUnit}`} prominent />
                    <Info label={t.total} value={formatCurrency(booking.total_price)} strong prominent />
                  </div>

                  <button type="button" onClick={() => setExpandedId(isExpanded ? null : booking.id)} className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-sm font-medium text-gray-600 sm:hidden">
                    {isExpanded ? t.hideDetails : t.viewDetails}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <div className={`${isExpanded ? 'block' : 'hidden'} space-y-5 sm:block`}>
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="space-y-5">
                        <SectionTitle icon={<Calendar className="h-4 w-4 text-[#C09A6A]" />} label={t.bookingInfo} />
                        <div className="grid gap-3 text-sm md:grid-cols-2 2xl:grid-cols-3">
                          <Info label={t.orderNo} value={`#${booking.id.slice(-10).toUpperCase()}`} />
                          <Info label={t.bookingDate} value={formatDate(booking.created_at, dateLocale)} />
                          <Info label={t.guestName} value={profile?.display_name || t.unknownGuest} />
                          <Info label={t.phone} value={profile?.phone || '-'} />
                          <Info label={t.email} value={user?.email || '-'} />
                          <Info label={t.guests} value={`${booking.guests} ${t.guestUnit}`} />
                          <Info label={t.extraBeds} value={t.noExtraBed} />
                        </div>

                        {booking.special_requests && (
                          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>{t.specialRequests}: {booking.special_requests}</span>
                          </div>
                        )}

                        <section>
                          <SectionTitle label={t.timeline} />
                          <div className="grid gap-2 md:grid-cols-5">
                            {timelineSteps.map(step => {
                              const done = isStepDone(booking, step.key);
                              return (
                                <div key={step.key} className={`rounded-xl border px-3 py-2 text-xs font-medium leading-5 ${done ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                                  <span className="mr-1">{done ? '\u2713' : '\u25cb'}</span>{step.label}
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      </div>

                      <aside className="space-y-5">
                        <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <SectionTitle icon={<Home className="h-4 w-4 text-[#0D9488]" />} label={t.propertyInfo} />
                          <div className="grid gap-3 text-sm">
                            <Info label={t.host} value={hostName} />
                            <Info label={t.propertyPhone} value={phone || '-'} />
                            <Info label={t.address} value={address || '-'} />
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                            <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2C1F10] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#5A3E1B]"><MapPin className="h-4 w-4" />{t.navigate}</a>
                            <a href={phone ? `tel:${phone}` : '/contact'} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"><Phone className="h-4 w-4" />{t.contactHost}</a>
                            <Link to="/contact" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50"><MessageCircle className="h-4 w-4" />{t.lineService}</Link>
                          </div>
                        </section>

                        <section className="rounded-xl border border-gray-100 p-4">
                          <SectionTitle icon={<Receipt className="h-4 w-4 text-orange-500" />} label={t.paymentInfo} />
                          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
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
                      </aside>
                    </div>

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

function SectionTitle({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
      {icon}
      {label}
    </h4>
  );
}

function Info({ label, value, strong = false, prominent = false }: { label: string; value: string; strong?: boolean; prominent?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border border-gray-100 bg-white px-3 py-2.5 ${prominent ? 'shadow-sm' : ''}`}>
      <p className="text-xs leading-5 text-gray-400">{label}</p>
      <p className={`mt-0.5 break-words leading-6 ${prominent ? 'text-base' : 'text-sm'} ${strong ? 'font-bold text-[#2C1F10]' : 'font-medium text-gray-800'}`}>{value}</p>
    </div>
  );
}
