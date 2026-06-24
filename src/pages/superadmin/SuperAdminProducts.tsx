import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Tag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  image_url: string | null;
  sku: string | null;
  vendor_id: string | null;
  category_id: string | null;
  origin?: string | null;
  roast_level?: string | null;
  processing_method?: string | null;
  flavor_notes?: string[] | null;
  tags?: string[] | null;
  vendors?: { name: string } | null;
  categories?: { name: string } | null;
}

type ProductIssue = '缺圖片' | '缺分類' | '缺供應商' | '缺 SKU' | '無庫存' | '缺風味資料';

function getProductIssues(product: Product): ProductIssue[] {
  const issues: ProductIssue[] = [];

  if (!product.image_url) issues.push('缺圖片');
  if (!product.category_id) issues.push('缺分類');
  if (!product.vendor_id) issues.push('缺供應商');
  if (!product.sku) issues.push('缺 SKU');
  if (product.stock_quantity <= 0) issues.push('無庫存');

  const hasCoffeeMetadata = Boolean(
    product.origin ||
    product.roast_level ||
    product.processing_method ||
    (product.flavor_notes && product.flavor_notes.length > 0) ||
    (product.tags && product.tags.length > 0),
  );
  if (!hasCoffeeMetadata) issues.push('缺風味資料');

  return issues;
}

function getCompleteness(product: Product) {
  const issues = getProductIssues(product);
  const score = Math.max(0, Math.round(((6 - issues.length) / 6) * 100));

  return { score, issues };
}

export default function SuperAdminProducts() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialParams = new URLSearchParams(location.search);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get('q') || '');
  }, [location.search]);

  useEffect(() => {
    const fetchProducts = async () => {
      setError('');
      const { data, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, stock_quantity, is_active, image_url, sku, vendor_id, category_id, origin, roast_level, processing_method, flavor_notes, tags, vendors(name), categories!products_category_id_fkey(name)')
        .order('name');

      if (productsError) {
        setError(productsError.message);
        setProducts([]);
        setLoading(false);
        return;
      }

      setProducts((data || []) as unknown as Product[]);
      setLoading(false);
    };

    fetchProducts();
  }, []);

  const qualityStats = useMemo(() => {
    const incomplete = products.filter(product => getProductIssues(product).length > 0).length;
    const missingImage = products.filter(product => !product.image_url).length;
    const missingFlavor = products.filter(product => getProductIssues(product).includes('缺風味資料')).length;

    return { incomplete, missingImage, missingFlavor };
  }, [products]);

  const filtered = products.filter(product => {
    const q = search.toLowerCase();
    const issues = getProductIssues(product);
    const matchSearch = !search
      || product.name.toLowerCase().includes(q)
      || (product.sku || '').toLowerCase().includes(q)
      || (product.vendors?.name || '').toLowerCase().includes(q)
      || (product.categories?.name || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? product.is_active : !product.is_active);
    const matchStock = stockFilter === 'all'
      || (stockFilter === 'instock' && product.stock_quantity > 5)
      || (stockFilter === 'low' && product.stock_quantity > 0 && product.stock_quantity <= 5)
      || (stockFilter === 'out' && product.stock_quantity === 0);
    const matchQuality = qualityFilter === 'all'
      || (qualityFilter === 'complete' && issues.length === 0)
      || (qualityFilter === 'incomplete' && issues.length > 0)
      || issues.includes(qualityFilter as ProductIssue);

    return matchSearch && matchStatus && matchStock && matchQuality;
  });

  const totalValue = products.reduce((sum, product) => sum + product.price * product.stock_quantity, 0);
  const outOfStock = products.filter(product => product.stock_quantity === 0).length;
  const lowStock = products.filter(product => product.stock_quantity > 0 && product.stock_quantity <= 5).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2">
            <ShoppingBag className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
            <p className="text-sm text-gray-400">檢查上架商品、庫存與資料完整度，快速找出缺圖或缺規格的品項。</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/superadmin/products/new')}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          新增商品
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: '商品總數', value: products.length, color: 'bg-amber-50 text-amber-700' },
          { label: '低庫存', value: lowStock, color: 'bg-orange-50 text-orange-600' },
          { label: '售完', value: outOfStock, color: 'bg-red-50 text-red-600' },
          { label: '資料未完整', value: qualityStats.incomplete, color: 'bg-sky-50 text-sky-700' },
          { label: '缺圖片', value: qualityStats.missingImage, color: 'bg-slate-100 text-slate-700' },
        ].map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-2xl bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${stat.color}`}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="搜尋商品名稱、SKU、供應商或分類"
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400">
          <option value="all">全部狀態</option>
          <option value="active">上架中</option>
          <option value="inactive">未上架</option>
        </select>
        <select value={stockFilter} onChange={event => setStockFilter(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400">
          <option value="all">全部庫存</option>
          <option value="instock">庫存充足</option>
          <option value="low">低庫存</option>
          <option value="out">售完</option>
        </select>
        <select value={qualityFilter} onChange={event => setQualityFilter(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-amber-400">
          <option value="all">全部完整度</option>
          <option value="complete">資料完整</option>
          <option value="incomplete">資料未完整</option>
          <option value="缺圖片">缺圖片</option>
          <option value="缺分類">缺分類</option>
          <option value="缺供應商">缺供應商</option>
          <option value="缺風味資料">缺風味資料</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          商品資料載入失敗：{error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <ShoppingBag className="mx-auto mb-2 h-10 w-10 opacity-20" />
            <p>沒有符合條件的商品</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">商品</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">供應商</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">分類</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">售價</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">庫存</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">完整度</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">狀態</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((product, index) => {
                  const completeness = getCompleteness(product);

                  return (
                    <motion.tr key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.015 }} className="hover:bg-amber-50/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="h-11 w-11 flex-shrink-0 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
                              <ImageOff className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{product.name}</p>
                            {product.sku && <p className="font-mono text-xs text-gray-400">{product.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Store className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                          {product.vendors?.name || <span className="text-gray-300">未指定</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {product.categories?.name ? (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Tag className="h-3 w-3 text-gray-400" />
                            {product.categories.name}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">未分類</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(product.price)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {product.stock_quantity <= 5 && <AlertTriangle className={`h-3.5 w-3.5 ${product.stock_quantity === 0 ? 'text-red-500' : 'text-orange-400'}`} />}
                          <span className={`font-semibold ${product.stock_quantity === 0 ? 'text-red-600' : product.stock_quantity <= 5 ? 'text-orange-500' : 'text-gray-700'}`}>
                            {product.stock_quantity}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-40">
                          <div className="mb-1 flex items-center gap-2">
                            {completeness.issues.length === 0 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            <span className="text-xs font-bold text-gray-700">{completeness.score}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                            <div className={`h-full ${completeness.score === 100 ? 'bg-green-500' : completeness.score >= 67 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${completeness.score}%` }} />
                          </div>
                          {completeness.issues.length > 0 && (
                            <p className="mt-1 line-clamp-1 text-xs text-gray-400">{completeness.issues.join('、')}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {product.is_active ? '上架中' : '未上架'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/superadmin/products/detail/${product.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 hover:text-sky-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            查看
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/superadmin/products/${product.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-100 hover:text-amber-800"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            編輯
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>顯示 {filtered.length} / {products.length} 件商品，缺風味資料 {qualityStats.missingFlavor} 件</span>
          <span>庫存總價值 {formatCurrency(totalValue)}</span>
        </div>
      )}
    </div>
  );
}
