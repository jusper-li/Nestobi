import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Languages, Sparkles, Trash2 } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { callAI } from '../../lib/openai';

type Locale = 'zh-TW' | 'en' | 'ja' | 'ko';
type TranslateLang = 'auto' | 'zh-TW' | 'en' | 'ja' | 'ko';

const pick = (locale: Locale, zh: string, en: string, ja: string, ko: string) =>
  pickByLang(locale, zh, en, ja, ko);

const STORAGE_KEY = 'nestobi-ai-translator-preferences';

const SOURCE_OPTIONS: Array<{ value: TranslateLang; label: Record<Locale, string> }> = [
  {
    value: 'auto',
    label: {
      'zh-TW': '\u81ea\u52d5\u8fa8\u8b58',
      en: 'Auto detect',
      ja: '\u81ea\u52d5\u5224\u5b9a',
      ko: '\uc790\ub3d9 \uac10\uc9c0',
    },
  },
  {
    value: 'zh-TW',
    label: {
      'zh-TW': '\u7e41\u9ad4\u4e2d\u6587',
      en: 'Traditional Chinese',
      ja: '\u4e2d\u56fd\u8a9e\uff08\u7e41\u4f53\u5b57\uff09',
      ko: '\uc911\uad6d\uc5b4(\ubc88\uccb4)',
    },
  },
  {
    value: 'en',
    label: {
      'zh-TW': '\u82f1\u6587',
      en: 'English',
      ja: '\u82f1\u8a9e',
      ko: '\uc601\uc5b4',
    },
  },
  {
    value: 'ja',
    label: {
      'zh-TW': '\u65e5\u6587',
      en: 'Japanese',
      ja: '\u65e5\u672c\u8a9e',
      ko: '\uc77c\ubcf8\uc5b4',
    },
  },
  {
    value: 'ko',
    label: {
      'zh-TW': '\u97d3\u6587',
      en: 'Korean',
      ja: '\u97d3\u56fd\u8a9e',
      ko: '\ud55c\uad6d\uc5b4',
    },
  },
];

const TARGET_OPTIONS = SOURCE_OPTIONS.filter(option => option.value !== 'auto');

type StoredPreferences = {
  sourceLang?: TranslateLang;
  targetLang?: TranslateLang;
};

const isTranslateLang = (value: unknown): value is TranslateLang =>
  value === 'auto' || value === 'zh-TW' || value === 'en' || value === 'ja' || value === 'ko';

export default function Translator() {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as Locale;
  const lastManualSourceLang = useRef<Exclude<TranslateLang, 'auto'>>('zh-TW');
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resultTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [sourceLang, setSourceLang] = useState<TranslateLang>('auto');
  const [targetLang, setTargetLang] = useState<Exclude<TranslateLang, 'auto'>>('en');
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as StoredPreferences;
      if (isTranslateLang(parsed.sourceLang)) {
        setSourceLang(parsed.sourceLang);
        if (parsed.sourceLang !== 'auto') {
          lastManualSourceLang.current = parsed.sourceLang;
        }
      }
      if (isTranslateLang(parsed.targetLang) && parsed.targetLang !== 'auto') {
        setTargetLang(parsed.targetLang);
      }
    } catch {
      // Ignore invalid storage.
    }
  }, []);

  useEffect(() => {
    if (sourceLang !== 'auto') {
      lastManualSourceLang.current = sourceLang;
    }
  }, [sourceLang]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sourceLang,
        targetLang,
      }),
    );
  }, [sourceLang, targetLang]);

  const resizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    resizeTextarea(sourceTextareaRef.current);
  }, [sourceText]);

  useLayoutEffect(() => {
    resizeTextarea(resultTextareaRef.current);
  }, [resultText]);

  const title = useMemo(() => pick(locale, '\u0041\u0049 \u5373\u6642\u7ffb\u8b6f', 'AI Translator', 'AI \u7ffb\u8a33', 'AI \ube0c\ub79c\uc2f1'), [locale]);
  const subtitle = useMemo(
    () =>
      pick(
        locale,
        '\u8f38\u5165\u6587\u5b57\u5f8c\u5373\u53ef\u5feb\u901f\u7ffb\u8b6f\uff0c\u4e26\u4fdd\u7559\u4f60\u4e0a\u6b21\u9078\u64c7\u7684\u8a9e\u7cfb\u3002',
        'Paste text, translate instantly, and keep your last language choices.',
        '\u30c6\u30ad\u30b9\u30c8\u3092\u5165\u529b\u3059\u308b\u3068\u3059\u3050\u306b\u7ffb\u8a33\u3067\u304d\u307e\u3059\u3002\u524d\u56de\u306e\u8a00\u8a9e\u8a2d\u5b9a\u3082\u8a18\u61b6\u3057\u307e\u3059\u3002',
        '\ud14d\uc2a4\ud2b8\ub97c \uc785\ub825\ud558\uba74 \ubc14\ub85c \ubc88\uc5ed\ub418\uace0, \ub9c8\uc9c0\ub9c9 \uc5b8\uc5b4 \uc124\uc815\ub3c4 \uae30\uc5b5\ud569\ub2c8\ub2e4.',
      ),
    [locale],
  );

  const sourceLabel = useMemo(
    () => SOURCE_OPTIONS.find(option => option.value === sourceLang)?.label[locale] || '',
    [locale, sourceLang],
  );
  const targetLabel = useMemo(
    () => TARGET_OPTIONS.find(option => option.value === targetLang)?.label[locale] || '',
    [locale, targetLang],
  );

  const onSwap = () => {
    if (sourceLang === 'auto') {
      const nextTarget = lastManualSourceLang.current === targetLang ? 'zh-TW' : lastManualSourceLang.current;
      setSourceLang(targetLang);
      setTargetLang(nextTarget);
      return;
    }

    const nextSource = targetLang;
    const nextTarget = sourceLang;
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
  };

  const onClear = () => {
    setSourceText('');
    setResultText('');
  };

  const onTranslate = async () => {
    if (!sourceText.trim() || loading) return;
    setLoading(true);
    try {
      const translated = await callAI<string>('translate', {
        text: sourceText,
        sourceLang,
        targetLang,
        language: locale,
      });
      setResultText(translated?.trim() || '');
    } catch {
      setResultText(
        pick(
          locale,
          '\u7ffb\u8b6f\u5931\u6557\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002',
          'Translation failed. Please try again later.',
          '\u7ffb\u8a33\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u3057\u3070\u3089\u304f\u3057\u3066\u304b\u3089\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
          '\ubc88\uc5ed\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead title={title} description={subtitle} />
      <Navigation />

      <div className="mx-auto max-w-4xl px-4 py-5 sm:py-8">
        <div className="mb-4 text-center sm:mb-5">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg sm:h-14 sm:w-14">
            <Languages className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-gray-500 sm:text-base">
            {subtitle}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 md:hidden">
            <select
              value={sourceLang}
              onChange={e => setSourceLang(e.target.value as TranslateLang)}
              aria-label={pick(locale, '來源語言', 'From', '元の言語', '원문 언어')}
              className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-[12px] font-semibold text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              {SOURCE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label[locale]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onSwap}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50"
              aria-label={pick(locale, '交換語言', 'Swap languages', '言語を入れ替える', '언어 바꾸기')}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>

            <select
              value={targetLang}
              onChange={e => setTargetLang(e.target.value as Exclude<TranslateLang, 'auto'>)}
              aria-label={pick(locale, '翻譯成', 'To', '翻訳先', '번역 언어')}
              className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-[12px] font-semibold text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              {TARGET_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label[locale]}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 md:grid md:gap-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-2 py-1.5 sm:px-4 sm:py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
                    {pick(locale, '\u4f86\u6e90\u8a9e\u8a00', 'From', '\u5143\u306e\u8a00\u8a9e', '\uc6d0\ubb38 \uc5b8\uc5b4')}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-semibold text-gray-800 sm:mt-1 sm:text-sm">{sourceLabel}</p>
                </div>
                {sourceLang === 'auto' && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-700 sm:px-2.5 sm:py-1 sm:text-[11px]">
                    {pick(locale, '\u81ea\u52d5\u8fa8\u8b58', 'Auto', '\u81ea\u52d5\u5224\u5b9a', '\uc790\ub3d9 \uac10\uc9c0')}
                  </span>
                )}
              </div>
              <select
                value={sourceLang}
                onChange={e => setSourceLang(e.target.value as TranslateLang)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-[12px] font-medium text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:mt-3 sm:px-3 sm:py-3 sm:text-sm"
              >
                {SOURCE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onSwap}
              className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 sm:h-11 sm:w-11"
              aria-label={pick(locale, '\u4ea4\u63db\u8a9e\u8a00', 'Swap languages', '\u8a00\u8a9e\u3092\u5165\u308c\u66ff\u3048\u308b', '\uc5b8\uc5b4 \ubc14\uafb8\uae30')}
            >
              <ArrowLeftRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-2 py-1.5 sm:px-4 sm:py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
                    {pick(locale, '\u7ffb\u8b6f\u6210', 'To', '\u7ffb\u8a33\u5148', '\ubc88\uc5ed \uc5b8\uc5b4')}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-semibold text-gray-800 sm:mt-1 sm:text-sm">{targetLabel}</p>
                </div>
              </div>
              <select
                value={targetLang}
                onChange={e => setTargetLang(e.target.value as Exclude<TranslateLang, 'auto'>)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-[12px] font-medium text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:mt-3 sm:px-3 sm:py-3 sm:text-sm"
              >
                {TARGET_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-gray-700">
                  {pick(locale, '\u8f38\u5165\u6587\u5b57', 'Input text', '\u5165\u529b\u30c6\u30ad\u30b9\u30c8', '\uc785\ub825\ud560 \ubb38\uc7a5')}
                </p>
                <button
                  type="button"
                  onClick={onClear}
                  disabled={!sourceText && !resultText}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {pick(locale, '\u6e05\u9664\u5167\u5bb9', 'Clear', '\u30af\u30ea\u30a2', '\ub0b4\uc6a9 \uc9c0\uc6b0\uae30')}
                </button>
              </div>
              <textarea
                ref={sourceTextareaRef}
                value={sourceText}
                onChange={e => setSourceText(e.target.value)}
                placeholder={pick(
                  locale,
                  '\u8f38\u5165\u8981\u7ffb\u8b6f\u7684\u6587\u5b57\uff0c\u7cfb\u7d71\u6703\u81ea\u52d5\u8fa8\u8b58\u8a9e\u8a00...',
                  'Type text to translate. The system will auto-detect the language...',
                  '\u7ffb\u8a33\u3057\u305f\u3044\u6587\u7ae0\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u8a00\u8a9e\u306f\u81ea\u52d5\u5224\u5b9a\u3055\u308c\u307e\u3059...',
                  '\ubc88\uc5ed\ud560 \ubb38\uc7a5\uc744 \uc785\ub825\ud558\uc138\uc694. \uc5b8\uc5b4\ub294 \uc790\ub3d9\uc73c\ub85c \uac10\uc9c0\ub429\ub2c8\ub2e4...',
                )}
                className="w-full resize-none overflow-hidden rounded-2xl border border-gray-200 px-4 py-3 text-[17px] leading-7 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:text-[17px]"
              />
            </div>

            <div>
              <p className="mb-2 text-base font-semibold text-gray-700">
                {pick(locale, '\u7ffb\u8b6f\u7d50\u679c', 'Result', '\u7ffb\u8a33\u7d50\u679c', '\ubc88\uc5ed \uacb0\uacfc')}
              </p>
              <textarea
                ref={resultTextareaRef}
                value={resultText}
                readOnly
                placeholder={pick(
                  locale,
                  '\u7ffb\u8b6f\u7d50\u679c\u6703\u986f\u793a\u5728\u9019\u88e1...',
                  'Translation result appears here...',
                  '\u7ffb\u8a33\u7d50\u679c\u304c\u3053\u3053\u306b\u8868\u793a\u3055\u308c\u307e\u3059...',
                  '\ubc88\uc5ed \uacb0\uacfc\uac00 \uc5ec\uae30\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4...',
                )}
                className="w-full resize-none overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-[17px] leading-7 text-gray-900 outline-none placeholder:text-gray-400 sm:text-[17px]"
              />
            </div>

            <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 -mx-1 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0">
              <div className="grid gap-1.5 sm:grid-cols-[auto_1fr]">
                <button
                  type="button"
                  onClick={onClear}
                  disabled={!sourceText && !resultText}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-3"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {pick(locale, '\u6e05\u9664', 'Clear', '\u30af\u30ea\u30a2', '\uc9c0\uc6b0\uae30')}
                </button>
                <button
                  type="button"
                  onClick={onTranslate}
                  disabled={!sourceText.trim() || loading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-500 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 animate-pulse sm:h-4 sm:w-4" />
                      {pick(locale, '\u7ffb\u8b6f\u4e2d...', 'Translating...', '\u7ffb\u8a33\u4e2d...', '\ubc88\uc5ed \uc911...')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {pick(locale, '\u958b\u59cb\u7ffb\u8b6f', 'Start translation', '\u7ffb\u8a33\u958b\u59cb', '\ubc88\uc5ed \uc2dc\uc791')}
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="hidden text-center text-xs leading-5 text-gray-400 sm:block">
              {pick(
                locale,
                '\u4f86\u6e90\u8a9e\u8a00\u53ef\u4f7f\u7528\u81ea\u52d5\u8fa8\u8b58\uff0c\u4e26\u6703\u8a18\u4f4f\u4f60\u4e0a\u6b21\u9078\u64c7\u7684\u7ffb\u8b6f\u8a9e\u7cfb\u3002',
                'The source language can auto-detect, and your last target language will be remembered.',
                '\u5143\u306e\u8a00\u8a9e\u306f\u81ea\u52d5\u5224\u5b9a\u3067\u304d\u3001\u524d\u56de\u9078\u3093\u3060\u7ffb\u8a33\u5148\u3082\u8a18\u61b6\u3057\u307e\u3059\u3002',
                '\uc6d0\ubb38 \uc5b8\uc5b4\ub294 \uc790\ub3d9 \uac10\uc9c0\ub418\uba70, \ub9c8\uc9c0\ub9c9 \ubc88\uc5ed \uc5b8\uc5b4\ub3c4 \uae30\uc5b5\ud569\ub2c8\ub2e4.',
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
