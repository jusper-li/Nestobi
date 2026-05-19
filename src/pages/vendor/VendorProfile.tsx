import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertCircle, Store, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface VendorData {
  id: string;
  name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  website: string;
  logo_url: string;
  note: string;
}

const VendorProfile: React.FC = () => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [form, setForm] = useState<Partial<VendorData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noVendor, setNoVendor] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPw.length < 6) { setPwError('新密碼至少需要 6 個字元'); return; }
    if (newPw !== confirmPw) { setPwError('兩次輸入的密碼不一致'); return; }
    setPwLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPw,
      });
      if (signInErr) { setPwError('目前密碼不正確'); setPwLoading(false); return; }
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err.message || '密碼更新失敗，請稍後再試');
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('vendors').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!data) { setNoVendor(true); setLoading(false); return; }
      setVendor(data as VendorData);
      setForm({
        name: data.name,
        description: data.description,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        address: data.address,
        website: data.website,
        logo_url: data.logo_url,
        note: data.note,
      });
      setLoading(false);
    });
  }, [user]);

  const setField = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!vendor) return;
    setSaving(true);
    await supabase.from('vendors').update({ ...form, updated_at: new Date().toISOString() }).eq('id', vendor.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (noVendor) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <AlertCircle className="w-12 h-12 text-yellow-400 mb-3" />
      <p className="text-gray-600">帳號尚未關聯廠商，請聯絡管理員。</p>
    </div>
  );

  const FIELDS = [
    { label: '廠商名稱 *', key: 'name', type: 'text', col: 'full' },
    { label: '聯絡信箱', key: 'contact_email', type: 'email', col: 'half' },
    { label: '聯絡電話', key: 'contact_phone', type: 'tel', col: 'half' },
    { label: '地址', key: 'address', type: 'text', col: 'full' },
    { label: '網站', key: 'website', type: 'url', col: 'half' },
    { label: 'Logo 網址', key: 'logo_url', type: 'url', col: 'half' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-xl"><Store className="w-6 h-6 text-emerald-700" /></div>
        <h1 className="text-2xl font-bold text-gray-900">廠商資料</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        {form.logo_url && (
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-contain border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <p className="font-semibold text-gray-900">{form.name}</p>
              <p className="text-sm text-gray-400">{form.contact_email}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(f => (
            <div key={f.key} className={f.col === 'full' ? 'col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key] || ''} onChange={e => setField(f.key, e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">廠商描述</label>
            <textarea rows={4} value={form.description || ''} onChange={e => setField('description', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea rows={2} value={form.note || ''} onChange={e => setField('note', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition shadow-sm disabled:opacity-60 ${saved ? 'bg-green-100 text-green-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? '已儲存' : '儲存變更'}
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-600" />變更密碼</h3>
        <p className="text-sm text-gray-500">登入信箱：{user?.email}</p>
        {pwSuccess && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
            <CheckCircle className="w-4 h-4" />密碼已成功更新！
          </motion.div>
        )}
        {pwError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{pwError}</div>}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目前密碼</label>
            <div className="relative">
              <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} required placeholder="輸入目前密碼" className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
              <div className="relative">
                <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} required placeholder="至少 6 個字元" className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required placeholder="再次輸入新密碼" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <button type="submit" disabled={pwLoading} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition shadow-sm disabled:opacity-60">
            {pwLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '更新密碼'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default VendorProfile;
