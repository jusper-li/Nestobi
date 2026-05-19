import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, FileText, CheckCircle, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, dateDiffInDays } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import Navigation from '../../components/Navigation';

const SEND_EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

interface Room { id: string; name: string; price_per_night: number; image_url: string; location: string; capacity: number; }

const DAY_LABELS: Record<number, string> = { 0: '週日', 1: '週一', 2: '週二', 3: '週三', 4: '週四', 5: '週五', 6: '週六' };

function calcNightPrices(checkIn: string, checkOut: string, basePrice: number, dayPrices: Record<number, number>) {
  const result: { date: string; day: number; price: number }[] = [];
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const cur = new Date(start);
  while (cur < end) {
    const dow = cur.getDay();
    result.push({
      date: cur.toISOString().split('T')[0],
      day: dow,
      price: dayPrices[dow] > 0 ? dayPrices[dow] : basePrice,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

const BookingForm: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  useEffect(() => {
    const fetchRoom = async () => {
      const [{ data }, { data: prices }] = await Promise.all([
        supabase.from('tbl_rooms').select('*').eq('id', roomId).single(),
        supabase.from('tbl_room_day_prices').select('day_of_week, price').eq('room_id', roomId),
      ]);
      setRoom(data);
      if (prices) {
        const map: Record<number, number> = {};
        prices.forEach((p: any) => { map[p.day_of_week] = Number(p.price); });
        setDayPrices(map);
      }
      setFetchLoading(false);
    };
    if (roomId) fetchRoom();
  }, [roomId]);

  const nights = checkIn && checkOut ? dateDiffInDays(checkIn, checkOut) : 0;
  const nightBreakdown = nights > 0 && room ? calcNightPrices(checkIn, checkOut, room.price_per_night, dayPrices) : [];
  const totalPrice = nightBreakdown.reduce((sum, n) => sum + n.price, 0);
  const hasVariablePricing = Object.keys(dayPrices).some(k => dayPrices[Number(k)] > 0);
  const pointsEarned = Math.floor(totalPrice / 100) * 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !room) { setError('請先登入後再預訂'); return; }
    if (nights <= 0) { setError('請選擇有效的入住和退房日期'); return; }
    setLoading(true);
    setError('');
    try {
      const { data: booking, error: bookingErr } = await supabase.from('tbl_bookings').insert({
        user_id: user.id, room_id: room.id, check_in_date: checkIn, check_out_date: checkOut,
        guests, total_price: totalPrice, status: 'confirmed', special_requests: specialRequests,
      }).select().single();
      if (bookingErr) throw bookingErr;
      if (pointsEarned > 0) {
        await supabase.from('points').insert({
          user_id: user.id, amount: pointsEarned, transaction_type: 'earn',
          reference_id: booking.id, description: `訂房獲得點數：${room.name}`,
        });
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const { data: profile } = await supabase.from('tbl_mn5wgzh0').select('display_name').eq('user_id', user.id).maybeSingle();
        fetch(SEND_EMAIL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
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
              totalPrice,
              nights,
              pointsEarned,
            },
          }),
        });
      }
      setSuccess(true);
    } catch (err: any) {
      setError('預訂失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return (
    <div className="min-h-screen bg-gray-50"><Navigation />
      <div className="flex justify-center py-32"><div className="w-10 h-10 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-gray-50"><Navigation />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">預訂成功！</h2>
          <p className="text-gray-500 mb-2">您已獲得 <strong className="text-[#2C1F10]">{pointsEarned}</strong> 點數</p>
          <p className="text-gray-500 mb-8">總費用：<strong>{formatCurrency(totalPrice)}</strong></p>
          <button onClick={() => navigate('/member')} className="bg-[#C09A6A] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#8B6840] transition">查看我的訂房</button>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50"><Navigation />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">完成預訂</h1>
        {room && (
          <div className="bg-white rounded-2xl shadow-md p-5 mb-6 flex gap-4">
            <img src={room.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=200'} alt={room.name} className="w-24 h-20 object-cover rounded-xl flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">{room.name}</h3>
              <div className="flex items-center gap-1 text-gray-500 text-sm mt-1"><MapPin className="w-3.5 h-3.5" />{room.location}</div>
              <p className="text-[#2C1F10] font-semibold mt-1">{formatCurrency(room.price_per_night)} / 晚</p>
            </div>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Calendar className="w-4 h-4" />入住日期</label>
              <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Calendar className="w-4 h-4" />退房日期</label>
              <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} required min={checkIn || new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Users className="w-4 h-4" />入住人數</label>
            <input type="number" value={guests} onChange={e => setGuests(Number(e.target.value))} min={1} max={room?.capacity || 10} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FileText className="w-4 h-4" />特殊需求（選填）</label>
            <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} rows={3} placeholder="例：需要嬰兒床、早到入住等..." className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C1F10] resize-none" />
          </div>
          {nights > 0 && room && (
            <div className="bg-[#F0E4C8] rounded-xl p-4 space-y-1">
              {hasVariablePricing ? (
                nightBreakdown.map((n, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600">
                    <span>{n.date} ({DAY_LABELS[n.day]})</span>
                    <span>{formatCurrency(n.price)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-sm text-gray-600"><span>{formatCurrency(room.price_per_night)} × {nights} 晚</span><span>{formatCurrency(totalPrice)}</span></div>
              )}
              <div className="flex justify-between text-sm text-green-600 pt-1"><span>獲得點數</span><span>+{pointsEarned} 點</span></div>
              <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-[#D5CDB8] pt-2"><span>總費用</span><span className="text-[#2C1F10]">{formatCurrency(totalPrice)}</span></div>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-[#C09A6A] hover:bg-[#8B6840] text-white font-semibold py-3 rounded-xl transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '確認預訂'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;
