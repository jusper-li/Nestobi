import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const PROJECT_ROOT = process.cwd();
const SNAPSHOT_DIR = path.join(PROJECT_ROOT, 'public', 'snapshots');

async function loadEnv() {
  const raw = await fs.readFile(path.join(PROJECT_ROOT, '.env'), 'utf8');
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

async function writeJson(fileName, data) {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  await fs.writeFile(path.join(SNAPSHOT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function requiredData(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data || [];
}

const env = await loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const [rooms, products, categories, posts] = await Promise.all([
  supabase
    .from('tbl_rooms')
    .select('id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,image_url,images,location,is_available,amenities,hotels(id,name,city,star_rating)')
    .eq('is_available', true)
    .limit(160),
  supabase
    .from('products')
    .select('*,product_category_links(category_id)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(360),
  supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })
    .limit(120),
  supabase
    .from('blog_posts')
    .select('id,title,slug,excerpt,cover_image_url,author_name,tags,category,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(180),
]);

await writeJson('rooms.json', requiredData(rooms, 'rooms'));
await writeJson('products.json', requiredData(products, 'products'));
await writeJson('categories.json', requiredData(categories, 'categories'));
await writeJson('blog-posts.json', requiredData(posts, 'blog_posts'));

console.log(
  JSON.stringify(
    {
      rooms: requiredData(rooms, 'rooms').length,
      products: requiredData(products, 'products').length,
      categories: requiredData(categories, 'categories').length,
      blogPosts: requiredData(posts, 'blog_posts').length,
    },
    null,
    2
  )
);
