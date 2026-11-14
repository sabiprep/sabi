import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, CircleAlert, ClipboardCheck, FileUp, Flag, RefreshCw, Search, ShieldCheck, X, History, Pencil, Link2, LockKeyhole } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';

type Question = {
  id: string; subject: string; topic?: string | null; subtopic?: string | null;
  topic_id?: string; subtopic_id?: string; year?: number | null; question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  answer: string; explanation?: string; explanation_short?: string;
  source?: string | null; status: string; review_state: string; current_version: number;
  difficulty?: 'easy' | 'medium' | 'hard'; concepts?: string[];
};
type FlagItem = { id: string; question_id: string; version_number: number; reason: string; details?: string | null; created_at: string; question?: Question };
type Version = { version_number: number; content_hash: string; legacy_status?: string; review_state: string; change_reason: string; created_at: string; created_by?: string | null };
type Provenance = { source_label?: string | null; source_url?: string | null; source_type: string; attribution?: string | null; provenance_status: string; evidence?: Record<string, any> };
type Detail = { question: Question & { topic_record?: { subject_slug: string; verification_status: string; is_active: boolean }; subtopic_record?: { verification_status: string; is_active: boolean } }; provenance?: Provenance; versions: Version[]; reviews: any[]; flags: any[] };
type QueueResponse = { questions?: Question[]; flags?: FlagItem[]; total?: number };
type Tab = 'review' | 'flags' | 'imports';
type Draft = { subjectSlug: string; topicId: string; subtopicId: string; year: string; question: string; options: { A: string; B: string; C: string; D: string }; answer: 'A'|'B'|'C'|'D'; explanation: string; explanationShort: string; difficulty: 'easy'|'medium'|'hard'; concepts: string };
const emptyDraft: Draft = { subjectSlug: '', topicId: '', subtopicId: '', year: '', question: '', options: { A: '', B: '', C: '', D: '' }, answer: 'A', explanation: '', explanationShort: '', difficulty: 'medium', concepts: '' };
const tabs: { id: Tab; label: string; Icon: typeof BookOpen }[] = [
  { id: 'review', label: 'Review queue', Icon: ClipboardCheck },
  { id: 'flags', label: 'Student reports', Icon: Flag },
  { id: 'imports', label: 'Import validation', Icon: FileUp },
];
const fieldClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700';
const panelClass = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';

async function requestJson(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export function QuestionBankAdminPage() {
  const [tab, setTab] = useState<Tab>('review');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Question | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [comments, setComments] = useState('');
  const [qualityChecked, setQualityChecked] = useState(false);
  const [answerChecked, setAnswerChecked] = useState(false);
  const [importText, setImportText] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [importReport, setImportReport] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [changeReason, setChangeReason] = useState('');
  const [provenanceForm, setProvenanceForm] = useState({ sourceLabel: '', sourceUrl: '', sourceType: 'official_exam', attribution: '', evidenceNote: '', verifiedAgainstEvidence: false });

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      if (tab === 'flags') {
        const data: QueueResponse = await requestJson('/api/question-bank/flag-queue?limit=50');
        setFlags(data.flags || []); setTotal(data.total || 0);
      } else if (tab === 'review') {
        const params = new URLSearchParams({ limit: '50' });
        if (subject) params.set('subject', subject);
        const data: QueueResponse = await requestJson(`/api/question-bank/review-queue?${params}`);
        setQuestions(data.questions || []); setTotal(data.total || 0);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load the question bank workspace.'); }
    finally { setBusy(false); }
  }, [tab, subject]);

  useEffect(() => { void load(); }, [load]);

  const openQuestion = useCallback(async (question: Question) => {
    setSelected(question); setDetail(null); setEditing(false); setError('');
    setComments(''); setQualityChecked(false); setAnswerChecked(false);
    setDetailBusy(true);
    try {
      const data: Detail = await requestJson(`/api/question-bank/${question.id}`);
      setDetail(data);
      const q = data.question;
      setDraft({
        subjectSlug: q.topic_record?.subject_slug || '',
        topicId: q.topic_id || '',
        subtopicId: q.subtopic_id || '',
        year: q.year ? String(q.year) : '',
        question: q.question,
        options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
        answer: (q.answer || 'A').toUpperCase() as Draft['answer'],
        explanation: q.explanation || '',
        explanationShort: q.explanation_short || '',
        difficulty: q.difficulty || 'medium',
        concepts: (q.concepts || []).join(', '),
      });
      setProvenanceForm({
        sourceLabel: data.provenance?.source_label || q.source || '',
        sourceUrl: data.provenance?.source_url || '',
        sourceType: ['official_exam','publisher','contributor','ai_generated','other'].includes(data.provenance?.source_type || '') ? data.provenance!.source_type : 'other',
        attribution: data.provenance?.attribution || '',
        evidenceNote: '',
        verifiedAgainstEvidence: false,
      });
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load full question history.'); }
    finally { setDetailBusy(false); }
  }, []);

  const filteredQuestions = useMemo(() => questions.filter(q => {
    const term = search.trim().toLowerCase();
    return !term || [q.question, q.subject, q.topic, q.subtopic, q.source, q.id].some(v => String(v || '').toLowerCase().includes(term));
  }), [questions, search]);

  async function refreshDetail() {
    if (!selected) return;
    const data: Detail = await requestJson(`/api/question-bank/${selected.id}`);
    setDetail(data);
    setSelected(data.question);
  }

  async function review(decision: 'approved' | 'rejected' | 'changes_requested' | 'flagged' | 'retired') {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await requestJson(`/api/question-bank/${selected.id}/review`, {
        method: 'POST', body: JSON.stringify({ decision, comments, qualityChecks: { content_reviewed: qualityChecked, answer_key_verified: answerChecked } }),
      });
      setNotice(`Question ${decision.replace('_', ' ')} successfully.`);
      setSelected(null); setDetail(null); setComments(''); setQualityChecked(false); setAnswerChecked(false);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Review action failed.'); }
    finally { setBusy(false); }
  }

  async function saveVersion() {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        subjectSlug: draft.subjectSlug.trim(), topicId: draft.topicId.trim(), subtopicId: draft.subtopicId.trim(),
        ...(draft.year ? { year: Number(draft.year) } : {}),
        question: draft.question, options: draft.options, answer: draft.answer,
        explanation: draft.explanation, explanationShort: draft.explanationShort || undefined,
        difficulty: draft.difficulty,
        concepts: draft.concepts.split(',').map(s => s.trim()).filter(Boolean),
      };
      const result = await requestJson(`/api/question-bank/${selected.id}/versions`, {
        method: 'POST', body: JSON.stringify({ changeReason, question: payload }),
      });
      setNotice(`Saved version ${result.version?.version_number ?? ''}. The question is now pending review and its source verification must be repeated.`);
      setEditing(false); setChangeReason(''); setQualityChecked(false); setAnswerChecked(false);
      await load(); await refreshDetail();
    } catch (err) { setError(err instanceof Error ? err.message : 'Question correction could not be saved.'); }
    finally { setBusy(false); }
  }

  async function verifyProvenance() {
    if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await requestJson(`/api/question-bank/${selected.id}/provenance/verify`, {
        method: 'POST', body: JSON.stringify(provenanceForm),
      });
      setNotice('Source evidence recorded and bound to the current question version.'); 
      await refreshDetail();
    } catch (err) { setError(err instanceof Error ? err.message : 'Source verification failed.'); }
    finally { setBusy(false); }
  }

  async function resolveFlag(flag: FlagItem, status: 'resolved' | 'dismissed') {
    setBusy(true); setError('');
    try {
      await requestJson(`/api/question-bank/flags/${flag.id}/resolve`, {
        method: 'POST', body: JSON.stringify({ status, resolutionNote: comments || undefined }),
      });
      setNotice(`Report ${status}.`); setComments(''); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update report.'); }
    finally { setBusy(false); }
  }


  async function commitImport() {
    if (!importReport?.batchId || importReport.validRows !== importReport.totalRows || importReport.invalidRows || importReport.duplicateRows) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await requestJson(`/api/question-bank/import/${importReport.batchId}/commit`, { method: 'POST' });
      setImportReport((previous: any) => ({ ...previous, commitResult: result }));
      setNotice(`Imported ${result.imported_count} questions as drafts. They are not published and still require source verification and human review.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'The validated batch could not be committed.'); }
    finally { setBusy(false); }
  }

  async function validateImport() {
    setBusy(true); setError(''); setNotice(''); setImportReport(null);
    try {
      const parsed = JSON.parse(importText);
      const rows = Array.isArray(parsed) ? parsed : parsed.rows;
      if (!Array.isArray(rows) || !rows.length) throw new Error('Paste a JSON array of question rows, or an object containing a rows array.');
      const report = await requestJson('/api/question-bank/import/validate', {
        method: 'POST', body: JSON.stringify({ sourceLabel: sourceLabel || undefined, sourceUrl: sourceUrl || undefined, rows }),
      });
      setImportReport(report); setNotice('Dry-run validation completed. No question records were imported.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Import validation failed.'); }
    finally { setBusy(false); }
  }

  const setDraftField = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(prev => ({ ...prev, [key]: value }));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-[#080D1A]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/home" aria-label="Back to SABI" className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><ArrowLeft size={18}/></Link>
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">SABI · Content operations</p><h1 className="text-lg font-black sm:text-xl">Question bank workspace</h1></div>
          </div>
          <button onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"><RefreshCw size={15} className={busy ? 'animate-spin' : ''}/> Refresh</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className={panelClass}><p className="text-xs font-semibold text-slate-500">Current workspace</p><p className="mt-1 text-2xl font-black">3,740</p><p className="text-xs text-slate-500">Legacy question records · baseline</p></div>
          <div className={panelClass}><p className="text-xs font-semibold text-slate-500">Items in this queue</p><p className="mt-1 text-2xl font-black">{total.toLocaleString()}</p><p className="text-xs text-slate-500">{tab === 'flags' ? 'Open student reports' : 'Pending review / flagged'}</p></div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40"><div className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><ShieldCheck size={17}/><p className="text-xs font-bold uppercase tracking-wide">Publishing safeguard</p></div><p className="mt-2 text-sm font-semibold">Only approved questions with verified source and syllabus mapping can reach students.</p></div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
          {tabs.map(({id,label,Icon}) => <button key={id} onClick={() => {setTab(id);setSelected(null);setDetail(null);setError('');setNotice('');}} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab===id?'bg-blue-700 text-white':'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon size={16}/>{label}</button>)}
        </div>

        {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><CircleAlert size={17} className="mt-0.5 shrink-0"/>{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</div>}

        {tab === 'imports' ? <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
          <div className={panelClass}>
            <h2 className="text-lg font-black">Validate a question import</h2><p className="mt-1 text-sm text-slate-500">Dry-run checks required fields, taxonomy references and duplicates. It does not import or publish questions.</p>
            <label className="mt-5 block text-xs font-bold">Source / batch label</label><input value={sourceLabel} onChange={e=>setSourceLabel(e.target.value)} placeholder="e.g. 2024 JAMB Physics — reviewed source" className={fieldClass}/>
            <label className="mt-4 block text-xs font-bold">Source URL (optional)</label><input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://official-source.example" className={fieldClass}/><label className="mt-4 block text-xs font-bold">Question rows (JSON)</label><textarea value={importText} onChange={e=>setImportText(e.target.value)} rows={14} placeholder={'[\n  { "subjectSlug": "physics", "question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "answer":"A", "explanation":"...", "topicId":"...", "subtopicId":"...", "difficulty":"medium" }\n]'} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 placeholder:text-slate-500 dark:border-slate-700"/>
            <button onClick={() => void validateImport()} disabled={busy || !importText.trim()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><FileUp size={16}/>{busy?'Validating…':'Run dry validation'}</button>
          </div>
          <div className={panelClass}><h3 className="font-black">Validation report</h3>{!importReport ? <p className="mt-3 text-sm text-slate-500">Your latest dry-run report will appear here.</p> : <><p className="mt-2 break-all text-xs text-slate-500">Batch {importReport.batchId}</p><div className="mt-4 grid grid-cols-2 gap-3">{[['Total',importReport.totalRows],['Valid',importReport.validRows],['Invalid',importReport.invalidRows],['Duplicates',importReport.duplicateRows]].map(([k,v])=><div key={String(k)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{k}</p><p className="text-2xl font-black">{v}</p></div>)}</div><div className="mt-4 max-h-80 space-y-2 overflow-auto">{(importReport.rows||[]).map((row:any)=><div key={row.rowNumber} className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700"><div className="flex justify-between gap-2"><b>Row {row.rowNumber}</b><span className="font-bold uppercase">{row.outcome}</span></div>{(row.errors||[]).map((e:any,i:number)=><p key={i} className="mt-1 text-red-600">{e.message}</p>)}</div>)}</div>{importReport.validRows===importReport.totalRows&&importReport.invalidRows===0&&importReport.duplicateRows===0&&!importReport.commitResult&&<button onClick={()=>void commitImport()} disabled={busy} className="mt-4 w-full rounded-xl bg-blue-700 px-3 py-3 text-sm font-bold text-white disabled:opacity-40">Commit validated batch as drafts</button>}{importReport.commitResult&&<p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Committed · {importReport.commitResult.imported_count} draft questions created · none published</p>}</>}</div>
        </section> : tab === 'flags' ? <section className="space-y-3">
          {busy && <p className="text-sm text-slate-500">Loading reports…</p>}
          {!busy && flags.length===0 && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700"><Flag className="mx-auto text-slate-400"/><p className="mt-3 font-bold">No open student reports</p></div>}
          {flags.map(flag=><article key={flag.id} className={panelClass}><div className="flex flex-wrap justify-between gap-2"><div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{flag.reason.replaceAll('_',' ')}</span><p className="mt-3 font-bold">{flag.question?.subject} · {flag.question?.topic}</p><p className="mt-1 text-sm">{flag.question?.question}</p><p className="mt-2 text-xs text-slate-500">{flag.details || 'No additional details'} · Version {flag.version_number}</p></div><div className="flex items-center gap-2"><button disabled={busy} onClick={()=>void resolveFlag(flag,'dismissed')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700">Dismiss</button><button disabled={busy} onClick={()=>void resolveFlag(flag,'resolved')} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white">Resolve</button></div></div></article>)}
        </section> : <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.95fr)]">
          <div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search question, subject, topic or source" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"/></div><select value={subject} onChange={e=>setSubject(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">All subjects</option>{['English Language','Mathematics','Physics','Chemistry','Biology','Government','Economics','Literature in English','CRS','Commerce','Accounting'].map(s=><option key={s}>{s}</option>)}</select></div>
            {busy && <p className="text-sm text-slate-500">Loading review queue…</p>}
            {!busy && filteredQuestions.length===0 && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700"><ClipboardCheck className="mx-auto text-slate-400"/><p className="mt-3 font-bold">No questions in this view</p><p className="mt-1 text-sm text-slate-500">Try another subject or refresh the queue.</p></div>}
            <div className="space-y-2">{filteredQuestions.map(q=><button key={q.id} onClick={()=>void openQuestion(q)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id===q.id?'border-blue-500 bg-blue-50 dark:bg-blue-950/30':'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900'}`}><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">{q.subject} · {q.year || 'Year unknown'}</span><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">{q.review_state.replaceAll('_',' ')}</span></div><p className="mt-2 line-clamp-2 text-sm font-semibold">{q.question}</p><p className="mt-2 text-xs text-slate-500">Version {q.current_version} · {q.topic || 'Topic not mapped'} · {q.source || 'Source unknown'}</p></button>)}</div>
          </div>
          <aside className={`h-fit space-y-4 ${panelClass}`}>
            {!selected ? <div className="py-10 text-center"><BookOpen className="mx-auto text-slate-400"/><h2 className="mt-3 font-black">Select a question</h2><p className="mt-1 text-sm text-slate-500">Inspect its content, source evidence and immutable version history.</p></div> : detailBusy || !detail ? <p className="py-10 text-center text-sm text-slate-500">Loading question history…</p> : <>
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-blue-600">{detail.question.subject} · v{detail.question.current_version}</p><h2 className="mt-1 font-black">Question review</h2></div><button onClick={()=>{setSelected(null);setDetail(null);}} aria-label="Close review" className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17}/></button></div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><span className="text-slate-500">Review</span><p className="mt-1 font-bold">{detail.question.review_state}</p></div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><span className="text-slate-500">Provenance</span><p className="mt-1 font-bold">{detail.provenance?.provenance_status || 'missing'}</p></div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><span className="text-slate-500">Topic taxonomy</span><p className="mt-1 font-bold">{detail.question.topic_record?.verification_status || 'unknown'}</p></div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><span className="text-slate-500">Subtopic taxonomy</span><p className="mt-1 font-bold">{detail.question.subtopic_record?.verification_status || 'unknown'}</p></div>
              </div>
              <p className="text-sm font-semibold leading-relaxed">{detail.question.question}</p>
              <div className="space-y-2">{(['A','B','C','D'] as const).map(letter=><div key={letter} className={`rounded-lg border p-3 text-sm ${detail.question.answer.toUpperCase()===letter?'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30':''}`}><b className="mr-2">{letter}.</b>{detail.question[`option_${letter.toLowerCase()}` as 'option_a']}</div>)}</div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><p className="text-xs font-bold uppercase text-slate-500">Stored answer</p><p className="mt-1 font-black">{detail.question.answer}</p><p className="mt-2 text-xs font-bold uppercase text-slate-500">Explanation</p><p className="mt-1">{detail.question.explanation || 'No explanation supplied.'}</p></div>
              <div className="text-xs text-slate-500">Source label: {detail.provenance?.source_label || detail.question.source || 'Unknown'} · Topic: {detail.question.topic || 'Unmapped'} / {detail.question.subtopic || 'Unmapped'}</div>

              <section className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center gap-2"><Link2 size={15}/><h3 className="text-sm font-black">Source provenance</h3></div>
                <p className="mt-2 text-xs text-slate-500">A question can only be approved after its source has been checked against evidence. Legacy source labels alone are not proof.</p>
                <label className="mt-3 block text-xs font-bold">Source label</label><input value={provenanceForm.sourceLabel} onChange={e=>setProvenanceForm(p=>({...p,sourceLabel:e.target.value}))} className={fieldClass}/>
                <label className="mt-3 block text-xs font-bold">Source URL (HTTP/S)</label><input type="url" value={provenanceForm.sourceUrl} onChange={e=>setProvenanceForm(p=>({...p,sourceUrl:e.target.value}))} className={fieldClass} placeholder="https://…"/>
                <label className="mt-3 block text-xs font-bold">Source type</label><select value={provenanceForm.sourceType} onChange={e=>setProvenanceForm(p=>({...p,sourceType:e.target.value}))} className={fieldClass}>{['official_exam','publisher','contributor','ai_generated','other'].map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select>
                <label className="mt-3 block text-xs font-bold">Attribution</label><input value={provenanceForm.attribution} onChange={e=>setProvenanceForm(p=>({...p,attribution:e.target.value}))} className={fieldClass}/>
                <label className="mt-3 block text-xs font-bold">Evidence checked and verification note</label><textarea rows={3} value={provenanceForm.evidenceNote} onChange={e=>setProvenanceForm(p=>({...p,evidenceNote:e.target.value}))} className={fieldClass} placeholder="Describe exactly what you compared against the linked source."/>
                <label className="mt-3 flex items-start gap-2 text-xs"><input type="checkbox" checked={provenanceForm.verifiedAgainstEvidence} onChange={e=>setProvenanceForm(p=>({...p,verifiedAgainstEvidence:e.target.checked}))}/><span>I personally checked the cited source and evidence against this exact question version.</span></label>
                <button onClick={()=>void verifyProvenance()} disabled={busy||!provenanceForm.verifiedAgainstEvidence||!provenanceForm.sourceLabel.trim()||!provenanceForm.sourceUrl.trim()||provenanceForm.evidenceNote.trim().length<20||!provenanceForm.attribution.trim()} className="mt-3 w-full rounded-xl bg-blue-700 px-3 py-3 text-sm font-bold text-white disabled:opacity-40">Record source verification</button>
                {detail.provenance?.evidence?.verification_history && <p className="mt-2 text-[11px] text-slate-500">{detail.provenance.evidence.verification_history.length} recorded verification event(s); latest is bound to version {detail.provenance.evidence.verified_version}.</p>}
              </section>

              <section className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><History size={15}/><h3 className="text-sm font-black">Version history</h3></div><span className="text-xs text-slate-500">{detail.versions.length} version(s)</span></div>
                <div className="mt-2 space-y-2">{detail.versions.map(v=><div key={v.version_number} className="rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800"><div className="flex justify-between gap-2"><b>Version {v.version_number}</b><span>{v.review_state}</span></div><p className="mt-1 text-slate-500">{v.change_reason} · {new Date(v.created_at).toLocaleString()}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-400">{v.content_hash}</p></div>)}</div>
              </section>

              <section className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-black">Content correction</h3><button onClick={()=>setEditing(v=>!v)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold dark:border-slate-700"><Pencil size={13}/>{editing?'Close editor':'Edit question'}</button></div>
                {editing && <div className="mt-3 space-y-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">Saving creates a new immutable version, resets review to pending, and invalidates previous source verification.</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><div><label className="text-xs font-bold">JAMB subject slug</label><input value={draft.subjectSlug} onChange={e=>setDraftField('subjectSlug',e.target.value)} className={fieldClass}/></div><div><label className="text-xs font-bold">Year</label><input type="number" value={draft.year} onChange={e=>setDraftField('year',e.target.value)} className={fieldClass}/></div><div><label className="text-xs font-bold">Topic UUID</label><input value={draft.topicId} onChange={e=>setDraftField('topicId',e.target.value)} className={fieldClass}/></div><div><label className="text-xs font-bold">Subtopic UUID</label><input value={draft.subtopicId} onChange={e=>setDraftField('subtopicId',e.target.value)} className={fieldClass}/></div></div>
                  <label className="block text-xs font-bold">Question stem</label><textarea rows={4} value={draft.question} onChange={e=>setDraftField('question',e.target.value)} className={fieldClass}/>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{(['A','B','C','D'] as const).map(letter=><div key={letter}><label className="text-xs font-bold">Option {letter}</label><textarea rows={2} value={draft.options[letter]} onChange={e=>setDraft(v=>({...v,options:{...v.options,[letter]:e.target.value}}))} className={fieldClass}/></div>)}</div>
                  <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold">Correct answer</label><select value={draft.answer} onChange={e=>setDraftField('answer',e.target.value as Draft['answer'])} className={fieldClass}>{['A','B','C','D'].map(v=><option key={v}>{v}</option>)}</select></div><div><label className="text-xs font-bold">Difficulty</label><select value={draft.difficulty} onChange={e=>setDraftField('difficulty',e.target.value as Draft['difficulty'])} className={fieldClass}>{['easy','medium','hard'].map(v=><option key={v}>{v}</option>)}</select></div></div>
                  <label className="block text-xs font-bold">Explanation</label><textarea rows={4} value={draft.explanation} onChange={e=>setDraftField('explanation',e.target.value)} className={fieldClass}/>
                  <label className="block text-xs font-bold">Short explanation (optional)</label><textarea rows={2} value={draft.explanationShort} onChange={e=>setDraftField('explanationShort',e.target.value)} className={fieldClass}/>
                  <label className="block text-xs font-bold">Concept tags (comma-separated)</label><input value={draft.concepts} onChange={e=>setDraftField('concepts',e.target.value)} className={fieldClass}/>
                  <label className="block text-xs font-bold">Reason for change</label><textarea rows={2} value={changeReason} onChange={e=>setChangeReason(e.target.value)} className={fieldClass} placeholder="Explain why this question is being corrected."/>
                  <button onClick={()=>void saveVersion()} disabled={busy||changeReason.trim().length<5||!draft.subjectSlug||!draft.topicId||!draft.subtopicId} className="w-full rounded-xl bg-blue-700 px-3 py-3 text-sm font-bold text-white disabled:opacity-40">Save as new version</button>
                </div>}
              </section>

              <section className="border-t border-slate-200 pt-3 dark:border-slate-700">
                <label className="block text-xs font-bold">Reviewer comments</label><textarea rows={2} value={comments} onChange={e=>setComments(e.target.value)} className={fieldClass} placeholder="Record the reason for this decision…"/>
                <label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={qualityChecked} onChange={e=>setQualityChecked(e.target.checked)}/> I reviewed the question content</label>
                <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={answerChecked} onChange={e=>setAnswerChecked(e.target.checked)}/> I independently verified the answer key</label>
                <button disabled={busy||!qualityChecked||!answerChecked||detail.provenance?.provenance_status!=='verified'||detail.question.topic_record?.verification_status!=='verified'||detail.question.subtopic_record?.verification_status!=='verified'} onClick={()=>void review('approved')} className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-3 text-sm font-bold text-white disabled:opacity-40"><Check size={16}/> Approve verified question</button>
                <div className="mt-2 grid grid-cols-3 gap-2"><button disabled={busy} onClick={()=>void review('changes_requested')} className="rounded-xl border border-amber-300 px-2 py-2 text-xs font-bold text-amber-800 dark:border-amber-900 dark:text-amber-300">Request changes</button><button disabled={busy} onClick={()=>void review('rejected')} className="rounded-xl border border-red-200 px-2 py-2 text-xs font-bold text-red-700 dark:border-red-900 dark:text-red-300">Reject</button><button disabled={busy} onClick={()=>void review('retired')} className="rounded-xl border border-slate-200 px-2 py-2 text-xs font-bold dark:border-slate-700">Retire</button></div>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500"><LockKeyhole size={12}/> Database checks remain authoritative; the UI cannot override missing verification.</p>
              </section>
            </>}
          </aside>
        </section>}
        <p className="mt-8 text-xs text-slate-500">Restricted workspace. API role checks enforce content-manager/admin access. Imports remain dry-run only; publishing requires reviewed content, verified source evidence and verified syllabus mapping.</p>
      </div>
    </main>
  );
}
