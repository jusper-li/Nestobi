import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, CreditCard as Edit, Trash2, LogOut, Home } from 'lucide-react';
import { supabase, Property } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此物業嗎？')) return;

    setDeleteId(id);
    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);

      if (error) throw error;
      setProperties(properties.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('刪除物業失敗');
    } finally {
      setDeleteId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-cream">
      <nav className="bg-white text-[#2C1F10] border-b border-[#F0E4C8] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src="/20260407_nestobi_logo.svg"
                alt="Kessaku"
                className="h-12 w-auto brightness-0 invert"
              />
              <span className="text-lg font-medium">管理員</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-[#2C1F10]/70 text-sm">{user?.email}</span>
              <a
                href="/"
                className="px-4 py-2 bg-cream/10 hover:bg-cream/20 rounded-sm transition-colors flex items-center"
              >
                <Home size={18} className="mr-2" />
                查看網站
              </a>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-cream/10 hover:bg-cream/20 rounded-sm transition-colors flex items-center"
              >
                <LogOut size={18} className="mr-2" />
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif text-charcoal mb-2">物業管理</h2>
            <p className="text-charcoal/60">管理您的房地產投資組合</p>
          </div>
          <button
            onClick={() => navigate('/admin/properties/new')}
            className="px-6 py-3 bg-[#C09A6A] text-white font-medium rounded-sm hover:bg-[#8B6840] transition-all duration-300 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            新增物業
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/50 animate-pulse rounded-sm h-32" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-sm shadow-md p-12 text-center">
            <p className="text-charcoal/60 mb-4">未找到物業</p>
            <button
              onClick={() => navigate('/admin/properties/new')}
              className="px-6 py-3 bg-[#C09A6A] text-white font-medium rounded-sm hover:bg-[#8B6840] transition-all duration-300"
            >
              新增您的第一個物業
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-sm shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F0E4C8] text-[#2C1F10]">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium">物業</th>
                    <th className="px-6 py-4 text-left font-medium">位置</th>
                    <th className="px-6 py-4 text-left font-medium">每股價格</th>
                    <th className="px-6 py-4 text-left font-medium">可售</th>
                    <th className="px-6 py-4 text-left font-medium">狀態</th>
                    <th className="px-6 py-4 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property, index) => (
                    <motion.tr
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-charcoal/10 hover:bg-cream/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <img
                            src={property.image_url}
                            alt={property.name}
                            className="w-16 h-16 object-cover rounded-sm mr-4"
                          />
                          <div>
                            <p className="font-medium text-charcoal">{property.name}</p>
                            <p className="text-sm text-charcoal/60 line-clamp-1">
                              {property.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-charcoal/70">{property.location}</td>
                      <td className="px-6 py-4 font-medium text-charcoal">
                        {formatPrice(property.price_per_share)}
                      </td>
                      <td className="px-6 py-4 text-charcoal/70">
                        {property.available_shares}/{property.total_shares}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-sm ${
                            property.status === 'Available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : property.status === 'Waitlist Open'
                              ? 'bg-[#C09A6A]/20 text-[#2C1F10]'
                              : 'bg-[#C09A6A]/10 text-[#2C1F10]'
                          }`}
                        >
                          {property.status === 'Available' ? '可售' : property.status === 'Waitlist Open' ? '候補開放' : '已售出'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/admin/properties/${property.id}`)}
                            className="p-2 hover:bg-[#C09A6A]/20 rounded-sm transition-colors"
                            title="編輯"
                          >
                            <Edit size={18} className="text-charcoal" />
                          </button>
                          <button
                            onClick={() => handleDelete(property.id)}
                            disabled={deleteId === property.id}
                            className="p-2 hover:bg-red-100 rounded-sm transition-colors disabled:opacity-50"
                            title="刪除"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
