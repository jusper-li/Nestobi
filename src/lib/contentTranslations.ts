import { callAI } from './openai';
import { supabase } from './supabase';

type RoomLike = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  amenities: string[] | null;
};

type HotelLike = {
  id: string;
  name?: string | null;
  city?: string | null;
};

type ProductLike = {
  id: string;
  name: string;
  description?: string | null;
  origin?: string | null;
  roast_level?: string | null;
  processing_method?: string | null;
  flavor_notes?: string[] | null;
  tags?: string[] | null;
};

type BlogLike = {
  id: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  category?: string | null;
  tags?: string[] | null;
  author_name?: string | null;
};

type BlogCategoryLike = {
  id: string;
  name: string;
  description?: string | null;
};

type CategoryLike = {
  id: string;
  name: string;
};

type StoreLike = {
  id: string;
  name: string;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  hours?: {
    primary?: string | null;
    secondary?: string | null;
    note?: string | null;
  } | null;
};

type QuizQuestionLike = {
  id: string;
  question_text: string;
  options: Array<{ option_text: string }>;
};

type TranslationRow = {
  entity_id: string;
  field_key: string;
  source_hash: string;
  translated_text: string;
};
type TranslationCacheRow = {
  source_hash: string;
  translated_text: string;
};

const ENTITY_TYPE = 'room';
const ENTITY_PRODUCT = 'product';
const ENTITY_BLOG = 'blog_post';
const ENTITY_BLOG_CATEGORY = 'blog_category';
const ENTITY_PRODUCT_CATEGORY = 'product_category';
const ENTITY_STORE = 'store_location';
const ENTITY_COFFEE_QUIZ_QUESTION = 'coffee_quiz_question';
const EMPTY_TRANSLATION_HINT = 'there is no text provided for translation';
const EMPTY_TRANSLATION_HINT_2 = 'please provide the text you would like to have translated';
let contentTranslationsTableUnavailable = false;
let translationCacheTableUnavailable = false;
let translationWriteDisabled = false;
let translationWriteAttempts = 0;
let translationWriteSuccess = 0;
let translationWriteFailed = 0;
let translationCacheWriteAttempts = 0;
let translationCacheWriteSuccess = 0;
let translationCacheWriteFailed = 0;
let translationLastError = '';
const STORAGE_KEY = 'nestobi:content-translations-unavailable';
const AI_COOLDOWN_KEY = 'nestobi:translation-ai-cooldown-until';
const AI_COOLDOWN_MS = 2 * 60 * 1000;
const TRANSLATION_CONCURRENCY = 3;

function isMojibakeLike(text: string): boolean {
  if (!text) return false;
  if (text.includes('\uFFFD')) return true; // mojibake-check-ignore: replacement char detector
  // Private use area characters are frequently seen in mojibake payloads in this project.
  if (/[\uE000-\uF8FF]/.test(text)) return true;
  // Common corrupted token pattern seen in prior bad payloads.
  if (/\?[^\s]{1,3}/.test(text) && /[蝜銝敺撱憿雿鈭頛瘝閮鞈瑯賢箇颯擐霅蝭噯麮窶篞諻鴔鼒諈黺賱鮈諤]/.test(text)) return true; // mojibake-check-ignore: detector token set
  return false;
}

if (typeof window !== 'undefined') {
  try {
    contentTranslationsTableUnavailable = window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    contentTranslationsTableUnavailable = false;
  }
}

function markTranslationsUnavailable() {
  contentTranslationsTableUnavailable = true;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }
}

function isLocalSupabaseProxyMode() {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function getAICooldownUntil() {
  if (typeof window === 'undefined') return 0;
  try {
    return Number(window.sessionStorage.getItem(AI_COOLDOWN_KEY) || '0');
  } catch {
    return 0;
  }
}

function setAICooldownNow() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(AI_COOLDOWN_KEY, String(Date.now() + AI_COOLDOWN_MS));
  } catch {
    // ignore
  }
}

async function readTranslationCacheByHashes(
  sourceHashes: string[],
  sourceLang: string,
  targetLang: string,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!sourceHashes.length || translationCacheTableUnavailable) return result;
  const { data, error } = await supabase
    .from('translation_cache')
    .select('source_hash, translated_text')
    .eq('source_lang', sourceLang)
    .eq('target_lang', targetLang)
    .in('source_hash', sourceHashes);

  const errText = String(error?.message || '').toLowerCase();
  if (errText.includes('could not find the table') || errText.includes('404') || errText.includes('not found')) {
    translationCacheTableUnavailable = true;
    return result;
  }

  (data as TranslationCacheRow[] | null)?.forEach(row => {
    const hash = String(row.source_hash || '');
    const txt = String(row.translated_text || '');
    if (hash && isUsableTranslation('x', txt)) result.set(hash, txt);
  });
  return result;
}

async function upsertTranslationCacheRows(
  rows: Array<{ source_hash: string; source_text: string; source_lang: string; target_lang: string; translated_text: string }>,
) {
  if (!rows.length || translationCacheTableUnavailable || translationWriteDisabled) return;
  // Deduplicate rows in the same payload to avoid Postgres upsert conflict-on-conflict (500).
  const dedupedRows = Array.from(
    rows.reduce((map, row) => {
      const key = `${row.source_hash}|${row.source_lang}|${row.target_lang}`;
      if (!map.has(key)) map.set(key, row);
      return map;
    }, new Map<string, { source_hash: string; source_text: string; source_lang: string; target_lang: string; translated_text: string }>()),
  ).map(([, row]) => row);

  if (!dedupedRows.length) return;

  translationCacheWriteAttempts += dedupedRows.length;
  const { error } = await supabase
    .from('translation_cache')
    .upsert(dedupedRows, { onConflict: 'source_hash,source_lang,target_lang' });
  const errText = String(error?.message || '').toLowerCase();
  if (errText.includes('could not find the table') || errText.includes('404') || errText.includes('not found')) {
    translationCacheTableUnavailable = true;
    translationCacheWriteFailed += dedupedRows.length;
    translationLastError = String(error?.message || 'translation_cache table not found');
  } else if (errText.includes('unauthorized') || errText.includes('permission denied') || errText.includes('401')) {
    translationWriteDisabled = true;
    translationCacheWriteFailed += dedupedRows.length;
    translationLastError = String(error?.message || 'translation_cache unauthorized');
  } else if (error) {
    translationCacheWriteFailed += dedupedRows.length;
    translationLastError = String(error?.message || 'translation_cache write failed');
  } else {
    translationCacheWriteSuccess += dedupedRows.length;
  }
}

export function getTranslationRuntimeState() {
  return {
    tableUnavailable: contentTranslationsTableUnavailable,
    writeDisabled: translationWriteDisabled,
    aiCoolingDown: Date.now() < getAICooldownUntil(),
    isLocalProxyMode: isLocalSupabaseProxyMode(),
    writeStats: {
      content: {
        attempts: translationWriteAttempts,
        success: translationWriteSuccess,
        failed: translationWriteFailed,
      },
      cache: {
        attempts: translationCacheWriteAttempts,
        success: translationCacheWriteSuccess,
        failed: translationCacheWriteFailed,
      },
      lastError: translationLastError,
    },
  };
}

function hashText(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const size = Math.max(1, limit);
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) break;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

function roomEntries(room: RoomLike) {
  const base = [
    { field_key: 'name', source_text: room.name || '' },
    { field_key: 'description', source_text: room.description || '' },
    { field_key: 'location', source_text: room.location || '' },
  ].filter(item => item.source_text.trim().length > 0);

  const amenities = (room.amenities || [])
    .map((item, index) => ({ field_key: `amenity:${index}`, source_text: item || '' }))
    .filter(item => item.source_text.trim().length > 0);

  return [...base, ...amenities].map(item => ({
    ...item,
    source_hash: hashText(item.source_text.trim()),
  }));
}

function isUsableTranslation(source: string, translated: string): boolean {
  const src = source.trim();
  const txt = translated.trim();
  if (!txt || !src) return false;
  if (isMojibakeLike(txt)) return false;
  const lower = txt.toLowerCase();
  if (lower.includes(EMPTY_TRANSLATION_HINT) || lower.includes(EMPTY_TRANSLATION_HINT_2)) return false;
  return true;
}

export async function translateRoomsOnDemand<T extends RoomLike>(rooms: T[], targetLang: string): Promise<T[]> {
  return translateRoomsWithOptions(rooms, targetLang, { allowAI: true, allowWrite: true });
}

export async function translateRoomsFromCacheOnly<T extends RoomLike>(rooms: T[], targetLang: string): Promise<T[]> {
  return translateRoomsWithOptions(rooms, targetLang, { allowAI: false, allowWrite: false });
}

async function translateRoomsWithOptions<T extends RoomLike>(
  rooms: T[],
  targetLang: string,
  options: { allowAI: boolean; allowWrite: boolean },
): Promise<T[]> {
  if (!rooms.length || targetLang === 'zh-TW') return rooms;
  const sourceLang = targetLang === 'zh-TW' ? 'en' : 'zh-TW';

  const entries = rooms.flatMap(room =>
    roomEntries(room).map(entry => ({
      entity_id: room.id,
      ...entry,
    })),
  );

  if (!entries.length) return rooms;

  const entityIds = [...new Set(entries.map(entry => entry.entity_id))];
  const tableMissing = contentTranslationsTableUnavailable;
  const { data: existingRows, error: selectError } = tableMissing
    ? { data: null, error: null as { message?: string } | null }
    : await supabase
      .from('content_translations')
      .select('entity_id, field_key, source_hash, translated_text')
      .eq('entity_type', ENTITY_TYPE)
      .eq('target_lang', targetLang)
      .in('entity_id', entityIds);

  const errText = String(selectError?.message || '').toLowerCase();
  const hasMissingTableError = Boolean(
    errText.includes('could not find the table')
    || errText.includes('404')
    || errText.includes('not found'),
  );
  if (hasMissingTableError) {
    markTranslationsUnavailable();
  }

  const translationMap = new Map<string, string>();
  (existingRows as TranslationRow[] | null)?.forEach(row => {
    if (isUsableTranslation('x', row.translated_text || '')) {
      translationMap.set(`${row.entity_id}|${row.field_key}|${row.source_hash}`, row.translated_text || '');
    }
  });

  const missing = entries.filter(entry => !translationMap.has(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`));
  const missingByHash = [...new Set(missing.map(entry => entry.source_hash))];

  const cacheByHash = await readTranslationCacheByHashes(missingByHash, sourceLang, targetLang);
  for (const entry of missing) {
    const reused = cacheByHash.get(entry.source_hash);
    if (reused) translationMap.set(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`, reused);
  }

  // Reuse existing translations across different entity IDs when source text hash matches.
  if (!contentTranslationsTableUnavailable && missingByHash.length > 0) {
    const { data: sharedRows } = await supabase
      .from('content_translations')
      .select('source_hash, translated_text')
      .eq('entity_type', ENTITY_TYPE)
      .eq('target_lang', targetLang)
      .in('source_hash', missingByHash);

    const sharedMap = new Map<string, string>();
    (sharedRows as Array<{ source_hash?: string; translated_text?: string | null }> | null)?.forEach(row => {
      const hash = String(row.source_hash || '');
      const txt = String(row.translated_text || '');
      if (hash && isUsableTranslation('x', txt)) sharedMap.set(hash, txt);
    });

    for (const entry of missing) {
      const reused = sharedMap.get(entry.source_hash);
      if (reused) {
        translationMap.set(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`, reused);
      }
    }
  }

  const unresolved = entries.filter(entry => !translationMap.has(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`));

  if (unresolved.length > 0 && options.allowAI) {
    if (Date.now() < getAICooldownUntil()) return rooms;
    const translatedRows = await mapWithConcurrency(
      unresolved,
      TRANSLATION_CONCURRENCY,
      async entry => {
        try {
          const translated = await callAI<string>('translate', {
            text: entry.source_text,
            sourceLang,
            targetLang,
          });
          const clean = (translated || '').trim();
          const safe = isUsableTranslation(entry.source_text, clean) ? clean : entry.source_text;
          translationMap.set(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`, safe);
          return {
            entity_type: ENTITY_TYPE,
            entity_id: entry.entity_id,
            field_key: entry.field_key,
            source_text: entry.source_text,
            source_hash: entry.source_hash,
            target_lang: targetLang,
            translated_text: safe,
          };
        } catch {
          setAICooldownNow();
          return null;
        }
      },
    );

    const inserts = translatedRows.filter(Boolean);
    if (options.allowWrite && !contentTranslationsTableUnavailable && !translationWriteDisabled && inserts.length > 0) {
      translationWriteAttempts += inserts.length;
      const { error } = await supabase
        .from('content_translations')
        .upsert(inserts, { onConflict: 'entity_type,entity_id,field_key,target_lang,source_hash' });
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('could not find the table')) {
        markTranslationsUnavailable();
        translationWriteFailed += inserts.length;
        translationLastError = String(error?.message || 'content_translations table not found');
      } else if (msg.includes('unauthorized') || msg.includes('permission denied') || msg.includes('401')) {
        translationWriteDisabled = true;
        translationWriteFailed += inserts.length;
        translationLastError = String(error?.message || 'content_translations unauthorized');
      } else if (error && !msg.includes('duplicate')) {
        translationWriteFailed += inserts.length;
        translationLastError = String(error?.message || 'content_translations write failed');
        console.warn('content translation insert failed', error.message);
      } else if (!error) {
        translationWriteSuccess += inserts.length;
      }
    }
    await upsertTranslationCacheRows(
      inserts.map(row => ({
        source_hash: String(row?.source_hash || ''),
        source_text: String(row?.source_text || ''),
        source_lang: sourceLang,
        target_lang: targetLang,
        translated_text: String(row?.translated_text || ''),
      })),
    );
  }

  return rooms.map(room => {
    const translatedName = translationMap.get(`${room.id}|name|${hashText((room.name || '').trim())}`);
    const translatedDescription = translationMap.get(`${room.id}|description|${hashText((room.description || '').trim())}`);
    const translatedLocation = translationMap.get(`${room.id}|location|${hashText((room.location || '').trim())}`);
    const translatedAmenities = (room.amenities || []).map((item, index) => {
      const key = `${room.id}|amenity:${index}|${hashText((item || '').trim())}`;
      return translationMap.get(key) || item;
    });

    return {
      ...room,
      name: translatedName || room.name,
      description: translatedDescription || room.description,
      location: translatedLocation || room.location,
      amenities: translatedAmenities,
    };
  });
}

export async function translateHotelsOnDemand<T extends HotelLike>(hotels: T[], targetLang: string): Promise<T[]> {
  if (!hotels.length || targetLang === 'zh-TW') return hotels;

  const roomLike = hotels.map(h => ({
    id: h.id,
    name: h.name || '',
    description: '',
    location: h.city || '',
    amenities: [],
  }));

  const translated = await translateRoomsOnDemand(roomLike, targetLang);
  const map = new Map(translated.map(item => [item.id, item]));

  return hotels.map(h => {
    const t = map.get(h.id);
    if (!t) return h;
    return {
      ...h,
      name: t.name || h.name,
      city: t.location || h.city,
    };
  });
}

export async function translateHotelsFromCacheOnly<T extends HotelLike>(hotels: T[], targetLang: string): Promise<T[]> {
  if (!hotels.length || targetLang === 'zh-TW') return hotels;

  const roomLike = hotels.map(h => ({
    id: h.id,
    name: h.name || '',
    description: '',
    location: h.city || '',
    amenities: [],
  }));

  const translated = await translateRoomsFromCacheOnly(roomLike, targetLang);
  const map = new Map(translated.map(item => [item.id, item]));

  return hotels.map(h => {
    const t = map.get(h.id);
    if (!t) return h;
    return {
      ...h,
      name: t.name || h.name,
      city: t.location || h.city,
    };
  });
}

async function translateGenericOnDemand<
  T extends { id: string },
  E extends { field_key: string; source_text: string; source_hash: string }
>(
  rows: T[],
  targetLang: string,
  entityType: string,
  buildEntries: (item: T) => E[],
  applyTranslation: (item: T, map: Map<string, string>) => T,
): Promise<T[]> {
  if (!rows.length) return rows;
  const sourceLang = targetLang === 'zh-TW' ? 'en' : 'zh-TW';

  const entries = rows.flatMap(item =>
    buildEntries(item).map(entry => ({ entity_id: item.id, ...entry })),
  );
  if (!entries.length) return rows;

  const entityIds = [...new Set(entries.map(entry => entry.entity_id))];
  const tableMissing = contentTranslationsTableUnavailable;
  const { data: existingRows, error: selectError } = tableMissing
    ? { data: null, error: null as { message?: string } | null }
    : await supabase
      .from('content_translations')
      .select('entity_id, field_key, source_hash, translated_text')
      .eq('entity_type', entityType)
      .eq('target_lang', targetLang)
      .in('entity_id', entityIds);

  const errText = String(selectError?.message || '').toLowerCase();
  if (errText.includes('could not find the table') || errText.includes('404') || errText.includes('not found')) {
    markTranslationsUnavailable();
  }

  const translationMap = new Map<string, string>();
  (existingRows as TranslationRow[] | null)?.forEach(row => {
    if (isUsableTranslation('x', row.translated_text || '')) {
      translationMap.set(`${row.entity_id}|${row.field_key}|${row.source_hash}`, row.translated_text || '');
    }
  });

  const missing = entries.filter(entry => !translationMap.has(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`));
  const missingByHash = [...new Set(missing.map(entry => entry.source_hash))];

  const cacheByHash = await readTranslationCacheByHashes(missingByHash, sourceLang, targetLang);
  for (const entry of missing) {
    const reused = cacheByHash.get(entry.source_hash);
    if (reused) translationMap.set(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`, reused);
  }

  // Reuse existing translations across different entity IDs when source text hash matches.
  if (!contentTranslationsTableUnavailable && missingByHash.length > 0) {
    const { data: sharedRows } = await supabase
      .from('content_translations')
      .select('source_hash, translated_text')
      .eq('entity_type', entityType)
      .eq('target_lang', targetLang)
      .in('source_hash', missingByHash);

    const sharedMap = new Map<string, string>();
    (sharedRows as Array<{ source_hash?: string; translated_text?: string | null }> | null)?.forEach(row => {
      const hash = String(row.source_hash || '');
      const txt = String(row.translated_text || '');
      if (hash && isUsableTranslation('x', txt)) sharedMap.set(hash, txt);
    });

    for (const entry of missing) {
      const reused = sharedMap.get(entry.source_hash);
      if (reused) {
        translationMap.set(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`, reused);
      }
    }
  }

  const unresolved = entries.filter(entry => !translationMap.has(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`));
  if (unresolved.length > 0) {
    if (Date.now() < getAICooldownUntil()) return rows.map(item => applyTranslation(item, translationMap));

    const translatedRows = await mapWithConcurrency(
      unresolved,
      TRANSLATION_CONCURRENCY,
      async entry => {
        try {
          const translated = await callAI<string>('translate', {
            text: entry.source_text,
            sourceLang,
            targetLang,
          });
          const clean = (translated || '').trim();
          const safe = isUsableTranslation(entry.source_text, clean) ? clean : entry.source_text;
          translationMap.set(`${entry.entity_id}|${entry.field_key}|${entry.source_hash}`, safe);
          return {
            entity_type: entityType,
            entity_id: entry.entity_id,
            field_key: entry.field_key,
            source_text: entry.source_text,
            source_hash: entry.source_hash,
            target_lang: targetLang,
            translated_text: safe,
          };
        } catch {
          setAICooldownNow();
          return null;
        }
      },
    );

    const inserts = translatedRows.filter(Boolean);
    if (!contentTranslationsTableUnavailable && !translationWriteDisabled && inserts.length > 0) {
      translationWriteAttempts += inserts.length;
      const { error } = await supabase
        .from('content_translations')
        .upsert(inserts, { onConflict: 'entity_type,entity_id,field_key,target_lang,source_hash' });
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('could not find the table')) {
        markTranslationsUnavailable();
        translationWriteFailed += inserts.length;
        translationLastError = String(error?.message || 'content_translations table not found');
      } else if (msg.includes('unauthorized') || msg.includes('permission denied') || msg.includes('401')) {
        translationWriteDisabled = true;
        translationWriteFailed += inserts.length;
        translationLastError = String(error?.message || 'content_translations unauthorized');
      } else if (error && !msg.includes('duplicate')) {
        translationWriteFailed += inserts.length;
        translationLastError = String(error?.message || 'content_translations write failed');
        console.warn('content translation insert failed', error.message);
      } else if (!error) {
        translationWriteSuccess += inserts.length;
      }
    }
    await upsertTranslationCacheRows(
      inserts.map(row => ({
        source_hash: String(row?.source_hash || ''),
        source_text: String(row?.source_text || ''),
        source_lang: sourceLang,
        target_lang: targetLang,
        translated_text: String(row?.translated_text || ''),
      })),
    );
  }

  return rows.map(item => applyTranslation(item, translationMap));
}

async function translateGenericFromCacheOnly<
  T extends { id: string },
  E extends { field_key: string; source_text: string; source_hash: string }
>(
  rows: T[],
  targetLang: string,
  entityType: string,
  buildEntries: (item: T) => E[],
  applyTranslation: (item: T, map: Map<string, string>) => T,
): Promise<T[]> {
  if (!rows.length) return rows;

  const entries = rows.flatMap(item =>
    buildEntries(item).map(entry => ({ entity_id: item.id, ...entry })),
  );
  if (!entries.length) return rows;

  const entityIds = [...new Set(entries.map(entry => entry.entity_id))];
  const tableMissing = contentTranslationsTableUnavailable;
  const { data: existingRows, error: selectError } = tableMissing
    ? { data: null, error: null as { message?: string } | null }
    : await supabase
      .from('content_translations')
      .select('entity_id, field_key, source_hash, translated_text')
      .eq('entity_type', entityType)
      .eq('target_lang', targetLang)
      .in('entity_id', entityIds);

  const errText = String(selectError?.message || '').toLowerCase();
  if (errText.includes('could not find the table') || errText.includes('404') || errText.includes('not found')) {
    markTranslationsUnavailable();
  }

  const translationMap = new Map<string, string>();
  (existingRows as TranslationRow[] | null)?.forEach(row => {
    if (isUsableTranslation('x', row.translated_text || '')) {
      translationMap.set(`${row.entity_id}|${row.field_key}|${row.source_hash}`, row.translated_text || '');
    }
  });

  return rows.map(item => applyTranslation(item, translationMap));
}

export async function translateProductsOnDemand<T extends ProductLike>(products: T[], targetLang: string): Promise<T[]> {
  return translateGenericOnDemand(
    products,
    targetLang,
    ENTITY_PRODUCT,
    item => {
      const base = [
        { field_key: 'name', source_text: item.name || '', source_hash: hashText((item.name || '').trim()) },
        { field_key: 'description', source_text: item.description || '', source_hash: hashText((item.description || '').trim()) },
        { field_key: 'origin', source_text: item.origin || '', source_hash: hashText((item.origin || '').trim()) },
        { field_key: 'roast_level', source_text: item.roast_level || '', source_hash: hashText((item.roast_level || '').trim()) },
        {
          field_key: 'processing_method',
          source_text: item.processing_method || '',
          source_hash: hashText((item.processing_method || '').trim()),
        },
      ];
      const flavorNotes = (item.flavor_notes || []).map((note, index) => ({
        field_key: `flavor_note:${index}`,
        source_text: note || '',
        source_hash: hashText((note || '').trim()),
      }));
      const tags = (item.tags || []).map((tag, index) => ({
        field_key: `tag:${index}`,
        source_text: tag || '',
        source_hash: hashText((tag || '').trim()),
      }));
      return [...base, ...flavorNotes, ...tags].filter(entry => entry.source_text.trim().length > 0);
    },
    (item, map) => {
      const nameHash = hashText((item.name || '').trim());
      const descHash = hashText((item.description || '').trim());
      const originHash = hashText((item.origin || '').trim());
      const roastLevelHash = hashText((item.roast_level || '').trim());
      const processingMethodHash = hashText((item.processing_method || '').trim());
      const translatedFlavorNotes = (item.flavor_notes || []).map((note, index) => {
        const noteHash = hashText((note || '').trim());
        return map.get(`${item.id}|flavor_note:${index}|${noteHash}`) || note;
      });
      const translatedTags = (item.tags || []).map((tag, index) => {
        const tagHash = hashText((tag || '').trim());
        return map.get(`${item.id}|tag:${index}|${tagHash}`) || tag;
      });
      return {
        ...item,
        name: map.get(`${item.id}|name|${nameHash}`) || item.name,
        description: map.get(`${item.id}|description|${descHash}`) || item.description,
        origin: map.get(`${item.id}|origin|${originHash}`) || item.origin,
        roast_level: map.get(`${item.id}|roast_level|${roastLevelHash}`) || item.roast_level,
        processing_method: map.get(`${item.id}|processing_method|${processingMethodHash}`) || item.processing_method,
        flavor_notes: translatedFlavorNotes,
        tags: translatedTags,
      };
    },
  );
}

export async function translateProductsFromCacheOnly<T extends ProductLike>(products: T[], targetLang: string): Promise<T[]> {
  return translateGenericFromCacheOnly(
    products,
    targetLang,
    ENTITY_PRODUCT,
    item => {
      const base = [
        { field_key: 'name', source_text: item.name || '', source_hash: hashText((item.name || '').trim()) },
        { field_key: 'description', source_text: item.description || '', source_hash: hashText((item.description || '').trim()) },
        { field_key: 'origin', source_text: item.origin || '', source_hash: hashText((item.origin || '').trim()) },
        { field_key: 'roast_level', source_text: item.roast_level || '', source_hash: hashText((item.roast_level || '').trim()) },
        {
          field_key: 'processing_method',
          source_text: item.processing_method || '',
          source_hash: hashText((item.processing_method || '').trim()),
        },
      ];
      const flavorNotes = (item.flavor_notes || []).map((note, index) => ({
        field_key: `flavor_note:${index}`,
        source_text: note || '',
        source_hash: hashText((note || '').trim()),
      }));
      const tags = (item.tags || []).map((tag, index) => ({
        field_key: `tag:${index}`,
        source_text: tag || '',
        source_hash: hashText((tag || '').trim()),
      }));
      return [...base, ...flavorNotes, ...tags].filter(entry => entry.source_text.trim().length > 0);
    },
    (item, map) => {
      const nameHash = hashText((item.name || '').trim());
      const descHash = hashText((item.description || '').trim());
      const originHash = hashText((item.origin || '').trim());
      const roastLevelHash = hashText((item.roast_level || '').trim());
      const processingMethodHash = hashText((item.processing_method || '').trim());
      const translatedFlavorNotes = (item.flavor_notes || []).map((note, index) => {
        const noteHash = hashText((note || '').trim());
        return map.get(`${item.id}|flavor_note:${index}|${noteHash}`) || note;
      });
      const translatedTags = (item.tags || []).map((tag, index) => {
        const tagHash = hashText((tag || '').trim());
        return map.get(`${item.id}|tag:${index}|${tagHash}`) || tag;
      });
      return {
        ...item,
        name: map.get(`${item.id}|name|${nameHash}`) || item.name,
        description: map.get(`${item.id}|description|${descHash}`) || item.description,
        origin: map.get(`${item.id}|origin|${originHash}`) || item.origin,
        roast_level: map.get(`${item.id}|roast_level|${roastLevelHash}`) || item.roast_level,
        processing_method: map.get(`${item.id}|processing_method|${processingMethodHash}`) || item.processing_method,
        flavor_notes: translatedFlavorNotes,
        tags: translatedTags,
      };
    },
  );
}

export async function translateBlogPostsOnDemand<T extends BlogLike>(posts: T[], targetLang: string): Promise<T[]> {
  return translateGenericOnDemand(
    posts,
    targetLang,
    ENTITY_BLOG,
    item => {
      const base = [
        { field_key: 'title', source_text: item.title || '', source_hash: hashText((item.title || '').trim()) },
        { field_key: 'excerpt', source_text: item.excerpt || '', source_hash: hashText((item.excerpt || '').trim()) },
        { field_key: 'content', source_text: item.content || '', source_hash: hashText((item.content || '').trim()) },
        { field_key: 'category', source_text: item.category || '', source_hash: hashText((item.category || '').trim()) },
        { field_key: 'author_name', source_text: item.author_name || '', source_hash: hashText((item.author_name || '').trim()) },
      ];
      const tags = (item.tags || [])
        .map((tag, index) => ({
          field_key: `tag:${index}`,
          source_text: tag || '',
          source_hash: hashText((tag || '').trim()),
        }));
      return [...base, ...tags].filter(entry => entry.source_text.trim().length > 0);
    },
    (item, map) => {
      const titleHash = hashText((item.title || '').trim());
      const excerptHash = hashText((item.excerpt || '').trim());
      const contentHash = hashText((item.content || '').trim());
      const categoryHash = hashText((item.category || '').trim());
      const authorNameHash = hashText((item.author_name || '').trim());
      const translatedTags = (item.tags || []).map((tag, index) => {
        const tagHash = hashText((tag || '').trim());
        return map.get(`${item.id}|tag:${index}|${tagHash}`) || tag;
      });
      return {
        ...item,
        title: map.get(`${item.id}|title|${titleHash}`) || item.title,
        excerpt: map.get(`${item.id}|excerpt|${excerptHash}`) || item.excerpt,
        content: map.get(`${item.id}|content|${contentHash}`) || item.content,
        category: map.get(`${item.id}|category|${categoryHash}`) || item.category,
        author_name: map.get(`${item.id}|author_name|${authorNameHash}`) || item.author_name,
        tags: translatedTags,
      };
    },
  );
}

export async function translateBlogPostsFromCacheOnly<T extends BlogLike>(posts: T[], targetLang: string): Promise<T[]> {
  return translateGenericFromCacheOnly(
    posts,
    targetLang,
    ENTITY_BLOG,
    item => {
      const base = [
        { field_key: 'title', source_text: item.title || '', source_hash: hashText((item.title || '').trim()) },
        { field_key: 'excerpt', source_text: item.excerpt || '', source_hash: hashText((item.excerpt || '').trim()) },
        { field_key: 'content', source_text: item.content || '', source_hash: hashText((item.content || '').trim()) },
        { field_key: 'category', source_text: item.category || '', source_hash: hashText((item.category || '').trim()) },
        { field_key: 'author_name', source_text: item.author_name || '', source_hash: hashText((item.author_name || '').trim()) },
      ];
      const tags = (item.tags || [])
        .map((tag, index) => ({
          field_key: `tag:${index}`,
          source_text: tag || '',
          source_hash: hashText((tag || '').trim()),
        }));
      return [...base, ...tags].filter(entry => entry.source_text.trim().length > 0);
    },
    (item, map) => {
      const titleHash = hashText((item.title || '').trim());
      const excerptHash = hashText((item.excerpt || '').trim());
      const contentHash = hashText((item.content || '').trim());
      const categoryHash = hashText((item.category || '').trim());
      const authorNameHash = hashText((item.author_name || '').trim());
      const translatedTags = (item.tags || []).map((tag, index) => {
        const tagHash = hashText((tag || '').trim());
        return map.get(`${item.id}|tag:${index}|${tagHash}`) || tag;
      });
      return {
        ...item,
        title: map.get(`${item.id}|title|${titleHash}`) || item.title,
        excerpt: map.get(`${item.id}|excerpt|${excerptHash}`) || item.excerpt,
        content: map.get(`${item.id}|content|${contentHash}`) || item.content,
        category: map.get(`${item.id}|category|${categoryHash}`) || item.category,
        author_name: map.get(`${item.id}|author_name|${authorNameHash}`) || item.author_name,
        tags: translatedTags,
      };
    },
  );
}

export async function translateBlogCategoriesOnDemand<T extends BlogCategoryLike>(categories: T[], targetLang: string): Promise<T[]> {
  return translateGenericOnDemand(
    categories,
    targetLang,
    ENTITY_BLOG_CATEGORY,
    item => [
      { field_key: 'name', source_text: item.name || '', source_hash: hashText((item.name || '').trim()) },
      { field_key: 'description', source_text: item.description || '', source_hash: hashText((item.description || '').trim()) },
    ].filter(entry => entry.source_text.trim().length > 0),
    (item, map) => {
      const nameHash = hashText((item.name || '').trim());
      const descHash = hashText((item.description || '').trim());
      return {
        ...item,
        name: map.get(`${item.id}|name|${nameHash}`) || item.name,
        description: map.get(`${item.id}|description|${descHash}`) || item.description,
      };
    },
  );
}

export async function translateBlogCategoriesFromCacheOnly<T extends BlogCategoryLike>(categories: T[], targetLang: string): Promise<T[]> {
  return translateGenericFromCacheOnly(
    categories,
    targetLang,
    ENTITY_BLOG_CATEGORY,
    item => [
      { field_key: 'name', source_text: item.name || '', source_hash: hashText((item.name || '').trim()) },
      { field_key: 'description', source_text: item.description || '', source_hash: hashText((item.description || '').trim()) },
    ].filter(entry => entry.source_text.trim().length > 0),
    (item, map) => {
      const nameHash = hashText((item.name || '').trim());
      const descHash = hashText((item.description || '').trim());
      return {
        ...item,
        name: map.get(`${item.id}|name|${nameHash}`) || item.name,
        description: map.get(`${item.id}|description|${descHash}`) || item.description,
      };
    },
  );
}

export async function translateCategoriesOnDemand<T extends CategoryLike>(categories: T[], targetLang: string): Promise<T[]> {
  return translateGenericOnDemand(
    categories,
    targetLang,
    ENTITY_PRODUCT_CATEGORY,
    item => [
      { field_key: 'name', source_text: item.name || '', source_hash: hashText((item.name || '').trim()) },
    ].filter(entry => entry.source_text.trim().length > 0),
    (item, map) => {
      const nameHash = hashText((item.name || '').trim());
      return {
        ...item,
        name: map.get(`${item.id}|name|${nameHash}`) || item.name,
      };
    },
  );
}

export async function translateCategoriesFromCacheOnly<T extends CategoryLike>(categories: T[], targetLang: string): Promise<T[]> {
  return translateGenericFromCacheOnly(
    categories,
    targetLang,
    ENTITY_PRODUCT_CATEGORY,
    item => [
      { field_key: 'name', source_text: item.name || '', source_hash: hashText((item.name || '').trim()) },
    ].filter(entry => entry.source_text.trim().length > 0),
    (item, map) => {
      const nameHash = hashText((item.name || '').trim());
      return {
        ...item,
        name: map.get(`${item.id}|name|${nameHash}`) || item.name,
      };
    },
  );
}

export async function translateStoreLocationsOnDemand<T extends StoreLike>(rows: T[], targetLang: string): Promise<T[]> {
  return translateGenericOnDemand(
    rows,
    targetLang,
    ENTITY_STORE,
    item => [
      { field_key: 'name', source_text: item.name || '', source_hash: hashText((item.name || '').trim()) },
      { field_key: 'city', source_text: item.city || '', source_hash: hashText((item.city || '').trim()) },
      { field_key: 'district', source_text: item.district || '', source_hash: hashText((item.district || '').trim()) },
      { field_key: 'address', source_text: item.address || '', source_hash: hashText((item.address || '').trim()) },
      {
        field_key: 'hours.primary',
        source_text: item.hours?.primary || '',
        source_hash: hashText((item.hours?.primary || '').trim()),
      },
      {
        field_key: 'hours.secondary',
        source_text: item.hours?.secondary || '',
        source_hash: hashText((item.hours?.secondary || '').trim()),
      },
      {
        field_key: 'hours.note',
        source_text: item.hours?.note || '',
        source_hash: hashText((item.hours?.note || '').trim()),
      },
    ].filter(entry => entry.source_text.trim().length > 0),
    (item, map) => {
      const nameHash = hashText((item.name || '').trim());
      const cityHash = hashText((item.city || '').trim());
      const districtHash = hashText((item.district || '').trim());
      const addressHash = hashText((item.address || '').trim());
      const hoursPrimaryHash = hashText((item.hours?.primary || '').trim());
      const hoursSecondaryHash = hashText((item.hours?.secondary || '').trim());
      const hoursNoteHash = hashText((item.hours?.note || '').trim());
      return {
        ...item,
        name: map.get(`${item.id}|name|${nameHash}`) || item.name,
        city: map.get(`${item.id}|city|${cityHash}`) || item.city,
        district: map.get(`${item.id}|district|${districtHash}`) || item.district,
        address: map.get(`${item.id}|address|${addressHash}`) || item.address,
        hours: {
          ...(item.hours || {}),
          primary: map.get(`${item.id}|hours.primary|${hoursPrimaryHash}`) || item.hours?.primary || '',
          secondary: map.get(`${item.id}|hours.secondary|${hoursSecondaryHash}`) || item.hours?.secondary || '',
          note: map.get(`${item.id}|hours.note|${hoursNoteHash}`) || item.hours?.note || '',
        },
      };
    },
  );
}

export async function translateStoreLocationsFromCacheOnly<T extends StoreLike>(rows: T[], targetLang: string): Promise<T[]> {
  return translateGenericFromCacheOnly(
    rows,
    targetLang,
    ENTITY_STORE,
    item => [
      { field_key: 'name', source_text: item.name || '', source_hash: hashText((item.name || '').trim()) },
      { field_key: 'city', source_text: item.city || '', source_hash: hashText((item.city || '').trim()) },
      { field_key: 'district', source_text: item.district || '', source_hash: hashText((item.district || '').trim()) },
      { field_key: 'address', source_text: item.address || '', source_hash: hashText((item.address || '').trim()) },
      {
        field_key: 'hours.primary',
        source_text: item.hours?.primary || '',
        source_hash: hashText((item.hours?.primary || '').trim()),
      },
      {
        field_key: 'hours.secondary',
        source_text: item.hours?.secondary || '',
        source_hash: hashText((item.hours?.secondary || '').trim()),
      },
      {
        field_key: 'hours.note',
        source_text: item.hours?.note || '',
        source_hash: hashText((item.hours?.note || '').trim()),
      },
    ].filter(entry => entry.source_text.trim().length > 0),
    (item, map) => {
      const nameHash = hashText((item.name || '').trim());
      const cityHash = hashText((item.city || '').trim());
      const districtHash = hashText((item.district || '').trim());
      const addressHash = hashText((item.address || '').trim());
      const hoursPrimaryHash = hashText((item.hours?.primary || '').trim());
      const hoursSecondaryHash = hashText((item.hours?.secondary || '').trim());
      const hoursNoteHash = hashText((item.hours?.note || '').trim());
      return {
        ...item,
        name: map.get(`${item.id}|name|${nameHash}`) || item.name,
        city: map.get(`${item.id}|city|${cityHash}`) || item.city,
        district: map.get(`${item.id}|district|${districtHash}`) || item.district,
        address: map.get(`${item.id}|address|${addressHash}`) || item.address,
        hours: {
          ...(item.hours || {}),
          primary: map.get(`${item.id}|hours.primary|${hoursPrimaryHash}`) || item.hours?.primary || '',
          secondary: map.get(`${item.id}|hours.secondary|${hoursSecondaryHash}`) || item.hours?.secondary || '',
          note: map.get(`${item.id}|hours.note|${hoursNoteHash}`) || item.hours?.note || '',
        },
      };
    },
  );
}

export async function translateCoffeeQuizQuestionsOnDemand<T extends QuizQuestionLike>(rows: T[], targetLang: string): Promise<T[]> {
  return translateGenericOnDemand(
    rows,
    targetLang,
    ENTITY_COFFEE_QUIZ_QUESTION,
    item => {
      const base = [{ field_key: 'question_text', source_text: item.question_text || '', source_hash: hashText((item.question_text || '').trim()) }];
      const options = (item.options || []).map((option, index) => ({
        field_key: `option:${index}`,
        source_text: option.option_text || '',
        source_hash: hashText((option.option_text || '').trim()),
      }));
      return [...base, ...options].filter(entry => entry.source_text.trim().length > 0);
    },
    (item, map) => {
      const qHash = hashText((item.question_text || '').trim());
      const translatedOptions = (item.options || []).map((option, index) => {
        const optionHash = hashText((option.option_text || '').trim());
        return {
          ...option,
          option_text: map.get(`${item.id}|option:${index}|${optionHash}`) || option.option_text,
        };
      });
      return {
        ...item,
        question_text: map.get(`${item.id}|question_text|${qHash}`) || item.question_text,
        options: translatedOptions,
      };
    },
  );
}

export async function translateCoffeeQuizQuestionsFromCacheOnly<T extends QuizQuestionLike>(rows: T[], targetLang: string): Promise<T[]> {
  return translateGenericFromCacheOnly(
    rows,
    targetLang,
    ENTITY_COFFEE_QUIZ_QUESTION,
    item => {
      const base = [{ field_key: 'question_text', source_text: item.question_text || '', source_hash: hashText((item.question_text || '').trim()) }];
      const options = (item.options || []).map((option, index) => ({
        field_key: `option:${index}`,
        source_text: option.option_text || '',
        source_hash: hashText((option.option_text || '').trim()),
      }));
      return [...base, ...options].filter(entry => entry.source_text.trim().length > 0);
    },
    (item, map) => {
      const qHash = hashText((item.question_text || '').trim());
      const translatedOptions = (item.options || []).map((option, index) => {
        const optionHash = hashText((option.option_text || '').trim());
        return {
          ...option,
          option_text: map.get(`${item.id}|option:${index}|${optionHash}`) || option.option_text,
        };
      });
      return {
        ...item,
        question_text: map.get(`${item.id}|question_text|${qHash}`) || item.question_text,
        options: translatedOptions,
      };
    },
  );
}
