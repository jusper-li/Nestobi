const http = require('http');
const https = require('https');

const PUBLIC_LIST_VERSION = '2026-05-11-public-list-v5';

const RESOURCE_CONFIG = {
  products: {
    table: 'products',
    query: 'select=*,product_category_links(category_id)&is_active=eq.true&order=created_at.desc&limit=360',
    snapshot: '/snapshots/products.json',
  },
  categories: {
    table: 'categories',
    query: 'select=*&order=name.asc&limit=120',
    snapshot: '/snapshots/categories.json',
  },
  rooms: {
    table: 'tbl_rooms',
    query: 'select=id,name,description,room_type,capacity,min_capacity,price_per_night,weekend_price,image_url,images,location,is_available,amenities,hotels(id,name,city,star_rating)&is_available=eq.true&limit=160',
    snapshot: '/snapshots/rooms.json',
  },
  'blog-posts': {
    table: 'blog_posts',
    query: 'select=id,title,slug,excerpt,cover_image_url,author_name,tags,category,published_at,blog_post_category_links(category_id)&status=eq.published&slug=neq.system-store-locations&order=published_at.desc&limit=180',
    snapshot: '/snapshots/blog-posts.json',
  },
  'blog-categories': {
    table: 'blog_categories',
    query: 'select=id,name,slug,description,display_order,is_active,parent_id&is_active=eq.true&order=display_order.asc&limit=120',
    snapshot: '/snapshots/blog-categories.json',
  },
};

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
  'x-public-list-version': PUBLIC_LIST_VERSION,
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function getHeader(event, name) {
  const target = name.toLowerCase();
  const headers = event.headers || {};
  const key = Object.keys(headers).find(header => header.toLowerCase() === target);
  return key ? headers[key] : '';
}

function requestJson(url, options = {}, timeoutMs = 6500) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === 'http:' ? http : https;
    const req = transport.request({
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, res => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let body = null;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          body = null;
        }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body });
      });
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error('request_timeout')));
    req.on('error', reject);
    req.end();
  });
}

async function requestJsonWithRetry(url, options = {}, timeouts = [8500, 12500]) {
  let lastError;

  for (const timeout of timeouts) {
    try {
      const res = await requestJson(url, options, timeout);
      if (res.ok || res.status < 500) return res;
      lastError = new Error(`http_${res.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('request_failed');
}

async function fetchSupabaseList(config) {
  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnv('SUPABASE_PUBLISHABLE_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) throw new Error('missing_supabase_env');

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/rest/v1/${config.table}?${config.query}`;
  const res = await requestJsonWithRetry(url, {
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
      accept: 'application/json',
    },
  });

  if (!res.ok) throw new Error(`supabase_${res.status}`);
  const json = res.body;
  if (!Array.isArray(json)) throw new Error('supabase_payload_not_array');

  return json;
}

async function fetchSnapshotList(event, config) {
  const host = getHeader(event, 'host');
  if (!host) throw new Error('missing_host');

  const proto = getHeader(event, 'x-forwarded-proto') || 'https';
  const snapshotUrl = `${proto}://${host}${config.snapshot}`;
  const res = await requestJson(snapshotUrl, { headers: { accept: 'application/json' } }, 4500);

  if (!res.ok) throw new Error(`snapshot_${res.status}`);
  const json = res.body;
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.items)) return json.items;

  throw new Error('snapshot_payload_not_array');
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') {
    return response(405, { error: 'method_not_allowed' });
  }

  const resource = event.queryStringParameters?.resource || '';
  const config = RESOURCE_CONFIG[resource];

  if (!config) {
    return response(400, { error: 'unsupported_resource' });
  }

  try {
    const items = await fetchSupabaseList(config);
    return response(200, { items, source: 'supabase' });
  } catch (supabaseError) {
    try {
      const items = await fetchSnapshotList(event, config);
      return response(200, {
        items,
        source: 'snapshot',
        reason: supabaseError instanceof Error ? supabaseError.message : 'supabase_unavailable',
      });
    } catch (snapshotError) {
      return response(503, {
        error: 'public_list_unavailable',
        supabase: supabaseError instanceof Error ? supabaseError.message : 'unknown',
        snapshot: snapshotError instanceof Error ? snapshotError.message : 'unknown',
      });
    }
  }
};
