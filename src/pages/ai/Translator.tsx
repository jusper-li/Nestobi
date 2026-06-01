import { useMemo, useState } from 'react';
import { ArrowLeftRight, Languages } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { callAI } from '../../lib/openai';

type Locale = 'zh-TW' | 'en' | 'ja' | 'ko';
type TranslateLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const pick = (locale: Locale, zh: string, en: string, ja: string, ko: string) =>
  pickByLang(locale, zh, en, ja, ko);

const LANG_OPTIONS: Array<{ value: TranslateLang; label: Record<Locale, string> }> = [
  { value: 'zh-TW', label: { 'zh-TW': '繁體中文', en: 'Traditional Chinese', ja: '繁体字中国語', ko: '번체 중국어' } },
  { value: 'en', label: { 'zh-TW': 'English', en: 'English', ja: '英語', ko: '영어' } },
  { value: 'ja', label: { 'zh-TW': '日文', en: 'Japanese', ja: '日本語', ko: '일본어' } },
  { value: 'ko', label: { 'zh-TW': '韓文', en: 'Korean', ja: '韓国語', ko: '한국어' } },
];

export default function Translator() {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as Locale;

  const [sourceLang, setSourceLang] = useState<TranslateLang>('zh-TW');
  const [targetLang, setTargetLang] = useState<TranslateLang>('en');
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => pick(locale, 'AI 即時翻譯', 'AI Translator', 'AI 翻訳', 'AI 번역'), [locale]);
  const subtitle = useMemo(
    () =>
      pick(
        locale,
        '即時翻譯常見旅遊情境用語。',
        'Instant translation for common travel scenarios.',
        '旅行のよくあるシーンをすぐ翻訳できます。',
        '여행에서 자주 쓰는 표현을 즉시 번역합니다.',
      ),
    [locale],
  );

  const onSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(resultText);
    setResultText(sourceText);
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
      setResultText(translated || '');
    } catch {
      setResultText(
        pick(
          locale,
          '翻譯失敗，請稍後再試。',
          'Translation failed. Please try again later.',
          '翻訳に失敗しました。しばらくしてから再試行してください。',
          '번역에 실패했습니다. 잠시 후 다시 시도해 주세요.',
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

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Languages className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-gray-500">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value as TranslateLang)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label[locale]}
                </option>
              ))}
            </select>
            <button type="button" onClick={onSwap} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50" aria-label="swap language">
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value as TranslateLang)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label[locale]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={6}
              placeholder={pick(locale, '輸入要翻譯的文字...', 'Type text to translate...', '翻訳したいテキストを入力してください...', '번역할 텍스트를 입력하세요...')}
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />

            <textarea
              value={resultText}
              readOnly
              rows={6}
              placeholder={pick(locale, '翻譯結果會顯示在這裡...', 'Translation result appears here...', '翻訳結果がここに表示されます...', '번역 결과가 여기에 표시됩니다...')}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
            />

            <button type="button" onClick={onTranslate} disabled={!sourceText.trim() || loading} className="w-full rounded-xl bg-teal-500 py-3 font-semibold text-white hover:bg-teal-600 disabled:opacity-50">
              {loading ? pick(locale, '翻譯中...', 'Translating...', '翻訳中...', '번역 중...') : pick(locale, '翻譯', 'Translate', '翻訳', '번역')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
