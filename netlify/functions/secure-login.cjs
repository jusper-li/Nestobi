const https = require('https');

const GENERIC_AUTH_ERROR_MESSAGE = '電子郵件或密碼錯誤';
const LOGIN_RATE_LIMIT_MESSAGE = '登入嘗試次數過多，請稍後再試。';
const AUTH_SERVICE_ERROR_MESSAGE = '登入服務暫時無法使用，請稍後再試。';
const FUNCTION_VERSION = '2026-05-11-auth-proxy-v4';
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

class LoginError extends Error {
  constructor(code, statusCode, upstreamStatus) {
    super(code);
    this.code = code;
    this.statusCode = statusCode;
    this.upstreamStatus = upstreamStatus;
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    if (url.origin === 'https://nestobi.netlify.app') return true;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    return url.protocol === 'https:' && url.hostname.endsWith('--nestobi.netlify.app');
  } catch {
    return false;
  }
}

function corsHeaders(event) {
  const origin = getHeader(event, 'origin');
  const headers = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };

  if (isAllowedOrigin(origin)) {
    headers['access-control-allow-origin'] = origin;
  }

  return headers;
}

function postJson(url, headers, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const target = new URL(url);
    const req = https.request({
      hostname: target.hostname,
      path: `${target.pathname}${target.search}`,
      method: 'POST',
      headers: {
        ...headers,
        'content-length': Buffer.byteLength(body),
      },
    }, res => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let jsonBody = {};
        try {
          jsonBody = raw ? JSON.parse(raw) : {};
        } catch {
          jsonBody = {};
        }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: jsonBody });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function json(event, statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(event),
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-secure-login-version': FUNCTION_VERSION,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function empty(event, statusCode = 204) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(event),
      'cache-control': 'no-store',
      'x-secure-login-version': FUNCTION_VERSION,
    },
    body: '',
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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getClientIp(event) {
  return getHeader(event, 'x-nf-client-connection-ip') ||
    getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
}

function getAttemptKey(event, email) {
  return `${getClientIp(event)}:${normalizeEmail(email)}`;
}

function getAttemptState(key) {
  const now = Date.now();
  const state = attempts.get(key);
  if (!state) return { count: 0, firstAt: now };
  if (now - state.firstAt > WINDOW_MS && (!state.lockedUntil || state.lockedUntil <= now)) {
    attempts.delete(key);
    return { count: 0, firstAt: now };
  }
  return state;
}

function isLocked(key) {
  const state = getAttemptState(key);
  return state.lockedUntil && state.lockedUntil > Date.now();
}

function recordFailure(key) {
  const now = Date.now();
  const state = getAttemptState(key);
  const next = {
    count: state.count + 1,
    firstAt: state.firstAt || now,
    lockedUntil: state.lockedUntil,
  };
  if (next.count >= MAX_FAILURES) next.lockedUntil = now + WINDOW_MS;
  attempts.set(key, next);
}

async function signInWithPassword(email, password) {
  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnv('SUPABASE_PUBLISHABLE_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) throw new LoginError('missing_supabase_env', 503);

  const res = await postJson(
    `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`,
    {
      apikey: supabaseAnonKey,
      'content-type': 'application/json',
    },
    { email, password }
  );

  if (!res.ok) {
    if (res.status === 429) throw new LoginError('supabase_auth_rate_limited', 429, res.status);
    if (res.status >= 500) throw new LoginError('supabase_auth_unavailable', 503, res.status);
    throw new LoginError('invalid_credentials', 401, res.status);
  }
  return res.body;
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return empty(event);
  if (event.httpMethod !== 'POST') return json(event, 405, { error: 'method_not_allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(event, 400, { error: GENERIC_AUTH_ERROR_MESSAGE });
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const key = getAttemptKey(event, email);

  if (!email || !password) return json(event, 400, { error: GENERIC_AUTH_ERROR_MESSAGE });
  if (isLocked(key)) return json(event, 429, { error: LOGIN_RATE_LIMIT_MESSAGE });

  try {
    const session = await signInWithPassword(email, password);
    attempts.delete(key);
    return json(event, 200, { session });
  } catch (error) {
    if (error instanceof LoginError && error.statusCode === 503) {
      console.error('secure-login configuration or auth service error:', error.code);
      return json(event, 503, { error: AUTH_SERVICE_ERROR_MESSAGE });
    }

    if (error instanceof LoginError && error.statusCode === 429) {
      console.error('secure-login upstream auth rate limit:', error.code);
      return json(event, 429, { error: LOGIN_RATE_LIMIT_MESSAGE });
    }

    recordFailure(key);
    return json(
      event,
      isLocked(key) ? 429 : 401,
      { error: isLocked(key) ? LOGIN_RATE_LIMIT_MESSAGE : GENERIC_AUTH_ERROR_MESSAGE }
    );
  }
};
