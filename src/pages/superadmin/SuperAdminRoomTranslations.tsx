import { useEffect, useMemo, useState } from 'react';
import { Search, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TranslationRow {
  id: string;
  entity_id: string;
  field_key: string;
  target_lang: string;
  source_text: string;
  translated_text: string;
  is_manual: boolean;
  updated_at: string;
}

interface RoomOption {
  id: string;
  name: string;
}

export default function SuperAdminRoomTranslations() {
  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [search, setSearch] = useState('');
  const [lang, setLang] = useState('all');
  const [edits, setEdits] = useState<Record<string, string>>({});

  const roomNameMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach(room => map.set(room.id, room.name));
    return map;
  }, [rooms]);

  async function loadData() {
    setLoading(true);
    const [{ data: translationRows }, { data: roomRows }] = await Promise.all([
      supabase
        .from('content_translations')
        .select('id, entity_id, field_key, target_lang, source_text, translated_text, is_manual, updated_at')
        .eq('entity_type', 'room')
        .order('updated_at', { ascending: false })
        .limit(800),
      supabase.from('tbl_rooms').select('id, name'),
    ]);

    setRows((translationRows || []) as TranslationRow[]);
    setRooms((roomRows || []) as RoomOption[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(row => {
      const roomName = roomNameMap.get(row.entity_id) || '';
      const matchLang = lang === 'all' || row.target_lang === lang;
      const matchSearch =
        !q ||
        roomName.toLowerCase().includes(q) ||
        row.field_key.toLowerCase().includes(q) ||
        row.source_text.toLowerCase().includes(q) ||
        row.translated_text.toLowerCase().includes(q);
      return matchLang && matchSearch;
    });
  }, [rows, roomNameMap, search, lang]);

  async function saveRow(row: TranslationRow) {
    const translated = (edits[row.id] ?? row.translated_text).trim();
    if (!translated) return;
    setSavingId(row.id);
    const { error } = await supabase
      .from('content_translations')
      .update({ translated_text: translated, is_manual: true, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (!error) {
      setRows(prev => prev.map(item => (item.id === row.id ? { ...item, translated_text: translated, is_manual: true } : item)));
    }
    setSavingId('');
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">住宿翻譯管理</h1>
        <p className="mt-1 text-sm text-gray-500">檢視並更新住宿相關的多語系翻譯內容。</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="搜尋房型、欄位或翻譯內容"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:border-[#C09A6A] focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/20"
            />
          </div>
          <select
            value={lang}
            onChange={event => setLang(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#C09A6A] focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/20"
          >
            <option value="all">全部語言</option>
            <option value="en">English</option>
            <option value="ja">日文</option>
            <option value="ko">韓文</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">房型</th>
                <th className="px-4 py-3">欄位</th>
                <th className="px-4 py-3">語言</th>
                <th className="px-4 py-3">原文</th>
                <th className="px-4 py-3">翻譯</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    載入中...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    目前沒有符合條件的翻譯資料
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{roomNameMap.get(row.entity_id) || '未命名房型'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{row.field_key}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#8B6840]">{row.target_lang}</td>
                    <td className="max-w-xs px-4 py-3 text-xs text-gray-500">{row.source_text}</td>
                    <td className="px-4 py-3">
                      <textarea
                        rows={2}
                        value={edits[row.id] ?? row.translated_text}
                        onChange={event => setEdits(prev => ({ ...prev, [row.id]: event.target.value }))}
                        className="w-full min-w-[220px] rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#C09A6A] focus:outline-none focus:ring-2 focus:ring-[#C09A6A]/20"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => saveRow(row)}
                        disabled={savingId === row.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#2C1F10] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#1A1208] disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        儲存
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
