import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, CheckCircle, AlertCircle, Loader, ChevronDown, ChevronUp, Tag, Building2, BedDouble, ShoppingBag, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';

interface Category { id: string; name: string; slug: string; }
interface Vendor { id: string; name: string; }
interface Hotel { id: string; name: string; city: string; vendor_id: string; }

interface ParsedResult {
  intent: 'product' | 'hotel' | 'room';
  confidence: number;
  data: Record<string, any>;
}

interface HistoryItem {
  id: string;
  command: string;
  intent: string;
  saved: boolean;
  savedAt: string;
}

const ROOM_TYPES = [
  { value: 'single', label: '單人房' },
  { value: 'double', label: '雙人房' },
  { value: 'suite', label: '套房' },
  { value: 'deluxe', label: '豪華房' },
  { value: 'family', label: '家庭房' },
  { value: 'villa', label: '別墅' },
];

function TagEditor({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <div className="border border-gray-200 rounded-xl p-2 flex flex-wrap gap-1.5 min-h-[42px]">
      {values.map(v => (
        <span key={v} className="flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
          {v}
          <button type="button" onClick={() => onChange(values.filter(x => x !== v))}><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={placeholder || '輸入後按 Enter 新增'}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";
const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400";

const SuperAdminListingCommand: React.FC = () => {
  const [command, setCommand] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('id, name, slug').order('name'),
      supabase.from('vendors').select('id, name').eq('is_active', true).order('name'),
      supabase.from('hotels').select('id, name, city, vendor_id').eq('is_active', true).order('name'),
    ]).then(([{ data: cats }, { data: vds }, { data: hts }]) => {
      setCategories(cats || []);
      setVendors(vds || []);
      setHotels(hts || []);
    });

    const saved = localStorage.getItem('listing_command_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const set = (key: string, value: any) => setEditData(prev => ({ ...prev, [key]: value }));

  const handleParse = async () => {
    if (!command.trim()) return;
    setParsing(true);
    setError('');
    setParsed(null);
    setSavedMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-listing`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode: 'command', content: command }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '解析失敗');
      const result: ParsedResult = json.result;
      setParsed(result);
      // Auto-resolve category_id from slug
      let initialData = { ...result.data };
      if (result.intent === 'product' && result.data.category_slug) {
        const cat = categories.find(c => c.slug === result.data.category_slug);
        if (cat) initialData.category_id = cat.id;
      }
      setEditData(initialData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setSaving(true);
    setError('');
    try {
      if (parsed.intent === 'product') {
        const payload: Record<string, any> = {
          name: editData.name,
          description: editData.description || '',
          price: Number(editData.price) || 0,
          stock_quantity: Number(editData.stock_quantity) || 0,
          is_active: editData.is_active !== false,
          sku: editData.sku || null,
          category_id: editData.category_id || null,
          vendor_id: editData.vendor_id || null,
          image_url: editData.image_url || null,
          origin: editData.origin || null,
          roast_level: editData.roast_level || null,
          processing_method: editData.processing_method || null,
          altitude: editData.altitude || null,
          variety: Array.isArray(editData.variety) ? editData.variety : [],
          flavor_notes: Array.isArray(editData.flavor_notes) ? editData.flavor_notes : [],
          weight_grams: editData.weight_grams ? Number(editData.weight_grams) : null,
          tags: Array.isArray(editData.tags) ? editData.tags : [],
          source_url: editData.source_url || null,
          roast_date: editData.roast_date || null,
        };
        const { error: dbErr } = await supabase.from('products').insert(payload);
        if (dbErr) throw new Error(dbErr.message);
        await logAdminAction('create_product', 'products', null, { name: payload.name, vendor_id: payload.vendor_id, source: 'listing_command' });
        setSavedMsg('商品已成功上架！');
      } else if (parsed.intent === 'hotel') {
        const payload: Record<string, any> = {
          name: editData.name,
          description: editData.description || '',
          address: editData.address || null,
          city: editData.city || null,
          phone: editData.phone || null,
          email: editData.email || null,
          star_rating: Number(editData.star_rating) || 3,
          line_id: editData.line_id || null,
          facebook: editData.facebook || null,
          checkin_time: editData.checkin_time || '15:00',
          checkout_time: editData.checkout_time || '11:00',
          deposit_amount: Number(editData.deposit_amount) || 0,
          pet_friendly: editData.pet_friendly === true,
          registration_number: editData.registration_number || null,
          image_url: editData.image_url || null,
          is_active: editData.is_active !== false,
          vendor_id: editData.vendor_id || null,
        };
        const { error: dbErr } = await supabase.from('hotels').insert(payload);
        if (dbErr) throw new Error(dbErr.message);
        await logAdminAction('create_hotel', 'hotels', null, { name: payload.name, vendor_id: payload.vendor_id, source: 'listing_command' });
        setSavedMsg('飯店已成功上架！');
      } else if (parsed.intent === 'room') {
        const payload: Record<string, any> = {
          name: editData.name,
          description: editData.description || '',
          room_type: editData.room_type || 'double',
          capacity: Number(editData.capacity) || 2,
          min_capacity: Number(editData.min_capacity) || 1,
          price_per_night: Number(editData.price_per_night) || 0,
          weekend_price: Number(editData.weekend_price) || 0,
          floor: editData.floor || '',
          location: editData.location || '',
          amenities: Array.isArray(editData.amenities) ? editData.amenities : [],
          images: Array.isArray(editData.images) ? editData.images : [],
          image_url: (Array.isArray(editData.images) && editData.images[0]) || editData.image_url || null,
          hotel_id: editData.hotel_id || null,
          vendor_id: editData.vendor_id || null,
          is_available: editData.is_available !== false,
        };
        const { error: dbErr } = await supabase.from('tbl_rooms').insert(payload);
        if (dbErr) throw new Error(dbErr.message);
        await logAdminAction('create_room', 'tbl_rooms', null, { name: payload.name, vendor_id: payload.vendor_id, hotel_id: payload.hotel_id, source: 'listing_command' });
        setSavedMsg('房型已成功上架！');
      }

      const item: HistoryItem = {
        id: Date.now().toString(),
        command: command.slice(0, 80),
        intent: parsed.intent,
        saved: true,
        savedAt: new Date().toLocaleString('zh-TW'),
      };
      const newHistory = [item, ...history].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem('listing_command_history', JSON.stringify(newHistory));
      setParsed(null);
      setEditData({});
      setCommand('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const intentIcon = (intent: string) => {
    if (intent === 'hotel') return <Building2 className="w-4 h-4" />;
    if (intent === 'room') return <BedDouble className="w-4 h-4" />;
    return <ShoppingBag className="w-4 h-4" />;
  };

  const intentLabel = (intent: string) => {
    if (intent === 'hotel') return '飯店';
    if (intent === 'room') return '房型';
    return '商品';
  };

  const intentColor = (intent: string) => {
    if (intent === 'hotel') return 'bg-blue-100 text-blue-700';
    if (intent === 'room') return 'bg-green-100 text-green-700';
    return 'bg-amber-100 text-amber-700';
  };

  const filteredHotels = editData.vendor_id
    ? hotels.filter(h => h.vendor_id === editData.vendor_id)
    : hotels;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-xl"><Terminal className="w-6 h-6 text-slate-700" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 上架指令</h1>
          <p className="text-sm text-gray-400">輸入自然語言描述，AI 自動解析並填入上架欄位</p>
        </div>
      </div>

      {/* Command Input */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <label className="block text-sm font-semibold text-gray-700">輸入上架指令</label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleParse(); }}
            rows={4}
            placeholder={`範例：\n上架商品：衣索比亞耶加雪菲水洗豆，售價 NT$580，淺烘焙，花香調性，產地海拔1800-2000m\n\n上架飯店：花蓮山海民宿，地址花蓮縣花蓮市海濱路123號，電話0912345678，入住15點\n\n上架房型：雙人海景房，最多2人，每晚3200元，假日3800元，設備WiFi/冷氣/早餐`}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none font-mono"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Ctrl + Enter 送出</p>
          <button
            onClick={handleParse}
            disabled={parsing || !command.trim()}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50"
          >
            {parsing ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {parsing ? 'AI 解析中…' : 'AI 解析'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Saved message */}
      {savedMsg && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {savedMsg}
        </motion.div>
      )}

      {/* Parsed result editor */}
      <AnimatePresence>
        {parsed && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Intent header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${intentColor(parsed.intent)}`}>
                {intentIcon(parsed.intent)}{intentLabel(parsed.intent)}
              </span>
              <span className="text-sm text-gray-400">
                信心度 <span className="font-semibold text-gray-700">{Math.round(parsed.confidence * 100)}%</span>
              </span>
              <span className="ml-auto text-xs text-gray-400">確認欄位後按「確認上架」</span>
            </div>

            <div className="p-5 space-y-4">
              {/* ── Common: name, description, vendor ── */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="名稱 *">
                    <input value={editData.name || ''} onChange={e => set('name', e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="描述">
                    <textarea value={editData.description || ''} onChange={e => set('description', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                  </Field>
                </div>
                <div>
                  <Field label="所屬廠商">
                    <select value={editData.vendor_id || ''} onChange={e => { set('vendor_id', e.target.value); set('hotel_id', ''); }} className={selectCls}>
                      <option value="">不指定廠商</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </Field>
                </div>
                <div>
                  <Field label="啟用狀態">
                    <button type="button" onClick={() => set(parsed.intent === 'room' ? 'is_available' : 'is_active', !(editData.is_active ?? editData.is_available))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition border ${(editData.is_active ?? editData.is_available) !== false ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                      <span className={`w-3 h-3 rounded-full ${(editData.is_active ?? editData.is_available) !== false ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {(editData.is_active ?? editData.is_available) !== false ? '啟用' : '停用'}
                    </button>
                  </Field>
                </div>
              </div>

              {/* ── PRODUCT fields ── */}
              {parsed.intent === 'product' && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="售價 (NT$)">
                      <input type="number" value={editData.price || 0} onChange={e => set('price', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="庫存數量">
                      <input type="number" value={editData.stock_quantity || 0} onChange={e => set('stock_quantity', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="SKU">
                      <input value={editData.sku || ''} onChange={e => set('sku', e.target.value)} placeholder="選填" className={inputCls} />
                    </Field>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="分類">
                      <select value={editData.category_id || ''} onChange={e => set('category_id', e.target.value)} className={selectCls}>
                        <option value="">選擇分類</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="圖片 URL">
                      <input value={editData.image_url || ''} onChange={e => set('image_url', e.target.value)} placeholder="https://..." className={inputCls} />
                    </Field>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="產地">
                      <input value={editData.origin || ''} onChange={e => set('origin', e.target.value)} placeholder="例：衣索比亞" className={inputCls} />
                    </Field>
                    <Field label="烘焙程度">
                      <input value={editData.roast_level || ''} onChange={e => set('roast_level', e.target.value)} placeholder="淺/中/深烘焙" className={inputCls} />
                    </Field>
                    <Field label="處理方式">
                      <input value={editData.processing_method || ''} onChange={e => set('processing_method', e.target.value)} placeholder="水洗/日曬/蜜處理" className={inputCls} />
                    </Field>
                    <Field label="海拔高度">
                      <input value={editData.altitude || ''} onChange={e => set('altitude', e.target.value)} placeholder="例：1800-2000m" className={inputCls} />
                    </Field>
                    <Field label="重量 (克)">
                      <input type="number" value={editData.weight_grams || ''} onChange={e => set('weight_grams', e.target.value)} placeholder="例：200" className={inputCls} />
                    </Field>
                    <Field label="烘焙日期">
                      <input type="date" value={editData.roast_date || ''} onChange={e => set('roast_date', e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="品種 (Enter 新增)">
                    <TagEditor values={Array.isArray(editData.variety) ? editData.variety : []} onChange={v => set('variety', v)} placeholder="輸入品種名稱後按 Enter" />
                  </Field>
                  <Field label="風味描述 (Enter 新增)">
                    <TagEditor values={Array.isArray(editData.flavor_notes) ? editData.flavor_notes : []} onChange={v => set('flavor_notes', v)} placeholder="如：花香、柑橘、蜂蜜" />
                  </Field>
                  <Field label="標籤 (Enter 新增)">
                    <TagEditor values={Array.isArray(editData.tags) ? editData.tags : []} onChange={v => set('tags', v)} placeholder="品牌、國家、分類關鍵字" />
                  </Field>
                  <Field label="商品來源網址">
                    <input value={editData.source_url || ''} onChange={e => set('source_url', e.target.value)} placeholder="https://..." className={inputCls} />
                  </Field>
                </div>
              )}

              {/* ── HOTEL fields ── */}
              {parsed.intent === 'hotel' && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="城市">
                      <input value={editData.city || ''} onChange={e => set('city', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="地址">
                      <input value={editData.address || ''} onChange={e => set('address', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="電話">
                      <input value={editData.phone || ''} onChange={e => set('phone', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Email">
                      <input type="email" value={editData.email || ''} onChange={e => set('email', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="LINE ID">
                      <input value={editData.line_id || ''} onChange={e => set('line_id', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Facebook 網址">
                      <input value={editData.facebook || ''} onChange={e => set('facebook', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="入住時間">
                      <input value={editData.checkin_time || '15:00'} onChange={e => set('checkin_time', e.target.value)} placeholder="15:00" className={inputCls} />
                    </Field>
                    <Field label="退房時間">
                      <input value={editData.checkout_time || '11:00'} onChange={e => set('checkout_time', e.target.value)} placeholder="11:00" className={inputCls} />
                    </Field>
                    <Field label="星級評等">
                      <select value={editData.star_rating || 3} onChange={e => set('star_rating', Number(e.target.value))} className={selectCls}>
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} 星</option>)}
                      </select>
                    </Field>
                    <Field label="訂金金額 (NT$)">
                      <input type="number" value={editData.deposit_amount || 0} onChange={e => set('deposit_amount', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="主圖 URL">
                      <input value={editData.image_url || ''} onChange={e => set('image_url', e.target.value)} placeholder="https://..." className={inputCls} />
                    </Field>
                    <Field label="登記字號">
                      <input value={editData.registration_number || ''} onChange={e => set('registration_number', e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="寵物友善">
                    <button type="button" onClick={() => set('pet_friendly', !editData.pet_friendly)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition border ${editData.pet_friendly ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                      <span className={`w-3 h-3 rounded-full ${editData.pet_friendly ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {editData.pet_friendly ? '接受寵物' : '不接受寵物'}
                    </button>
                  </Field>
                </div>
              )}

              {/* ── ROOM fields ── */}
              {parsed.intent === 'room' && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field label="房型類別">
                      <select value={editData.room_type || 'double'} onChange={e => set('room_type', e.target.value)} className={selectCls}>
                        {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </Field>
                    <Field label="最少人數">
                      <input type="number" value={editData.min_capacity || 1} onChange={e => set('min_capacity', Number(e.target.value))} min={1} className={inputCls} />
                    </Field>
                    <Field label="最多人數">
                      <input type="number" value={editData.capacity || 2} onChange={e => set('capacity', Number(e.target.value))} min={1} className={inputCls} />
                    </Field>
                    <Field label="平日每晚 (NT$)">
                      <input type="number" value={editData.price_per_night || 0} onChange={e => set('price_per_night', Number(e.target.value))} className={inputCls} />
                    </Field>
                    <Field label="假日每晚 (NT$)">
                      <input type="number" value={editData.weekend_price || 0} onChange={e => set('weekend_price', Number(e.target.value))} className={inputCls} />
                    </Field>
                    <Field label="樓層">
                      <input value={editData.floor || ''} onChange={e => set('floor', e.target.value)} placeholder="例：2F" className={inputCls} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="地點">
                        <input value={editData.location || ''} onChange={e => set('location', e.target.value)} className={inputCls} />
                      </Field>
                    </div>
                    <div>
                      <Field label="所屬飯店">
                        <select value={editData.hotel_id || ''} onChange={e => set('hotel_id', e.target.value)} className={selectCls}>
                          <option value="">不指定飯店</option>
                          {filteredHotels.map(h => <option key={h.id} value={h.id}>{h.name}{h.city ? ` (${h.city})` : ''}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                  <Field label="設施 (Enter 新增)">
                    <TagEditor values={Array.isArray(editData.amenities) ? editData.amenities : []} onChange={v => set('amenities', v)} placeholder="如：WiFi、停車場、早餐、冷氣" />
                  </Field>
                  <Field label="房間圖片 URL (Enter 新增)">
                    <TagEditor values={Array.isArray(editData.images) ? editData.images : []} onChange={v => set('images', v)} placeholder="貼上圖片網址後按 Enter" />
                  </Field>
                </div>
              )}

              {/* Action row */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setParsed(null); setEditData({}); setSavedMsg(''); }}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                  取消
                </button>
                <button type="button" onClick={handleSave} disabled={saving || !editData.name}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50">
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  確認上架
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button onClick={() => setHistoryOpen(p => !p)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Tag className="w-4 h-4 text-gray-400" />
              上架紀錄
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{history.length}</span>
            </div>
            {historyOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          <AnimatePresence>
            {historyOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                className="overflow-hidden border-t border-gray-100">
                <div className="p-3 space-y-2">
                  {history.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 text-sm">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${intentColor(item.intent)}`}>
                        {intentIcon(item.intent)}{intentLabel(item.intent)}
                      </span>
                      <span className="flex-1 text-gray-700 truncate">{item.command}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{item.savedAt}</span>
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default SuperAdminListingCommand;
