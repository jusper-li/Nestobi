import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import MemberBackLink from '../../components/MemberBackLink';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../lib/utils';

type Invoice = { id: string; order_id: string; invoice_status: string; invoice_number?: string | null; invoice_random_number?: string | null; invoice_date?: string | null; buyer_identifier?: string | null; carrier_number?: string | null; love_code?: string | null; total_amount?: number | null; created_at: string };

export default function MemberInvoices() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; (async () => { if (!user) { setLoading(false); return; } const { data } = await supabase.from('invoices').select('id,order_id,invoice_status,invoice_number,invoice_random_number,invoice_date,buyer_identifier,carrier_number,love_code,total_amount,created_at').eq('user_id', user.id).order('created_at', { ascending: false }); if (active) { setRows((data || []) as Invoice[]); setLoading(false); } })(); return () => { active = false; }; }, [user]);
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#C09A6A]" /></div>;
  return <div className="space-y-5"><MemberBackLink /><h2 className="flex items-center gap-2 text-xl font-bold text-gray-900"><FileText className="h-5 w-5 text-[#0D9488]" />發票</h2>{rows.length === 0 ? <div className="rounded-2xl bg-white p-12 text-center text-gray-400 shadow-sm">目前沒有發票紀錄</div> : <div className="overflow-x-auto rounded-2xl bg-white shadow-sm"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-gray-100 bg-gray-50 text-gray-500"><tr>{['開立日期', '訂單', '發票號碼', '類型／載具', '金額', '狀態'].map(label => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{rows.map(invoice => <tr key={invoice.id}><td className="px-4 py-4">{formatDate(invoice.invoice_date || invoice.created_at)}</td><td className="px-4 py-4 font-mono text-xs">#{invoice.order_id.slice(-8).toUpperCase()}</td><td className="px-4 py-4 font-semibold">{invoice.invoice_number || '尚未開立'}{invoice.invoice_random_number && <span className="ml-2 text-xs font-normal text-gray-400">隨機碼 {invoice.invoice_random_number}</span>}</td><td className="px-4 py-4">{invoice.buyer_identifier ? `企業 ${invoice.buyer_identifier}` : invoice.carrier_number ? `電子條碼 ${invoice.carrier_number}` : invoice.love_code ? `捐贈 ${invoice.love_code}` : '個人電子發票'}</td><td className="px-4 py-4 font-semibold">{formatCurrency(invoice.total_amount || 0)}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${invoice.invoice_status === 'issued' ? 'bg-green-100 text-green-700' : invoice.invoice_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{invoice.invoice_status === 'issued' ? '已開立' : invoice.invoice_status === 'failed' ? '失敗' : '待處理'}</span></td></tr>)}</tbody></table></div>}</div>;
}
