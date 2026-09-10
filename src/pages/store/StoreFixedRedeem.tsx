import { useEffect, useState } from "react";
import { Loader2, MapPin, Phone, Store } from "lucide-react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type StoreInfo = { storeName: string; storeImageUrl?: string; city: string; district: string; address: string; phone: string; hours?: { primary?: string; secondary?: string } };
export default function StoreFixedRedeem() {
  const { token = "" } = useParams(); const [store, setStore] = useState<StoreInfo | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { supabase.rpc("get_store_by_qr_token", { p_public_token: token }).then(({ data }) => { if (data?.success) setStore(data as StoreInfo); setLoading(false); }); }, [token]);
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  if (!store) return <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4"><section className="rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold">門市 QR Code 已失效</h1><p className="mt-3 text-sm text-slate-500">請向門市人員索取新的 QR Code。</p></section></main>;
  return <main className="min-h-screen bg-stone-50 px-4 py-6"><section className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-sm">{store.storeImageUrl && <img src={store.storeImageUrl} alt="" className="h-52 w-full object-cover" />}<div className="p-7"><p className="text-xs font-semibold tracking-[0.25em] text-amber-700">NESTOBI STORE</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-bold"><Store className="h-7 w-7 text-amber-600" />{store.storeName}</h1><div className="mt-6 space-y-3 text-sm text-slate-600"><p><MapPin className="mr-2 inline h-4 w-4 text-amber-700" />{store.city} {store.district} {store.address}</p><p><Phone className="mr-2 inline h-4 w-4 text-amber-700" />{store.phone}</p><p>營業時間：{store.hours?.primary || "請洽門市"}</p></div><div className="mt-7 rounded-2xl bg-amber-50 p-5 text-center"><h2 className="font-bold text-amber-950">門市點數抵用</h2><p className="mt-2 text-sm leading-6 text-amber-800">請先請門市人員建立本次消費金額，再掃描該筆訂單 QR Code 進行點數抵用。</p><p className="mt-3 text-xs text-amber-700">固定 QR Code 為門市入口，不會直接綁定會員或消費金額。</p></div></div></section></main>;
}
