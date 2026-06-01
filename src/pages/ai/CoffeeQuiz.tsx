import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { translateCoffeeQuizQuestionsFromCacheOnly, translateCoffeeQuizQuestionsOnDemand } from '../../lib/contentTranslations';

type OptionKey = 'A' | 'B' | 'C' | 'D';
type QuestionOption = { id: string; option_key: OptionKey; option_text: string; score: number };
type Question = { id: string; question_text: string; image_url: string | null; display_order: number; options: QuestionOption[] };

export default function CoffeeQuiz() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const shouldTranslate = pickByLang(locale, '0', '1', '1', '1') === '1';
  const t = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, OptionKey>>>({});
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [qRes, oRes] = await Promise.all([
        supabase.from('coffee_quiz_questions').select('id,question_text,image_url,display_order').eq('is_active', true).order('display_order', { ascending: true }),
        supabase.from('coffee_quiz_question_options').select('id,question_id,option_key,option_text,score,display_order').order('display_order', { ascending: true }),
      ]);
      const qRows = (qRes.data || []) as Array<{ id: string; question_text: string; image_url: string | null; display_order: number }>;
      const oRows = (oRes.data || []) as Array<{ id: string; question_id: string; option_key: OptionKey; option_text: string; score: number; display_order: number }>;
      const merged = qRows
        .map(q => ({ ...q, options: oRows.filter(o => o.question_id === q.id).sort((a, b) => a.display_order - b.display_order) }))
        .filter(q => q.options.length > 0);

      let rows = merged;
      if (shouldTranslate) rows = await translateCoffeeQuizQuestionsFromCacheOnly(merged, locale);
      if (!active) return;
      setQuestions(rows);
      setLoading(false);

      if (shouldTranslate) {
        const fullRows = await translateCoffeeQuizQuestionsOnDemand(merged, locale);
        if (!active) return;
        setQuestions(fullRows);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [locale, shouldTranslate]);

  const baseType = useMemo(() => {
    const score: Record<OptionKey, number> = { A: 0, B: 0, C: 0, D: 0 };
    questions.forEach(q => {
      const selectedKey = answers[q.id];
      if (!selectedKey) return;
      const selected = q.options.find(o => o.option_key === selectedKey);
      score[selectedKey] += Number(selected?.score ?? 1);
    });
    return (Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'B') as OptionKey;
  }, [answers, questions]);

  const resultTitle = {
    A: t('明亮果酸冒險家', 'Bright Explorer', '明るい酸味の冒険家', '밝은 산미 탐험가'),
    B: t('香甜順口愛好者', 'Smooth & Sweet Lover', '甘くなめらか派', '달콤하고 부드러운 취향'),
    C: t('均衡風味品味家', 'Balanced Taster', 'バランス派テイスター', '균형 잡힌 풍미 애호가'),
    D: t('濃厚深焙經典派', 'Bold Dark Classic', '深煎りクラシック派', '진한 다크 클래식'),
  }[baseType];

  const current = questions[index];

  const onNext = () => {
    if (!current || !answers[current.id]) return;
    if (index === questions.length - 1) setDone(true);
    else setIndex(v => v + 1);
  };

  const onSave = async () => {
    if (!user) return;
    await supabase.from('coffee_quiz_submissions').insert({ user_id: user.id, result_type: resultTitle, answers, agreement: true });
    setSaved(true);
  };

  const reset = () => {
    setIndex(0);
    setAnswers({});
    setDone(false);
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <SEOHead title={t('AI 咖啡測驗', 'AI Coffee Quiz', 'AIコーヒー診断', 'AI 커피 퀴즈')} description={t('用 12 題找出你的咖啡偏好。', 'Find your coffee profile in 12 questions.', '12問であなたのコーヒータイプを診断。', '12문항으로 커피 취향을 확인하세요.')} />
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between text-sm text-[#9c6b2f]">
          <Link to="/" className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {t('返回首頁', 'Back Home', 'ホームへ戻る', '홈으로')}
          </Link>
          <span>
            {t('進度', 'Progress', '進捗', '진행')} {Math.min(Object.keys(answers).length, questions.length)}/{questions.length || 12}
          </span>
        </div>

        <section className="rounded-3xl border bg-white p-5">
          {loading ? (
            <div className="py-24 text-center text-gray-500">{t('載入題目中...', 'Loading questions...', '問題を読み込み中...', '문항 불러오는 중...')}</div>
          ) : !done && current ? (
            <>
              <div className="mb-4 inline-flex items-center rounded-full bg-[#f6ead7] px-3 py-1 text-sm font-semibold text-[#8a5a22]">
                {t('AI 咖啡測驗', 'AI Coffee Quiz', 'AIコーヒー診断', 'AI 커피 퀴즈')}
              </div>
              {current.image_url && (
                <div className="mb-5 overflow-hidden rounded-2xl bg-[#f3f3f3]">
                  <img src={current.image_url} alt={current.question_text} className="h-72 w-full object-contain" />
                </div>
              )}
              <h2 className="mb-4 text-3xl font-black text-[#1a1a1a]">{current.question_text}</h2>
              <div className="space-y-3">
                {current.options.map(opt => {
                  const active = answers[current.id] === opt.option_key;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnswers(prev => ({ ...prev, [current.id]: opt.option_key }))}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-lg ${active ? 'border-[#c09a6a] bg-[#f8efe2]' : 'border-gray-200 bg-white'}`}
                    >
                      <span className="mr-2 font-bold">{opt.option_key}.</span>
                      {opt.option_text}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-2">
                <button type="button" onClick={() => setIndex(v => Math.max(0, v - 1))} className="rounded-xl border px-5 py-2.5 text-gray-400" disabled={index === 0}>
                  {t('上一題', 'Previous', '前の質問', '이전')}
                </button>
                <button type="button" onClick={onNext} className="rounded-xl bg-[#d8c5a6] px-5 py-2.5 font-semibold text-white">
                  {index === questions.length - 1 ? t('查看結果', 'Result', '結果を見る', '결과 보기') : t('下一題', 'Next', '次へ', '다음')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 w-fit rounded-full bg-white px-5 py-2 text-2xl font-black text-[#3b2a19]">{t('檢測結果', 'Quiz Result', '診断結果', '진단 결과')}</div>
              <h3 className="mb-5 text-center text-3xl font-black text-[#2b2b2b]">{resultTitle}</h3>
              {saved ? (
                <p className="mb-4 text-center font-semibold text-green-700">{t('結果已儲存', 'Result saved', '結果を保存しました', '결과가 저장되었습니다')}</p>
              ) : (
                <button type="button" onClick={onSave} className="mx-auto mb-4 block rounded-full bg-[#212529] px-8 py-3 text-xl font-black text-white" disabled={!user}>
                  {t('保存結果', 'Save Result', '結果を保存', '결과 저장')}
                </button>
              )}
              <button type="button" onClick={reset} className="mx-auto flex items-center gap-2 rounded-xl border px-4 py-2 text-sm text-gray-600">
                <RotateCcw className="h-4 w-4" />
                {t('重新測驗', 'Retake Quiz', 'もう一度診断', '다시 진단하기')}
              </button>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
