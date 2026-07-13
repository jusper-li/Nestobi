import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, ChevronDown, ChevronUp, Coffee, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/auditLog';

type OptionKey = 'A' | 'B' | 'C' | 'D';
type ModalMode = 'create' | 'edit' | null;

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

interface OptionDraft {
  option_text: string;
  score: number;
}

interface QuestionDraft {
  question_text: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  options: Record<OptionKey, OptionDraft>;
}

const optionKeys: OptionKey[] = ['A', 'B', 'C', 'D'];

const createEmptyOptions = (): Record<OptionKey, OptionDraft> => ({
  A: { option_text: '', score: 1 },
  B: { option_text: '', score: 1 },
  C: { option_text: '', score: 1 },
  D: { option_text: '', score: 1 },
});

const createEmptyDraft = (): QuestionDraft => ({
  question_text: '',
  image_url: '',
  display_order: 1,
  is_active: true,
  options: createEmptyOptions(),
});

export default function SuperAdminCoffeeQuiz() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(createEmptyDraft());

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
      supabase
        .from('coffee_quiz_submissions')
        .select('id,member_name,member_phone,member_email,result_type,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    setQuestions((qRes.data || []) as QuestionRow[]);
    setOptions((oRes.data || []) as OptionRow[]);
    setSubmissions((sRes.data || []) as SubmissionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const closeModal = () => {
    setModalMode(null);
    setEditingQuestionId(null);
    setDraft(createEmptyDraft());
  };

  const openCreateModal = () => {
    const nextOrder = questions.length ? Math.max(...questions.map(question => question.display_order || 0)) + 1 : 1;
    setEditingQuestionId(null);
    setDraft({
      ...createEmptyDraft(),
      display_order: nextOrder,
    });
    setModalMode('create');
    setMsg('');
  };

  const openEditModal = (question: QuestionRow) => {
    const mappedOptions = optionKeys.reduce<Record<OptionKey, OptionDraft>>((acc, key) => {
      const existing = options.find(option => option.question_id === question.id && option.option_key === key);
      acc[key] = {
        option_text: existing?.option_text || '',
        score: existing?.score ?? 1,
      };
      return acc;
    }, createEmptyOptions());

    setEditingQuestionId(question.id);
    setDraft({
      question_text: question.question_text,
      image_url: question.image_url || '',
      display_order: question.display_order,
      is_active: question.is_active,
      options: mappedOptions,
    });
    setModalMode('edit');
    setOpenQuestionId(question.id);
    setMsg('');
  };

  const uploadImage = async (file: File, onDone: (url: string) => void) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `coffee-quiz/question-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) {
      setMsg(`圖片上傳失敗：${error.message}`);
      return;
    }
    const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
    onDone(data.publicUrl);
  };

  const saveQuestion = async () => {
    if (!draft.question_text.trim()) {
      setMsg('請先輸入題目。');
      return;
    }

    setSaving(true);
    setMsg('');

    const payload = {
      question_text: draft.question_text.trim(),
      image_url: draft.image_url || null,
      display_order: draft.display_order,
      is_active: draft.is_active,
    };

    if (modalMode === 'edit' && editingQuestionId) {
      const { error } = await supabase
        .from('coffee_quiz_questions')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingQuestionId);

      if (error) {
        setSaving(false);
        setMsg(`更新題目失敗：${error.message}`);
        return;
      }

      await Promise.all(
        optionKeys.map(async (key, index) => {
          const existing = options.find(option => option.question_id === editingQuestionId && option.option_key === key);
          const optionPayload = {
            question_id: editingQuestionId,
            option_key: key,
            option_text: draft.options[key].option_text.trim() || key,
            score: Number(draft.options[key].score) || 0,
            display_order: index + 1,
          };

          if (existing) {
            await supabase.from('coffee_quiz_question_options').update({ ...optionPayload, updated_at: new Date().toISOString() }).eq('id', existing.id);
          } else {
            await supabase.from('coffee_quiz_question_options').insert(optionPayload);
          }
        }),
      );

      await logAdminAction('update_coffee_quiz_question', 'coffee_quiz_questions', editingQuestionId, payload as Record<string, unknown>);
      await loadAll();
      setSaving(false);
      setMsg('題目已更新。');
      closeModal();
      return;
    }

    const { data, error } = await supabase
      .from('coffee_quiz_questions')
      .insert(payload)
      .select('id')
      .single();

    if (error || !data) {
      setSaving(false);
      setMsg(`建立題目失敗：${error?.message || 'unknown error'}`);
      return;
    }

    const questionId = data.id as string;
    const rows = optionKeys.map((key, index) => ({
      question_id: questionId,
      option_key: key,
      option_text: draft.options[key].option_text.trim() || key,
      score: Number(draft.options[key].score) || 0,
      display_order: index + 1,
    }));

    const { error: optionError } = await supabase.from('coffee_quiz_question_options').insert(rows);
    if (optionError) {
      setSaving(false);
      setMsg(`建立選項失敗：${optionError.message}`);
      return;
    }

    await logAdminAction('create_coffee_quiz_question', 'coffee_quiz_questions', questionId, {
      question_text: draft.question_text.trim(),
      display_order: draft.display_order,
      image_url: draft.image_url || null,
    });

    await loadAll();
    setSaving(false);
    setMsg('題目已新增。');
    setOpenQuestionId(questionId);
    closeModal();
  };

  const updateQuestionOption = async (id: string, patch: Partial<OptionRow>) => {
    await supabase.from('coffee_quiz_question_options').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    await logAdminAction('update_coffee_quiz_option', 'coffee_quiz_question_options', id, patch as Record<string, unknown>);
  };

  const updateQuestion = async (id: string, patch: Partial<QuestionRow>) => {
    await supabase.from('coffee_quiz_questions').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    await logAdminAction('update_coffee_quiz_question', 'coffee_quiz_questions', id, patch as Record<string, unknown>);
    setQuestions(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  const deleteQuestion = async (id: string) => {
    if (!window.confirm('確定要刪除這題嗎？')) return;
    await supabase.from('coffee_quiz_questions').delete().eq('id', id);
    await logAdminAction('delete_coffee_quiz_question', 'coffee_quiz_questions', id);
    await loadAll();
    if (openQuestionId === id) setOpenQuestionId(null);
    if (editingQuestionId === id) closeModal();
  };

  const groupedQuestions = useMemo(
    () =>
      questions.map(question => ({
        question,
        opts: options
          .filter(option => option.question_id === question.id)
          .sort((a, b) => a.display_order - b.display_order),
      })),
    [questions, options],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
          <Coffee className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">咖啡 AI 測驗</h1>
          <p className="text-sm text-gray-500">可新增、編輯題目，並以收合列表管理既有題目。</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          新增題目
        </button>
      </div>

      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{msg}</div>}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">題目清單</h2>
        {loading ? (
          <p className="text-sm text-gray-500">載入中...</p>
        ) : (
          <div className="space-y-3">
            {groupedQuestions.map(({ question, opts }) => {
              const isOpen = openQuestionId === question.id;
              return (
                <div key={question.id} className="overflow-hidden rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setOpenQuestionId(prev => (prev === question.id ? null : question.id))}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-sm font-bold text-amber-700">{question.display_order}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{question.question_text}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${question.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {question.is_active ? '啟用' : '停用'}
                        </span>
                        <span>{opts.length} 個選項</span>
                        {question.image_url ? <span>有圖片</span> : <span>無圖片</span>}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 bg-white p-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <input
                          value={question.display_order}
                          type="number"
                          onChange={e => setQuestions(prev => prev.map(item => (item.id === question.id ? { ...item, display_order: Number(e.target.value) || 0 } : item)))}
                          onBlur={e => void updateQuestion(question.id, { display_order: Number(e.target.value) || 0 })}
                          className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                        />
                        <input
                          value={question.question_text}
                          onChange={e => setQuestions(prev => prev.map(item => (item.id === question.id ? { ...item, question_text: e.target.value } : item)))}
                          onBlur={e => void updateQuestion(question.id, { question_text: e.target.value })}
                          className="min-w-[280px] flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        />
                        <label className="inline-flex items-center gap-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={question.is_active}
                            onChange={e => {
                              const next = e.target.checked;
                              setQuestions(prev => prev.map(item => (item.id === question.id ? { ...item, is_active: next } : item)));
                              void updateQuestion(question.id, { is_active: next });
                            }}
                          />
                          啟用
                        </label>
                        <button type="button" onClick={() => openEditModal(question)} className="rounded-lg px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50">
                          編輯
                        </button>
                        <button type="button" onClick={() => void deleteQuestion(question.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="刪除題目">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                          <p className="mb-2 text-xs font-semibold text-gray-500">目前圖片</p>
                          {question.image_url ? (
                            <img src={question.image_url} alt={question.question_text} className="h-32 w-full rounded-xl object-cover" />
                          ) : (
                            <div className="flex h-32 items-center justify-center rounded-xl bg-white text-gray-300">沒有圖片</div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            {opts.map(opt => (
                              <div key={opt.id} className="rounded-lg border border-gray-100 p-3">
                                <div className="mb-1 text-xs font-bold text-gray-500">{opt.option_key}</div>
                                <input
                                  value={opt.option_text}
                                  onChange={e => setOptions(prev => prev.map(row => (row.id === opt.id ? { ...row, option_text: e.target.value } : row)))}
                                  onBlur={e => void updateQuestionOption(opt.id, { option_text: e.target.value })}
                                  className="mb-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                                />
                                <input
                                  type="number"
                                  value={opt.score}
                                  onChange={e => setOptions(prev => prev.map(row => (row.id === opt.id ? { ...row, score: Number(e.target.value) || 0 } : row)))}
                                  onBlur={e => void updateQuestionOption(opt.id, { score: Number(e.target.value) || 0 })}
                                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 inline-flex items-center gap-2 text-lg font-bold text-gray-900">
          <BarChart3 className="h-5 w-5" />
          參與統計
        </h2>
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
                <th className="py-2">時間</th>
                <th className="py-2">姓名</th>
                <th className="py-2">電話</th>
                <th className="py-2">Email</th>
                <th className="py-2">結果</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="py-2">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="py-2">{s.member_name}</td>
                  <td className="py-2">{s.member_phone}</td>
                  <td className="py-2">{s.member_email || '-'}</td>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      <Check className="h-3 w-3" />
                      {s.result_type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="關閉"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-gray-100 px-6 py-5">
              <h3 className="text-lg font-bold text-gray-900">{modalMode === 'edit' ? '編輯題目' : '新增題目'}</h3>
              <p className="mt-1 text-sm text-gray-500">題目、圖片與四個選項都在這裡編輯。</p>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={draft.question_text}
                  onChange={e => setDraft(prev => ({ ...prev, question_text: e.target.value }))}
                  placeholder="題目文字"
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
                <input
                  type="number"
                  value={draft.display_order}
                  onChange={e => setDraft(prev => ({ ...prev, display_order: Number(e.target.value) || 1 }))}
                  placeholder="排序"
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />

                <div className="md:col-span-2">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-semibold text-gray-500">目前圖片</p>
                    {draft.image_url ? (
                      <div className="flex items-start gap-3">
                        <img src={draft.image_url} alt="preview" className="h-20 w-20 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <input
                            value={draft.image_url}
                            onChange={e => setDraft(prev => ({ ...prev, image_url: e.target.value }))}
                            placeholder="圖片網址"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                          />
                          <p className="mt-1 text-xs text-gray-400">可貼上圖片網址，或用上傳替換。</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-gray-300">
                          <Upload className="h-6 w-6" />
                        </div>
                        <input
                          value={draft.image_url}
                          onChange={e => setDraft(prev => ({ ...prev, image_url: e.target.value }))}
                          placeholder="圖片網址"
                          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <Upload className="h-4 w-4" />
                  上傳圖片
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(file, url => setDraft(prev => ({ ...prev, image_url: url })));
                      e.target.value = '';
                    }}
                  />
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={draft.is_active} onChange={e => setDraft(prev => ({ ...prev, is_active: e.target.checked }))} />
                  啟用題目
                </label>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {optionKeys.map(key => (
                  <div key={key} className="rounded-xl border border-gray-200 p-3">
                    <p className="mb-2 text-xs font-bold text-gray-500">選項 {key}</p>
                    <input
                      value={draft.options[key].option_text}
                      onChange={e =>
                        setDraft(prev => ({
                          ...prev,
                          options: { ...prev.options, [key]: { ...prev.options[key], option_text: e.target.value } },
                        }))
                      }
                      placeholder={`選項 ${key} 文字`}
                      className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      value={draft.options[key].score}
                      onChange={e =>
                        setDraft(prev => ({
                          ...prev,
                          options: { ...prev.options, [key]: { ...prev.options[key], score: Number(e.target.value) || 0 } },
                        }))
                      }
                      placeholder="分數"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button type="button" onClick={closeModal} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700">
                取消
              </button>
              <button
                type="button"
                onClick={saveQuestion}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? <Save className="h-4 w-4 animate-pulse" /> : <Plus className="h-4 w-4" />}
                {modalMode === 'edit' ? '儲存變更' : '新增題目'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
