import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Coffee, RotateCcw, SlidersHorizontal } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type OptionKey = 'A' | 'B' | 'C' | 'D';
type QuestionOption = { id: string; option_key: OptionKey; option_text: string; score: number };
type Question = { id: string; question_text: string; image_url: string | null; display_order: number; options: QuestionOption[] };

const DEFAULT_PROFILES = {
  A: { title: '中深焙專業達人', desc: '偏好堅果、巧克力與醇厚口感，推薦中深焙配方與低酸感咖啡。' },
  B: { title: '平衡風味探索者', desc: '你重視口感與層次，推薦中焙與多產區輪替，體驗更多元風味。' },
  C: { title: '香甜順口愛好者', desc: '你偏好圓潤、甜感與易飲性，推薦淺中焙與花果香調。' },
  D: { title: '明亮果酸冒險家', desc: '你接受新鮮刺激的風味，推薦淺焙、日曬與高香氣豆款。' },
} as const;

export default function CoffeeQuiz() {
  const { user } = useAuth();
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
    const load = async () => {
      setLoading(true);
      const [qRes, oRes] = await Promise.all([
        supabase.from('coffee_quiz_questions').select('id,question_text,image_url,display_order').eq('is_active', true).order('display_order', { ascending: true }),
        supabase.from('coffee_quiz_question_options').select('id,question_id,option_key,option_text,score,display_order').order('display_order', { ascending: true }),
      ]);
      const qRows = (qRes.data || []) as Array<{ id: string; question_text: string; image_url: string | null; display_order: number }>;
      const oRows = (oRes.data || []) as Array<{ id: string; question_id: string; option_key: OptionKey; option_text: string; score: number }>;
      const merged = qRows.map(q => ({
        ...q,
        options: oRows.filter(o => o.question_id === q.id).sort((a, b) => a.option_key.localeCompare(b.option_key)),
      })).filter(q => q.options.length > 0);
      setQuestions(merged);
      setLoading(false);
    };
    load();
  }, []);

  const current = questions[index];
  const answeredCount = Object.keys(answers).length;

  const baseType = useMemo(() => {
    const score: Record<OptionKey, number> = { A: 0, B: 0, C: 0, D: 0 };
    questions.forEach((q) => {
      const pick = answers[q.id];
      if (!pick) return;
      const selected = q.options.find(o => o.option_key === pick);
      score[pick] += Number(selected?.score ?? 1);
    });
    return (Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'B') as OptionKey;
  }, [answers, questions]);

  const tunedType = useMemo(() => {
    const shift =
      (roast - 5) +
      (acidity <= 4 ? 1 : acidity >= 7 ? -1 : 0) +
      (mouthfeel >= 7 ? -1 : mouthfeel <= 3 ? 1 : 0) +
      (adventure >= 7 ? 1 : adventure <= 3 ? -1 : 0);
    const order: OptionKey[] = ['A', 'B', 'C', 'D'];
    const idx = order.indexOf(baseType);
    const next = Math.max(0, Math.min(order.length - 1, idx + (shift >= 2 ? 1 : shift <= -2 ? -1 : 0)));
    return order[next];
  }, [baseType, roast, acidity, mouthfeel, adventure]);

  const result = DEFAULT_PROFILES[tunedType];

  const onSelect = (key: OptionKey) => setAnswers(prev => ({ ...prev, [current.id]: key }));
  const onNext = () => {
    if (!current || !answers[current.id]) return;
    if (index === questions.length - 1) { setDone(true); return; }
    setIndex(v => v + 1);
  };

  const onSave = async () => {
    setSubmitError('');
    if (!name.trim() || !phone.trim() || !agree || !user) return;
    const payload = {
      user_id: user.id,
      member_email: user.email || null,
      member_name: name.trim(),
      member_phone: phone.trim(),
      result_type: result.title,
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
    setIndex(0); setAnswers({}); setDone(false); setRoast(5); setAcidity(5); setMouthfeel(5); setAdventure(5);
    setName(''); setPhone(''); setAgree(false); setSaved(false); setSubmitError('');
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEOHead title="AI 咖啡測驗" description="完成咖啡問診，取得專屬咖啡風味建議。" canonical="/ai/coffee-quiz" />
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-[#7B5A32] hover:underline"><ArrowLeft size={16} />返回首頁</Link>
          {!done && !loading && <span className="text-sm text-[#7B5A32]">進度 {answeredCount}/{questions.length}</span>}
        </div>

        {loading ? (
          <section className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm ring-1 ring-black/5">載入測驗中...</section>
        ) : !done && current ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F2E4CF] px-3 py-1 text-xs font-semibold text-[#704B24]">
              <Coffee className="h-3.5 w-3.5" />AI 咖啡測驗
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
                  <button key={o.id} onClick={() => onSelect(o.option_key)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${active ? 'border-[#C09A6A] bg-[#FFF7EB] text-[#5E411F]' : 'border-gray-200 hover:border-[#D9BE97]'}`}>
                    <span className="mr-2 font-semibold">{o.option_key}.</span>{o.option_text}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setIndex(v => Math.max(0, v - 1))} disabled={index === 0} className="rounded-xl border border-gray-200 px-4 py-2 text-sm disabled:opacity-40">上一題</button>
              <button onClick={onNext} disabled={!answers[current.id]} className="rounded-xl bg-[#C09A6A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{index === questions.length - 1 ? '看結果' : '下一題'}</button>
            </div>
          </section>
        ) : (
          <section className="space-y-4 rounded-2xl bg-[#5E4D43] p-4 sm:p-6">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#5E4D43]">檢測結果</span>
              <h2 className="mt-3 text-3xl font-extrabold text-[#2B1D0E]">{result.title}</h2>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-center text-sm font-semibold leading-7 text-[#3A312B]">「{result.desc}」</p>
              <div className="mt-5 flex justify-center">
                <img src="/images/coffee-quiz/14.avif" alt="coffee result" className="h-28 w-28 object-contain" />
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-center text-lg font-bold text-[#2B1D0E]">和你想的不一樣！？手動調整喜歡的烘焙度吧！</h3>
              <div className="space-y-4 text-sm text-[#2B1D0E]">
                <label className="block">
                  <div className="mb-1 flex items-center justify-between font-semibold"><span>淺烘焙</span><span>深烘焙</span></div>
                  <input type="range" min={0} max={9} value={roast} onChange={e => setRoast(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">
                  <div className="mb-1">
                    <span className="font-semibold">咖啡酸值｜</span>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span>果酸</span>
                      <span className="font-semibold text-[#5E4D43]">調整數值 {acidity}</span>
                      <span>甘苦</span>
                    </div>
                  </div>
                  <input type="range" min={0} max={9} value={acidity} onChange={e => setAcidity(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">
                  <div className="mb-1">
                    <span className="font-semibold">適口感覺｜</span>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span>明亮清爽</span>
                      <span className="font-semibold text-[#5E4D43]">調整數值 {mouthfeel}</span>
                      <span>濃厚甘醇</span>
                    </div>
                  </div>
                  <input type="range" min={0} max={9} value={mouthfeel} onChange={e => setMouthfeel(Number(e.target.value))} className="w-full" />
                </label>
                <label className="block">
                  <div className="mb-1">
                    <span className="font-semibold">冒險性格｜</span>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span>大膽嚐鮮</span>
                      <span className="font-semibold text-[#5E4D43]">調整數值 {adventure}</span>
                      <span>專注經典</span>
                    </div>
                  </div>
                  <input type="range" min={0} max={9} value={adventure} onChange={e => setAdventure(Number(e.target.value))} className="w-full" />
                </label>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#2B1D0E]">保存結果，領取專屬優惠</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="姓名" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="電話" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5" />
                我同意網站隱私權條款，並授權使用本次測驗結果做個人化推薦。
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={onSave} disabled={!name.trim() || !phone.trim() || !agree || !user} className="rounded-full bg-[#22252B] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40">保存結果</button>
                <button onClick={reset} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-sm"><RotateCcw size={14} />重新測驗</button>
              </div>
              {!user && <p className="mt-2 text-xs text-amber-700">請先登入會員後再送出結果。</p>}
              {submitError && <p className="mt-2 text-xs text-red-600">{submitError}</p>}
              {saved && <p className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 size={16} />已保存測驗結果。</p>}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
