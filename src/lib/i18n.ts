export type Lang = 'zh-TW' | 'en' | 'ja' | 'ko';

export function normalizeLang(raw: string | null | undefined): Lang {
  const v = String(raw || '').trim().toLowerCase();
  if (v.startsWith('en')) return 'en';
  if (v.startsWith('ja') || v.startsWith('jp')) return 'ja';
  if (v.startsWith('ko') || v.startsWith('kr')) return 'ko';
  return 'zh-TW';
}

export function pickByLang(lang: string | null | undefined, zh: string, en: string, ja: string, ko: string): string {
  const n = normalizeLang(lang);
  if (n === 'en') return en;
  if (n === 'ja') return ja;
  if (n === 'ko') return ko;
  return zh;
}

export function localeByLang(lang: string | null | undefined): 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR' {
  const n = normalizeLang(lang);
  if (n === 'en') return 'en-US';
  if (n === 'ja') return 'ja-JP';
  if (n === 'ko') return 'ko-KR';
  return 'zh-TW';
}
