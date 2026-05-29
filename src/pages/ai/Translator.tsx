import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Check, Copy, History, Languages } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { callAI } from '../../lib/openai';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { formatDate } from '../../lib/utils';

const LANGS = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ภาษาไทย' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'vi', label: 'Tiếng Việt' },
];

interface TranslationRecord {
  id: string;
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}

const Translator: React.FC = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState('zh-TW');
  const [targetLang, setTargetLang] = useState('en');
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<TranslationRecord[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    const { data } = await supabase.from('translations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
    setHistory(data || []);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) return;
    setLoading(true);
    setTranslated('');
    try {
      const result = await callAI<string>('translate', { text: sourceText, sourceLang, targetLang, language: normalizedLang });
      setTranslated(result);
      if (user) {
        await supabase.from('translations').insert({
          user_id: user.id,
          source_text: sourceText,
          translated_text: result,
          source_lang: sourceLang,
          target_lang: targetLang,
          status: 'completed',
        });
        fetchHistory();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead title={pick('AI 即時翻譯', 'AI Translator', 'AI 翻訳', 'AI 번역')} description={pick('常用旅遊情境的即時翻譯。', 'Instant translation for common travel scenarios.', '旅行シーンで使える即時翻訳。', '여행 상황에 바로 쓰는 실시간 번역.')} />
      <Navigation />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D9488] shadow-lg">
            <Languages className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{pick('AI 即時翻譯', 'AI Translator', 'AI 翻訳', 'AI 번역')}</h1>
          <p className="mt-1 text-gray-500">{pick('常用旅遊情境的即時翻譯。', 'Instant translation for common travel scenarios.', '旅行シーンで使える即時翻訳。', '여행 상황에 바로 쓰는 실시간 번역.')}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSourceLang(targetLang);
                setTargetLang(sourceLang);
                setSourceText(translated);
                setTranslated(sourceText);
              }}
              className="rounded-xl p-2 text-[#0D9488] transition hover:bg-teal-50"
              title={pick('交換語言', 'Swap language', '言語を入れ替え', '언어 교환')}
            >
              <ArrowRightLeft className="h-5 w-5" />
            </button>
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
              {LANGS.filter((l) => l.code !== sourceLang).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleTranslate}>
            <div className="grid gap-4 md:grid-cols-2">
              <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={6} placeholder={pick('輸入要翻譯的文字...', 'Type text to translate...', '翻訳したいテキストを入力...', '번역할 문장을 입력하세요...')} className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm" />
              <div className="relative">
                <textarea value={translated} readOnly rows={6} placeholder={pick('翻譯結果會顯示在這裡...', 'Translation result appears here...', '翻訳結果がここに表示されます...', '번역 결과가 여기에 표시됩니다...')} className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700" />
                {translated && (
                  <button type="button" onClick={() => { navigator.clipboard.writeText(translated); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-200">
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
            <button type="submit" disabled={loading || !sourceText.trim()} className="mt-4 w-full rounded-xl bg-[#0D9488] py-3 font-semibold text-white shadow-md transition hover:bg-[#0a7a6e] disabled:opacity-60">
              {loading ? pick('翻譯中...', 'Translating...', '翻訳中...', '번역 중...') : pick('翻譯', 'Translate', '翻訳', '번역')}
            </button>
          </form>
        </div>

        {history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <History className="h-5 w-5 text-[#0D9488]" />
              {pick('翻譯紀錄', 'History', '翻訳履歴', '번역 기록')}
            </h3>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="rounded-xl border border-gray-100 p-3">
                  <p className="truncate text-sm text-gray-700">{h.source_text}</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-[#0D9488]">{h.translated_text}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(h.created_at)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Translator;

