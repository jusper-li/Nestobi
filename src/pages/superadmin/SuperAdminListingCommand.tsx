import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BedDouble,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader,
  Send,
  ShoppingBag,
  Tag,
  Terminal,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Hotel {
  id: string;
  name: string;
  city: string;
  vendor_id: string;
}

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
  { value: 'single', label: 'Single Room' },
  { value: 'double', label: 'Double Room' },
  { value: 'suite', label: 'Suite' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'family', label: 'Family Room' },
  { value: 'villa', label: 'Villa' },
];

function TagEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const value = input.trim();
    if (value && !values.includes(value)) onChange([...values, value]);
    setInput('');
  };

  return (
    <div className="flex min-h-[42px] flex-wrap gap-1.5 rounded-xl border border-gray-200 p-2">
      {values.map(value => (
        <span key={value} className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
          {value}
          <button type="button" onClick={() => onChange(values.filter(item => item !== value))}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder || 'Type and press Enter'}
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';
const selectCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

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
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-listing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: 'command', content: command }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Parse failed');

      const result: ParsedResult = json.result;
      setParsed(result);

      const initialData = { ...result.data };
      if (result.intent === 'product' && result.data.category_slug) {
        const cat = categories.find(item => item.slug === result.data.category_slug);
        if (cat) initialData.category_id = cat.id;
      }
      setEditData(initialData);
    } catch (err: any) {
      setError(err.message);
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
        await logAdminAction('create_product', 'products', null, {
          name: payload.name,
          vendor_id: payload.vendor_id,
          source: 'listing_command',
        });
        setSavedMsg('Product created');
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
        await logAdminAction('create_hotel', 'hotels', null, {
          name: payload.name,
          vendor_id: payload.vendor_id,
          source: 'listing_command',
        });
        setSavedMsg('Hotel created');
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
        await logAdminAction('create_room', 'tbl_rooms', null, {
          name: payload.name,
          vendor_id: payload.vendor_id,
          hotel_id: payload.hotel_id,
          source: 'listing_command',
        });
        setSavedMsg('Room created');
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const intentIcon = (intent: string) => {
    if (intent === 'hotel') return <Building2 className="h-4 w-4" />;
    if (intent === 'room') return <BedDouble className="h-4 w-4" />;
    return <ShoppingBag className="h-4 w-4" />;
  };

  const intentLabel = (intent: string) => {
    if (intent === 'hotel') return 'Hotel';
    if (intent === 'room') return 'Room';
    return 'Product';
  };

  const intentColor = (intent: string) => {
    if (intent === 'hotel') return 'bg-blue-100 text-blue-700';
    if (intent === 'room') return 'bg-green-100 text-green-700';
    return 'bg-amber-100 text-amber-700';
  };

  const filteredHotels = editData.vendor_id ? hotels.filter(hotel => hotel.vendor_id === editData.vendor_id) : hotels;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-slate-100 p-2">
          <Terminal className="h-6 w-6 text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Listing Command</h1>
          <p className="text-sm text-gray-400">Enter a natural-language command and the system will parse it into a product, hotel, or room draft.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700">Command input</label>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={command}
            onChange={e => setCommand(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleParse();
            }}
            rows={4}
            placeholder={`Example:
Product: Ethiopia Yirgacheffe, NT$580, origin Ethiopia, altitude 1800-2000m.

Hotel: business hotel near Taipei Main Station, phone 0912345678, check-in 15:00.

Room: double room, weekday 3200, weekend 3800, amenities WiFi / AC / bathtub.`}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Ctrl + Enter to run</p>
          <button
            onClick={handleParse}
            disabled={parsing || !command.trim()}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {parsing ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {parsing ? 'Parsing...' : 'Parse'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {savedMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {savedMsg}
        </motion.div>
      )}

      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="overflow-hidden rounded-2xl bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${intentColor(parsed.intent)}`}>
                {intentIcon(parsed.intent)}
                {intentLabel(parsed.intent)}
              </span>
              <span className="text-sm text-gray-400">
                Confidence <span className="font-semibold text-gray-700">{Math.round(parsed.confidence * 100)}%</span>
              </span>
              <span className="ml-auto text-xs text-gray-400">Edit fields and save</span>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Name *">
                    <input value={editData.name || ''} onChange={e => set('name', e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Description">
                    <textarea value={editData.description || ''} onChange={e => set('description', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
                  </Field>
                </div>
                <div>
                  <Field label="Vendor">
                    <select
                      value={editData.vendor_id || ''}
                      onChange={e => {
                        set('vendor_id', e.target.value);
                        set('hotel_id', '');
                      }}
                      className={selectCls}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div>
                  <Field label="Enabled">
                    <button
                      type="button"
                      onClick={() => set(parsed.intent === 'room' ? 'is_available' : 'is_active', !(editData.is_active ?? editData.is_available))}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                        (editData.is_active ?? editData.is_available) !== false
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${(editData.is_active ?? editData.is_available) !== false ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {(editData.is_active ?? editData.is_available) !== false ? 'Enabled' : 'Disabled'}
                    </button>
                  </Field>
                </div>
              </div>

              {parsed.intent === 'product' && (
                <div className="space-y-4 border-t border-gray-100 pt-2">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Price (NT$)">
                      <input type="number" value={editData.price || 0} onChange={e => set('price', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Stock">
                      <input type="number" value={editData.stock_quantity || 0} onChange={e => set('stock_quantity', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="SKU">
                      <input value={editData.sku || ''} onChange={e => set('sku', e.target.value)} placeholder="Optional" className={inputCls} />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Category">
                      <select value={editData.category_id || ''} onChange={e => set('category_id', e.target.value)} className={selectCls}>
                        <option value="">Select category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Image URL">
                      <input value={editData.image_url || ''} onChange={e => set('image_url', e.target.value)} placeholder="https://..." className={inputCls} />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Origin">
                      <input value={editData.origin || ''} onChange={e => set('origin', e.target.value)} placeholder="e.g. Ethiopia" className={inputCls} />
                    </Field>
                    <Field label="Roast Level">
                      <input value={editData.roast_level || ''} onChange={e => set('roast_level', e.target.value)} placeholder="e.g. Light roast" className={inputCls} />
                    </Field>
                    <Field label="Process Method">
                      <input value={editData.processing_method || ''} onChange={e => set('processing_method', e.target.value)} placeholder="e.g. Washed / Natural" className={inputCls} />
                    </Field>
                    <Field label="Altitude">
                      <input value={editData.altitude || ''} onChange={e => set('altitude', e.target.value)} placeholder="e.g. 1800-2000m" className={inputCls} />
                    </Field>
                    <Field label="Weight (g)">
                      <input type="number" value={editData.weight_grams || ''} onChange={e => set('weight_grams', e.target.value)} placeholder="e.g. 200" className={inputCls} />
                    </Field>
                    <Field label="Roast Date">
                      <input type="date" value={editData.roast_date || ''} onChange={e => set('roast_date', e.target.value)} className={inputCls} />
                    </Field>
                  </div>

                  <Field label="Variety (Enter to add)">
                    <TagEditor values={Array.isArray(editData.variety) ? editData.variety : []} onChange={v => set('variety', v)} placeholder="Type and press Enter" />
                  </Field>
                  <Field label="Flavor Notes (Enter to add)">
                    <TagEditor values={Array.isArray(editData.flavor_notes) ? editData.flavor_notes : []} onChange={v => set('flavor_notes', v)} placeholder="Type and press Enter" />
                  </Field>
                  <Field label="Tags (Enter to add)">
                    <TagEditor values={Array.isArray(editData.tags) ? editData.tags : []} onChange={v => set('tags', v)} placeholder="Type and press Enter" />
                  </Field>
                  <Field label="Source URL">
                    <input value={editData.source_url || ''} onChange={e => set('source_url', e.target.value)} placeholder="https://..." className={inputCls} />
                  </Field>
                </div>
              )}

              {parsed.intent === 'hotel' && (
                <div className="space-y-4 border-t border-gray-100 pt-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="City">
                      <input value={editData.city || ''} onChange={e => set('city', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Address">
                      <input value={editData.address || ''} onChange={e => set('address', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Phone">
                      <input value={editData.phone || ''} onChange={e => set('phone', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Email">
                      <input type="email" value={editData.email || ''} onChange={e => set('email', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="LINE ID">
                      <input value={editData.line_id || ''} onChange={e => set('line_id', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Facebook">
                      <input value={editData.facebook || ''} onChange={e => set('facebook', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Check-in Time">
                      <input value={editData.checkin_time || '15:00'} onChange={e => set('checkin_time', e.target.value)} placeholder="15:00" className={inputCls} />
                    </Field>
                    <Field label="Check-out Time">
                      <input value={editData.checkout_time || '11:00'} onChange={e => set('checkout_time', e.target.value)} placeholder="11:00" className={inputCls} />
                    </Field>
                    <Field label="Stars">
                      <select value={editData.star_rating || 3} onChange={e => set('star_rating', Number(e.target.value))} className={selectCls}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>
                            {n} Stars
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Deposit (NT$)">
                      <input type="number" value={editData.deposit_amount || 0} onChange={e => set('deposit_amount', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Image URL">
                      <input value={editData.image_url || ''} onChange={e => set('image_url', e.target.value)} placeholder="https://..." className={inputCls} />
                    </Field>
                    <Field label="Registration No.">
                      <input value={editData.registration_number || ''} onChange={e => set('registration_number', e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Pet Friendly">
                    <button
                      type="button"
                      onClick={() => set('pet_friendly', !editData.pet_friendly)}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                        editData.pet_friendly ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${editData.pet_friendly ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {editData.pet_friendly ? 'Pet Friendly' : 'Not Pet Friendly'}
                    </button>
                  </Field>
                </div>
              )}

              {parsed.intent === 'room' && (
                <div className="space-y-4 border-t border-gray-100 pt-2">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Room Type">
                      <select value={editData.room_type || 'double'} onChange={e => set('room_type', e.target.value)} className={selectCls}>
                        {ROOM_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Min Guests">
                      <input type="number" value={editData.min_capacity || 1} onChange={e => set('min_capacity', Number(e.target.value))} min={1} className={inputCls} />
                    </Field>
                    <Field label="Max Guests">
                      <input type="number" value={editData.capacity || 2} onChange={e => set('capacity', Number(e.target.value))} min={1} className={inputCls} />
                    </Field>
                    <Field label="Weekday Price (NT$)">
                      <input type="number" value={editData.price_per_night || 0} onChange={e => set('price_per_night', Number(e.target.value))} className={inputCls} />
                    </Field>
                    <Field label="Weekend Price (NT$)">
                      <input type="number" value={editData.weekend_price || 0} onChange={e => set('weekend_price', Number(e.target.value))} className={inputCls} />
                    </Field>
                    <Field label="Floor">
                      <input value={editData.floor || ''} onChange={e => set('floor', e.target.value)} placeholder="e.g. 2F" className={inputCls} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Location">
                        <input value={editData.location || ''} onChange={e => set('location', e.target.value)} className={inputCls} />
                      </Field>
                    </div>
                    <div>
                      <Field label="Hotel">
                        <select value={editData.hotel_id || ''} onChange={e => set('hotel_id', e.target.value)} className={selectCls}>
                          <option value="">Select hotel</option>
                          {filteredHotels.map(hotel => (
                            <option key={hotel.id} value={hotel.id}>
                              {hotel.name}
                              {hotel.city ? ` (${hotel.city})` : ''}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                  <Field label="Amenities (Enter to add)">
                    <TagEditor values={Array.isArray(editData.amenities) ? editData.amenities : []} onChange={v => set('amenities', v)} placeholder="e.g. WiFi, AC, bathtub" />
                  </Field>
                  <Field label="Images (Enter to add)">
                    <TagEditor values={Array.isArray(editData.images) ? editData.images : []} onChange={v => set('images', v)} placeholder="Type and press Enter" />
                  </Field>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setParsed(null);
                    setEditData({});
                    setSavedMsg('');
                  }}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !editData.name}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Save Draft
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <button onClick={() => setHistoryOpen(prev => !prev)} className="flex w-full items-center justify-between px-5 py-4 transition hover:bg-gray-50">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Tag className="h-4 w-4 text-gray-400" />
              History
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{history.length}</span>
            </div>
            {historyOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>
          <AnimatePresence>
            {historyOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-100">
                <div className="space-y-2 p-3">
                  {history.map(item => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${intentColor(item.intent)}`}>
                        {intentIcon(item.intent)}
                        {intentLabel(item.intent)}
                      </span>
                      <span className="flex-1 truncate text-gray-700">{item.command}</span>
                      <span className="flex-shrink-0 text-xs text-gray-400">{item.savedAt}</span>
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
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
