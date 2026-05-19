import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

interface PurchaseRecord { id: string; product_id: string; quantity: number; unit_price: number; total_price: number; products: { name: string; image_url: string } | null; }
interface Order { id: string; total_amount: number; status: string; payment_status: string; payment_method: string; created_at: string; }

const MemberOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PurchaseRecord[]>>({});

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      const { data } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  const toggleExpand = async (orderId: string) => {
    if (expandedId === orderId) { setExpandedId(null); return; }
    setExpandedId(orderId);
    if (!details[orderId]) {
      const { data } = await supabase.from('purchase_records').select('*, products(name, image_url)').eq('order_id', orderId);
      setDetails(prev => ({ ...prev, [orderId]: (data as any) || [] }));
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-[#0D9488]" />我的訂單</h2>
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <ShoppingBag className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400">尚無訂單紀錄</p>
        </div>
      ) : (
        orders.map((order, i) => (
          <motion.div key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-semibold text-gray-900">訂單 #{order.id.slice(-10).toUpperCase()}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {order.payment_status === 'paid' ? '已付款' : '待付款'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#2C1F10] text-lg">{formatCurrency(order.total_amount)}</p>
                <button onClick={() => toggleExpand(order.id)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition">
                  {expandedId === order.id ? <><ChevronUp className="w-4 h-4" />收起詳情</> : <><ChevronDown className="w-4 h-4" />查看詳情</>}
                </button>
              </div>
            </div>
            {expandedId === order.id && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-gray-100 p-5">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-1.5"><Package className="w-4 h-4" />訂單明細</h4>
                {(details[order.id] || []).map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <img src={item.products?.image_url || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=60'} alt={item.products?.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.products?.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.total_price)}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        ))
      )}
    </div>
  );
};

export default MemberOrders;
