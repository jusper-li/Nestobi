import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Check, Copy, History, Languages } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { callAI } from '../../lib/openai';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { formatDate } from '../../lib/utils';

const LANGS = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ไทย' },
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
  const { t, lang } = useLanguage();
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
      const result = await callAI<string>('translate', { text: sourceText, sourceLang, targetLang, language: lang });
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
      <SEOHead title={t.ai.translator.title} description={t.ai.translator.subtitle} />
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0D9488] rounded-2xl mb-3 shadow-lg">
            <Languages className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.ai.translator.title}</h1>
          <p className="text-gray-500 mt-1">{t.ai.translator.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button onClick={() => { setSourceLang(targetLang); setTargetLang(sourceLang); setSourceText(translated); setTranslated(sourceText); }} className="p-2 text-[#0D9488] hover:bg-teal-50 rounded-xl transition" title={t.ai.translator.swap}>
              <ArrowRightLeft className="w-5 h-5" />
            </button>
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
              {LANGS.filter((l) => l.code !== sourceLang).map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          <form onSubmit={handleTranslate}>
            <div className="grid md:grid-cols-2 gap-4">
              <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={6} placeholder={t.ai.translator.inputPlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none text-sm" />
              <div className="relative">
                <textarea value={translated} readOnly rows={6} placeholder={t.ai.translator.resultPlaceholder} className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 resize-none text-sm text-gray-700" />
                {translated && (
                  <button type="button" onClick={() => { navigator.clipboard.writeText(translated); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="absolute top-2 right-2 p-1.5 hover:bg-gray-200 rounded-lg transition text-gray-500">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
            <button type="submit" disabled={loading || !sourceText.trim()} className="mt-4 w-full bg-[#0D9488] hover:bg-[#0a7a6e] text-white font-semibold py-3 rounded-xl transition shadow-md disabled:opacity-60">
              {loading ? t.ai.translator.translating : t.ai.translator.translate}
            </button>
          </form>
        </div>

        {history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-[#0D9488]" />
              {t.ai.translator.history}
            </h3>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="border border-gray-100 rounded-xl p-3">
                  <p className="text-sm text-gray-700 truncate">{h.source_text}</p>
                  <p className="text-sm text-[#0D9488] font-medium truncate mt-0.5">{h.translated_text}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(h.created_at)}</p>
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
