import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Coffee, RotateCcw } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang } from '../../lib/i18n';
import { translateCoffeeQuizQuestionsFromCacheOnly, translateCoffeeQuizQuestionsOnDemand } from '../../lib/contentTranslations';

type OptionKey = 'A' | 'B' | 'C' | 'D';
type LangKey = 'zh-TW' | 'en' | 'ja' | 'ko';

type QuestionOption = { id: string; option_key: OptionKey; option_text: string; score: number };
type Question = { id: string; question_text: string; image_url: string | null; display_order: number; options: QuestionOption[] };

const COPY: Record<LangKey, Record<string, string>> = {
  'zh-TW': {
    title: 'AI 咖啡測驗',
    desc: '用 12 題快速找到你的咖啡風味偏好。',
    back: '返回首頁',
    progress: '進度',
    loading: '題目載入中...',
    next: '下一題',
    prev: '上一題',
    viewResult: '查看結果',
    result: '檢測結果',
    tune: '和你想的不一樣！？手動調整喜歡的烘焙度吧！',
    saveResult: '儲存結果',
    name: '姓名',
    phone: '手機號碼',
    agree: '我同意儲存本次測驗結果，用於後續個人化推薦。',
    save: '儲存結果',
    retake: '重新測驗',
    loginHint: '請先登入會員後再儲存結果。',
    saved: '結果已儲存',
    quizTag: 'AI 咖啡測驗',
    roastLeft: '淺烘焙',
    roastRight: '深烘焙',
    acidity: '咖啡酸值｜果酸　甘苦',
    mouthfeel: '適口感覺｜明亮清爽　濃厚甘醇',
    adventure: '冒險性格｜大膽嚐鮮　專注經典',
  },
  en: {
    title: 'AI Coffee Quiz',
    desc: 'Find your coffee flavor profile in 12 quick questions.',
    back: 'Back Home',
    progress: 'Progress',
    loading: 'Loading questions...',
    next: 'Next',
    prev: 'Previous',
    viewResult: 'See Result',
    result: 'Result',
    tune: 'Not exactly your style? Fine-tune your roast preference.',
    saveResult: 'Save Result',
    name: 'Name',
    phone: 'Phone',
    agree: 'I agree to store this quiz result for personalized recommendations.',
    save: 'Save Result',
    retake: 'Retake Quiz',
    loginHint: 'Please sign in before saving your result.',
    saved: 'Result saved',
    quizTag: 'AI Coffee Quiz',
    roastLeft: 'Light Roast',
    roastRight: 'Dark Roast',
    acidity: 'Acidity | Fruity - Bitter',
    mouthfeel: 'Mouthfeel | Bright - Rich',
    adventure: 'Adventure | Bold - Classic',
  },
  ja: {
    title: 'AI コーヒー診断',
    desc: '12問であなたのコーヒーの好みを見つけます。',
    back: 'ホームへ戻る',
    progress: '進捗',
    loading: '質問を読み込み中...',
    next: '次へ',
    prev: '前へ',
    viewResult: '結果を見る',
    result: '診断結果',
    tune: '好みに合わせて焙煎傾向を手動調整できます。',
    saveResult: '結果を保存',
    name: 'お名前',
    phone: '電話番号',
    agree: 'この診断結果を保存し、今後のおすすめに使用することに同意します。',
    save: '保存する',
    retake: 'もう一度診断',
    loginHint: '結果を保存するにはログインしてください。',
    saved: '保存しました',
    quizTag: 'AI コーヒー診断',
    roastLeft: '浅煎り',
    roastRight: '深煎り',
    acidity: '酸味｜フルーティー　苦味',
    mouthfeel: '口当たり｜明るく軽やか　濃厚で甘い',
    adventure: '冒険性格｜新しい挑戦　定番重視',
  },
  ko: {
    title: 'AI 커피 퀴즈',
    desc: '12개 질문으로 나에게 맞는 커피 취향을 찾아보세요.',
    back: '홈으로',
    progress: '진행',
    loading: '문항 불러오는 중...',
    next: '다음',
    prev: '이전',
    viewResult: '결과 보기',
    result: '진단 결과',
    tune: '생각과 다르다면? 로스팅 취향을 직접 조정해보세요.',
    saveResult: '결과 저장',
    name: '이름',
    phone: '휴대폰 번호',
    agree: '이 진단 결과를 저장하고 개인화 추천에 활용하는 데 동의합니다.',
    save: '저장',
    retake: '다시 테스트',
    loginHint: '결과 저장 전 로그인이 필요합니다.',
    saved: '저장되었습니다',
    quizTag: 'AI 커피 퀴즈',
    roastLeft: '라이트 로스트',
    roastRight: '다크 로스트',
    acidity: '산미｜과일향　쓴맛',
    mouthfeel: '바디감｜밝고 산뜻함　진하고 달콤함',
    adventure: '모험성향｜새로운 시도　클래식 선호',
  },
};

const RESULT_PROFILE: Record<OptionKey, Record<LangKey, { title: string; desc: string }>> = {
  A: {
    'zh-TW': { title: '明亮果酸冒險家', desc: '你喜歡新鮮刺激的風味，推薦淺焙、日曬與高香氣豆款。' },
    en: { title: 'Bright Explorer', desc: 'You prefer vivid acidity and clean fruity notes. Light roast is your lane.' },
    ja: { title: '明るい酸味の冒険家', desc: '鮮やかな酸味とフルーティーさが好き。浅煎りや華やかな豆がおすすめ。' },
    ko: { title: '상큼 산미 탐험가', desc: '산뜻한 산미와 과일향을 선호해요. 라이트 로스트 원두가 잘 맞습니다.' },
  },
  B: {
    'zh-TW': { title: '香甜順口愛好者', desc: '你偏好圓潤、甜感與易飲性，推薦淺中焙與花果香調。' },
    en: { title: 'Smooth & Sweet Lover', desc: 'You enjoy sweet balance and smooth drinkability. Medium-light roast suits you well.' },
    ja: { title: '甘くまろやか派', desc: '甘さと飲みやすさを重視。中浅煎りのバランス系がぴったりです。' },
    ko: { title: '달콤 밸런스 취향', desc: '달콤함과 부드러운 목넘김을 좋아해요. 미디엄-라이트 로스트가 잘 맞아요.' },
  },
  C: {
    'zh-TW': { title: '平衡醇厚鑑賞家', desc: '你重視口感層次與香氣表現，推薦中焙至中深焙。' },
    en: { title: 'Body-Forward Taster', desc: 'You enjoy richer body and layered aroma. Medium to medium-dark roast fits you.' },
    ja: { title: 'コク重視の鑑賞家', desc: '口当たりと香りの層を重視。中煎り〜中深煎りがおすすめです。' },
    ko: { title: '밸런스 바디 애호가', desc: '바디감과 향의 층을 중요하게 봐요. 미디엄~미디엄 다크가 어울립니다.' },
  },
  D: {
    'zh-TW': { title: '深焙品味大師', desc: '你喜歡厚實苦甜與深邃尾韻，推薦中深焙至深焙豆。' },
    en: { title: 'Bold Dark Adventurer', desc: 'You love bold intensity and deep finish. Medium-dark to dark roast is ideal.' },
    ja: { title: '深煎りマスター', desc: 'しっかりした苦甘さと長い余韻が好み。中深煎り〜深煎りが最適。' },
    ko: { title: '다크 로스트 마스터', desc: '진한 쌉싸름함과 긴 여운을 좋아해요. 미디엄 다크~다크 로스트가 최적입니다.' },
  },
};

function toLangKey(lang: string): LangKey {
  const normalized = normalizeLang(lang);
  if (normalized === 'en' || normalized === 'ja' || normalized === 'ko') return normalized;
  return 'zh-TW';
}

export default function CoffeeQuiz() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const uiLang = toLangKey(lang);
  const t = COPY[uiLang];

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
    async function load() {
      setLoading(true);
      const [qRes, oRes] = await Promise.all([
        supabase.from('coffee_quiz_questions').select('id,question_text,image_url,display_order').eq('is_active', true).order('display_order', { ascending: true }),
        supabase.from('coffee_quiz_question_options').select('id,question_id,option_key,option_text,score,display_order').order('display_order', { ascending: true }),
      ]);

      const qRows = (qRes.data || []) as Array<{ id: string; question_text: string; image_url: string | null; display_order: number }>;
      const oRows = (oRes.data || []) as Array<{ id: string; question_id: string; option_key: OptionKey; option_text: string; score: number; display_order: number }>;

      const merged = qRows
        .map((q) => ({
          ...q,
          options: oRows.filter((o) => o.question_id === q.id).sort((a, b) => a.display_order - b.display_order || a.option_key.localeCompare(b.option_key)),
        }))
        .filter((q) => q.options.length > 0);

      let rows = merged;
      if (uiLang !== 'zh-TW') rows = await translateCoffeeQuizQuestionsFromCacheOnly(merged, uiLang);
      if (!active) return;
      setQuestions(rows);
      setLoading(false);

      if (uiLang !== 'zh-TW') {
        const fullRows = await translateCoffeeQuizQuestionsOnDemand(merged, uiLang);
        if (!active) return;
        setQuestions(fullRows);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [uiLang]);

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
    const shift = roast - 5 + (acidity <= 4 ? 1 : acidity >= 7 ? -1 : 0) + (mouthfeel >= 7 ? -1 : mouthfeel <= 3 ? 1 : 0) + (adventure >= 7 ? 1 : adventure <= 3 ? -1 : 0);
    const order: OptionKey[] = ['A', 'B', 'C', 'D'];
    const idx = order.indexOf(baseType);
    const next = Math.max(0, Math.min(order.length - 1, idx + (shift >= 2 ? 1 : shift <= -2 ? -1 : 0)));
    return order[next];
  }, [baseType, roast, acidity, mouthfeel, adventure]);

  const resultProfile = RESULT_PROFILE[tunedType][uiLang];

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
      result_type: resultProfile.title,
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
      <SEOHead title={t.title} description={t.desc} canonical="/ai/coffee-quiz" />
      <Navigation />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-[#7B5A32] hover:underline">
            <ArrowLeft size={16} />
            {t.back}
          </Link>
          {!done && !loading && (
            <span className="text-sm text-[#7B5A32]">
              {t.progress} {answeredCount}/{questions.length}
            </span>
          )}
        </div>

        {loading ? (
          <section className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-black/5">{t.loading}</section>
        ) : !done && current ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F2E4CF] px-3 py-1 text-xs font-semibold text-[#704B24]">
              <Coffee className="h-3.5 w-3.5" />
              {t.quizTag}
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
              <button onClick={() => setIndex((v) => Math.max(0, v - 1))} disabled={index === 0} className="rounded-xl border border-gray-200 px-4 py-2 text-sm disabled:opacity-40">
                {t.prev}
              </button>
              <button onClick={onNext} disabled={!answers[current.id]} className="rounded-xl bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {index === questions.length - 1 ? t.viewResult : t.next}
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-4 rounded-2xl bg-[#5E4D43] p-4 sm:p-6">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#5E4D43]">{t.result}</span>
              <h2 className="mt-3 text-3xl font-extrabold text-white">{resultProfile.title}</h2>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-center text-sm font-semibold leading-7 text-[#3A312B]">{resultProfile.desc}</p>
              <div className="mt-5 flex justify-center">
                <img src="/images/coffee-quiz/14.avif" alt="coffee result" className="h-28 w-28 object-contain" />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-center text-lg font-bold text-[#2B1D0E]">{t.tune}</h3>
              <div className="space-y-4 text-sm text-[#2B1D0E]">
                <label className="block">
                  <div className="mb-1 flex items-center justify-between font-semibold">
                    <span>{t.roastLeft}</span>
                    <span>{t.roastRight}</span>
                  </div>
                  <input type="range" min={0} max={9} value={roast} onChange={(e) => setRoast(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">
                  <div className="mb-1 font-semibold">{t.acidity}</div>
                  <input type="range" min={0} max={9} value={acidity} onChange={(e) => setAcidity(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">
                  <div className="mb-1 font-semibold">{t.mouthfeel}</div>
                  <input type="range" min={0} max={9} value={mouthfeel} onChange={(e) => setMouthfeel(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">
                  <div className="mb-1 font-semibold">{t.adventure}</div>
                  <input type="range" min={0} max={9} value={adventure} onChange={(e) => setAdventure(Number(e.target.value))} className="w-full" />
                </label>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#2B1D0E]">{t.saveResult}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phone} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
                {t.agree}
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={onSave} disabled={!name.trim() || !phone.trim() || !agree || !user} className="rounded-full bg-[#22252B] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                  {t.save}
                </button>
                <button onClick={reset} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm">
                  <RotateCcw size={14} />
                  {t.retake}
                </button>
              </div>
              {!user && <p className="mt-2 text-xs text-amber-700">{t.loginHint}</p>}
              {submitError && <p className="mt-2 text-xs text-red-600">{submitError}</p>}
              {saved && (
                <p className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-700">
                  <CheckCircle2 size={16} />
                  {t.saved}
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

