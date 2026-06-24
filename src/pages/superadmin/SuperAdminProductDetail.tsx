import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, ImageOff, Package, Pencil, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  images?: string[] | null;
  stock_quantity: number;
  is_active: boolean;
  sku: string | null;
  origin?: string | null;
  roast_level?: string | null;
  processing_method?: string | null;
  altitude?: string | null;
  variety?: string[] | null;
  flavor_notes?: string[] | null;
  weight_grams?: number | null;
  tags?: string[] | null;
  source_url?: string | null;
  roast_date?: string | null;
  created_at: string;
  updated_at: string;
  vendors?: { id?: string | null; name?: string | null } | null;
  categories?: { id?: string | null; name?: string | null; slug?: string | null } | null;
}

export default function SuperAdminProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      const { data, error: loadError } = await supabase
        .from('products')
        .select('id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,roast_date,created_at,updated_at,vendor_id,vendors(id,name),category_id,categories(id,name,slug)')
        .eq('id', id)
        .maybeSingle();

      if (loadError) setError(loadError.message);
      else setProduct((data as ProductDetail) || null);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/superadmin/products')}
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Load failed'}
        </div>
      </div>
    );
  }

  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const cover = product.image_url || images[0] || '';
  const variety = product.variety || [];
  const flavorNotes = product.flavor_notes || [];
  const tags = product.tags || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/superadmin/products')}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
        <div className="rounded-xl bg-amber-100 p-2">
          <ShoppingBag className="h-6 w-6 text-amber-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500">{product.sku || product.id}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/superadmin/products/${product.id}`)}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          <Pencil className="h-4 w-4" />
          前往編輯
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {cover ? (
              <img src={cover} alt={product.name} className="h-72 w-full object-cover" />
            ) : (
              <div className="flex h-72 items-center justify-center bg-gray-100 text-gray-300">
                <ImageOff className="h-12 w-12" />
              </div>
            )}
            <div className="border-t border-gray-100 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {product.is_active ? '上架中' : '未上架'}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  庫存 {product.stock_quantity}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {formatCurrency(product.price)}
                </span>
                {product.roast_date ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    烘焙日 {product.roast_date}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">重量</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {product.weight_grams ? `${product.weight_grams} g` : '-'}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">產地</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{product.origin || '-'}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500">處理法</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{product.processing_method || '-'}</p>
                </div>
              </div>

              <div className="mt-4 prose max-w-none text-gray-700">
                <p>{product.description || 'No description'}</p>
              </div>
            </div>
          </div>

          {images.length > 0 && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">照片</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {images.map((src, index) => (
                  <img
                    key={`${src}-${index}`}
                    src={src}
                    alt={`${product.name}-${index + 1}`}
                    className="h-28 w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">風味與標籤</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500">風味描述</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {flavorNotes.length ? (
                    flavorNotes.map((note) => (
                      <span key={note} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        {note}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">尚未設定風味</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">標籤</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.length ? (
                    tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">尚未設定標籤</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">品種</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {variety.length ? (
                    variety.map((item) => (
                      <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">尚未設定品種</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">基本資料</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500">廠商</p>
                {product.vendors?.id ? (
                  <Link
                    to={`/superadmin/vendors/detail/${product.vendors.id}`}
                    className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
                  >
                    {product.vendors.name || product.vendors.id}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="mt-1 text-gray-700">-</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">分類</p>
                <p className="mt-1 font-semibold text-gray-900">{product.categories?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">烘焙程度</p>
                <p className="mt-1 text-gray-700">{product.roast_level || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">海拔</p>
                <p className="mt-1 text-gray-700">{product.altitude || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">外部連結</p>
                {product.source_url ? (
                  <a
                    href={product.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-amber-700 hover:underline"
                  >
                    {product.source_url}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-1 text-gray-700">-</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">建立時間</p>
                <p className="mt-1 text-gray-700">{new Date(product.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">更新時間</p>
                <p className="mt-1 text-gray-700">{new Date(product.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">快速操作</h2>
            <div className="space-y-3 text-sm">
              {product.vendors?.id ? (
                <Link
                  to={`/superadmin/vendors/detail/${product.vendors.id}`}
                  className="block rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium text-gray-800 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800"
                >
                  前往廠商頁
                </Link>
              ) : null}
              {product.categories?.name ? (
                <Link
                  to={`/superadmin/products?q=${encodeURIComponent(product.categories.name)}`}
                  className="block rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-medium text-gray-800 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800"
                >
                  查看同分類商品
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => navigate(`/superadmin/products/${product.id}`)}
                className="block w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                編輯商品
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              商品摘要
            </div>
            <p className="mt-2 leading-6">
              這裡可以快速查看商品的價格、庫存、來源與風味標籤，方便後台做內容維護與推薦判斷。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
