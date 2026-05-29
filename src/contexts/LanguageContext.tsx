import React, { createContext, useContext, useState } from 'react';
import { translations, type Lang, type Translations } from '../i18n/translations';
import { normalizeLang } from '../lib/i18n';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'zh-TW',
  setLang: () => {},
  t: translations['zh-TW'],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return normalizeLang(localStorage.getItem('nestobi-lang'));
    } catch {
      return 'zh-TW';
    }
  });

  const setLang = (newLang: Lang) => {
    const normalized = normalizeLang(newLang);
    setLangState(normalized);
    try { localStorage.setItem('nestobi-lang', normalized); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
