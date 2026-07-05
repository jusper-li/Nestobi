import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Coffee, Plus, Save, Trash2, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';

type OptionKey = 'A' | 'B' | 'C' | 'D';

interface QuestionRow {
  id: string;
  question_text: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface OptionRow {
  id: string;
  question_id: string;
  option_key: OptionKey;
  option_text: string;
  score: number;
  display_order: number;
}

interface SubmissionRow {
  id: string;
  member_name: string;
  member_phone: string;
  member_email: string | null;
  result_type: string;
  created_at: string;
}

const EMPTY_OPTIONS: Record<OptionKey, { option_text: string; score: number }> = {
  A: { option_text: '', score: 1 },
  B: { option_text: '', score: 1 },
  C: { option_text: '', score: 1 },
  D: { option_text: '', score: 1 },
};

export default function SuperAdminCoffeeQuiz() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [questionText, setQuestionText] = useState('');
  const [questionOrder, setQuestionOrder] = useState(1);
  const [questionActive, setQuestionActive] = useState(true);
  const [questionImage, setQuestionImage] = useState('');
  const [formOptions, setFormOptions] = useState(EMPTY_OPTIONS);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const s of submissions) byType[s.result_type] = (byType[s.result_type] || 0) + 1;
    return byType;
  }, [submissions]);

  const loadAll = async () => {
    setLoading(true);
    const [qRes, oRes, sRes] = await Promise.all([
      supabase.from('coffee_quiz_questions').select('*').order('display_order', { ascending: true }),
      supabase.from('coffee_quiz_question_options').select('*').order('display_order', { ascending: true }),
      supabase.from('coffee_quiz_submissions').select('id,member_name,member_phone,member_email,result_type,created_at').order('created_at', { ascending: false }).limit(200),
    ]);
    setQuestions((qRes.data || []) as QuestionRow[]);
    setOptions((oRes.data || []) as OptionRow[]);
    setSubmissions((sRes.data || []) as SubmissionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const uploadImage = async (file: File) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `coffee-quiz/question-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) return;
    const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
    setQuestionImage(data.publicUrl);
  };

  const createQuestion = async () => {
    if (!questionText.trim()) return;
    setSaving(true);
    setMsg('');

    const { data, error } = await supabase
      .from('coffee_quiz_questions')
      .insert({
        question_text: questionText.trim(),
        image_url: questionImage || null,
        display_order: questionOrder,
        is_active: questionActive,
      })
      .select('id')
      .single();

    if (error || !data) {
      setSaving(false);
      setMsg(`建立失敗：${error?.message || 'unknown error'}`);
      return;
    }
    const questionId = data.id;

    const rows = (Object.keys(formOptions) as OptionKey[]).map((key, index) => ({
      question_id: data.id,
      option_key: key,
      option_text: formOptions[key].option_text.trim() || key,
      score: Number(formOptions[key].score) || 0,
      display_order: index + 1,
    }));
    const { error: optionError } = await supabase.from('coffee_quiz_question_options').insert(rows);
    if (optionError) {
      setSaving(false);
      setMsg(`選項建立失敗：${optionError.message}`);
      return;
    }

    await logAdminAction('create_coffee_quiz_question', 'coffee_quiz_questions', questionId, {
      question_text: questionText.trim(),
      display_order: questionOrder,
    });

    setQuestionText('');
    setQuestionOrder((v) => v + 1);
    setQuestionImage('');
    setFormOptions(EMPTY_OPTIONS);
    setSaving(false);
    setMsg('題目已新增');
    await loadAll();
  };

  const updateQuestionOption = async (id: string, patch: Partial<OptionRow>) => {
    await supabase.from('coffee_quiz_question_options').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    await logAdminAction('update_coffee_quiz_option', 'coffee_quiz_question_options', id, patch as Record<string, unknown>);
  };

  const updateQuestion = async (id: string, patch: Partial<QuestionRow>) => {
    await supabase.from('coffee_quiz_questions').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    await logAdminAction('update_coffee_quiz_question', 'coffee_quiz_questions', id, patch as Record<string, unknown>);
  };

  const deleteQuestion = async (id: string) => {
    if (!window.confirm('確定刪除這題？')) return;
    await supabase.from('coffee_quiz_questions').delete().eq('id', id);
    await logAdminAction('delete_coffee_quiz_question', 'coffee_quiz_questions', id);
    await loadAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700"><Coffee className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI咖啡尋豆師管理</h1>
          <p className="text-sm text-gray-500">題目編輯、分數設定、圖片上傳、測驗結果統計</p>
        </div>
      </div>

      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</div>}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">新增題目</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="題目內容" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
          <input type="number" value={questionOrder} onChange={e => setQuestionOrder(Number(e.target.value) || 1)} placeholder="順序" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
          <input value={questionImage} onChange={e => setQuestionImage(e.target.value)} placeholder="題目圖片 URL" className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm md:col-span-2" />
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <Upload className="h-4 w-4" /> 上傳圖片
            <input className="hidden" type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={questionActive} onChange={e => setQuestionActive(e.target.checked)} />
            啟用題目
          </label>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(Object.keys(formOptions) as OptionKey[]).map((key) => (
            <div key={key} className="rounded-xl border border-gray-200 p-3">
              <p className="mb-2 text-xs font-bold text-gray-500">選項 {key}</p>
              <input value={formOptions[key].option_text} onChange={e => setFormOptions(prev => ({ ...prev, [key]: { ...prev[key], option_text: e.target.value } }))} placeholder={`選項${key}文字`} className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input type="number" value={formOptions[key].score} onChange={e => setFormOptions(prev => ({ ...prev, [key]: { ...prev[key], score: Number(e.target.value) || 0 } }))} placeholder="分數" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
        <button onClick={createQuestion} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Plus className="h-4 w-4" />} 新增題目
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">題目清單</h2>
        {loading ? <p className="text-sm text-gray-500">讀取中...</p> : (
          <div className="space-y-4">
            {questions.map(q => {
              const opts = options.filter(o => o.question_id === q.id).sort((a, b) => a.display_order - b.display_order);
              return (
                <div key={q.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <input value={q.display_order} type="number" onChange={e => setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, display_order: Number(e.target.value) || 0 } : item))} onBlur={e => updateQuestion(q.id, { display_order: Number(e.target.value) || 0 })} className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />
                    <input value={q.question_text} onChange={e => setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, question_text: e.target.value } : item))} onBlur={e => updateQuestion(q.id, { question_text: e.target.value })} className="min-w-[280px] flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
                    <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <input type="checkbox" checked={q.is_active} onChange={e => { const v = e.target.checked; setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, is_active: v } : item)); updateQuestion(q.id, { is_active: v }); }} />
                      啟用
                    </label>
                    <button onClick={() => deleteQuestion(q.id)} className="ml-auto rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <input value={q.image_url || ''} onChange={e => setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, image_url: e.target.value } : item))} onBlur={e => updateQuestion(q.id, { image_url: e.target.value || null })} placeholder="題目圖片 URL" className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {opts.map(opt => (
                      <div key={opt.id} className="rounded-lg border border-gray-100 p-2">
                        <div className="mb-1 text-xs font-bold text-gray-500">{opt.option_key}</div>
                        <input value={opt.option_text} onChange={e => setOptions(prev => prev.map(row => row.id === opt.id ? { ...row, option_text: e.target.value } : row))} onBlur={e => updateQuestionOption(opt.id, { option_text: e.target.value })} className="mb-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm" />
                        <input type="number" value={opt.score} onChange={e => setOptions(prev => prev.map(row => row.id === opt.id ? { ...row, score: Number(e.target.value) || 0 } : row))} onBlur={e => updateQuestionOption(opt.id, { score: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 inline-flex items-center gap-2 text-lg font-bold text-gray-900"><BarChart3 className="h-5 w-5" />測驗結果統計</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-xs text-amber-700">{k}</p>
              <p className="text-xl font-bold text-amber-900">{v}</p>
            </div>
          ))}
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-2">時間</th><th className="py-2">會員</th><th className="py-2">電話</th><th className="py-2">Email</th><th className="py-2">結果</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="py-2">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="py-2">{s.member_name}</td>
                  <td className="py-2">{s.member_phone}</td>
                  <td className="py-2">{s.member_email || '-'}</td>
                  <td className="py-2"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"><Check className="h-3 w-3" />{s.result_type}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
