import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Minus, Plus, RefreshCw, ShoppingCart } from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../lib/utils";

type Store = { id: string; name: string; name_en?: string | null };
type Product = { id: string; name: string; price: number; image_url?: string | null; stock_quantity?: number | null; is_active?: boolean | null };
type CartLine = Product & { quantity: number };

export default function StorePos() {
  const { role, storeAssignments } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [qrUrl, setQrUrl] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [order, setOrder] = useState<{ id: string; merchantOrderNo: string; total: number; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(() => Object.values(cart).reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const add = (product: Product) => setCart((current) => ({ ...current, [product.id]: { ...product, quantity: (current[product.id]?.quantity || 0) + 1 } }));
  const change = (id: string, delta: number) => setCart((current) => {
    const line = current[id];
    if (!line) return current;
    const quantity = line.quantity + delta;
    if (quantity <= 0) { const next = { ...current }; delete next[id]; return next; }
    return { ...current, [id]: { ...line, quantity } };
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = storeAssignments.map((item) => item.store_location_id);
      let query = supabase.from("store_locations").select("id,name,name_en").eq("is_active", true).order("name");
      if (role !== "admin" && role !== "superadmin" && ids.length) query = query.in("id", ids);
      const { data, error: storeError } = await query;
      if (cancelled) return;
      if (storeError) setError(storeError.message);
      const rows = (data || []) as Store[];
      setStores(rows);
      setStoreId(rows[0]?.id || "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [role, storeAssignments]);

  useEffect(() => {
    if (!storeId) return;
    setCart({});
    supabase.from("products").select("id,name,price,image_url,stock_quantity,is_active").eq("store_location_id", storeId).eq("is_active", true).order("name")
      .then(({ data, error: productError }) => { if (productError) setError(productError.message); setProducts((data || []) as Product[]); });
  }, [storeId]);

  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase.channel(`pos-order-${order.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, (payload) => {
      const next = payload.new as { payment_status?: string; total_amount?: number };
      setOrder((current) => current ? { ...current, status: String(next.payment_status || current.status), total: Number(next.total_amount ?? current.total) } : current);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [order?.id]);

  const createOrder = async () => {
    if (!storeId || !Object.keys(cart).length) return;
    setBusy(true); setError("");
    const { data, error: createError } = await supabase.rpc("create_pos_order", { p_store_location_id: storeId, p_items: Object.values(cart).map((item) => ({ product_id: item.id, quantity: item.quantity })) });
    if (createError || !data?.success) { setError(createError?.message || data?.error || "無法建立待付款訂單。"); setBusy(false); return; }
    const url = `${window.location.origin}/pos/pay/${encodeURIComponent(data.paymentToken)}`;
    setQrUrl(url);
    setQrImage(await QRCode.toDataURL(url, { width: 360, margin: 2 }));
    setOrder({ id: data.orderId, merchantOrderNo: data.merchantOrderNo, total: Number(data.subtotal || total), status: "unpaid" });
    setBusy(false);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-600" /></div>;
  return <main className="min-h-screen bg-stone-50 px-4 py-6 md:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold tracking-[0.25em] text-amber-700">STORE POS</p><h1 className="mt-1 text-3xl font-bold text-slate-900">門市快速結帳</h1><p className="mt-1 text-sm text-slate-500">選商品建立待付款訂單，讓客人掃描 QR Code 完成付款。</p></div>
        <select value={storeId} onChange={(event) => setStoreId(event.target.value)} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold"><option value="">選擇門市</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select>
      </div>
      {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold"><ShoppingCart className="h-5 w-5 text-amber-600" />商品</h2><button type="button" onClick={() => storeId && supabase.from("products").select("id,name,price,image_url,stock_quantity,is_active").eq("store_location_id", storeId).eq("is_active", true).order("name").then(({ data }) => setProducts((data || []) as Product[]))} className="text-sm text-slate-500"><RefreshCw className="mr-1 inline h-4 w-4" />更新</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <button key={product.id} type="button" onClick={() => add(product)} className="overflow-hidden rounded-xl border border-stone-200 text-left transition hover:border-amber-400 hover:shadow-sm"><div className="aspect-[4/3] bg-stone-100">{product.image_url && <img src={product.image_url} alt="" className="h-full w-full object-cover" />}</div><div className="p-3"><p className="font-semibold text-slate-900">{product.name}</p><p className="mt-1 text-sm text-amber-700">{formatCurrency(Number(product.price))}</p><p className="mt-1 text-xs text-slate-400">庫存 {product.stock_quantity ?? "-"}</p></div></button>)}</div></section>
        <aside className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">本次訂單</h2>{Object.values(cart).length === 0 ? <p className="py-10 text-center text-sm text-slate-400">請先選擇商品</p> : <div className="mt-4 space-y-3">{Object.values(cart).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3"><div className="min-w-0"><p className="truncate font-medium">{item.name}</p><p className="text-sm text-slate-500">{formatCurrency(Number(item.price))}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => change(item.id, -1)} className="rounded-full border p-1"><Minus className="h-3 w-3" /></button><span className="w-5 text-center text-sm">{item.quantity}</span><button type="button" onClick={() => change(item.id, 1)} className="rounded-full border p-1"><Plus className="h-3 w-3" /></button></div></div>)}</div>}<div className="mt-5 flex justify-between border-t pt-4 text-lg font-bold"><span>合計</span><span>{formatCurrency(total)}</span></div><button type="button" disabled={busy || !Object.keys(cart).length} onClick={createOrder} className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "建立待付款訂單"}</button>
          {order && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center"><p className="text-sm font-semibold text-amber-900">訂單 {order.merchantOrderNo}</p>{order.status === "paid" ? <><CheckCircle2 className="mx-auto my-4 h-14 w-14 text-emerald-600" /><p className="font-bold text-emerald-700">付款成功</p></> : <><p className="mt-1 text-sm text-amber-800">請客人掃描 QR Code</p>{qrImage && <img src={qrImage} alt="POS 付款 QR Code" className="mx-auto my-3 rounded-lg bg-white p-2" />}<a href={qrUrl} target="_blank" rel="noreferrer" className="break-all text-xs text-slate-500">{qrUrl}</a></>}</div>}
          {order?.status === "paid" && <button type="button" onClick={() => { setOrder(null); setQrUrl(""); setQrImage(""); setCart({}); }} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm font-semibold">建立下一筆</button>}
        </aside>
      </div>
    </div>
  </main>;
}
