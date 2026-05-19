import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hotel, Plus, Pencil, Trash2, X, AlertCircle, Star, MapPin, Phone, Mail, BedDouble, ToggleLeft, ToggleRight, Link2, Loader2, CheckCircle, ChevronRight, Sparkles, FileText, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import MultiImageUpload from '../../components/MultiImageUpload';
import { sanitizeText } from '../../lib/security';

interface HotelRow {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  image_url: string;
  images: string[];
  star_rating: number;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  room_count?: number;
}

const emptyForm = {
  name: '',
  description: '',
  address: '',
  city: '',
  image_url: '',
  images: [] as string[],
  star_rating: 3,
  phone: '',
  email: '',
  is_active: true,
};

const STAR_LEVELS = [1, 2, 3, 4, 5];
const ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp,.gif,.txt,.csv,.json';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'text/csv', 'application/json'];

type StepKey = 'input' | 'loading' | 'review';

const VendorHotels: React.FC = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [hotels, setHotels] = useState<HotelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);

  // Add / Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HotelRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Scraper state
  const [showScraper, setShowScraper] = useState(false);
  const [scraperUrl, setScraperUrl] = useState('');
  const [scraperStep, setScraperStep] = useState<StepKey>('input');
  const [scraperError, setScraperError] = useState('');
  const [scraperForm, setScraperForm] = useState(emptyForm);
  const [scraperSaving, setScraperSaving] = useState(false);

  // Parser state
  const [showParser, setShowParser] = useState(false);
  const [parserTab, setParserTab] = useState<'text' | 'file'>('text');
  const [parserText, setParserText] = useState('');
  const [parserFile, setParserFile] = useState<File | null>(null);
  const [parserFilePreview, setParserFilePreview] = useState('');
  const [parserDragOver, setParserDragOver] = useState(false);
  const [parserStep, setParserStep] = useState<StepKey>('input');
  const [parserError, setParserError] = useState('');
  const [parserForm, setParserForm] = useState(emptyForm);
  const [parserSaving, setParserSaving] = useState(false);

  const fetchHotels = async (vid: string) => {
    const { data: hotelData } = await supabase
      .from('hotels')
      .select('*')
      .eq('vendor_id', vid)
      .order('created_at', { ascending: true });

    if (!hotelData) { setHotels([]); return; }

    const ids = hotelData.map((h: any) => h.id);
    const { data: roomCounts } = await supabase
      .from('tbl_rooms')
      .select('hotel_id')
      .in('hotel_id', ids);

    const countMap: Record<string, number> = {};
    (roomCounts || []).forEach((r: any) => {
      countMap[r.hotel_id] = (countMap[r.hotel_id] || 0) + 1;
    });
    setHotels(hotelData.map((h: any) => ({ ...h, room_count: countMap[h.id] || 0 })));
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('vendors').select('id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!data) { setNoVendor(true); setLoading(false); return; }
      setVendorId(data.id);
      fetchHotels(data.id).then(() => setLoading(false));
    });
  }, [user]);

  // ── Add / Edit ─────────────────────────────────────────────────
  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (h: HotelRow) => {
    setEditing(h);
    setForm({ name: h.name, description: h.description, address: h.address, city: h.city, image_url: h.image_url, images: Array.isArray(h.images) ? h.images : (h.image_url ? [h.image_url] : []), star_rating: h.star_rating, phone: h.phone, email: h.email, is_active: h.is_active });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!vendorId || !form.name.trim()) return;
    setSaving(true);
    const images = Array.from(new Set(form.images.map(image => sanitizeText(image, 1000)).filter(Boolean)));
    const payload = {
      ...form,
      name: sanitizeText(form.name, 160),
      description: sanitizeText(form.description, 2000),
      address: sanitizeText(form.address, 260),
      city: sanitizeText(form.city, 120),
      phone: sanitizeText(form.phone, 80),
      email: sanitizeText(form.email, 160),
      images,
      image_url: images[0] || sanitizeText(form.image_url || '', 1000),
      vendor_id: vendorId,
      updated_at: new Date().toISOString()
    };
    if (editing) {
      await supabase.from('hotels').update(payload).eq('id', editing.id).eq('vendor_id', vendorId);
    } else {
      await supabase.from('hotels').insert(payload);
    }
    await fetchHotels(vendorId);
    setSaving(false);
    setShowModal(false);
  };
  const handleDelete = async (id: string) => {
    if (!vendorId) return;
    await supabase.from('hotels').delete().eq('id', id).eq('vendor_id', vendorId);
    await fetchHotels(vendorId);
    setDeleteConfirm(null);
  };
  const toggleActive = async (h: HotelRow) => {
    if (!vendorId) return;
    await supabase.from('hotels').update({ is_active: !h.is_active, updated_at: new Date().toISOString() }).eq('id', h.id).eq('vendor_id', vendorId);
    setHotels(prev => prev.map(x => x.id === h.id ? { ...x, is_active: !h.is_active } : x));
  };
  const setField = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  // ── Scraper ────────────────────────────────────────────────────
  const openScraper = () => {
    setScraperUrl(''); setScraperStep('input'); setScraperError(''); setScraperForm(emptyForm); setShowScraper(true);
  };
  const applyScraperResult = (r: Record<string, unknown>) => {
    const imgUrl = String(r.image_url || '');
    setScraperForm({
      name: String(r.name || ''), description: String(r.description || ''), city: String(r.city || ''),
      address: String(r.address || ''), image_url: imgUrl,
      images: imgUrl ? [imgUrl] : [],
      star_rating: Math.min(5, Math.max(1, Number(r.star_rating) || 3)),
      phone: String(r.phone || ''), email: String(r.email || ''), is_active: true,
    });
  };
  const handleScrape = async () => {
    if (!scraperUrl.trim()) { setScraperError('請輸入網址'); return; }
    setScraperError(''); setScraperStep('loading');
    try {
      const { data: { session: s1 } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke('scrape-url', {
        body: { url: scraperUrl.trim(), type: 'hotel' },
        headers: s1 ? { Authorization: `Bearer ${s1.access_token}` } : {},
      });
      if (fnError) throw new Error(fnError.message || '解析失敗');
      if (data?.error) throw new Error(data.error);
      applyScraperResult(data.result);
      setScraperStep('review');
    } catch (err: unknown) {
      setScraperError(err instanceof Error ? err.message : '爬取失敗，請確認網址後重試');
      setScraperStep('input');
    }
  };
  const handleScraperSave = async () => {
    if (!vendorId || !scraperForm.name.trim()) return;
    setScraperSaving(true);
    const images = Array.from(new Set(scraperForm.images.map(image => sanitizeText(image, 1000)).filter(Boolean)));
    const payload = {
      ...scraperForm,
      name: sanitizeText(scraperForm.name, 160),
      description: sanitizeText(scraperForm.description, 2000),
      address: sanitizeText(scraperForm.address, 260),
      city: sanitizeText(scraperForm.city, 120),
      phone: sanitizeText(scraperForm.phone, 80),
      email: sanitizeText(scraperForm.email, 160),
      images,
      image_url: images[0] || sanitizeText(scraperForm.image_url || '', 1000),
      vendor_id: vendorId,
      updated_at: new Date().toISOString()
    };
    await supabase.from('hotels').insert(payload);
    await fetchHotels(vendorId);
    setScraperSaving(false);
    setShowScraper(false);
  };

  // ── Parser ─────────────────────────────────────────────────────
  const openParser = () => {
    setParserTab('text'); setParserText(''); setParserFile(null); setParserFilePreview('');
    setParserStep('input'); setParserError(''); setParserForm(emptyForm); setShowParser(true);
  };
  const handleParserFile = (file: File) => {
    const ok = ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXT.split(',').some(ext => file.name.toLowerCase().endsWith(ext));
    if (!ok) { setParserError('不支援此格式，請上傳圖片（JPG/PNG/WebP）或文字檔（TXT/CSV/JSON）'); return; }
    setParserFile(file); setParserError('');
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setParserFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else { setParserFilePreview(''); }
  };
  const applyParserResult = (r: Record<string, unknown>) => {
    const imgUrl = String(r.image_url || '');
    setParserForm({
      name: String(r.name || ''), description: String(r.description || ''), city: String(r.city || ''),
      address: String(r.address || ''), image_url: imgUrl,
      images: imgUrl ? [imgUrl] : [],
      star_rating: Math.min(5, Math.max(1, Number(r.star_rating) || 3)),
      phone: String(r.phone || ''), email: String(r.email || ''), is_active: true,
    });
  };
  const handleParse = async () => {
    if (parserTab === 'text' && !parserText.trim()) { setParserError('請輸入文字內容'); return; }
    if (parserTab === 'file' && !parserFile) { setParserError('請選擇檔案'); return; }
    setParserError(''); setParserStep('loading');
    try {
      let reqBody: Record<string, unknown>;
      if (parserTab === 'text') {
        reqBody = { type: 'hotel', mode: 'text', content: parserText.trim() };
      } else {
        const isImage = parserFile!.type.startsWith('image/');
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve((e.target?.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(parserFile!);
        });
        reqBody = { type: 'hotel', mode: isImage ? 'image' : 'file', content: base64, mime_type: parserFile!.type, filename: parserFile!.name };
      }
      const { data: { session: s2 } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke('parse-listing', {
        body: reqBody,
        headers: s2 ? { Authorization: `Bearer ${s2.access_token}` } : {},
      });
      if (fnError) throw new Error(fnError.message || '解析失敗');
      if (data?.error) throw new Error(data.error);
      applyParserResult(data.result);
      setParserStep('review');
    } catch (err: unknown) {
      setParserError(err instanceof Error ? err.message : '解析失敗，請檢查內容後重試');
      setParserStep('input');
    }
  };
  const handleParserSave = async () => {
    if (!vendorId || !parserForm.name.trim()) return;
    setParserSaving(true);
    const images = Array.from(new Set(parserForm.images.map(image => sanitizeText(image, 1000)).filter(Boolean)));
    const payload = {
      ...parserForm,
      name: sanitizeText(parserForm.name, 160),
      description: sanitizeText(parserForm.description, 2000),
      address: sanitizeText(parserForm.address, 260),
      city: sanitizeText(parserForm.city, 120),
      phone: sanitizeText(parserForm.phone, 80),
      email: sanitizeText(parserForm.email, 160),
      images,
      image_url: images[0] || sanitizeText(parserForm.image_url || '', 1000),
      vendor_id: vendorId,
      updated_at: new Date().toISOString()
    };
    await supabase.from('hotels').insert(payload);
    await fetchHotels(vendorId);
    setParserSaving(false);
    setShowParser(false);
  };

  // ── Shared sub-components ──────────────────────────────────────
  const StepIndicator = ({ current }: { current: StepKey }) => (
    <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
      {([{ key: 'input', label: '輸入內容' }, { key: 'loading', label: 'AI 解析中' }, { key: 'review', label: '確認資料' }] as const).map((s, i, arr) => (
        <React.Fragment key={s.key}>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${current === s.key ? 'text-emerald-700' : current === 'review' && s.key === 'input' ? 'text-emerald-500' : 'text-gray-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${current === s.key ? 'bg-emerald-600 text-white' : current === 'review' && s.key === 'input' ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
              {current === 'review' && s.key === 'input' ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </span>{s.label}
          </div>
          {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );

  const ReviewFields = ({ f, setF }: { f: typeof emptyForm; setF: React.Dispatch<React.SetStateAction<typeof emptyForm>> }) => (
    <div className="space-y-4">
      {([
        { label: '飯店名稱 *', key: 'name' },
        { label: '城市', key: 'city' },
        { label: '地址', key: 'address' },
        { label: '電話', key: 'phone' },
        { label: '信箱', key: 'email' },
      ] as const).map(field => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
          <input type="text" value={f[field.key] as string} onChange={e => setF(p => ({ ...p, [field.key]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">飯店圖片（可多張，第一張為封面）</label>
        <MultiImageUpload values={f.images} onChange={imgs => setF(p => ({ ...p, images: imgs, image_url: imgs[0] || '' }))} accentClass="ring-emerald-400" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">星級</label>
        <div className="flex gap-1">
          {STAR_LEVELS.map(n => (
            <button key={n} type="button" onClick={() => setF(p => ({ ...p, star_rating: n }))} className={`transition ${n <= f.star_rating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}>
              <Star className={`w-6 h-6 ${n <= f.star_rating ? 'fill-amber-400' : ''}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">飯店簡介</label>
        <textarea rows={3} value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={f.is_active} onChange={e => setF(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 rounded accent-emerald-600" />
        <span className="text-sm text-gray-700">開放營業</span>
      </label>
    </div>
  );

  const AILoadingPane = ({ label }: { label: string }) => (
    <div className="p-12 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
      <div className="text-center">
        <p className="font-medium text-gray-800 mb-1">{label}</p>
        <p className="text-sm text-gray-400">AI 辨識飯店資訊中，請稍候…</p>
      </div>
    </div>
  );

  // ── Guards ─────────────────────────────────────────────────────
  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (noVendor) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <AlertCircle className="w-12 h-12 text-yellow-400 mb-3" />
      <p className="text-gray-600">帳號尚未關聯廠商，請聯絡管理員。</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl"><Hotel className="w-6 h-6 text-emerald-700" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">飯店管理</h1>
            <p className="text-sm text-gray-400">管理旗下所有飯店或住宿物件</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={openParser} className="flex items-center gap-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
            <FileText className="w-4 h-4" />文字/檔案上架
          </button>
          <button onClick={openScraper} className="flex items-center gap-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
            <Sparkles className="w-4 h-4" />網址爬蟲上架
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
            <Plus className="w-4 h-4" />新增飯店
          </button>
        </div>
      </div>

      {/* Hotel grid */}
      {hotels.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hotel className="w-8 h-8 text-emerald-300" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-1">尚無飯店</h3>
          <p className="text-gray-400 text-sm mb-6">新增您的第一間飯店，再至「房間管理」中選擇飯店新增房型</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={openParser} className="inline-flex items-center gap-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-sm font-medium transition">
              <FileText className="w-4 h-4" />文字/檔案上架
            </button>
            <button onClick={openScraper} className="inline-flex items-center gap-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-sm font-medium transition">
              <Sparkles className="w-4 h-4" />網址爬蟲上架
            </button>
            <button onClick={openAdd} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition">
              <Plus className="w-4 h-4" />手動新增
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {hotels.map((hotel, i) => (
            <motion.div key={hotel.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition ${hotel.is_active ? 'border-transparent' : 'border-gray-200 opacity-70'}`}>
              {hotel.image_url ? (
                <div className="relative h-44 overflow-hidden">
                  <img src={hotel.image_url} alt={hotel.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-0.5">
                    {STAR_LEVELS.map(n => <Star key={n} className={`w-3.5 h-3.5 ${n <= hotel.star_rating ? 'text-amber-400 fill-amber-400' : 'text-white/40'}`} />)}
                  </div>
                  <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-medium ${hotel.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                    {hotel.is_active ? '營業中' : '已停用'}
                  </span>
                </div>
              ) : (
                <div className="h-44 bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center relative">
                  <Hotel className="w-12 h-12 text-emerald-200" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-0.5">
                    {STAR_LEVELS.map(n => <Star key={n} className={`w-3.5 h-3.5 ${n <= hotel.star_rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />)}
                  </div>
                  <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-medium ${hotel.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {hotel.is_active ? '營業中' : '已停用'}
                  </span>
                </div>
              )}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-base mb-1">{hotel.name}</h3>
                {hotel.city && (
                  <div className="flex items-center gap-1 text-gray-400 text-xs mb-2">
                    <MapPin className="w-3 h-3" />{hotel.city}{hotel.address ? ` · ${hotel.address}` : ''}
                  </div>
                )}
                {hotel.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{hotel.description}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <BedDouble className="w-3.5 h-3.5 text-emerald-500" />
                    <span><span className="font-semibold text-gray-800">{hotel.room_count}</span> 間房型</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(hotel)} title={hotel.is_active ? '停用' : '啟用'}
                      className={`p-2 rounded-xl transition ${hotel.is_active ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-emerald-600'}`}>
                      {hotel.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(hotel)} className="p-2 hover:bg-emerald-50 rounded-xl text-emerald-600 transition"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteConfirm(hotel.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h3 className="font-semibold text-gray-900">{editing ? '編輯飯店' : '新增飯店'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">飯店名稱 *</label>
                  <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="例：台北美麗信花園酒店"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
                    <input type="text" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="例：台北市"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">星級</label>
                    <div className="flex items-center gap-1 py-2">
                      {STAR_LEVELS.map(n => (
                        <button key={n} type="button" onClick={() => setField('star_rating', n)} className={`transition ${n <= form.star_rating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}>
                          <Star className={`w-6 h-6 ${n <= form.star_rating ? 'fill-amber-400' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                  <input type="text" value={form.address} onChange={e => setField('address', e.target.value)} placeholder="例：中山北路二段39巷3號"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">飯店圖片（可多張，第一張為封面）</label>
                  <MultiImageUpload
                    values={form.images}
                    onChange={imgs => { setField('images', imgs); setField('image_url', imgs[0] || ''); }}
                    accentClass="ring-emerald-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />電話</label>
                    <input type="text" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="02-1234-5678"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Mail className="w-3.5 h-3.5" />信箱</label>
                    <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="hotel@example.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">飯店簡介</label>
                  <textarea rows={3} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="描述飯店特色、位置優勢、服務等…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} className="w-4 h-4 rounded accent-emerald-600" />
                  <span className="text-sm text-gray-700">開放營業</span>
                </label>
              </div>
              <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">取消</button>
                <button onClick={handleSave} disabled={saving || !form.name.trim()} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center gap-1.5">
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {editing ? '儲存變更' : '新增飯店'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0"><Trash2 className="w-5 h-5 text-red-600" /></div>
                <div>
                  <h3 className="font-semibold text-gray-900">確認刪除飯店</h3>
                  <p className="text-sm text-gray-500 mt-0.5">刪除後，此飯店的所有房型將失去飯店關聯，此操作無法復原。</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">取消</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition">確認刪除</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scraper Modal ── */}
      <AnimatePresence>
        {showScraper && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">網址爬蟲 AI 解析上架</h3>
                </div>
                <button onClick={() => setShowScraper(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <StepIndicator current={scraperStep} />
              <div className="flex-1 overflow-y-auto">
                {scraperStep === 'input' && (
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">輸入飯店官網或訂房平台網址，AI 將自動擷取飯店資訊。</p>
                    {scraperError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{scraperError}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">飯店網址</label>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 focus-within:ring-2 focus-within:ring-emerald-500">
                        <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input type="url" value={scraperUrl} onChange={e => setScraperUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScrape()}
                          placeholder="https://www.hotel.com/..." className="flex-1 py-2.5 text-sm outline-none bg-transparent" />
                      </div>
                    </div>
                  </div>
                )}
                {scraperStep === 'loading' && <AILoadingPane label="正在爬取網頁內容" />}
                {scraperStep === 'review' && (
                  <div className="p-6 space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />解析完成！請確認以下資料，可直接修改後上架。
                    </div>
                    {scraperForm.image_url && (
                      <img src={scraperForm.image_url} alt="preview" className="w-full h-36 object-cover rounded-xl"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <ReviewFields f={scraperForm} setF={setScraperForm} />
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end flex-shrink-0">
                {scraperStep === 'review' && (
                  <button onClick={() => setScraperStep('input')} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">重新解析</button>
                )}
                <button onClick={() => setShowScraper(false)} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">取消</button>
                {scraperStep === 'input' && (
                  <button onClick={handleScrape} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition shadow-sm">
                    <Sparkles className="w-4 h-4" />開始爬取
                  </button>
                )}
                {scraperStep === 'review' && (
                  <button onClick={handleScraperSave} disabled={scraperSaving || !scraperForm.name.trim()} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60">
                    {scraperSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}確認上架
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Parser Modal ── */}
      <AnimatePresence>
        {showParser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">文字 / 檔案 AI 解析上架</h3>
                </div>
                <button onClick={() => setShowParser(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <StepIndicator current={parserStep} />
              <div className="flex-1 overflow-y-auto">
                {parserStep === 'input' && (
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">貼上飯店介紹文字，或上傳圖片／文字檔，AI 將自動解析飯店資料。</p>
                    <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                      {[{ key: 'text' as const, icon: <FileText className="w-4 h-4" />, label: '貼上文字' }, { key: 'file' as const, icon: <Upload className="w-4 h-4" />, label: '上傳檔案' }].map(t => (
                        <button key={t.key} onClick={() => { setParserTab(t.key); setParserError(''); }}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${parserTab === t.key ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                          {t.icon}{t.label}
                        </button>
                      ))}
                    </div>
                    {parserError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{parserError}
                      </div>
                    )}
                    {parserTab === 'text' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">飯店描述文字</label>
                        <textarea rows={8} value={parserText} onChange={e => setParserText(e.target.value)}
                          placeholder={`貼上任何格式的飯店介紹，例如：\n\n台北晶華酒店\n地點：中山北路二段39巷3號，台北市\n五星級豪華酒店\n電話：02-2523-8000\n\n坐落台北市精華地段...`}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          上傳檔案 <span className="text-xs font-normal text-gray-400 ml-1">支援 JPG/PNG/WebP/TXT/CSV/JSON</span>
                        </label>
                        <div
                          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${parserDragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}
                          onClick={() => document.getElementById('hotel-parser-file')?.click()}
                          onDragOver={e => { e.preventDefault(); setParserDragOver(true); }}
                          onDragLeave={() => setParserDragOver(false)}
                          onDrop={e => { e.preventDefault(); setParserDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleParserFile(f); }}>
                          <input id="hotel-parser-file" type="file" accept={ACCEPTED_EXT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleParserFile(f); }} />
                          {parserFile ? (
                            <div className="space-y-2">
                              {parserFilePreview
                                ? <img src={parserFilePreview} alt="preview" className="mx-auto max-h-32 rounded-lg object-contain" />
                                : <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto"><FileText className="w-6 h-6 text-emerald-600" /></div>
                              }
                              <p className="font-medium text-gray-900 text-sm">{parserFile.name}</p>
                              <p className="text-xs text-gray-400">{(parserFile.size / 1024).toFixed(1)} KB · 點擊更換</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto"><Upload className="w-6 h-6 text-gray-400" /></div>
                              <p className="text-sm font-medium text-gray-700">拖曳檔案至此，或點擊選擇</p>
                              <p className="text-xs text-gray-400">圖片：JPG、PNG、WebP｜文字：TXT、CSV、JSON</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {parserStep === 'loading' && <AILoadingPane label="AI 正在解析內容" />}
                {parserStep === 'review' && (
                  <div className="p-6 space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />解析完成！請確認以下資料，可直接修改後上架。
                    </div>
                    {parserForm.image_url && (
                      <img src={parserForm.image_url} alt="preview" className="w-full h-36 object-cover rounded-xl"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <ReviewFields f={parserForm} setF={setParserForm} />
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end flex-shrink-0">
                {parserStep === 'review' && (
                  <button onClick={() => setParserStep('input')} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">重新解析</button>
                )}
                <button onClick={() => setShowParser(false)} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">取消</button>
                {parserStep === 'input' && (
                  <button onClick={handleParse} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition shadow-sm">
                    <Sparkles className="w-4 h-4" />開始解析
                  </button>
                )}
                {parserStep === 'review' && (
                  <button onClick={handleParserSave} disabled={parserSaving || !parserForm.name.trim()} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60">
                    {parserSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}確認上架
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorHotels;
