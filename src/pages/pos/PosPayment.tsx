import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, Search, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { submitNewebPayMpgForm } from "../../lib/shopCheckout";
import { formatCurrency } from "../../lib/utils";

type PaymentChoice = "points" | "credit" | "mixed";
type Order = { orderId: string; merchantOrderNo: string; totalAmount: number; subtotalAmount: number; pointsDiscount: number; paymentStatus: string; items: Array<{ name: string; quantity: number; unit_price: number; total_price: number }> };

export default function PosPayment() {
  const { paymentToken = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [choice, setChoice] = useState<PaymentChoice>("credit");
  const [points, setPoints] = useState(0);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [memberToken, setMemberToken] = useState("");
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [otpRequestId, setOtpRequestId] = useState("");
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!paymentToken) return;
    supabase.rpc("get_pos_order", { p_payment_token: paymentToken }).then(({ data, error }) => {
      if (error || !data?.success) setMessage(error?.message || "付款連結已失效。");
      else { setOrder(data as Order); setPaid(data.paymentStatus === "paid"); }
      setLoading(false);
    });
  }, [paymentToken]);

  const invoke = async (name: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error || !data?.success) throw new Error(error?.message || data?.error || "操作失敗。");
    return data;
  };
  const lookup = async () => {
    setBusy(true); setMessage("");
    try { const data = await invoke("guest-lookup-member-points", { phone, email }); if (!data.matched) throw new Error("找不到會員，請確認手機或 Email。"); setMemberToken(data.memberToken); setAvailablePoints(Number(data.availablePoints || 0)); setPoints(Math.min(Number(data.availablePoints || 0), Math.floor(Number(order?.subtotalAmount || 0)))); }
    catch (error) { setMessage(error instanceof Error ? error.message : "會員查詢失敗。"); } finally { setBusy(false); }
  };
  const requestOtp = async () => {
    setBusy(true); setMessage("");
    try { const session = await invoke("guest-create-points-redemption-session", { memberToken, guestCheckoutToken: paymentToken, requestedPoints: points }); setSessionId(session.sessionId); const request = await invoke("guest-request-points-otp", { memberToken, guestCheckoutToken: paymentToken, sessionId: session.sessionId }); setOtpRequestId(request.otpRequestId); setMessage(`驗證碼已寄至 ${request.maskedIdentifier || "會員信箱"}`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "驗證碼寄送失敗。"); } finally { setBusy(false); }
  };
  const verifyOtp = async () => {
    setBusy(true); setMessage("");
    try { await invoke("guest-verify-points-otp", { memberToken, otpRequestId, otp }); setVerified(true); setMessage("點數驗證成功。"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "驗證碼錯誤。"); } finally { setBusy(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const usePoints = choice === "credit" ? 0 : points;
      if (usePoints > 0 && !verified) throw new Error("請先完成點數驗證。");
      const data = await invoke("pos-payment", { paymentToken, paymentMethod: "CREDIT", pointsToUse: usePoints, pointSessionId: usePoints ? sessionId : null, name, phone, email });
      if (data.mode === "points") setPaid(true);
      else submitNewebPayMpgForm(data.paymentUrl, data.merchantId, data.tradeInfo, data.tradeSha, data.version);
    } catch (error) { setMessage(error instanceof Error ? error.message : "付款失敗。"); setBusy(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  if (!order) return <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4"><section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold">付款連結無效</h1><p className="mt-3 text-sm leading-6 text-slate-500">請使用門市人員產生的 QR Code 開啟付款頁。此頁面的 `:token` 只是網址範例，不能直接使用。</p>{message && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}</section></main>;
  if (paid) return <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4"><section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /><h1 className="mt-5 text-2xl font-bold">付款完成</h1><p className="mt-2 text-slate-500">請將此畫面交給門市人員確認。</p><p className="mt-5 text-sm text-slate-500">訂單 {order?.merchantOrderNo}</p></section></main>;
  return <main className="min-h-screen bg-stone-50 px-4 py-6"><div className="mx-auto max-w-xl"><section className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-xs font-semibold tracking-[0.25em] text-amber-700">NESTOBI POS CHECKOUT</p><h1 className="mt-2 text-2xl font-bold">門市付款</h1><p className="mt-1 text-sm text-slate-500">訂單 {order?.merchantOrderNo}</p><div className="mt-5 space-y-3 border-b pb-5">{order?.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-3 text-sm"><span>{item.name} × {item.quantity}</span><span>{formatCurrency(Number(item.total_price))}</span></div>)}<div className="flex justify-between pt-2 text-lg font-bold"><span>應付金額</span><span>{formatCurrency(Math.max(0, Number(order?.subtotalAmount || 0) - (choice === "credit" ? 0 : points)))}</span></div></div><form onSubmit={submit} className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-3">{([["points", "使用會員點數"], ["credit", "信用卡付款"], ["mixed", "點數 + 信用卡"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setChoice(value)} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${choice === value ? "border-amber-600 bg-amber-50 text-amber-900" : "border-stone-200"}`}>{label}</button>)}</div><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="姓名" className="w-full rounded-xl border px-4 py-3" /><input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="手機" className="w-full rounded-xl border px-4 py-3" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-xl border px-4 py-3" />{choice !== "credit" && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-amber-700" />會員點數折抵</div><div className="mt-3 flex gap-2"><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="手機或 Email" className="min-w-0 flex-1 rounded-xl border px-3 py-2" /><button type="button" disabled={busy} onClick={lookup} className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"><Search className="mr-1 inline h-4 w-4" />查詢</button></div>{availablePoints !== null && <p className="mt-2 text-sm text-amber-900">可用餘額：{availablePoints} 點</p>}<input type="number" min={1} max={Math.floor(Number(order?.subtotalAmount || 0))} value={points || ""} onChange={(event) => setPoints(Math.max(0, Math.floor(Number(event.target.value))))} placeholder="折抵點數" className="mt-3 w-full rounded-xl border px-3 py-2" />{memberToken && !verified && <div className="mt-3 flex gap-2"><button type="button" disabled={busy || !points} onClick={requestOtp} className="rounded-xl border px-3 py-2 text-sm"><Mail className="mr-1 inline h-4 w-4" />寄送驗證碼</button>{otpRequestId && <><input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6 位驗證碼" className="min-w-0 flex-1 rounded-xl border px-3 py-2" /><button type="button" disabled={busy} onClick={verifyOtp} className="rounded-xl bg-amber-700 px-3 py-2 text-sm text-white">驗證</button></>}</div>}{verified && <p className="mt-3 text-sm font-semibold text-emerald-700">點數驗證完成，可送出付款。</p>}</div>}<button disabled={busy} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : choice === "points" && points >= Number(order?.subtotalAmount || 0) ? "確認點數付款" : "前往付款"}</button>{message && <p className="text-sm text-amber-800">{message}</p>}</form></section></div></main>;
}
