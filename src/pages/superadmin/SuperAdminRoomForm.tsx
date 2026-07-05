import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Store, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';
import WeeklyPricingSection from '../../components/WeeklyPricingSection';
import MultiImageUpload from '../../components/MultiImageUpload';

interface RoomForm {
  name: string;
  description: string;
  room_type: string;
  capacity: number;
  min_capacity: number;
  price_per_night: number;
  weekend_price: number;
  image_url: string;
  images: string[];
  floor: string;
  location: string;
  amenities: string[];
  vendor_id: string;
  hotel_id: string;
  is_available: boolean;
}

interface Vendor { id: string; name: string; }
interface Hotel { id: string; name: string; city: string; }

const ROOM_TYPES = [
  { value: 'single', label: '單人房' },
  { value: 'double', label: '雙人房' },
  { value: 'suite', label: '套房' },
  { value: 'family', label: '家庭房' },
  { value: 'villa', label: '別墅' },
];

const AMENITIES_LIST = ['WiFi', '早餐', '停車', '游泳池', '健身房', 'SPA'];

const EMPTY: RoomForm = {
  name: '', description: '', room_type: 'double', capacity: 2, min_capacity: 1,
  price_per_night: 3000, weekend_price: 0, image_url: '', images: [], floor: '', location: '', amenities: [], vendor_id: '', hotel_id: '', is_available: true,
};

const SuperAdminRoomForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [form, setForm] = useState<RoomForm>(EMPTY);
  const [dayPrices, setDayPrices] = useState<Record<number, number>>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [vendorName, setVendorName] = useState('');

  const loadHotels = async (vendorId: string) => {
    if (!vendorId) { setHotels([]); return; }
    const { data } = await supabase.from('hotels').select('id, name, city').eq('vendor_id', vendorId).order('name');
    setHotels((data || []) as Hotel[]);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: vds } = await supabase.from('vendors').select('id, name').order('name');
      setVendors(vds || []);
      if (!isNew && id) {
        const [{ data }, { data: prices }] = await Promise.all([
          supabase.from('tbl_rooms').select('*, vendors(name)').eq('id', id).maybeSingle(),
          supabase.from('tbl_room_day_prices').select('day_of_week, price').eq('room_id', id),
        ]);
        if (data) {
          const { vendors: vendorObj, ...roomData } = data as any;
          setForm({ ...EMPTY, ...roomData, amenities: Array.isArray(data.amenities) ? data.amenities : [], images: Array.isArray(data.images) ? data.images : [], hotel_id: data.hotel_id || '', floor: data.floor || '', min_capacity: data.min_capacity || 1, weekend_price: data.weekend_price || 0 });
          setVendorName(vendorObj?.name || '');
          if (data.vendor_id) await loadHotels(data.vendor_id);
        }
        if (prices) {
          const map: Record<number, number> = {};
          prices.forEach((p: any) => { map[p.day_of_week] = Number(p.price); });
          setDayPrices(map);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const set = (key: keyof RoomForm, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'vendor_id') { loadHotels(value); setForm(prev => ({ ...prev, vendor_id: value, hotel_id: '' })); }
  };
  const toggleAmenity = (a: string) =>
    set('amenities', form.amenities.includes(a) ? form.amenities.filter(x => x !== a) : [...form.amenities, a]);

  const saveDayPrices = async (roomId: string) => {
    await supabase.from('tbl_room_day_prices').delete().eq('room_id', roomId);
    const rows = Object.entries(dayPrices)
      .filter(([, price]) => price > 0)
      .map(([day, price]) => ({ room_id: roomId, day_of_week: Number(day), price }));
    if (rows.length > 0) {
      await supabase.from('tbl_room_day_prices').insert(rows);
      await logAdminAction('upsert_room_day_prices', 'tbl_room_day_prices', roomId, { count: rows.length });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, vendor_id: form.vendor_id || null, hotel_id: form.hotel_id || null, image_url: form.images[0] || form.image_url || '', images: form.images };
      if (isNew) {
        const { data } = await supabase.from('tbl_rooms').insert(payload).select('id').single();
        if (data) {
          await logAdminAction('create_room', 'tbl_rooms', data.id, { name: payload.name, vendor_id: payload.vendor_id, hotel_id: payload.hotel_id });
          await saveDayPrices(data.id);
        }
      } else {
        await supabase.from('tbl_rooms').update(payload).eq('id', id!);
        await logAdminAction('update_room', 'tbl_rooms', id!, { name: payload.name, vendor_id: payload.vendor_id, hotel_id: payload.hotel_id });
        await saveDayPrices(id!);
      }
      navigate('/superadmin/rooms');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/superadmin/rooms')}
          className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? '新增房型' : '編輯房型'}</h1>
          {!isNew && vendorName && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-600">
              <Store className="w-3.5 h-3.5" />
              <span>所屬廠商：{vendorName}</span>
            </div>
          )}
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-sm p-6 space-y-5"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><Store className="w-4 h-4 text-amber-500" />所屬廠商</span>
            </label>
            <select
              value={form.vendor_id}
              onChange={e => set('vendor_id', e.target.value)}
              className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">請選擇廠商</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-amber-500" />所屬飯店</span>
            </label>
            <select
              value={form.hotel_id}
              onChange={e => set('hotel_id', e.target.value)}
              disabled={hotels.length === 0}
              className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
            >
              <option value="">{hotels.length === 0 ? '請先選擇廠商' : '不指定飯店'}</option>
              {hotels.map(h => <option key={h.id} value={h.id}>{h.name}{h.city ? ` (${h.city})` : ''}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">房型名稱</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">房型類別</label>
            <select
              value={form.room_type}
              onChange={e => set('room_type', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最少人數</label>
            <input type="number" value={form.min_capacity} onChange={e => set('min_capacity', Number(e.target.value))} min={1}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最多人數</label>
            <input type="number" value={form.capacity} onChange={e => set('capacity', Number(e.target.value))} min={1}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平日每晚價格（NT$）</label>
            <input type="number" value={form.price_per_night} onChange={e => set('price_per_night', Number(e.target.value))} min={0}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">假日每晚價格（NT$）</label>
            <input type="number" value={form.weekend_price} onChange={e => set('weekend_price', Number(e.target.value))} min={0}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地點</label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">樓層</label>
            <input type="text" value={form.floor} onChange={e => set('floor', e.target.value)} placeholder="例如 1F、2F"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">房間圖片（可多張，第一張為封面）</label>
            <MultiImageUpload values={form.images} onChange={imgs => set('images', imgs)} accentClass="ring-amber-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">房型介紹</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
        </div>

        <div className="border border-amber-100 rounded-xl p-4 bg-amber-50/40">
          <WeeklyPricingSection
            dayPrices={dayPrices}
            defaultPrice={form.price_per_night}
            onChange={setDayPrices}
            accentColor="amber"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">設施（多選）</label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES_LIST.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  form.amenities.includes(a)
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => set('is_available', !form.is_available)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_available ? 'bg-amber-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${form.is_available ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm text-gray-700">開放預訂</span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/superadmin/rooms')}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition text-center"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />
            }
            儲存
          </button>
        </div>
      </motion.form>
    </div>
  );
};

export default SuperAdminRoomForm;
