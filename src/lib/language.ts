export type SupportedLanguage = 'zh-TW' | 'en' | 'ja' | 'ko';

const LANGUAGE_ALIASES: Record<string, SupportedLanguage> = {
  'zh': 'zh-TW',
  'zh-tw': 'zh-TW',
  'zh-hant': 'zh-TW',
  'zh-hk': 'zh-TW',
  'zh-mo': 'zh-TW',
  'en': 'en',
  'en-us': 'en',
  'en-gb': 'en',
  'ja': 'ja',
  'ja-jp': 'ja',
  'ko': 'ko',
  'ko-kr': 'ko',
};

export const normalizeLang = (value?: string | null): SupportedLanguage => {
  const raw = (value || '').trim().toLowerCase();
  return LANGUAGE_ALIASES[raw] || 'zh-TW';
};

export const pickByLang = <T>(
  value: string | null | undefined,
  zh: T,
  en: T,
  ja: T,
  ko: T,
): T => {
  const normalized = normalizeLang(value);
  if (normalized === 'en') return en;
  if (normalized === 'ja') return ja;
  if (normalized === 'ko') return ko;
  return zh;
};
