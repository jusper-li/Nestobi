import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeLang, type Lang } from '../lib/i18n';
import { LANG_OPTIONS, translateKey } from '../i18n/translations';

export interface LanguageOption {
  code: Lang;
  name: string;
  flag: string;
}

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  currentLanguage: Lang;
  setLanguage: (lang: string) => void;
  languages: LanguageOption[];
  translationRevision: number;
  t: (key: string, fallback?: string) => string;
}

const languageOptions: LanguageOption[] = LANG_OPTIONS.map(option => ({
  code: option.code,
  name: option.label,
  flag: option.flag,
}));

const LanguageContext = createContext<LanguageContextType>({
  lang: 'zh-TW',
  setLang: () => {},
  currentLanguage: 'zh-TW',
  setLanguage: () => {},
  languages: languageOptions,
  translationRevision: 0,
  t: (_key, fallback) => fallback || _key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return normalizeLang(localStorage.getItem('nestobi-lang'));
    } catch {
      return 'zh-TW';
    }
  });

  const setLanguage = useCallback((newLang: string) => {
    const normalized = normalizeLang(newLang);
    setLangState(normalized);
    try {
      localStorage.setItem('nestobi-lang', normalized);
    } catch {
      // Language switching still works when storage is unavailable.
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => setLanguage(newLang), [setLanguage]);
  const t = useCallback((key: string, fallback?: string) => translateKey(lang, key, fallback), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = 'ltr';
  }, [lang]);

  const value = useMemo<LanguageContextType>(() => ({
    lang,
    setLang,
    currentLanguage: lang,
    setLanguage,
    languages: languageOptions,
    translationRevision: languageOptions.findIndex(option => option.code === lang),
    t,
  }), [lang, setLang, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);
