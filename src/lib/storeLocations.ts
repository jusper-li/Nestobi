import { supabase } from './supabase';

export const STORE_LOCATIONS_SYSTEM_SLUG = 'system-store-locations';
export const STORE_LOCATIONS_SOURCE_URL = 'https://www.dlalshop.com/pages/store-locator';

export interface StoreLocationHours {
  primary: string;
  secondary?: string;
  note?: string;
}

export interface StoreLocation {
  id?: string;
  name: string;
  name_en: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  hours: StoreLocationHours;
  image_url: string;
  map_url: string;
  sort_order: number;
  is_active: boolean;
  source_url: string;
  source_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export const LEGACY_EN_STORE_LOCATIONS: StoreLocation[] = [
  {
    name: '信義官方旗艦店',
    name_en: 'Xinyi Official Flagship Store',
    slug: 'xinyi-official-flagship-store',
    city: '台北市',
    district: '信義區',
    address: 'No. 4-1, Aly. 22, Ln. 553, Sec.4, Zhongxiao E. Rd., Xinyi Dist., Taipei City, Taiwan',
    phone: '+886-2-2756-5663',
    hours: {
      primary: 'Sunday to Thursday 09:00-20:00',
      secondary: 'Friday & Saturday 10:00-21:00',
    },
    image_url: '/stores/dlal-xinyi-flagship.webp',
    source_image_url: 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e01f842d018002394672a/750x.webp?source_format=jpg',
    map_url: 'https://www.google.com/maps/search/?api=1&query=No.%204-1%2C%20Aly.%2022%2C%20Ln.%20553%2C%20Sec.4%2C%20Zhongxiao%20E.%20Rd.%2C%20Xinyi%20Dist.%2C%20Taipei%20City%2C%20Taiwan',
    sort_order: 0,
    is_active: true,
    source_url: STORE_LOCATIONS_SOURCE_URL,
  },
  {
    name: '長春門市',
    name_en: 'Changchun Store',
    slug: 'changchun-store',
    city: '台北市',
    district: '中山區',
    address: 'No. 7, Ln. 137, Changchun Rd., Zhongshan Dist., Taipei City, Taiwan',
    phone: '+886-2-2562-7670',
    hours: {
      primary: 'Monday to Friday 08:00-18:00',
      secondary: 'Saturday & Sunday 09:00-18:00',
    },
    image_url: '/stores/dlal-changchun.webp',
    source_image_url: 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e035725224ebb70cc5051/750x.webp?source_format=jpg',
    map_url: 'https://www.google.com/maps/search/?api=1&query=No.%207%2C%20Ln.%20137%2C%20Changchun%20Rd.%2C%20Zhongshan%20Dist.%2C%20Taipei%20City%2C%20Taiwan',
    sort_order: 1,
    is_active: true,
    source_url: STORE_LOCATIONS_SOURCE_URL,
  },
  {
    name: '南港中信金融園區門市',
    name_en: 'Nangang CTBC Financial Park Store',
    slug: 'nangang-ctbc-financial-park-store',
    city: '台北市',
    district: '南港區',
    address: '(Counter B101) 1F., No. 188, Jingmao 2nd Rd., Nangang Dist., Taipei City, Taiwan',
    phone: '+886-2-2789-0188',
    hours: {
      primary: 'Monday to Sunday 08:00-20:00',
    },
    image_url: '/stores/dlal-nangang-ctbc.webp',
    source_image_url: 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e04e451874900179f71ad/750x.webp?source_format=jpg',
    map_url: 'https://www.google.com/maps/search/?api=1&query=1F.%2C%20No.%20188%2C%20Jingmao%202nd%20Rd.%2C%20Nangang%20Dist.%2C%20Taipei%20City%2C%20Taiwan',
    sort_order: 2,
    is_active: true,
    source_url: STORE_LOCATIONS_SOURCE_URL,
  },
  {
    name: '內湖昇恆昌門市',
    name_en: 'Neihu Sheng Hengchang Store',
    slug: 'neihu-sheng-hengchang-store',
    city: '台北市',
    district: '內湖區',
    address: 'No. 129, Jinzhuang Road, Neihu District, Taipei City, Taiwan',
    phone: '+886-2-2794-9796',
    hours: {
      primary: 'Monday to Sunday 10:00-21:00',
    },
    image_url: '/stores/dlal-neihu-ever-rich.webp',
    source_image_url: 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e061b456b1c001d9392ad/750x.webp?source_format=jpg',
    map_url: 'https://www.google.com/maps/search/?api=1&query=No.%20129%2C%20Jinzhuang%20Road%2C%20Neihu%20District%2C%20Taipei%20City%2C%20Taiwan',
    sort_order: 3,
    is_active: true,
    source_url: STORE_LOCATIONS_SOURCE_URL,
  },
];

export const DEFAULT_STORE_LOCATIONS: StoreLocation[] = [
  {
    name: '信義品牌概念店',
    name_en: '',
    slug: 'xinyi-official-flagship-store',
    city: '台北市',
    district: '信義區',
    address: '台北市信義區忠孝東路四段553巷22弄4-1號',
    phone: '02-2756-5663',
    hours: {
      primary: '週日至週四 09:00-20:00',
      secondary: '週五＆週六 10:00-21:00',
    },
    image_url: '/stores/dlal-xinyi-flagship.webp',
    source_image_url: 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e01f842d018002394672a/750x.webp?source_format=jpg',
    map_url: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E4%BF%A1%E7%BE%A9%E5%8D%80%E5%BF%A0%E5%AD%9D%E6%9D%B1%E8%B7%AF%E5%9B%9B%E6%AE%B5553%E5%B7%B722%E5%BC%844-1%E8%99%9F',
    sort_order: 0,
    is_active: true,
    source_url: STORE_LOCATIONS_SOURCE_URL,
  },
  {
    name: '長春店',
    name_en: '',
    slug: 'changchun-store',
    city: '台北市',
    district: '中山區',
    address: '台北市中山區長春路137巷7號',
    phone: '02-2562-7670',
    hours: {
      primary: '週一至週五 08:00-17:30',
      secondary: '週六＆週日 10:00-17:30',
    },
    image_url: '/stores/dlal-changchun.webp',
    source_image_url: 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e035725224ebb70cc5051/750x.webp?source_format=jpg',
    map_url: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E4%B8%AD%E5%B1%B1%E5%8D%80%E9%95%B7%E6%98%A5%E8%B7%AF137%E5%B7%B77%E8%99%9F',
    sort_order: 1,
    is_active: true,
    source_url: STORE_LOCATIONS_SOURCE_URL,
  },
  {
    name: '南港中信店',
    name_en: '',
    slug: 'nangang-ctbc-financial-park-store',
    city: '台北市',
    district: '南港區',
    address: '台北市南港區經貿二路188號1樓(B101櫃位)',
    phone: '02-2789-0188',
    hours: {
      primary: '平日 07:30-19:00',
      secondary: '假日 08:30-19:00',
    },
    image_url: '/stores/dlal-nangang-ctbc.webp',
    source_image_url: 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e04e451874900179f71ad/750x.webp?source_format=jpg',
    map_url: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E5%8D%97%E6%B8%AF%E5%8D%80%E7%B6%93%E8%B2%BF%E4%BA%8C%E8%B7%AF188%E8%99%9F1%E6%A8%93B101%E6%AB%83%E4%BD%8D',
    sort_order: 2,
    is_active: true,
    source_url: STORE_LOCATIONS_SOURCE_URL,
  },
  {
    name: '內湖昇恆昌店',
    name_en: '',
    slug: 'neihu-sheng-hengchang-store',
    city: '台北市',
    district: '內湖區',
    address: '台北市內湖區金莊路129號',
    phone: '02-27949796',
    hours: {
      primary: '週一到週五 10:30-19:30',
      secondary: '週六＆週日 10:00-21:00',
    },
    image_url: '/stores/dlal-neihu-ever-rich.webp',
    source_image_url: 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e061b456b1c001d9392ad/750x.webp?source_format=jpg',
    map_url: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E5%85%A7%E6%B9%96%E5%8D%80%E9%87%91%E8%8E%8A%E8%B7%AF129%E8%99%9F',
    sort_order: 3,
    is_active: true,
    source_url: STORE_LOCATIONS_SOURCE_URL,
  },
];

function normalizeHours(value: unknown): StoreLocationHours {
  if (value && typeof value === 'object') {
    const hours = value as Partial<StoreLocationHours>;
    return {
      primary: String(hours.primary || ''),
      secondary: hours.secondary ? String(hours.secondary) : undefined,
      note: hours.note ? String(hours.note) : undefined,
    };
  }

  return { primary: String(value || '') };
}

export function normalizeStoreLocation(value: Partial<StoreLocation>, index = 0): StoreLocation {
  return {
    name: value.name || '',
    name_en: value.name_en || '',
    slug: value.slug || `store-${index + 1}`,
    city: value.city || '',
    district: value.district || '',
    address: value.address || '',
    phone: value.phone || '',
    hours: normalizeHours(value.hours),
    image_url: value.image_url || '',
    map_url: value.map_url || '',
    sort_order: Number.isFinite(value.sort_order) ? Number(value.sort_order) : index,
    is_active: value.is_active !== false,
    source_url: value.source_url || STORE_LOCATIONS_SOURCE_URL,
    source_image_url: value.source_image_url || '',
    id: value.id,
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

function parseSystemStoreLocations(content: string | null | undefined): StoreLocation[] {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as { locations?: StoreLocation[] } | StoreLocation[];
    const rows = Array.isArray(parsed) ? parsed : parsed.locations;
    if (!Array.isArray(rows)) return [];

    return rows.map((row, index) => normalizeStoreLocation(row, index));
  } catch {
    return [];
  }
}

async function fetchFromStoreTable(includeInactive: boolean) {
  let query = supabase
    .from('store_locations')
    .select('*')
    .order('sort_order', { ascending: true });

  if (!includeInactive) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;

  return ((data || []) as StoreLocation[]).map((row, index) => normalizeStoreLocation(row, index));
}

async function fetchFromSystemPost(includeInactive: boolean) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('content')
    .eq('slug', STORE_LOCATIONS_SYSTEM_SLUG)
    .maybeSingle();

  if (error) return [];

  const rows = parseSystemStoreLocations(data?.content);
  return includeInactive ? rows : rows.filter(row => row.is_active);
}

export async function fetchStoreLocations(includeInactive = false): Promise<StoreLocation[]> {
  const systemRows = await fetchFromSystemPost(includeInactive);
  if (systemRows.length > 0) return systemRows.sort((a, b) => a.sort_order - b.sort_order);

  try {
    const rows = await fetchFromStoreTable(includeInactive);
    if (rows.length > 0) return rows;
  } catch {
    // The production database can lag behind the deployed frontend. Fall back to the system data row.
  }

  const defaults = DEFAULT_STORE_LOCATIONS.map((row, index) => normalizeStoreLocation(row, index));
  return includeInactive ? defaults : defaults.filter(row => row.is_active);
}

function toTablePayload(locations: StoreLocation[]) {
  return locations.map((location, index) => ({
    name: location.name.trim(),
    name_en: location.name_en.trim(),
    slug: location.slug.trim(),
    city: location.city.trim(),
    district: location.district.trim(),
    address: location.address.trim(),
    phone: location.phone.trim(),
    hours: location.hours,
    image_url: location.image_url.trim(),
    map_url: location.map_url.trim(),
    sort_order: index,
    is_active: location.is_active,
    source_url: location.source_url.trim() || STORE_LOCATIONS_SOURCE_URL,
    source_image_url: location.source_image_url?.trim() || '',
    updated_at: new Date().toISOString(),
  }));
}

async function saveToStoreTable(locations: StoreLocation[]) {
  const rows = toTablePayload(locations);
  const { data: existing, error: selectError } = await supabase
    .from('store_locations')
    .select('slug');

  if (selectError) throw selectError;

  const { error: upsertError } = await supabase
    .from('store_locations')
    .upsert(rows, { onConflict: 'slug' });

  if (upsertError) throw upsertError;

  const nextSlugs = new Set(rows.map(row => row.slug));
  const staleSlugs = ((existing || []) as { slug: string }[])
    .map(row => row.slug)
    .filter(slug => !nextSlugs.has(slug));

  if (staleSlugs.length > 0) {
    const { error: deleteError } = await supabase
      .from('store_locations')
      .delete()
      .in('slug', staleSlugs);
    if (deleteError) throw deleteError;
  }
}

async function saveToSystemPost(locations: StoreLocation[]) {
  const cleanLocations = locations.map((location, index) => normalizeStoreLocation({
    ...location,
    sort_order: index,
  }, index));
  const now = new Date().toISOString();
  const content = JSON.stringify({
    source_url: STORE_LOCATIONS_SOURCE_URL,
    synced_at: now,
    locations: cleanLocations,
  }, null, 2);

  const { error } = await supabase
    .from('blog_posts')
    .upsert({
      slug: STORE_LOCATIONS_SYSTEM_SLUG,
      title: 'System Store Locations',
      excerpt: 'Nestobi store locator structured data.',
      content,
      cover_image_url: cleanLocations[0]?.image_url || '',
      author_name: 'Nestobi',
      tags: ['system', 'store-locations'],
      category: 'System',
      status: 'published',
      meta_description: 'Nestobi store locator structured data.',
      published_at: now,
      updated_at: now,
    }, { onConflict: 'slug' });

  if (error) throw error;
}

export async function saveStoreLocations(locations: StoreLocation[]): Promise<'store_locations' | 'system_post'> {
  try {
    await saveToStoreTable(locations);
    await saveToSystemPost(locations);
    return 'store_locations';
  } catch {
    await saveToSystemPost(locations);
    return 'system_post';
  }
}

export function createEmptyStoreLocation(order: number): StoreLocation {
  return {
    name: '',
    name_en: '',
    slug: `store-${Date.now()}`,
    city: '台北市',
    district: '',
    address: '',
    phone: '',
    hours: { primary: '', secondary: '' },
    image_url: '',
    map_url: '',
    sort_order: order,
    is_active: true,
    source_url: STORE_LOCATIONS_SOURCE_URL,
  };
}

export function storeLocationToSearchText(location: StoreLocation) {
  return [
    location.name,
    location.name_en,
    location.city,
    location.district,
    location.address,
    location.phone,
    location.hours.primary,
    location.hours.secondary || '',
  ].join(' ').toLowerCase();
}
