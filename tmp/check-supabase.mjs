import { createClient } from './node_modules/@supabase/supabase-js/dist/module/index.js';
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(Boolean).map(line => line.split(/=(.*)/s).slice(0,2)));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const tables = ['products','categories','blog_posts','blog_categories','tbl_rooms','site_settings','store_locations'];
const out = {};
for (const table of tables) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  out[table] = error ? { error: error.message, code: error.code } : { count };
}
console.log(JSON.stringify({ url: env.VITE_SUPABASE_URL, out }, null, 2));
