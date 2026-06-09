const http = require('http');
const https = require('https');

function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function getHeader(event, name) {
  const target = name.toLowerCase();
  const headers = event.headers || {};
  const key = Object.keys(headers).find(header => header.toLowerCase() === target);
  return key ? headers[key] : '';
}

function requestJson(url, options = {}, timeoutMs = 8000) {
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

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatLastMod(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function resolveBaseUrl(event) {
  const configured = (getEnv('SITE_URL') || getEnv('URL') || '').replace(/\/$/, '');
  if (configured) return configured;
  const host = getHeader(event, 'host');
  const proto = getHeader(event, 'x-forwarded-proto') || 'https';
  if (host) return `${proto}://${host}`;
  return 'https://nestobi.com';
}

function resolveSupabaseConfig() {
  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnv('SUPABASE_PUBLISHABLE_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return {
    baseUrl: supabaseUrl.replace(/\/$/, ''),
    anonKey: supabaseAnonKey,
  };
}

async function fetchSupabaseRows(table, query) {
  const config = resolveSupabaseConfig();
  if (!config) throw new Error('missing_supabase_env');
  const url = `${config.baseUrl}/rest/v1/${table}?${query}`;
  const res = await requestJson(url, {
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${config.anonKey}`,
      accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`supabase_${res.status}`);
  if (!Array.isArray(res.body)) throw new Error('supabase_payload_not_array');
  return res.body;
}

function buildUrlEntry(baseUrl, path, lastmod, priority, changefreq) {
  return {
    loc: new URL(path, baseUrl).href,
    lastmod: formatLastMod(lastmod),
    priority,
    changefreq,
  };
}

function buildXml(entries) {
  const urls = entries
    .filter(entry => entry.loc)
    .map(entry => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ''}${entry.changefreq ? `\n    <changefreq>${escapeXml(entry.changefreq)}</changefreq>` : ''}${entry.priority ? `\n    <priority>${escapeXml(entry.priority)}</priority>` : ''}\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function latestDate(rows, fieldNames) {
  let latest = '';
  for (const row of rows || []) {
    for (const field of fieldNames) {
      const value = row?.[field];
      if (!value) continue;
      if (!latest || new Date(value).getTime() > new Date(latest).getTime()) latest = value;
    }
  }
  return latest;
}

async function safeFetch(fetcher) {
  try {
    return await fetcher();
  } catch {
    return [];
  }
}

exports.handler = async event => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'content-type': 'application/xml; charset=utf-8' },
      body: '',
    };
  }

  const baseUrl = resolveBaseUrl(event);
  const staticEntries = [
    buildUrlEntry(baseUrl, '/', null, '1.0', 'daily'),
    buildUrlEntry(baseUrl, '/rooms', null, '0.9', 'daily'),
    buildUrlEntry(baseUrl, '/shop', null, '0.9', 'daily'),
    buildUrlEntry(baseUrl, '/blog', null, '0.8', 'daily'),
    buildUrlEntry(baseUrl, '/stores', null, '0.8', 'weekly'),
    buildUrlEntry(baseUrl, '/faq', null, '0.8', 'weekly'),
    buildUrlEntry(baseUrl, '/contact', null, '0.6', 'monthly'),
    buildUrlEntry(baseUrl, '/services', null, '0.6', 'monthly'),
    buildUrlEntry(baseUrl, '/about', null, '0.5', 'monthly'),
    buildUrlEntry(baseUrl, '/privacy', null, '0.4', 'yearly'),
    buildUrlEntry(baseUrl, '/terms', null, '0.4', 'yearly'),
    buildUrlEntry(baseUrl, '/cookies', null, '0.3', 'yearly'),
    buildUrlEntry(baseUrl, '/anti-fraud', null, '0.3', 'yearly'),
  ];

  const [rooms, products, blogPosts, hotels, stores, faqs] = await Promise.all([
    safeFetch(() => fetchSupabaseRows('tbl_rooms', 'select=id,updated_at,is_available&is_available=eq.true&order=updated_at.desc&limit=500')),
    safeFetch(() => fetchSupabaseRows('products', 'select=id,updated_at,is_active&is_active=eq.true&order=updated_at.desc&limit=500')),
    safeFetch(() => fetchSupabaseRows('blog_posts', 'select=slug,updated_at,published_at,status&status=eq.published&slug=neq.system-store-locations&order=published_at.desc&limit=500')),
    safeFetch(() => fetchSupabaseRows('hotels', 'select=id,updated_at,is_active&is_active=eq.true&order=updated_at.desc&limit=500')),
    safeFetch(() => fetchSupabaseRows('store_locations', 'select=updated_at,is_active&is_active=eq.true&order=updated_at.desc&limit=200')),
    safeFetch(() => fetchSupabaseRows('faqs', 'select=updated_at,is_published&is_published=eq.true&order=updated_at.desc&limit=500')),
  ]);

  const latestStoreUpdatedAt = latestDate(stores, ['updated_at']);
  const latestFaqUpdatedAt = latestDate(faqs, ['updated_at']);
  if (latestStoreUpdatedAt) {
    staticEntries[4] = buildUrlEntry(baseUrl, '/stores', latestStoreUpdatedAt, '0.8', 'weekly');
  }
  if (latestFaqUpdatedAt) {
    staticEntries[5] = buildUrlEntry(baseUrl, '/faq', latestFaqUpdatedAt, '0.8', 'weekly');
  }

  const entries = [
    ...staticEntries,
    ...rooms.map(row => buildUrlEntry(baseUrl, `/rooms/${row.id}`, row.updated_at, '0.8', 'weekly')),
    ...products.map(row => buildUrlEntry(baseUrl, `/shop/${row.id}`, row.updated_at, '0.7', 'weekly')),
    ...blogPosts.map(row => buildUrlEntry(baseUrl, `/blog/${row.slug}`, row.published_at || row.updated_at, '0.7', 'weekly')),
    ...hotels.map(row => buildUrlEntry(baseUrl, `/hotels/${row.id}`, row.updated_at, '0.7', 'weekly')),
  ];

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
    },
    body: buildXml(entries),
  };
};
