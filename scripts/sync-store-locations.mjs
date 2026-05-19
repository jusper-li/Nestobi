import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.NESTOBI_SUPERADMIN_EMAIL;
const password = process.env.NESTOBI_SUPERADMIN_PASSWORD;

if (!supabaseUrl || !anonKey || !email || !password) {
  throw new Error('Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, NESTOBI_SUPERADMIN_EMAIL, or NESTOBI_SUPERADMIN_PASSWORD.');
}

const supabase = createClient(supabaseUrl, anonKey);
const sourceUrl = 'https://www.dlalshop.com/pages/store-locator';

const storageImages = {
  'xinyi-official-flagship-store': `${supabaseUrl}/storage/v1/object/public/site-assets/stores/xinyi-official-flagship-store.webp`,
  'changchun-store': `${supabaseUrl}/storage/v1/object/public/site-assets/stores/changchun-store.webp`,
  'nangang-ctbc-financial-park-store': `${supabaseUrl}/storage/v1/object/public/site-assets/stores/nangang-ctbc-financial-park-store.webp`,
  'neihu-sheng-hengchang-store': `${supabaseUrl}/storage/v1/object/public/site-assets/stores/neihu-sheng-hengchang-store.webp`,
};

const sourceImages = {
  'xinyi-official-flagship-store': 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e01f842d018002394672a/750x.webp?source_format=jpg',
  'changchun-store': 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e035725224ebb70cc5051/750x.webp?source_format=jpg',
  'nangang-ctbc-financial-park-store': 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e04e451874900179f71ad/750x.webp?source_format=jpg',
  'neihu-sheng-hengchang-store': 'https://shoplineimg.com/6007e2477c614a00198d7b0f/662e061b456b1c001d9392ad/750x.webp?source_format=jpg',
};

const locations = [
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
    map_url: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E4%BF%A1%E7%BE%A9%E5%8D%80%E5%BF%A0%E5%AD%9D%E6%9D%B1%E8%B7%AF%E5%9B%9B%E6%AE%B5553%E5%B7%B722%E5%BC%844-1%E8%99%9F',
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
    map_url: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E4%B8%AD%E5%B1%B1%E5%8D%80%E9%95%B7%E6%98%A5%E8%B7%AF137%E5%B7%B77%E8%99%9F',
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
    map_url: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E5%8D%97%E6%B8%AF%E5%8D%80%E7%B6%93%E8%B2%BF%E4%BA%8C%E8%B7%AF188%E8%99%9F1%E6%A8%93B101%E6%AB%83%E4%BD%8D',
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
    map_url: 'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%E5%B8%82%E5%85%A7%E6%B9%96%E5%8D%80%E9%87%91%E8%8E%8A%E8%B7%AF129%E8%99%9F',
  },
].map((location, sort_order) => ({
  ...location,
  sort_order,
  is_active: true,
  source_url: sourceUrl,
  source_image_url: sourceImages[location.slug],
  image_url: storageImages[location.slug],
}));

const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) throw authError;

const now = new Date().toISOString();

const tableRows = locations.map(location => ({
  ...location,
  updated_at: now,
}));

const { error: tableError } = await supabase
  .from('store_locations')
  .upsert(tableRows, { onConflict: 'slug' });

if (tableError && tableError.code !== 'PGRST205') {
  throw tableError;
}

const { error: systemError } = await supabase.from('blog_posts').upsert({
  slug: 'system-store-locations',
  title: 'System Store Locations',
  excerpt: 'Nestobi store locator structured data.',
  content: JSON.stringify({ source_url: sourceUrl, synced_at: now, locations }, null, 2),
  cover_image_url: locations[0].image_url,
  author_name: 'Nestobi',
  tags: ['system', 'store-locations'],
  category: 'System',
  status: 'published',
  meta_description: 'Nestobi store locator structured data.',
  published_at: now,
  updated_at: now,
}, { onConflict: 'slug' });

if (systemError) throw systemError;

const publicClient = createClient(supabaseUrl, anonKey);
const { data, error: verifyError } = await publicClient
  .from('blog_posts')
  .select('content')
  .eq('slug', 'system-store-locations')
  .maybeSingle();

if (verifyError) throw verifyError;

const saved = JSON.parse(data.content);
const firstNameCodepoints = Array.from(saved.locations[0].name)
  .map(char => char.codePointAt(0).toString(16))
  .join(' ');

console.log(JSON.stringify({
  storeLocationsTable: tableError?.code === 'PGRST205' ? 'missing' : 'updated',
  count: saved.locations.length,
  firstName: saved.locations[0].name,
  firstNameCodepoints,
}, null, 2));
