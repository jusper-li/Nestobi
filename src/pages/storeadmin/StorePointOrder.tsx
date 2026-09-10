import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, Loader2, Printer, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../lib/utils";

type Store = { id: string; name: string };
type Order = { id: string; token: string; gross: number; status: string; points: number; finalAmount: number };

export default function StorePointOrder() {
  const { role, storeAssignments } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [amount, setAmount] = useState("");
  const [qr, setQr] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const ids = storeAssignments.map((item) => item.store_location_id);
    let query = supabase.from("store_locations").select("id,name").eq("is_active", true).order("name");
    if (role !== "admin" && role !== "superadmin" && ids.length) query = query.in("id", ids);
    query.then(({ data, error: loadError }) => { if (loadError) setError(loadError.message); const rows = (data || []) as Store[]; setStores(rows); setStoreId(rows[0]?.id || ""); });
  }, [role, storeAssignments]);

  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase.channel(`store-point-order-${order.id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "store_orders", filter: `id=eq.${order.id}` }, (payload) => {
      const next = payload.new as { status?: string; points_used?: number; final_amount?: number };
      setOrder((current) => current ? { ...current, status: String(next.status || current.status), points: Number(next.points_used ?? current.points), finalAmount: Number(next.final_amount ?? current.finalAmount) } : current);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [order?.id]);

  const create = async () => {
    setBusy(true); setError("");
    const gross = Math.round(Number(amount));
    const { data, error: createError } = await supabase.rpc("create_store_point_order", { p_store_location_id: storeId, p_gross_amount: gross });
    if (createError || !data?.success) { setError(createError?.message || data?.error || "無法建立抵用單。"); setBusy(false); return; }
    const url = `${window.location.origin}/store/redeem/${data.checkoutToken}`;
    setQr(await QRCode.toDataURL(url, { width: 360, margin: 2 }));
    setOrder({ id: data.orderId, token: url, gross, status: "waiting_customer", points: 0, finalAmount: gross });
    setBusy(false);
  };
  const reset = () => { setOrder(null); setQr(""); setAmount(""); };

  return <main className="min-h-screen bg-stone-50 px-4 py-6 md:px-8"><div className="mx-auto max-w-5xl"><div className="mb-6"><p className="text-sm font-semibold tracking-[0.25em] text-amber-700">STORE POINTS</p><h1 className="mt-1 text-3xl font-bold">門市點數抵用 QR Code</h1><p className="mt-1 text-sm text-slate-500">先輸入本次消費金額，再讓客人掃描單筆 QR Code 抵用點數。</p></div>{error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="grid gap-6 lg:grid-cols-[1fr_360px]"><section className="rounded-2xl bg-white p-6 shadow-sm"><label className="mb-2 block text-sm font-semibold">門市</label><select value={storeId} onChange={(event) => setStoreId(event.target.value)} className="w-full rounded-xl border px-4 py-3"><option value="">選擇門市</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select><label className="mb-2 mt-5 block text-sm font-semibold">本次消費金額</label><input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="例如 850" className="w-full rounded-xl border px-4 py-3 text-2xl" disabled={!!order} /><button type="button" disabled={busy || !!order || !storeId || Number(amount) <= 0} onClick={create} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "建立待抵用單"}</button>{order && <div className="mt-6 space-y-3 rounded-2xl bg-stone-50 p-4"><p className="text-sm text-slate-500">訂單狀態</p><p className="font-bold text-slate-900">{order.status === "completed" ? "已完成抵用" : order.status === "customer_opened" ? "客人已開啟" : "等待客人掃碼"}</p><div className="grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-500">消費金額</span><p className="font-semibold">{formatCurrency(order.gross)}</p></div><div><span className="text-slate-500">使用點數</span><p className="font-semibold">{order.points.toLocaleString()}</p></div><div><span className="text-slate-500">尚需支付</span><p className="font-semibold">{formatCurrency(order.finalAmount)}</p></div></div>{order.status === "completed" && <CheckCircle2 className="h-8 w-8 text-emerald-600" />}<button type="button" onClick={reset} className="w-full rounded-xl border px-4 py-2 text-sm font-semibold">建立下一筆</button></div>}</section><section className="rounded-2xl bg-white p-6 text-center shadow-sm"><QrCode className="mx-auto h-7 w-7 text-amber-700" /><h2 className="mt-2 font-bold">顧客掃描付款</h2>{qr ? <><img src={qr} alt="門市點數抵用 QR Code" className="mx-auto my-4 rounded-xl border p-2" /><div className="flex justify-center gap-2"><a href={qr} download="nestobi-store-redeem.png" className="rounded-xl border px-3 py-2 text-sm"><Download className="mr-1 inline h-4 w-4" />下載</a><button type="button" onClick={() => void navigator.clipboard.writeText(order?.token || "")} className="rounded-xl border px-3 py-2 text-sm"><Copy className="mr-1 inline h-4 w-4" />複製連結</button><button type="button" onClick={() => window.print()} className="rounded-xl border px-3 py-2 text-sm"><Printer className="mr-1 inline h-4 w-4" />列印</button></div></> : <p className="py-20 text-sm text-slate-400">建立抵用單後顯示 QR Code</p>}</section></div></div></main>;
}
