export const GENERIC_AUTH_ERROR_MESSAGE = '登入失敗，請確認登入資訊或稍後再試。';
export const LOGIN_RATE_LIMIT_MESSAGE = '登入嘗試次數過多，請稍後再試。';

const LOGIN_ATTEMPT_KEY = 'nestobi:login-attempts:v1';
const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const ALLOWED_TAGS = new Set([
  'a', 'article', 'b', 'blockquote', 'br', 'caption', 'code', 'div', 'em', 'figcaption',
  'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p',
  'pre', 'section', 'span', 'strong', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'tr', 'u', 'ul', 's',
]);

const GLOBAL_ALLOWED_ATTRS = new Set([
  'aria-label', 'aria-hidden', 'class', 'id', 'role', 'title',
]);

const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  table: new Set(['summary']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
};

interface LoginAttemptState {
  count: number;
  firstAt: number;
  lockedUntil?: number;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readAttemptStore(): Record<string, LoginAttemptState> {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(LOGIN_ATTEMPT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAttemptStore(store: Record<string, LoginAttemptState>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(store));
}

export function getLoginRateLimit(email: string) {
  const key = normalizeEmail(email);
  const state = readAttemptStore()[key];
  const now = Date.now();

  if (!state) return { blocked: false, retryAfterMs: 0 };
  if (state.lockedUntil && state.lockedUntil > now) {
    return { blocked: true, retryAfterMs: state.lockedUntil - now };
  }

  return { blocked: false, retryAfterMs: 0 };
}

export function recordLoginFailure(email: string) {
  const key = normalizeEmail(email);
  const now = Date.now();
  const store = readAttemptStore();
  const existing = store[key];
  const state = !existing || now - existing.firstAt > LOGIN_WINDOW_MS
    ? { count: 1, firstAt: now }
    : { ...existing, count: existing.count + 1 };

  if (state.count >= LOGIN_MAX_FAILURES) state.lockedUntil = now + LOGIN_WINDOW_MS;
  store[key] = state;
  writeAttemptStore(store);
}

export function clearLoginFailures(email: string) {
  const key = normalizeEmail(email);
  const store = readAttemptStore();
  delete store[key];
  writeAttemptStore(store);
}

export function isProductionHost() {
  if (typeof window === 'undefined') return false;
  return !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

export function sanitizeText(value: string, maxLength = 500) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

function isSafeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;

  try {
    const url = new URL(trimmed);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeStyle(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes('expression') || lower.includes('javascript:') || lower.includes('url(')) return '';

  return value
    .split(';')
    .map(part => part.trim())
    .filter(part => /^(text-align|font-weight|font-style|text-decoration|max-width|width|height)\s*:/i.test(part))
    .join('; ');
}

function sanitizeAttributes(element: Element) {
  const tag = element.tagName.toLowerCase();
  const allowed = TAG_ATTRS[tag] || new Set<string>();

  Array.from(element.attributes).forEach(attr => {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    if (name.startsWith('on') || name === 'srcdoc') {
      element.removeAttribute(attr.name);
      return;
    }

    const isDataOrAria = name.startsWith('data-') || name.startsWith('aria-');
    const isAllowed = GLOBAL_ALLOWED_ATTRS.has(name) || allowed.has(name) || isDataOrAria;
    if (!isAllowed && name !== 'style') {
      element.removeAttribute(attr.name);
      return;
    }

    if ((name === 'href' || name === 'src') && !isSafeUrl(value)) {
      element.removeAttribute(attr.name);
      return;
    }

    if (name === 'target' && value !== '_blank') element.removeAttribute(attr.name);
    if (name === 'style') {
      const safeStyle = sanitizeStyle(value);
      if (safeStyle) element.setAttribute('style', safeStyle);
      else element.removeAttribute('style');
    }
  });

  if (tag === 'a' && element.getAttribute('target') === '_blank') {
    element.setAttribute('rel', 'noopener noreferrer');
  }

  if (tag === 'img' && !element.getAttribute('loading')) {
    element.setAttribute('loading', 'lazy');
  }
}

export function sanitizeHtml(value: string | null | undefined) {
  if (!value) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return value
      .replace(/<\s*(script|style|iframe|object|embed|meta|link)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '')
      .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${value}</body>`, 'text/html');

  const visit = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tag = element.tagName.toLowerCase();

      Array.from(element.childNodes).forEach(visit);

      if (!ALLOWED_TAGS.has(tag)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      sanitizeAttributes(element);
      return;
    }

    if (node.nodeType === Node.COMMENT_NODE) node.parentNode?.removeChild(node);
  };

  Array.from(doc.body.childNodes).forEach(visit);
  return doc.body.innerHTML;
}
