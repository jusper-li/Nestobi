import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, BedDouble, Calendar, Download, ExternalLink, Home, Mail, MapPin, MessageCircle, Phone, Receipt, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
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
    title: pick('\u6211\u7684\u8a02\u623f', 'My Bookings', 'My Bookings', 'My Bookings'),
    noData: pick('\u76ee\u524d\u6c92\u6709\u8a02\u623f\u8cc7\u6599', 'No bookings yet', 'No bookings yet', 'No bookings yet'),
    bookingInfo: pick('\u8a02\u623f\u8cc7\u8a0a', 'Booking Info', 'Booking Info', 'Booking Info'),
    propertyInfo: pick('\u623f\u6e90\u8cc7\u8a0a', 'Property Info', 'Property Info', 'Property Info'),
    paymentInfo: pick('\u4ed8\u6b3e\u8cc7\u8a0a', 'Payment Info', 'Payment Info', 'Payment Info'),
    timeline: pick('\u72c0\u614b\u8ffd\u8e64', 'Status Timeline', 'Status Timeline', 'Status Timeline'),
    orderNo: pick('\u8a02\u55ae\u7de8\u865f', 'Order No.', 'Order No.', 'Order No.'),
    bookingDate: pick('\u8a02\u623f\u65e5\u671f', 'Booked On', 'Booked On', 'Booked On'),
    checkIn: pick('\u5165\u4f4f\u65e5\u671f', 'Check-in', 'Check-in', 'Check-in'),
    checkOut: pick('\u9000\u623f\u65e5\u671f', 'Check-out', 'Check-out', 'Check-out'),
    nights: pick('\u4f4f\u5bbf\u5929\u6578', 'Nights', 'Nights', 'Nights'),
    guestName: pick('\u623f\u5ba2\u59d3\u540d', 'Guest Name', 'Guest Name', 'Guest Name'),
    phone: pick('\u806f\u7d61\u96fb\u8a71', 'Phone', 'Phone', 'Phone'),
    email: pick('Email', 'Email', 'Email', 'Email'),
    guests: pick('\u5165\u4f4f\u4eba\u6578', 'Guests', 'Guests', 'Guests'),
    extraBeds: pick('\u52a0\u5e8a\u4eba\u6578', 'Extra Beds', 'Extra Beds', 'Extra Beds'),
    host: pick('\u623f\u6771\u540d\u7a31', 'Host', 'Host', 'Host'),
    propertyPhone: pick('\u6c11\u5bbf\u96fb\u8a71', 'Property Phone', 'Property Phone', 'Property Phone'),
    address: pick('\u5730\u5740', 'Address', 'Address', 'Address'),
    navigate: pick('\u5c0e\u822a\u524d\u5f80', 'Navigate', 'Navigate', 'Navigate'),
    contactHost: pick('\u806f\u7d61\u623f\u6771', 'Contact Host', 'Contact Host', 'Contact Host'),
    lineService: pick('LINE\u5ba2\u670d', 'LINE Support', 'LINE Support', 'LINE Support'),
    roomPrice: pick('\u623f\u50f9', 'Room Rate', 'Room Rate', 'Room Rate'),
    cleaningFee: pick('\u6e05\u6f54\u8cbb', 'Cleaning Fee', 'Cleaning Fee', 'Cleaning Fee'),
    serviceFee: pick('\u670d\u52d9\u8cbb', 'Service Fee', 'Service Fee', 'Service Fee'),
    discount: pick('\u6298\u6263', 'Discount', 'Discount', 'Discount'),
    coupon: pick('\u512a\u60e0\u5238', 'Coupon', 'Coupon', 'Coupon'),
    total: pick('\u7e3d\u91d1\u984d', 'Total', 'Total', 'Total'),
    paymentMethod: pick('\u4ed8\u6b3e\u65b9\u5f0f', 'Payment Method', 'Payment Method', 'Payment Method'),
    paymentTime: pick('\u4ed8\u6b3e\u6642\u9593', 'Payment Time', 'Payment Time', 'Payment Time'),
    invoice: pick('\u767c\u7968', 'Invoice', 'Invoice', 'Invoice'),
    onlinePayment: pick('\u7dda\u4e0a\u4ed8\u6b3e', 'Online Payment', 'Online Payment', 'Online Payment'),
    notIssued: pick('\u5c1a\u672a\u958b\u7acb', 'Not issued', 'Not issued', 'Not issued'),
    noCoupon: pick('\u672a\u4f7f\u7528', 'Not used', 'Not used', 'Not used'),
    included: pick('\u5df2\u5305\u542b', 'Included', 'Included', 'Included'),
    noExtraBed: pick('0 \u4eba', '0 guests', '0 guests', '0 guests'),
    pendingPayment: pick('\u5f85\u4ed8\u6b3e\u78ba\u8a8d', 'Pending payment confirmation', 'Pending payment confirmation', 'Pending payment confirmation'),
    viewOrder: pick('\u67e5\u770b\u8a02\u55ae', 'View Order', 'View Order', 'View Order'),
    cancel: pick('\u53d6\u6d88\u8a02\u623f', 'Cancel Booking', 'Cancel Booking', 'Cancel Booking'),
    cancelling: pick('\u53d6\u6d88\u4e2d...', 'Cancelling...', 'Cancelling...', 'Cancelling...'),
    modifyDates: pick('\u4fee\u6539\u65e5\u671f', 'Modify Dates', 'Modify Dates', 'Modify Dates'),
    bookAgain: pick('\u518d\u6b21\u9810\u8a02', 'Book Again', 'Book Again', 'Book Again'),
    downloadInvoice: pick('\u4e0b\u8f09\u767c\u7968', 'Download Invoice', 'Download Invoice', 'Download Invoice'),
    specialRequests: pick('\u7279\u6b8a\u9700\u6c42', 'Special Requests', 'Special Requests', 'Special Requests'),
    room: pick('\u623f\u578b', 'Room', 'Room', 'Room'),
    unknownGuest: pick('\u65c5\u4eba', 'Traveler', 'Traveler', 'Traveler'),
    confirmCancel: pick('\u78ba\u5b9a\u8981\u53d6\u6d88\u9019\u7b46\u8a02\u623f\u55ce\uff1f', 'Cancel this booking?', 'Cancel this booking?', 'Cancel this booking?'),
    nightUnit: pick('\u665a', 'nights', 'nights', 'nights'),
    guestUnit: pick('\u4eba', 'guests', 'guests', 'guests'),
  };

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);

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
      setBookings((data as Booking[]) || []);
      setLoading(false);
    };
    void fetchBookings();
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

  const timelineSteps = [
    { key: 'ordered', label: pick('\u5df2\u4e0b\u8a02', 'Booked', 'Booked', 'Booked') },
    { key: 'paid', label: pick('\u5df2\u4ed8\u6b3e', 'Paid', 'Paid', 'Paid') },
    { key: 'confirmed', label: pick('\u623f\u6771\u78ba\u8a8d', 'Host Confirmed', 'Host Confirmed', 'Host Confirmed') },
    { key: 'upcoming', label: pick('\u5373\u5c07\u5165\u4f4f', 'Upcoming Stay', 'Upcoming Stay', 'Upcoming Stay') },
    { key: 'completed', label: pick('\u5df2\u5b8c\u6210\u5165\u4f4f', 'Stay Completed', 'Stay Completed', 'Stay Completed') },
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
