import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Coffee, RotateCcw } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  translateCoffeeQuizQuestionsFromCacheOnly,
  translateCoffeeQuizQuestionsOnDemand,
} from '../../lib/contentTranslations';

type OptionKey = 'A' | 'B' | 'C' | 'D';
type QuestionOption = {
  id: string;
  option_key: OptionKey;
  option_text: string;
  score: number;
};
type Question = {
  id: string;
  question_text: string;
  image_url: string | null;
  display_order: number;
  options: QuestionOption[];
};

type LangKey = 'zh-TW' | 'en' | 'ja' | 'ko';
type CopyMap = Record<LangKey, string>;

const RESULT_PROFILES: Record<OptionKey, { title: CopyMap; desc: CopyMap }> = {
  A: {
    title: { 'zh-TW': '明亮果酸冒險家', en: 'Bright Explorer', ja: 'フルーティ探検家', ko: '밝은 산미 탐험가' },
    desc: {
      'zh-TW': '你偏好清爽明亮風味，推薦淺焙與花果香調。',
      en: 'You enjoy bright and clean flavors. Light roast with floral-fruity notes fits you.',
      ja: '爽やかで明るい味わいが好み。浅煎りと花果系の香りがおすすめです。',
      ko: '맑고 밝은 풍미를 선호해요. 라이트 로스트와 플로럴·과일향을 추천합니다.',
    },
  },
  B: {
    title: { 'zh-TW': '香甜順口愛好者', en: 'Smooth & Sweet Lover', ja: 'まろやか派', ko: '달콤 밸런스형' },
    desc: {
      'zh-TW': '你偏好圓潤甜感，推薦淺中焙到中焙的平衡配方。',
      en: 'You prefer rounded sweetness. Medium-light to medium balanced blends are best for you.',
      ja: 'まろやかな甘さが好み。中浅煎り〜中煎りのバランス系がぴったりです。',
      ko: '부드럽고 달콤한 균형감을 선호해요. 중약배전~중배전 블렌드를 추천합니다.',
    },
  },
  C: {
    title: { 'zh-TW': '厚實口感品味家', en: 'Body-Forward Taster', ja: 'コク重視派', ko: '바디 중시형' },
    desc: {
      'zh-TW': '你喜歡厚實口感，推薦中深焙與堅果可可調性。',
      en: 'You enjoy richer body. Medium-dark roast with nutty-cocoa notes suits you.',
      ja: 'コクのある味わいが好み。中深煎りとナッツ・カカオ系がおすすめです。',
      ko: '묵직한 바디를 좋아해요. 중강배전과 너티·코코아 노트를 추천합니다.',
    },
  },
  D: {
    title: { 'zh-TW': '深焙濃韻玩家', en: 'Bold Dark Adventurer', ja: '深煎りマスター', ko: '진한 다크 로스터' },
    desc: {
      'zh-TW': '你偏好濃烈層次，推薦深焙與辛香尾韻風味。',
      en: 'You enjoy bold intensity. Dark roast with spicy deep finish matches your style.',
      ja: '力強く深い風味が好み。深煎りとスパイシーな余韻がおすすめです。',
      ko: '강렬하고 진한 풍미를 선호해요. 다크 로스트와 스파이시한 여운이 잘 맞습니다.',
    },
  },
};

export default function CoffeeQuiz() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const langRaw = String(lang || '').trim();
  const langLower = langRaw.toLowerCase();
  const normalizedLang: LangKey = langLower.startsWith('en')
    ? 'en'
    : langLower.startsWith('ja') || langLower.startsWith('jp')
      ? 'ja'
      : langLower.startsWith('ko') || langLower.startsWith('kr')
        ? 'ko'
        : 'zh-TW';
  const pick = (zh: string, en: string, ja: string, ko: string) =>
    normalizedLang === 'en' ? en : normalizedLang === 'ja' ? ja : normalizedLang === 'ko' ? ko : zh;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, OptionKey>>>({});
  const [done, setDone] = useState(false);
  const [roast, setRoast] = useState(5);
  const [acidity, setAcidity] = useState(5);
  const [mouthfeel, setMouthfeel] = useState(5);
  const [adventure, setAdventure] = useState(5);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [qRes, oRes] = await Promise.all([
        supabase
          .from('coffee_quiz_questions')
          .select('id,question_text,image_url,display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('coffee_quiz_question_options')
          .select('id,question_id,option_key,option_text,score,display_order')
          .order('display_order', { ascending: true }),
      ]);

      const qRows = (qRes.data || []) as Array<{
        id: string;
        question_text: string;
        image_url: string | null;
        display_order: number;
      }>;
      const oRows = (oRes.data || []) as Array<{
        id: string;
        question_id: string;
        option_key: OptionKey;
        option_text: string;
        score: number;
        display_order: number;
      }>;

      const merged = qRows
        .map((q) => ({
          ...q,
          options: oRows
            .filter((o) => o.question_id === q.id)
            .sort((a, b) => a.display_order - b.display_order || a.option_key.localeCompare(b.option_key)),
        }))
        .filter((q) => q.options.length > 0);

      let initialRows = merged;
      if (normalizedLang !== 'zh-TW') {
        initialRows = await translateCoffeeQuizQuestionsFromCacheOnly(merged, normalizedLang);
      }
      if (!active) return;
      setQuestions(initialRows);
      setLoading(false);

      if (normalizedLang !== 'zh-TW') {
        const fullRows = await translateCoffeeQuizQuestionsOnDemand(merged, normalizedLang);
        if (!active) return;
        setQuestions(fullRows);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [normalizedLang]);

  const current = questions[index];
  const answeredCount = Object.keys(answers).length;

  const baseType = useMemo(() => {
    const score: Record<OptionKey, number> = { A: 0, B: 0, C: 0, D: 0 };
    questions.forEach((q) => {
      const selectedKey = answers[q.id];
      if (!selectedKey) return;
      const selected = q.options.find((o) => o.option_key === selectedKey);
      score[selectedKey] += Number(selected?.score ?? 1);
    });
    return (Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'B') as OptionKey;
  }, [answers, questions]);

  const tunedType = useMemo(() => {
    const shift =
      roast - 5 +
      (acidity <= 4 ? 1 : acidity >= 7 ? -1 : 0) +
      (mouthfeel >= 7 ? -1 : mouthfeel <= 3 ? 1 : 0) +
      (adventure >= 7 ? 1 : adventure <= 3 ? -1 : 0);
    const order: OptionKey[] = ['A', 'B', 'C', 'D'];
    const idx = order.indexOf(baseType);
    const next = Math.max(0, Math.min(order.length - 1, idx + (shift >= 2 ? 1 : shift <= -2 ? -1 : 0)));
    return order[next];
  }, [baseType, roast, acidity, mouthfeel, adventure]);

  const resultProfile = RESULT_PROFILES[tunedType];
  const resultTitle = resultProfile.title[normalizedLang];
  const resultDesc = resultProfile.desc[normalizedLang];

  const onSelect = (key: OptionKey) => setAnswers((prev) => ({ ...prev, [current.id]: key }));
  const onNext = () => {
    if (!current || !answers[current.id]) return;
    if (index === questions.length - 1) {
      setDone(true);
      return;
    }
    setIndex((v) => v + 1);
  };

  const onSave = async () => {
    setSubmitError('');
    if (!name.trim() || !phone.trim() || !agree || !user) return;
    const payload = {
      user_id: user.id,
      member_email: user.email || null,
      member_name: name.trim(),
      member_phone: phone.trim(),
      result_type: resultTitle,
      roast_score: roast,
      acidity_score: acidity,
      adventure_score: adventure,
      answers: { ...answers, __fine_tune: { roast, acidity, mouthfeel, adventure } },
      agreement: true,
    };
    const { error } = await supabase.from('coffee_quiz_submissions').insert(payload);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSaved(true);
  };

  const reset = () => {
    setIndex(0);
    setAnswers({});
    setDone(false);
    setRoast(5);
    setAcidity(5);
    setMouthfeel(5);
    setAdventure(5);
    setName('');
    setPhone('');
    setAgree(false);
    setSaved(false);
    setSubmitError('');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEOHead
        title={pick('AI 咖啡測驗', 'AI Coffee Quiz', 'AIコーヒー診断', 'AI 커피 퀴즈')}
        description={pick(
          '完成咖啡測驗，找出適合你的風味設定。',
          'Take the coffee quiz and discover your flavor profile.',
          'コーヒー診断で自分に合う味を見つけよう。',
          '커피 퀴즈로 나에게 맞는 취향을 찾아보세요.',
        )}
        canonical="/ai/coffee-quiz"
      />
      <Navigation />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-[#7B5A32] hover:underline">
            <ArrowLeft size={16} />
            {pick('返回首頁', 'Back Home', 'ホームへ戻る', '홈으로')}
          </Link>
          {!done && !loading && (
            <span className="text-sm text-[#7B5A32]">
              {pick('進度', 'Progress', '進捗', '진행')} {answeredCount}/{questions.length}
            </span>
          )}
        </div>

        {loading ? (
          <section className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-black/5">
            {pick('載入測驗中...', 'Loading quiz...', '診断を読み込み中...', '퀴즈 불러오는 중...')}
          </section>
        ) : !done && current ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F2E4CF] px-3 py-1 text-xs font-semibold text-[#704B24]">
              <Coffee className="h-3.5 w-3.5" />
              {pick('AI 咖啡測驗', 'AI Coffee Quiz', 'AIコーヒー診断', 'AI 커피 퀴즈')}
            </div>
            {current.image_url && (
              <div className="mb-4 overflow-hidden rounded-xl bg-gray-100">
                <img src={current.image_url} alt={current.question_text} className="max-h-[420px] w-full object-contain object-center" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-[#2B1D0E]">{current.question_text}</h1>
            <div className="mt-5 space-y-2">
              {current.options.map((o) => {
                const active = answers[current.id] === o.option_key;
                return (
                  <button
                    key={o.id}
                    onClick={() => onSelect(o.option_key)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                      active ? 'border-[#C09A6A] bg-[#FFF7EB] text-[#5E411F]' : 'border-gray-200 hover:border-[#D9BE97]'
                    }`}
                  >
                    <span className="mr-2 font-semibold">{o.option_key}.</span>
                    {o.option_text}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setIndex((v) => Math.max(0, v - 1))}
                disabled={index === 0}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm disabled:opacity-40"
              >
                {pick('上一題', 'Previous', '前の質問', '이전')}
              </button>
              <button
                onClick={onNext}
                disabled={!answers[current.id]}
                className="rounded-xl bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {index === questions.length - 1
                  ? pick('查看結果', 'See Result', '結果を見る', '결과 보기')
                  : pick('下一題', 'Next', '次へ', '다음')}
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-4 rounded-2xl bg-[#5E4D43] p-4 sm:p-6">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#5E4D43]">
                {pick('檢測結果', 'Result', '診断結果', '결과')}
              </span>
              <h2 className="mt-3 text-3xl font-extrabold text-white">{resultTitle}</h2>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-center text-sm font-semibold leading-7 text-[#3A312B]">{resultDesc}</p>
              <div className="mt-5 flex justify-center">
                <img src="/images/coffee-quiz/14.avif" alt="coffee result" className="h-28 w-28 object-contain" />
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-center text-lg font-bold text-[#2B1D0E]">
                {pick('和你想的不一樣？手動調整喜歡的焙度吧！', 'Not exactly your style? Fine-tune it!', '好みに合わせて焙煎度を調整！', '취향에 맞게 세부 조정해보세요!')}
              </h3>
              <div className="space-y-4 text-sm text-[#2B1D0E]">
                <label className="block">
                  <div className="mb-1 flex items-center justify-between font-semibold">
                    <span>{pick('淺焙', 'Light Roast', '浅煎り', '라이트')}</span>
                    <span>{pick('深焙', 'Dark Roast', '深煎り', '다크')}</span>
                  </div>
                  <input type="range" min={0} max={9} value={roast} onChange={(e) => setRoast(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">
                  <div className="mb-1">
                    <span className="font-semibold">{pick('咖啡酸值', 'Acidity', '酸味', '산미')}</span>
                  </div>
                  <input type="range" min={0} max={9} value={acidity} onChange={(e) => setAcidity(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">
                  <div className="mb-1">
                    <span className="font-semibold">{pick('適口感覺', 'Mouthfeel', '口当たり', '바디감')}</span>
                  </div>
                  <input type="range" min={0} max={9} value={mouthfeel} onChange={(e) => setMouthfeel(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">
                  <div className="mb-1">
                    <span className="font-semibold">{pick('冒險性格', 'Adventure', '冒険性', '모험성')}</span>
                  </div>
                  <input type="range" min={0} max={9} value={adventure} onChange={(e) => setAdventure(Number(e.target.value))} className="w-full" />
                </label>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#2B1D0E]">{pick('儲存測驗結果', 'Save Result', '結果を保存', '결과 저장')}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={pick('姓名', 'Name', 'お名前', '이름')} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={pick('手機號碼', 'Phone', '電話番号', '전화번호')} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
                {pick(
                  '我同意提供個人資料用於儲存測驗結果與後續推薦。',
                  'I agree to store my quiz result and use my data for recommendations.',
                  '結果保存とおすすめ提案のため、個人情報提供に同意します。',
                  '결과 저장 및 추천 제공을 위한 개인정보 제공에 동의합니다.',
                )}
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={onSave}
                  disabled={!name.trim() || !phone.trim() || !agree || !user}
                  className="rounded-full bg-[#22252B] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {pick('儲存結果', 'Save Result', '結果を保存', '결과 저장')}
                </button>
                <button onClick={reset} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm">
                  <RotateCcw size={14} />
                  {pick('重新測驗', 'Retake Quiz', 'もう一度診断', '다시하기')}
                </button>
              </div>
              {!user && <p className="mt-2 text-xs text-amber-700">{pick('請先登入後再儲存結果。', 'Please log in before saving your result.', '保存前にログインしてください。', '저장 전에 로그인해 주세요.')}</p>}
              {submitError && <p className="mt-2 text-xs text-red-600">{submitError}</p>}
              {saved && (
                <p className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-700">
                  <CheckCircle2 size={16} />
                  {pick('結果已儲存', 'Result saved', '保存しました', '저장되었습니다')}
                </p>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
