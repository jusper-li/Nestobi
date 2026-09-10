import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, Search, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../lib/utils";

type StoreOrder = { orderId: string; storeName: string; storeImageUrl?: string; grossAmount: number; pointsUsed: number; pointsDiscount: number; finalAmount: number; status: string; paymentStatus: string; expiresAt: string };

export default function StoreRedeem() {
  const { token = "" } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [points, setPoints] = useState(0);
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [memberToken, setMemberToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const { data, error } = await supabase.rpc("get_store_point_order", { p_checkout_token: token });
      if (error || !data?.success) setMessage("此門市 QR Code 已失效或已完成抵用。");
      else { setOrder(data as StoreOrder); setDone(data.status === "completed"); }
      setLoading(false);
    })();
  }, [token]);
  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_logged_in_store_point_balance").then(({ data }) => setAvailable(Number(data?.availablePoints || 0)));
  }, [user]);

  const invoke = async (name: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error || !data?.success) throw new Error(error?.message || data?.error || "操作失敗。");
    return data;
  };
  const lookupGuest = async () => {
    setBusy(true); setMessage("");
    try {
      const isEmail = phoneOrEmail.includes("@");
      const data = await invoke("guest-lookup-member-points", { phone: isEmail ? "" : phoneOrEmail, email: isEmail ? phoneOrEmail : "" });
      if (!data.matched) throw new Error("找不到會員，請確認手機或 Email。");
      setMemberToken(data.memberToken); setAvailable(Number(data.availablePoints || 0)); setPoints(Math.min(Number(data.availablePoints || 0), Math.floor(Number(order?.grossAmount || 0))));
    } catch (error) { setMessage(error instanceof Error ? error.message : "會員查詢失敗。"); } finally { setBusy(false); }
  };
  const requestOtp = async () => {
    setBusy(true); setMessage("");
    try {
      const session = await invoke("guest-create-points-redemption-session", { memberToken, guestCheckoutToken: token, requestedPoints: points });
      setSessionId(session.sessionId);
      const request = await invoke("guest-request-points-otp", { memberToken, guestCheckoutToken: token, sessionId: session.sessionId });
      setOtpRequestId(request.otpRequestId); setMessage(`驗證碼已寄至 ${request.maskedIdentifier || "會員信箱"}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "驗證碼寄送失敗。"); } finally { setBusy(false); }
  };
  const verifyOtp = async () => {
    setBusy(true); setMessage("");
    try { await invoke("guest-verify-points-otp", { memberToken, otpRequestId, otp }); setVerified(true); setMessage("驗證成功，請確認使用點數。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "驗證碼錯誤。"); } finally { setBusy(false); }
  };
  const redeem = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (points <= 0 || points > Number(order?.grossAmount || 0) || (available !== null && points > available)) throw new Error("抵用點數超過可用上限。");
      if (!user && !verified) throw new Error("請先完成 Email OTP 驗證。");
      const data = await invoke("redeem-store-points", { checkoutToken: token, points, memberToken: user ? undefined : memberToken, sessionId: user ? undefined : sessionId });
      setDone(true); setOrder((current) => current ? { ...current, pointsUsed: Number(data.pointsUsed || points), pointsDiscount: Number(data.pointsDiscount || points), finalAmount: Number(data.finalAmount || 0), status: "completed", paymentStatus: Number(data.finalAmount || 0) > 0 ? "partial_paid" : "points_paid" } : current);
    } catch (error) { setMessage(error instanceof Error ? error.message : "點數抵用失敗。"); } finally { setBusy(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  if (!order) return <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4"><section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold">門市 QR Code 無效</h1><p className="mt-3 text-sm text-slate-500">{message}</p></section></main>;
  return <main className="min-h-screen bg-stone-50 px-4 py-6"><div className="mx-auto max-w-xl"><section className="overflow-hidden rounded-3xl bg-white shadow-sm">{order.storeImageUrl && <img src={order.storeImageUrl} alt="" className="h-44 w-full object-cover" />}<div className="p-6"><p className="text-xs font-semibold tracking-[0.25em] text-amber-700">NESTOBI STORE REDEEM</p><h1 className="mt-2 text-2xl font-bold">{order.storeName}</h1><div className="mt-5 rounded-2xl bg-amber-50 p-4"><p className="text-sm text-amber-900">本次消費</p><p className="mt-1 text-3xl font-bold text-amber-950">{formatCurrency(Number(order.grossAmount))}</p><p className="mt-2 text-sm text-amber-800">單筆 QR Code 抵用單</p></div>{done ? <div className="mt-6 rounded-2xl bg-emerald-50 p-5 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h2 className="mt-3 font-bold text-emerald-900">點數抵用完成</h2><p className="mt-2 text-sm text-emerald-800">已使用 {order.pointsUsed.toLocaleString()} 點，尚需支付 {formatCurrency(Number(order.finalAmount))}</p></div> : <form onSubmit={redeem} className="mt-6 space-y-4"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-amber-700" />會員點數抵用</div>{user ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">已登入會員，可直接使用點數，不需要再次驗證。</p> : <div className="flex gap-2"><input value={phoneOrEmail} onChange={(event) => setPhoneOrEmail(event.target.value)} placeholder="手機或 Email" className="min-w-0 flex-1 rounded-xl border px-4 py-3" /><button type="button" disabled={busy} onClick={lookupGuest} className="rounded-xl bg-slate-900 px-4 py-3 text-sm text-white"><Search className="mr-1 inline h-4 w-4" />查詢</button></div>}{available !== null && <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">可用點數：<strong>{available.toLocaleString()} 點</strong></p>}<div><label className="mb-2 block text-sm font-semibold">本次抵用點數</label><div className="grid grid-cols-4 gap-2">{[100, 300, 500].map((value) => <button key={value} type="button" onClick={() => setPoints(Math.min(value, Math.floor(Number(order.grossAmount))))} className="rounded-xl border px-2 py-2 text-sm">{value}</button>)}<button type="button" onClick={() => setPoints(Math.floor(Number(order.grossAmount)))} className="rounded-xl border px-2 py-2 text-sm">全部</button></div><input required type="number" min={1} max={Math.floor(Number(order.grossAmount))} value={points || ""} onChange={(event) => setPoints(Math.floor(Number(event.target.value)))} placeholder="自訂點數" className="mt-2 w-full rounded-xl border px-4 py-3" /></div>{!user && memberToken && !verified && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-2"><button type="button" disabled={busy || !points} onClick={requestOtp} className="rounded-xl border bg-white px-3 py-2 text-sm"><Mail className="mr-1 inline h-4 w-4" />寄送 OTP</button>{otpRequestId && <><input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="驗證碼" className="min-w-0 flex-1 rounded-xl border px-3 py-2" /><button type="button" disabled={busy} onClick={verifyOtp} className="rounded-xl bg-amber-700 px-3 py-2 text-sm text-white">驗證</button></>}</div></div>}{!user && verified && <p className="text-sm font-semibold text-emerald-700">Email OTP 驗證完成。</p>}<button disabled={busy || !points} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "確認使用點數"}</button>{message && <p className="text-sm text-amber-800">{message}</p>}</form>}</div></section></div></main>;
}
