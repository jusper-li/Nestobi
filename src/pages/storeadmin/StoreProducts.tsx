import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Package, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../lib/utils";

type Store = { id: string; name: string };
type Product = { id: string; name: string; sku: string | null; price: number; stock_quantity: number | null; is_active: boolean | null; image_url: string | null };
type Props = { createOnly?: boolean };

export default function StoreProducts({ createOnly = false }: Props) {
  const { role, storeAssignments } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: "", description: "", price: "", stock_quantity: "0", sku: "", image_url: "", is_active: true });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadProducts = async (id: string) => {
    if (!id) return;
    const { data, error } = await supabase.from("products").select("id,name,sku,price,stock_quantity,is_active,image_url").eq("store_location_id", id).order("created_at", { ascending: false });
    if (error) setMessage(error.message); else setProducts((data || []) as Product[]);
  };
  useEffect(() => {
    const ids = storeAssignments.map((item) => item.store_location_id);
    let query = supabase.from("store_locations").select("id,name").eq("is_active", true).order("name");
    if (role !== "admin" && role !== "superadmin" && ids.length) query = query.in("id", ids);
    query.then(({ data, error }) => { if (error) setMessage(error.message); const rows = (data || []) as Store[]; setStores(rows); setStoreId(rows[0]?.id || ""); setLoading(false); });
  }, [role, storeAssignments]);
  useEffect(() => { void loadProducts(storeId); }, [storeId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!storeId || !form.name.trim()) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.from("products").insert({ store_location_id: storeId, name: form.name.trim(), description: form.description.trim(), price: Number(form.price || 0), stock_quantity: Number(form.stock_quantity || 0), sku: form.sku.trim(), image_url: form.image_url.trim(), is_active: form.is_active });
    if (error) setMessage(error.message); else { setMessage("商品已建立"); setForm({ name: "", description: "", price: "", stock_quantity: "0", sku: "", image_url: "", is_active: true }); if (!createOnly) await loadProducts(storeId); }
    setBusy(false);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  return <main className="min-h-screen bg-stone-50 px-4 py-6 md:px-8"><div className="mx-auto max-w-6xl"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold tracking-[0.25em] text-amber-700">STORE PRODUCTS</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-bold"><Package className="h-7 w-7 text-amber-600" />{createOnly ? "建立商品" : "商品管理"}</h1><p className="mt-1 text-sm text-slate-500">{createOnly ? "建立商品與初始庫存。" : "查看門市商品、價格、庫存與上架狀態。"}</p></div><div className="flex gap-2">{createOnly ? <button type="button" onClick={() => navigate("/member/store-admin/products")} className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold"><ArrowLeft className="mr-1 inline h-4 w-4" />返回商品管理</button> : <button type="button" onClick={() => navigate("/member/store-admin/products/new")} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="mr-1 inline h-4 w-4" />建立商品</button>}</div></div><div className="mb-5 rounded-2xl bg-white p-5 shadow-sm"><label className="mb-2 block text-sm font-semibold">管理門市</label><select value={storeId} onChange={(event) => setStoreId(event.target.value)} className="w-full max-w-md rounded-xl border px-4 py-3"><option value="">選擇門市</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></div>{message && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}{createOnly ? <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm"><div className="grid gap-4 md:grid-cols-2"><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="商品名稱" className="rounded-xl border px-4 py-3" /><input type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="價格" className="rounded-xl border px-4 py-3" /><input type="number" min="0" value={form.stock_quantity} onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })} placeholder="初始庫存" className="rounded-xl border px-4 py-3" /><input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="SKU" className="rounded-xl border px-4 py-3" /><input value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} placeholder="圖片網址" className="rounded-xl border px-4 py-3 md:col-span-2" /><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="商品說明" rows={5} className="rounded-xl border px-4 py-3 md:col-span-2" /></div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />立即上架</label><button disabled={busy || !storeId} className="mt-5 rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white disabled:opacity-40">{busy ? <Loader2 className="inline h-5 w-5 animate-spin" /> : "儲存商品"}</button></form> : <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="px-3 py-3">商品</th><th className="px-3 py-3">SKU</th><th className="px-3 py-3">價格</th><th className="px-3 py-3">庫存</th><th className="px-3 py-3">狀態</th></tr></thead><tbody className="divide-y">{products.map((product) => <tr key={product.id}><td className="px-3 py-4 font-semibold">{product.name}</td><td className="px-3 py-4 text-slate-500">{product.sku || "-"}</td><td className="px-3 py-4">{formatCurrency(Number(product.price))}</td><td className="px-3 py-4">{product.stock_quantity ?? 0}</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs ${product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{product.is_active ? "上架中" : "已下架"}</span></td></tr>)}</tbody></table>{!products.length && <p className="py-10 text-center text-sm text-slate-400">目前沒有商品</p>}</div></section>}</div></main>;
}
