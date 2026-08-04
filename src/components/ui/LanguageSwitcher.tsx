import { Check, Languages } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageSwitcherProps {
  compact?: boolean;
  inverted?: boolean;
  className?: string;
}

export default function LanguageSwitcher({ compact = false, inverted = false, className = '' }: LanguageSwitcherProps) {
  const { lang, languages, setLanguage, t } = useLanguage();

  return (
    <label
      className={`relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
        inverted
          ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
          : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'
      } ${className}`}
      title={t('backoffice.language', '介面語言')}
    >
      <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!compact ? <span className="hidden font-medium lg:inline">{t('backoffice.language', '介面語言')}</span> : null}
      <select
        value={lang}
        onChange={event => setLanguage(event.target.value)}
        className={`min-w-0 cursor-pointer appearance-none bg-transparent pr-5 text-xs font-semibold outline-none ${
          inverted ? 'text-white' : 'text-gray-700'
        }`}
        aria-label={t('backoffice.language', '介面語言')}
      >
        {languages.map(option => (
          <option key={option.code} value={option.code} className="bg-white text-gray-900">
            {compact ? option.flag : option.name}
          </option>
        ))}
      </select>
      <Check className="pointer-events-none absolute right-2 h-3 w-3 opacity-50" aria-hidden="true" />
    </label>
  );
}
