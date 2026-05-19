import React, { createContext, useContext, useState } from 'react';
import { translations, type Lang, type Translations } from '../i18n/translations';

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
      return (localStorage.getItem('nestobi-lang') as Lang) || 'zh-TW';
    } catch {
      return 'zh-TW';
    }
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    try { localStorage.setItem('nestobi-lang', newLang); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
