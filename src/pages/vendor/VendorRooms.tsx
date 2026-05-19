import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, BedDouble, X, AlertCircle, Link, Loader2, CheckCircle, ChevronRight, Sparkles, FileText, Upload, Hotel, MapPin, ChevronDown, ChevronUp, Users, Banknote } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/utils';
import MultiImageUpload from '../../components/MultiImageUpload';
import { sanitizeText } from '../../lib/security';

interface Room {
  id: string;
  name: string;
  room_type: string;
  capacity: number;
  min_capacity?: number;
  price_per_night: number;
  weekend_price?: number;
  location: string;
  floor?: string;
  is_available: boolean;
  image_url: string;
  images?: string[];
  description: string;
  amenities: string[];
  hotel_id?: string;
}

interface HotelOption {
  id: string;
  name: string;
  city: string;
  is_active: boolean;
}

interface BulkRoomItem {
  key: string;
  selected: boolean;
  expanded: boolean;
  form: RoomForm;
}

type RoomForm = {
  name: string;
  room_type: string;
  capacity: number;
  min_capacity: number;
  price_per_night: number;
  weekend_price: number;
  location: string;
  floor: string;
  image_url: string;
  images: string[];
  description: string;
  amenities: string[];
  is_available: boolean;
};

const ROOM_TYPES = ['single', 'double', 'suite', 'deluxe', 'family'];
const ROOM_TYPE_LABELS: Record<string, string> = { single: '單人房', double: '雙人房', suite: '套房', deluxe: '豪華房', family: '家庭房' };

const emptyForm: RoomForm = { name: '', room_type: 'double', capacity: 2, min_capacity: 1, price_per_night: 0, weekend_price: 0, location: '', floor: '', image_url: '', images: [], description: '', amenities: [], is_available: true };

function rawToForm(r: Record<string, unknown>): RoomForm {
  const imageUrl = String(r.image_url || '');
  const images = Array.isArray(r.images) ? r.images.map(String) : (imageUrl ? [imageUrl] : []);
  return {
    name: String(r.name || ''),
    room_type: ROOM_TYPES.includes(r.room_type as string) ? (r.room_type as string) : 'double',
    capacity: Number(r.capacity) || 2,
    min_capacity: Number(r.min_capacity) || 1,
    price_per_night: Number(r.price_per_night) || 0,
    weekend_price: Number(r.weekend_price) || 0,
    location: String(r.location || ''),
    floor: String(r.floor || ''),
    image_url: imageUrl,
    images,
    description: String(r.description || ''),
    amenities: Array.isArray(r.amenities) ? r.amenities.map(String) : [],
    is_available: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRoomArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function extractScrapedRooms(data: unknown): Record<string, unknown>[] {
  if (!isRecord(data)) return [];

  const topLevelRooms = asRoomArray(data.rooms);
  if (topLevelRooms.length > 0) return topLevelRooms;

  if (isRecord(data.result)) {
    const nestedRooms = asRoomArray(data.result.rooms);
    if (nestedRooms.length > 0) return nestedRooms;
    if (typeof data.result.name === 'string' && data.result.name.trim()) return [data.result];
  }

  return [];
}

const VendorRooms: React.FC = () => {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [noVendor, setNoVendor] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [amenityInput, setAmenityInput] = useState('');

  // Scraper state — bulk mode
  const [showScraper, setShowScraper] = useState(false);
  const [scraperUrl, setScraperUrl] = useState('');
  const [scraperStep, setScraperStep] = useState<'input' | 'loading' | 'review'>('input');
  const [scraperError, setScraperError] = useState('');
  const [scraperBulkRooms, setScraperBulkRooms] = useState<BulkRoomItem[]>([]);
  const [scraperBulkSaving, setScraperBulkSaving] = useState(false);

  // Text/File parser state
  const [showParser, setShowParser] = useState(false);
  const [parserTab, setParserTab] = useState<'text' | 'file'>('text');
  const [parserText, setParserText] = useState('');
  const [parserFile, setParserFile] = useState<File | null>(null);
  const [parserFilePreview, setParserFilePreview] = useState('');
  const [parserDragOver, setParserDragOver] = useState(false);
  const [parserStep, setParserStep] = useState<'input' | 'loading' | 'review'>('input');
  const [parserError, setParserError] = useState('');
  const [parserForm, setParserForm] = useState<RoomForm>(emptyForm);
  const [parserAmenityInput, setParserAmenityInput] = useState('');
  const [parserSaving, setParserSaving] = useState(false);

  // Hotel state
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);

  const fetchHotels = async (vid: string): Promise<HotelOption[]> => {
    const { data } = await supabase.from('hotels').select('id, name, city, is_active').eq('vendor_id', vid).order('created_at', { ascending: true });
    const list = (data || []) as HotelOption[];
    setHotels(list);
    return list;
  };

  const fetchRooms = async (vid: string, hotelId: string | null) => {
    let q = supabase.from('tbl_rooms').select('id,name,room_type,capacity,min_capacity,price_per_night,weekend_price,location,floor,is_available,image_url,images,description,amenities,hotel_id').eq('vendor_id', vid);
    if (hotelId) q = q.eq('hotel_id', hotelId);
    else q = q.is('hotel_id', null);
    const { data } = await q.order('created_at', { ascending: false });
    setRooms((data || []) as Room[]);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('vendors').select('id').eq('user_id', user.id).maybeSingle().then(async ({ data }) => {
      if (!data) { setNoVendor(true); setLoading(false); return; }
      setVendorId(data.id);
      const hotelList = await fetchHotels(data.id);
      const firstHotel = hotelList[0]?.id ?? null;
      setSelectedHotelId(firstHotel);
      await fetchRooms(data.id, firstHotel);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (vendorId) fetchRooms(vendorId, selectedHotelId);
  }, [selectedHotelId]);

  // ── Manual add/edit ────────────────────────────────────────────
  const openAdd = () => { setEditing(null); setForm(emptyForm); setAmenityInput(''); setShowModal(true); };
  const openEdit = (r: Room) => {
    setEditing(r);
    setForm({ name: r.name, room_type: r.room_type, capacity: r.capacity, min_capacity: r.min_capacity || 1, price_per_night: r.price_per_night, weekend_price: r.weekend_price || 0, location: r.location, floor: r.floor || '', image_url: r.image_url, images: r.images || [], description: r.description, amenities: r.amenities || [], is_available: r.is_available });
    setAmenityInput('');
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!vendorId || !form.name.trim()) return;
    setSaving(true);
    const images = Array.from(new Set(form.images.map(image => sanitizeText(image, 1000)).filter(Boolean)));
    const payload = {
      ...form,
      vendor_id: vendorId,
      hotel_id: selectedHotelId,
      name: sanitizeText(form.name, 160),
      location: sanitizeText(form.location, 160),
      floor: sanitizeText(form.floor, 80),
      description: sanitizeText(form.description, 2000),
      amenities: form.amenities.map(item => sanitizeText(item, 80)).filter(Boolean),
      images,
      image_url: images[0] || sanitizeText(form.image_url || '', 1000),
      updated_at: new Date().toISOString()
    };
    if (editing) {
      await supabase.from('tbl_rooms').update(payload).eq('id', editing.id).eq('vendor_id', vendorId);
    } else {
      await supabase.from('tbl_rooms').insert(payload);
    }
    await fetchRooms(vendorId, selectedHotelId);
    setSaving(false);
    setShowModal(false);
  };
  const handleDelete = async (id: string) => {
    if (!vendorId || !confirm('確定要刪除此房間嗎？')) return;
    await supabase.from('tbl_rooms').delete().eq('id', id).eq('vendor_id', vendorId);
    await fetchRooms(vendorId, selectedHotelId);
  };
  const addAmenity = () => {
    const val = amenityInput.trim();
    if (val && !form.amenities.includes(val)) setForm(f => ({ ...f, amenities: [...f.amenities, val] }));
    setAmenityInput('');
  };

  // ── Scraper (bulk) ─────────────────────────────────────────────
  const openScraper = () => {
    setScraperUrl(''); setScraperStep('input'); setScraperError(''); setScraperBulkRooms([]); setShowScraper(true);
  };

  const handleScrape = async () => {
    if (!scraperUrl.trim()) { setScraperError('請輸入網址'); return; }
    setScraperError(''); setScraperStep('loading');
    try {
      const { data: { session: s1 } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke('scrape-url', {
        body: { url: scraperUrl.trim(), type: 'room', bulk: true },
        headers: s1 ? { Authorization: `Bearer ${s1.access_token}` } : {},
      });
      if (fnError) throw new Error(fnError.message || '解析失敗');
      if (data?.error) throw new Error(data.error);
      const rawRooms = extractScrapedRooms(data);
      if (rawRooms.length === 0) throw new Error('未找到房型資料，請確認網址');
      setScraperBulkRooms(rawRooms.map((r, i) => ({
        key: `${i}-${Date.now()}`,
        selected: true,
        expanded: false,
        form: rawToForm(r),
      })));
      setScraperStep('review');
    } catch (err: unknown) {
      setScraperError(err instanceof Error ? err.message : '網址解析失敗，請確認網址是否正確');
      setScraperStep('input');
    }
  };

  const selectedCount = scraperBulkRooms.filter(r => r.selected).length;
  const allSelected = scraperBulkRooms.length > 0 && selectedCount === scraperBulkRooms.length;

  const toggleSelectAll = () => setScraperBulkRooms(prev => prev.map(r => ({ ...r, selected: !allSelected })));
  const toggleBulkSelect = (key: string) => setScraperBulkRooms(prev => prev.map(r => r.key === key ? { ...r, selected: !r.selected } : r));
  const toggleBulkExpand = (key: string) => setScraperBulkRooms(prev => prev.map(r => r.key === key ? { ...r, expanded: !r.expanded } : r));
  const setBulkField = (key: string, field: string, value: unknown) =>
    setScraperBulkRooms(prev => prev.map(r => r.key === key ? { ...r, form: { ...r.form, [field]: value } } : r));

  const handleBulkSave = async () => {
    if (!vendorId) return;
    const toInsert = scraperBulkRooms.filter(r => r.selected && r.form.name.trim());
    if (toInsert.length === 0) return;
    setScraperBulkSaving(true);
    const payload = toInsert.map(r => {
      const images = Array.from(new Set(r.form.images.map(image => sanitizeText(image, 1000)).filter(Boolean)));
      return {
        ...r.form,
        vendor_id: vendorId,
        hotel_id: selectedHotelId,
        name: sanitizeText(r.form.name, 160),
        location: sanitizeText(r.form.location, 160),
        floor: sanitizeText(r.form.floor, 80),
        description: sanitizeText(r.form.description, 2000),
        amenities: r.form.amenities.map(item => sanitizeText(item, 80)).filter(Boolean),
        images,
        image_url: images[0] || sanitizeText(r.form.image_url || '', 1000),
        updated_at: new Date().toISOString()
      };
    });
    await supabase.from('tbl_rooms').insert(payload);
    await fetchRooms(vendorId, selectedHotelId);
    setScraperBulkSaving(false);
    setShowScraper(false);
  };

  // ── Parser (single) ────────────────────────────────────────────
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'text/csv', 'application/json'];
  const ACCEPTED_EXT = '.jpg,.jpeg,.png,.webp,.gif,.txt,.csv,.json';

  const openParser = () => {
    setParserTab('text'); setParserText(''); setParserFile(null); setParserFilePreview('');
    setParserStep('input'); setParserError(''); setParserForm(emptyForm); setParserAmenityInput(''); setShowParser(true);
  };
  const handleParserFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_TYPES.some(t => file.name.endsWith(t.split('/')[1]))) {
      setParserError('不支援此檔案格式，請上傳圖片（JPG/PNG/WebP）或文字檔（TXT/CSV/JSON）');
      return;
    }
    setParserFile(file); setParserError('');
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setParserFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else { setParserFilePreview(''); }
  };
  const handleParse = async () => {
    if (parserTab === 'text' && !parserText.trim()) { setParserError('請輸入文字內容'); return; }
    if (parserTab === 'file' && !parserFile) { setParserError('請選擇檔案'); return; }
    setParserError(''); setParserStep('loading');
    try {
      let reqBody: Record<string, unknown>;
      if (parserTab === 'text') {
        reqBody = { type: 'room', mode: 'text', content: parserText.trim() };
      } else {
        const isImage = parserFile!.type.startsWith('image/');
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve((e.target?.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(parserFile!);
        });
        reqBody = { type: 'room', mode: isImage ? 'image' : 'file', content: base64, mime_type: parserFile!.type, filename: parserFile!.name };
      }
      const { data: { session: s2 } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke('parse-listing', {
        body: reqBody,
        headers: s2 ? { Authorization: `Bearer ${s2.access_token}` } : {},
      });
      if (fnError) throw new Error(fnError.message || '解析失敗');
      if (data?.error) throw new Error(data.error);
      setParserForm(rawToForm(data.result as Record<string, unknown>));
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
    await supabase.from('tbl_rooms').insert({
      ...parserForm,
      vendor_id: vendorId,
      hotel_id: selectedHotelId,
      name: sanitizeText(parserForm.name, 160),
      location: sanitizeText(parserForm.location, 160),
      floor: sanitizeText(parserForm.floor, 80),
      description: sanitizeText(parserForm.description, 2000),
      amenities: parserForm.amenities.map(item => sanitizeText(item, 80)).filter(Boolean),
      images,
      image_url: images[0] || sanitizeText(parserForm.image_url || '', 1000),
      updated_at: new Date().toISOString()
    });
    await fetchRooms(vendorId, selectedHotelId);
    setParserSaving(false);
    setShowParser(false);
  };
  const addParserAmenity = () => {
    const val = parserAmenityInput.trim();
    if (val && !parserForm.amenities.includes(val)) setParserForm(f => ({ ...f, amenities: [...f.amenities, val] }));
    setParserAmenityInput('');
  };

  // ── Shared step indicator ──────────────────────────────────────
  const StepBar = ({ step }: { step: 'input' | 'loading' | 'review' }) => (
    <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
      {([{ key: 'input', label: '輸入網址' }, { key: 'loading', label: 'AI 解析中' }, { key: 'review', label: '選擇房型' }] as const).map((s, i, arr) => (
        <React.Fragment key={s.key}>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === s.key ? 'text-emerald-700' : step === 'review' && s.key === 'input' ? 'text-emerald-500' : 'text-gray-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === s.key ? 'bg-emerald-600 text-white' : step === 'review' && s.key === 'input' ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
              {step === 'review' && s.key === 'input' ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </span>
            {s.label}
          </div>
          {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
        </React.Fragment>
      ))}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl"><BedDouble className="w-6 h-6 text-emerald-700" /></div>
          <h1 className="text-2xl font-bold text-gray-900">房間管理</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={openParser} className="flex items-center gap-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
            <FileText className="w-4 h-4" />文字/檔案上架
          </button>
          <button onClick={openScraper} className="flex items-center gap-2 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
            <Sparkles className="w-4 h-4" />網址爬蟲上架
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-sm">
            <Plus className="w-4 h-4" />新增房間
          </button>
        </div>
      </div>

      {/* Hotel selector */}
      {hotels.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Hotel className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">尚未建立飯店</p>
            <p className="text-xs text-amber-600 mt-0.5">請先至「飯店管理」建立飯店，再新增房間</p>
          </div>
          <a href="/vendor/hotels" className="flex-shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition">前往建立</a>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-1 flex items-center gap-1 overflow-x-auto">
          {hotels.map(h => (
            <button key={h.id} onClick={() => setSelectedHotelId(h.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${selectedHotelId === h.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Hotel className="w-4 h-4" />
              {h.name}
              {h.city && <span className={`text-xs ${selectedHotelId === h.id ? 'text-emerald-200' : 'text-gray-400'}`}>· {h.city}</span>}
              {!h.is_active && <span className={`text-xs ${selectedHotelId === h.id ? 'text-emerald-200' : 'text-gray-400'}`}>(停用)</span>}
            </button>
          ))}
          <a href="/vendor/hotels" className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-emerald-600 transition ml-auto flex-shrink-0">
            <MapPin className="w-3.5 h-3.5" />管理飯店
          </a>
        </div>
      )}

      {selectedHotelId && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Hotel className="w-4 h-4 text-emerald-500" />
          <span>目前顯示：<span className="font-medium text-gray-800">{hotels.find(h => h.id === selectedHotelId)?.name}</span> 的房型</span>
        </div>
      )}

      {/* Room grid */}
      {rooms.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <BedDouble className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">{selectedHotelId ? '此飯店尚無房型，點擊上方按鈕新增' : '尚無房間，點擊上方按鈕新增'}</p>
          <button onClick={openScraper} className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
            <Sparkles className="w-4 h-4" />使用 AI 爬蟲一次匯入所有房型 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room, i) => {
            const currentHotel = hotels.find(h => h.id === selectedHotelId);
            const coverImg = (room.images && room.images.length > 0 ? room.images[0] : null) || room.image_url;
            return (
            <motion.div key={room.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="relative">
                {coverImg ? (
                  <img src={coverImg} alt={room.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center"><BedDouble className="w-10 h-10 text-gray-300" /></div>
                )}
                {room.images && room.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{room.images.length} 張</span>
                )}
                {room.floor && (
                  <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{room.floor}</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0">
                    {currentHotel && (
                      <p className="text-xs text-emerald-600 font-medium mb-0.5 flex items-center gap-1">
                        <Hotel className="w-3 h-3" />{currentHotel.name}
                      </p>
                    )}
                    <h3 className="font-semibold text-gray-900 text-sm">{room.name}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${room.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {room.is_available ? '開放' : '停售'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  {ROOM_TYPE_LABELS[room.room_type] || room.room_type} · {room.min_capacity && room.min_capacity !== room.capacity ? `${room.min_capacity}–${room.capacity}` : room.capacity} 人
                </p>
                <p className="text-xs text-gray-400 mb-3">{room.location}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-700">{formatCurrency(room.price_per_night)}<span className="text-xs font-normal text-gray-400">/平日</span></span>
                    {room.weekend_price && room.weekend_price > 0 && (
                      <span className="text-xs text-gray-400 ml-1">假日 {formatCurrency(room.weekend_price)}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(room)} className="p-2 hover:bg-emerald-50 rounded-xl text-emerald-600 transition"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(room.id)} className="p-2 hover:bg-red-50 rounded-xl text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Manual Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editing ? '編輯房間' : '新增房間'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {([{ label: '房間名稱 *', key: 'name', type: 'text' }, { label: '地點', key: 'location', type: 'text' }] as const).map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type={f.type} value={form[f.key] as string} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">房間圖片（可多張，第一張為封面）</label>
                <MultiImageUpload values={form.images} onChange={imgs => setForm(prev => ({ ...prev, images: imgs }))} accentClass="ring-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">房型</label>
                  <select value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {ROOM_TYPES.map(t => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">容納人數</label>
                  <input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">每晚價格 (NT$)</label>
                <input type="number" min={0} value={form.price_per_night} onChange={e => setForm(f => ({ ...f, price_per_night: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">設施標籤</label>
                <div className="flex gap-2 mb-2">
                  <input value={amenityInput} onChange={e => setAmenityInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAmenity())} placeholder="輸入設施後按Enter"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <button onClick={addAmenity} type="button" className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200">加入</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.amenities.map((a, i) => (
                    <span key={i} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full">
                      {a}<button onClick={() => setForm(f => ({ ...f, amenities: f.amenities.filter((_, j) => j !== i) }))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="w-4 h-4 rounded accent-emerald-600" />
                <span className="text-sm text-gray-700">開放訂房</span>
              </label>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60 flex items-center gap-1.5">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editing ? '儲存變更' : '新增房間'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Scraper Modal (bulk) ── */}
      <AnimatePresence>
        {showScraper && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">AI 批次爬蟲 — 一次匯入所有房型</h3>
                </div>
                <button onClick={() => setShowScraper(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
              </div>

              <StepBar step={scraperStep} />

              <div className="flex-1 overflow-y-auto">
                {/* Input */}
                {scraperStep === 'input' && (
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">輸入民宿或飯店的網址，AI 將一次偵測並提取頁面上所有房型，讓您批次勾選匯入。</p>
                    {scraperError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{scraperError}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">住宿頁面網址</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="url" value={scraperUrl} onChange={e => setScraperUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScrape()}
                            placeholder="https://kei.cafe/room/K5"
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">支援民宿自有網站、各大訂房平台等</p>
                    </div>
                  </div>
                )}

                {/* Loading */}
                {scraperStep === 'loading' && (
                  <div className="p-12 flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-800 mb-1">AI 正在偵測所有房型</p>
                      <p className="text-sm text-gray-400">擷取頁面內容並解析房型清單中…</p>
                    </div>
                  </div>
                )}

                {/* Review — bulk checklist */}
                {scraperStep === 'review' && (
                  <div className="p-6 space-y-3">
                    {/* Summary bar */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>發現 <span className="font-bold">{scraperBulkRooms.length}</span> 個房型 · 已選 <span className="font-bold">{selectedCount}</span> 個</span>
                      </div>
                      <button onClick={toggleSelectAll} className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
                        {allSelected ? '取消全選' : '全選'}
                      </button>
                    </div>

                    {/* Room cards */}
                    {scraperBulkRooms.map(item => (
                      <div key={item.key} className={`border rounded-2xl transition overflow-hidden ${item.selected ? 'border-emerald-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                        {/* Card header */}
                        <div className="flex items-center gap-3 p-4">
                          <button onClick={() => toggleBulkSelect(item.key)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${item.selected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 bg-white'}`}>
                            {item.selected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </button>
                          {item.form.image_url && (
                            <img src={item.form.image_url} alt={item.form.name} className="w-12 h-10 object-cover rounded-lg flex-shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{item.form.name || '未命名房型'}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1 text-xs text-gray-500"><Users className="w-3 h-3" />{item.form.capacity} 人</span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">{ROOM_TYPE_LABELS[item.form.room_type] || item.form.room_type}</span>
                              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><Banknote className="w-3 h-3" />NT${item.form.price_per_night.toLocaleString()}</span>
                            </div>
                          </div>
                          <button onClick={() => toggleBulkExpand(item.key)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 flex-shrink-0">
                            {item.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Expanded edit form */}
                        <AnimatePresence>
                          {item.expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                              <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
                                {([{ label: '房間名稱', key: 'name' }, { label: '地點', key: 'location' }] as const).map(f => (
                                  <div key={f.key}>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                                    <input type="text" value={item.form[f.key] as string} onChange={e => setBulkField(item.key, f.key, e.target.value)}
                                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                  </div>
                                ))}
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">房間圖片（可多張，第一張為封面）</label>
                                  <MultiImageUpload values={item.form.images || []} onChange={imgs => setBulkField(item.key, 'images', imgs)} accentClass="ring-emerald-500" />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">房型</label>
                                    <select value={item.form.room_type} onChange={e => setBulkField(item.key, 'room_type', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                      {ROOM_TYPES.map(t => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">容納人數</label>
                                    <input type="number" min={1} value={item.form.capacity} onChange={e => setBulkField(item.key, 'capacity', Number(e.target.value))}
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">每晚價格</label>
                                    <input type="number" min={0} value={item.form.price_per_night} onChange={e => setBulkField(item.key, 'price_per_night', Number(e.target.value))}
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">描述</label>
                                  <textarea rows={2} value={item.form.description} onChange={e => setBulkField(item.key, 'description', e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                                </div>
                                {item.form.amenities.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.form.amenities.map((a, ai) => (
                                      <span key={ai} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full">
                                        {a}<button onClick={() => setBulkField(item.key, 'amenities', item.form.amenities.filter((_, j) => j !== ai))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end flex-shrink-0">
                {scraperStep === 'review' && (
                  <button onClick={() => setScraperStep('input')} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">重新解析</button>
                )}
                <button onClick={() => setShowScraper(false)} className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">取消</button>
                {scraperStep === 'input' && (
                  <button onClick={handleScrape} className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition shadow-sm">
                    <Sparkles className="w-4 h-4" />開始解析
                  </button>
                )}
                {scraperStep === 'review' && (
                  <button onClick={handleBulkSave} disabled={scraperBulkSaving || selectedCount === 0}
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-60 shadow-sm">
                    {scraperBulkSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    匯入 {selectedCount} 間房型
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Parser Modal (single) ── */}
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

              <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                {([{ key: 'input', label: '輸入內容' }, { key: 'loading', label: 'AI 解析中' }, { key: 'review', label: '確認資料' }] as const).map((s, i, arr) => (
                  <React.Fragment key={s.key}>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${parserStep === s.key ? 'text-emerald-700' : parserStep === 'review' && s.key === 'input' ? 'text-emerald-500' : 'text-gray-400'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${parserStep === s.key ? 'bg-emerald-600 text-white' : parserStep === 'review' && s.key === 'input' ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                        {parserStep === 'review' && s.key === 'input' ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                      </span>{s.label}
                    </div>
                    {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                  </React.Fragment>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                {parserStep === 'input' && (
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">貼上房間說明文字，或上傳圖片／文字檔，AI 將自動解析房間資料。</p>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">房間描述文字</label>
                        <textarea rows={8} value={parserText} onChange={e => setParserText(e.target.value)}
                          placeholder={`貼上任何格式的房間說明，例如：\n\n豪華海景雙人房\n地點：墾丁南灣\n每晚 NT$3,800\n容納 2 人\n設施：WiFi、冷氣、獨立衛浴、陽台\n\n寬敞客廳搭配落地窗，坐擁絕美海景...`}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          上傳檔案 <span className="text-xs font-normal text-gray-400 ml-2">支援 JPG / PNG / WebP / TXT / CSV / JSON</span>
                        </label>
                        <div
                          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${parserDragOver ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'}`}
                          onClick={() => document.getElementById('room-parser-file')?.click()}
                          onDragOver={e => { e.preventDefault(); setParserDragOver(true); }}
                          onDragLeave={() => setParserDragOver(false)}
                          onDrop={e => { e.preventDefault(); setParserDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleParserFile(f); }}>
                          <input id="room-parser-file" type="file" accept={ACCEPTED_EXT} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleParserFile(f); }} />
                          {parserFile ? (
                            <div className="space-y-2">
                              {parserFilePreview ? <img src={parserFilePreview} alt="preview" className="mx-auto max-h-32 rounded-lg object-contain" /> : <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto"><FileText className="w-6 h-6 text-emerald-600" /></div>}
                              <p className="font-medium text-gray-900 text-sm">{parserFile.name}</p>
                              <p className="text-xs text-gray-400">{(parserFile.size / 1024).toFixed(1)} KB · 點擊更換</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto"><Upload className="w-6 h-6 text-gray-400" /></div>
                              <p className="text-sm font-medium text-gray-700">拖曳檔案至此，或點擊選擇</p>
                              <p className="text-xs text-gray-400 mt-1">圖片：JPG、PNG、WebP｜文字：TXT、CSV、JSON</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {parserStep === 'loading' && (
                  <div className="p-10 flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
                    <div className="text-center">
                      <p className="font-medium text-gray-800 mb-1">AI 正在解析內容</p>
                      <p className="text-sm text-gray-400">辨識房間資訊中，請稍候…</p>
                    </div>
                  </div>
                )}

                {parserStep === 'review' && (
                  <div className="p-6 space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />解析完成！請確認以下資料是否正確，可直接修改後上架。
                    </div>
                    {([{ label: '房間名稱 *', key: 'name' }, { label: '地點', key: 'location' }] as const).map(f => (
                      <div key={f.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                        <input type="text" value={parserForm[f.key] as string} onChange={e => setParserForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">房間圖片（可多張，第一張為封面）</label>
                      <MultiImageUpload values={parserForm.images || []} onChange={imgs => setParserForm(p => ({ ...p, images: imgs }))} accentClass="ring-emerald-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">房型</label>
                        <select value={parserForm.room_type} onChange={e => setParserForm(f => ({ ...f, room_type: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                          {ROOM_TYPES.map(t => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">容納人數</label>
                        <input type="number" min={1} value={parserForm.capacity} onChange={e => setParserForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">每晚價格 (NT$)</label>
                      <input type="number" min={0} value={parserForm.price_per_night} onChange={e => setParserForm(f => ({ ...f, price_per_night: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                      <textarea rows={3} value={parserForm.description} onChange={e => setParserForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">設施標籤</label>
                      <div className="flex gap-2 mb-2">
                        <input value={parserAmenityInput} onChange={e => setParserAmenityInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addParserAmenity())} placeholder="輸入設施後按Enter"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        <button onClick={addParserAmenity} type="button" className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200">加入</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {parserForm.amenities.map((a, i) => (
                          <span key={i} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full">
                            {a}<button onClick={() => setParserForm(f => ({ ...f, amenities: f.amenities.filter((_, j) => j !== i) }))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={parserForm.is_available} onChange={e => setParserForm(f => ({ ...f, is_available: e.target.checked }))} className="w-4 h-4 rounded accent-emerald-600" />
                      <span className="text-sm text-gray-700">開放訂房</span>
                    </label>
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
                    {parserSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    確認上架
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

export default VendorRooms;
