import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { logAdminAction } from '../../lib/auditLog';

interface Product { id: string; name: string; price: number; stock_quantity: number; is_active: boolean; image_url: string; category_id: string; categories: { name: string } | null; }

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setError('');
      const { data, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, is_active, image_url, category_id, categories!products_category_id_fkey(name)')
        .order('name');

      if (productsError) {
        setError(productsError.message);
        setProducts([]);
        setLoading(false);
        return;
      }

      setProducts((data as any) || []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此商品？')) return;
    await supabase.from('products').delete().eq('id', id);
    await logAdminAction('delete_product', 'products', id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await supabase.from('products').update({ is_active: !current }).eq('id', id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#2C1F10] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
        <Link to="/admin/products/new" className="flex items-center gap-1.5 bg-[#C09A6A] hover:bg-[#8B6840] text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm">
          <Plus className="w-4 h-4" />新增商品
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            商品資料載入失敗：{error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">商品</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">分類</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">價格</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">庫存</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">狀態</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image_url || 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=60'} alt={p.name} className="w-12 h-10 object-cover rounded-lg flex-shrink-0" />
                      <p className="font-medium text-gray-900 text-sm line-clamp-1">{p.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.categories?.name || '未分類'}</span></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${p.stock_quantity <= 5 ? 'text-orange-500' : p.stock_quantity === 0 ? 'text-red-500' : 'text-gray-700'}`}>{p.stock_quantity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(p.id, p.is_active)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${p.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {p.is_active ? '上架中' : '已下架'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/products/${p.id}`} className="p-1.5 text-gray-400 hover:text-[#2C1F10] hover:bg-[#F0E4C8] rounded-lg transition"><Pencil className="w-4 h-4" /></Link>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <div className="text-center py-12 text-gray-400 flex flex-col items-center gap-2"><Package className="w-10 h-10 opacity-20" /><p>暫無商品資料</p></div>}
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
