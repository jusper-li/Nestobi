import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, Calendar, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface Booking {
  id: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_price: number;
  status: string;
  special_requests: string;
  created_at: string;
  tbl_rooms: { name: string; location: string; image_url: string } | null;
}

const MemberBookings: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase.from('tbl_bookings').select('*, tbl_rooms(name, location, image_url)').eq('user_id', user.id).order('created_at', { ascending: false });
    setBookings((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const handleCancel = async (id: string) => {
    if (!confirm('確定要取消這筆訂房？')) return;
    setCancelId(id);
    try {
      await supabase.from('tbl_bookings').update({ status: 'cancelled' }).eq('id', id);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    } finally {
      setCancelId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BedDouble className="w-5 h-5 text-[#2C1F10]" />我的訂房</h2>
      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <BedDouble className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400">尚無訂房紀錄</p>
        </div>
      ) : (
        bookings.map((booking, i) => (
          <motion.div key={booking.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-0">
              <img
                src={booking.tbl_rooms?.image_url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=200'}
                alt={booking.tbl_rooms?.name}
                className="w-full sm:w-36 h-32 sm:h-auto object-cover flex-shrink-0"
              />
              <div className="p-5 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{booking.tbl_rooms?.name || '房型'}</h3>
                    <p className="text-gray-500 text-sm">{booking.tbl_rooms?.location}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(booking.status)}`}>{getStatusLabel(booking.status)}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1"><Calendar className="w-4 h-4 text-gray-400" />{formatDate(booking.check_in_date)} ~ {formatDate(booking.check_out_date)}</div>
                  <div className="flex items-center gap-1"><Users className="w-4 h-4 text-gray-400" />{booking.guests} 位賓客</div>
                </div>
                {booking.special_requests && (
                  <div className="flex items-start gap-1 text-sm text-gray-500 mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-xs">{booking.special_requests}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#2C1F10]">{formatCurrency(booking.total_price)}</p>
                  {booking.status === 'confirmed' && (
                    <button onClick={() => handleCancel(booking.id)} disabled={cancelId === booking.id} className="text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-50">
                      {cancelId === booking.id ? '取消中...' : '取消訂房'}
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
};

export default MemberBookings;
