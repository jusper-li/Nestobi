import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Languages, History, Copy, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { callAI } from '../../lib/openai';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';

const TRANSLATE_LANGUAGES = [
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
  const { lang, t } = useLanguage();
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState('zh-TW');
  const [targetLang, setTargetLang] = useState('en');
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<TranslationRecord[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('translations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setHistory(data || []);
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) return;
    setLoading(true);
    setError('');
    setTranslated('');

    try {
      const result = await callAI<string>('translate', {
        text: sourceText,
        sourceLang,
        targetLang,
        language: lang,
      });
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
        await supabase.from('user_usage').upsert(
          { user_id: user.id, feature_type: 'translation', usage_count: 1, last_used_at: new Date().toISOString() },
          { onConflict: 'user_id,feature_type' }
        );
        fetchHistory();
      }
    } catch {
      setError('翻譯失敗，請稍後再試。');
    }
    setLoading(false);
  };

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translated);
    setTranslated(sourceText);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLangLabel = (code: string) => TRANSLATE_LANGUAGES.find(l => l.code === code)?.label || code;

  const quickPhrases: Record<string, { [key: string]: string[] }> = {
    'zh-TW': {
      旅遊: ['這個多少錢？', '廁所在哪裡？', '我迷路了', '請叫計程車'],
      住宿: ['我有預訂', '能否提早入住？', '請問 Wi-Fi 密碼？', '需要額外毛巾'],
      飲食: ['我對花生過敏', '請給我菜單', '外帶可以嗎？', '請結帳'],
    },
    en: {
      Travel: ['How much is this?', "Where's the restroom?", 'I am lost', 'Please call a taxi'],
      Hotel: ['I have a reservation', 'Can I check in early?', 'What is the Wi-Fi password?', 'I need extra towels'],
      Food: ['I am allergic to peanuts', 'Can I see the menu?', 'Can I take this to go?', 'Check please'],
    },
    ja: {
      旅行: ['これはいくらですか？', 'トイレはどこですか？', '迷子になりました', 'タクシーを呼んでください'],
      宿泊: ['予約しています', '早めにチェックインできますか？', 'Wi-Fiのパスワードは？', 'タオルを追加でください'],
      食事: ['ピーナツアレルギーです', 'メニューを見せてください', 'テイクアウトできますか？', 'お会計をお願いします'],
    },
    ko: {
      여행: ['이것은 얼마예요?', '화장실이 어디예요?', '길을 잃었어요', '택시를 불러주세요'],
      숙박: ['예약했어요', '일찍 체크인 할 수 있나요?', 'Wi-Fi 비밀번호가 뭐예요?', '수건이 더 필요해요'],
      음식: ['땅콩 알레르기가 있어요', '메뉴 보여주세요', '포장 가능한가요?', '계산해 주세요'],
    },
  };

  const currentPhrases = quickPhrases[lang] || quickPhrases['zh-TW'];

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead title="AI 即時翻譯" description="AI 即時多語翻譯工具，支援中文、英文、日文、韓文等多國語言即時互譯，旅遊溝通好幫手。" keywords="AI翻譯, 即時翻譯, 旅遊翻譯, 多語翻譯" pageType="default" breadcrumbs={[{name:'首頁',url:'/'},{name:'AI 即時翻譯',url:'/ai/translator'}]} />
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0D9488] rounded-2xl mb-3 shadow-lg">
            <Languages className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.ai.translator.title}</h1>
          <p className="text-gray-500 mt-1">{t.ai.translator.subtitle}</p>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {TRANSLATE_LANGUAGES.map(l => (
              <span key={l.code} className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{l.label}</span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <select
              value={sourceLang}
              onChange={e => setSourceLang(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              {TRANSLATE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button
              onClick={handleSwap}
              className="p-2 text-[#0D9488] hover:bg-teal-50 rounded-xl transition"
              title={t.ai.translator.swap}
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>
            <select
              value={targetLang}
              onChange={e => setTargetLang(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              {TRANSLATE_LANGUAGES.filter(l => l.code !== sourceLang).map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          <form onSubmit={handleTranslate}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{getLangLabel(sourceLang)}</label>
                <textarea
                  value={sourceText}
                  onChange={e => setSourceText(e.target.value)}
                  rows={6}
                  placeholder={t.ai.translator.inputPlaceholder}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D9488] resize-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{getLangLabel(targetLang)}</label>
                <div className="relative">
                  <textarea
                    value={translated}
                    readOnly
                    rows={6}
                    placeholder={t.ai.translator.resultPlaceholder}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 resize-none text-sm text-gray-700"
                  />
                  {translated && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="absolute top-2 right-2 p-1.5 hover:bg-gray-200 rounded-lg transition text-gray-500"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-3 text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !sourceText.trim()}
              className="mt-4 w-full bg-[#0D9488] hover:bg-[#0a7a6e] text-white font-semibold py-3 rounded-xl transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />{t.ai.translator.translating}</>
              ) : t.ai.translator.translate}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">旅遊常用語句</h3>
          <div className="space-y-3">
            {Object.entries(currentPhrases).map(([category, phrases]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-[#0D9488] mb-2">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {phrases.map(phrase => (
                    <button
                      key={phrase}
                      onClick={() => setSourceText(phrase)}
                      className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-full hover:bg-teal-100 transition"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-[#0D9488]" />{t.ai.translator.history}
            </h3>
            <div className="space-y-3">
              {history.map(h => (
                <div
                  key={h.id}
                  className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => { setSourceText(h.source_text); setSourceLang(h.source_lang); setTargetLang(h.target_lang); setTranslated(h.translated_text); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{h.source_text}</p>
                      <p className="text-sm text-[#0D9488] font-medium truncate mt-0.5">{h.translated_text}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-100 px-2 py-0.5 rounded-full">
                      {getLangLabel(h.source_lang)} → {getLangLabel(h.target_lang)}
                    </span>
                  </div>
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
