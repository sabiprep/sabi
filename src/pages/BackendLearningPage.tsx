import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Clock3, Flag, LoaderCircle, RefreshCw, Target } from 'lucide-react';
import MathText from '../components/MathText';
import { apiFetch, apiPostJson, describeApiFailure } from '../utils/apiClient';

type Mode = 'diagnostic' | 'smart_practice' | 'blitz' | 'cbt' | 'custom';
type LearningQuestion = {
  id: string; position: number; subject: string; topic: string; subtopic?: string | null;
  year?: number | null; question: string; options: Record<'A'|'B'|'C'|'D', string>;
  answerState?: { selectedOption: string; isCorrect?: boolean; correctOption?: string; explanation?: string; elapsedMs?: number; answeredAt?: string } | null;
  markedForReview?: boolean;
};
type LearningSession = {
  id: string; mode: Mode; subject: string | null; status: string;
  total_questions: number; answered_count: number; correct_count: number;
  started_at: string; completed_at?: string | null; metadata?: { examConfiguration?: { expiresAt?: string } };
};
const MODE_LABELS: Record<Mode,string> = {
  diagnostic: 'Diagnostic', smart_practice: 'Smart Practice', blitz: 'Blitz', cbt: 'CBT Simulator', custom: 'Custom Practice'
};

export function BackendLearningPage() {
  const [params] = useSearchParams();
  const initialMode = (params.get('mode') || 'diagnostic') as Mode;
  const [mode,setMode] = useState<Mode>(MODE_LABELS[initialMode] ? initialMode : 'diagnostic');
  const [subject,setSubject] = useState(params.get('subject') || 'Use of English');
  const [subjects] = useState<string[]>(() => (params.get('subjects') || '').split(',').map((value) => value.trim()).filter(Boolean).slice(0, 4));
  const [topic,setTopic] = useState(params.get('topic') || '');
  const [subtopic,setSubtopic] = useState(params.get('subtopic') || '');
  const [difficulty,setDifficulty] = useState(params.get('difficulty') || '');
  const [year,setYear] = useState(params.get('year') || '');
  const [limit,setLimit] = useState(() => {
    const requested = Number(params.get('limit') || 20);
    return Number.isInteger(requested) ? Math.max(1, Math.min(180, requested)) : 20;
  });
  const questionStartedAt = useRef(Date.now());
  const [configurationKey,setConfigurationKey] = useState<'quick-mock'|'full-mock'>(() => params.get('configuration') === 'full-mock' ? 'full-mock' : 'quick-mock');
  const [session,setSession] = useState<LearningSession|null>(null);
  const [questions,setQuestions] = useState<LearningQuestion[]>([]);
  const [index,setIndex] = useState(0);
  const [choice,setChoice] = useState<'A'|'B'|'C'|'D'|null>(null);
  const [answerResult,setAnswerResult] = useState<any>(null);
  const [aiExplanation,setAiExplanation] = useState<any>(null);
  const [aiLoading,setAiLoading] = useState(false);
  const [postExamAI,setPostExamAI] = useState<Record<string,any>>({});
  const [postExamBusyId,setPostExamBusyId] = useState<string|null>(null);
  const [cbtRemainingSeconds,setCbtRemainingSeconds] = useState<number|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [history,setHistory] = useState<any[]>([]);
  const [mastery,setMastery] = useState<any[]>([]);
  const [recommendations,setRecommendations] = useState<any>(null);

  const current = questions[index];
  const completed = Boolean(session && session.status === 'completed');
  const accuracy = session?.answered_count ? Math.round((session.correct_count/session.answered_count)*100) : 0;

  useEffect(()=>{
    if(!session||session.mode!=='cbt'||session.status!=='in_progress') {setCbtRemainingSeconds(null);return;}
    const expiresAt=session.metadata?.examConfiguration?.expiresAt;
    if(!expiresAt) {setCbtRemainingSeconds(null);return;}
    let expiryRefreshStarted=false;
    const updateRemaining=()=>{
      const remaining=Math.max(0,Math.ceil((Date.parse(expiresAt)-Date.now())/1000));
      setCbtRemainingSeconds(remaining);
      if(remaining===0&&!expiryRefreshStarted){
        expiryRefreshStarted=true;
        apiFetch('/api/learning/sessions/'+session.id).then(async response=>{
          if(!response.ok)return;
          const data=await response.json();
          setSession(data.session||session);
          setQuestions(data.questions||[]);
          setIndex(0);setChoice(null);setAnswerResult(null);
        }).catch(()=>undefined);
      }
    };
    updateRemaining();
    const timer=window.setInterval(updateRemaining,1000);
    return ()=>window.clearInterval(timer);
  },[session?.id,session?.mode,session?.status,session?.metadata?.examConfiguration?.expiresAt]);

  const loadOverview = useCallback(async () => {
    const [p,r] = await Promise.all([apiFetch('/api/learning/progress'),apiFetch('/api/learning/recommendations')]);
    if(p.ok){const d=await p.json();setHistory(d.recentSessions||[]);setMastery(d.mastery||[]);}
    if(r.ok)setRecommendations(await r.json());
  },[]);
  useEffect(()=>{void loadOverview();},[loadOverview]);

  const start = async () => {
    setLoading(true);setError('');setSession(null);setQuestions([]);setIndex(0);setChoice(null);setAnswerResult(null);
    questionStartedAt.current=Date.now();
    const payload:any={mode,limit,metadata:{source:'unified-learning-ui'}};
    if(mode==='cbt'){payload.configurationKey=configurationKey;}
    else if(mode==='diagnostic' && subjects.length){payload.subjects=subjects;}
    else if((mode==='diagnostic'||mode==='custom') && subject.trim()){payload.subject=subject.trim();}
    if(topic.trim())payload.topic=topic.trim();
    if(subtopic.trim())payload.subtopic=subtopic.trim();
    if(difficulty)payload.difficulty=difficulty;
    if(year.trim()&&Number.isInteger(Number(year)))payload.year=Number(year);
    const result=await apiPostJson('/api/learning/sessions',payload);
    setLoading(false);
    if(!result.ok){setError(describeApiFailure(result,'Could not start this learning session.'));return;}
    setSession(result.data?.session||null);setQuestions(result.data?.questions||[]);
    if(!result.data?.session||!Array.isArray(result.data?.questions)){setError('The learning API returned an unexpected session response.');return;}
    await loadOverview();
  };

  const submit = async () => {
    if(!session||!current||!choice||loading)return;
    setLoading(true);setError('');
    const result=await apiPostJson(`/api/learning/sessions/${session.id}/answers`,{
      questionId:current.id,selectedOption:choice,elapsedMs:Math.max(0,Math.min(3600000,Date.now()-questionStartedAt.current))
    });
    if(!result.ok){setLoading(false);setError(describeApiFailure(result,'Your answer was not saved.'));return;}
    const fresh=await apiFetch(`/api/learning/sessions/${session.id}`);
    if(fresh.ok){
      const data=await fresh.json();
      const updated=(data.questions||[]).find((q:LearningQuestion)=>q.id===current.id);
      setAnswerResult(updated?.answerState||result.data?.result||{});
      setSession(data.session||session);
      setQuestions(data.questions||questions);
    } else {
      setAnswerResult(result.data?.result||{});
    }
    setLoading(false);await loadOverview();
  };

  const requestAIExplanation = async () => {
    if(!session||!current||aiLoading)return;
    setAiLoading(true);setAiExplanation(null);
    const result=await apiPostJson('/api/ai/explanations',{sessionId:session.id,questionId:current.id,preference:'detailed',language:'english'});
    setAiLoading(false);
    if(!result.ok){setAiExplanation({aiAvailable:false,message:describeApiFailure(result,'AI explanation is temporarily unavailable.')});return;}
    setAiExplanation(result.data||{aiAvailable:false,message:'No explanation was returned.'});
  };

  const requestPostExamExplanation = async (questionId:string) => {
    if(!session||postExamBusyId)return;
    setPostExamBusyId(questionId);
    const result=await apiPostJson('/api/ai/explanations',{sessionId:session.id,questionId,preference:'detailed',language:'english'});
    setPostExamBusyId(null);
    setPostExamAI(previous=>({...previous,[questionId]:result.ok?(result.data||{aiAvailable:false}):{aiAvailable:false,message:describeApiFailure(result,'AI explanation is temporarily unavailable.')}}));
  };

  const grantAIConsentAndExplain = async () => {
    const consent=await apiPostJson('/api/ai/consent',{granted:true});
    if(!consent.ok){setAiExplanation({aiAvailable:false,message:describeApiFailure(consent,'Could not save your AI preference.')});return;}
    await requestAIExplanation();
  };

  const grantAIConsentAndExplainPostExam = async (questionId:string) => {
    const consent=await apiPostJson('/api/ai/consent',{granted:true});
    if(!consent.ok){setPostExamAI(previous=>({...previous,[questionId]:{aiAvailable:false,message:describeApiFailure(consent,'Could not save your AI preference.')}}));return;}
    await requestPostExamExplanation(questionId);
  };

  const next = async () => {
    if(index < questions.length - 1) {
      questionStartedAt.current=Date.now();
      setIndex(v=>Math.min(v+1,questions.length-1));
      setChoice(null);setAnswerResult(null);setAiExplanation(null);
      return;
    }
    if(!session || !['smart_practice','blitz'].includes(session.mode)) return;
    setLoading(true);setError('');
    const result=await apiPostJson(`/api/learning/sessions/${session.id}/next`,{});
    if(!result.ok) {
      setLoading(false);
      setError(describeApiFailure(result,'Could not load your next personalized question.'));
      return;
    }
    if(result.data?.completed) {
      const response=await apiFetch(`/api/learning/sessions/${session.id}`);
      if(response.ok) {
        const data=await response.json();
        setSession(data.session||result.data.session);
        setQuestions(data.questions||questions);
      } else setSession(result.data.session||{...session,status:'completed'});
      setLoading(false);await loadOverview();
      return;
    }
    if(!result.data?.question) {
      setLoading(false);setError('The learning service did not return a question. Please retry.');
      return;
    }
    setQuestions(previous=>[...previous,result.data.question]);
    setSession(result.data.session||session);
    questionStartedAt.current=Date.now();
    setIndex(questions.length);
    setChoice(null);setAnswerResult(null);setAiExplanation(null);
    setLoading(false);
  };

  const toggleReviewFlag = async () => {
    if(!session||session.mode!=='cbt'||!current||loading)return;
    setLoading(true);setError('');
    try {
      const response=await apiFetch(`/api/learning/sessions/${session.id}/questions/${current.id}/flag`,{
        method:'PATCH',
        body:JSON.stringify({markedForReview:!current.markedForReview}),
      });
      const data=await response.json().catch(()=>null);
      if(!response.ok) {
        setError(data?.error||'Could not update the review flag.');
        setLoading(false);return;
      }
      setQuestions(previous=>previous.map((question)=>question.id===current.id
        ? {...question,markedForReview:Boolean(data?.markedForReview)} : question));
    } catch {
      setError('The SABI API could not be reached. Your review flag was not changed.');
    }
    setLoading(false);
  };

  const submitSession = async () => {
    if(!session||loading)return;
    const confirmed=window.confirm(session.mode==='cbt'
      ? 'Submit this CBT now? Unanswered questions will remain unanswered.'
      : 'Finish this practice session now?');
    if(!confirmed)return;
    setLoading(true);setError('');
    const result=await apiPostJson(`/api/learning/sessions/${session.id}/submit`,{});
    if(!result.ok) {
      setLoading(false);setError(describeApiFailure(result,'Could not submit this session.'));
      return;
    }
    const response=await apiFetch(`/api/learning/sessions/${session.id}`);
    if(response.ok) {
      const data=await response.json();
      setSession(data.session||result.data?.session);
      setQuestions(data.questions||questions);
    } else setSession(result.data?.session||{...session,status:'completed'});
    setChoice(null);setAnswerResult(null);setAiExplanation(null);
    setLoading(false);await loadOverview();
  };

  const goToQuestion = (questionIndex:number) => {
    if(questionIndex<0||questionIndex>=questions.length)return;
    questionStartedAt.current=Date.now();
    setIndex(questionIndex);setChoice(null);setAnswerResult(null);setAiExplanation(null);
  };
  const resume = async (id:string) => {
    setLoading(true);setError('');
    const response=await apiFetch(`/api/learning/sessions/${id}`);
    if(!response.ok){setLoading(false);setError('Could not resume this session.');return;}
    const data=await response.json();questionStartedAt.current=Date.now();setSession(data.session);setQuestions(data.questions||[]);
    const firstUnanswered=(data.questions||[]).findIndex((q:LearningQuestion)=>!q.answerState);
    setIndex(firstUnanswered<0?Math.max(0,(data.questions||[]).length-1):firstUnanswered);
    setChoice(null);setAnswerResult(null);setLoading(false);
  };

  const startAnother = () => {setSession(null);setQuestions([]);setIndex(0);setChoice(null);setAnswerResult(null);setAiExplanation(null);setPostExamAI({});setError('');void loadOverview();};
  const subjectOptions = useMemo(()=>['Use of English','Mathematics','Physics','Chemistry'],[]);

  return <main className="min-h-screen bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100">
    <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#080D1A]/95 backdrop-blur px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <Link to="/home" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"><ArrowLeft size={17}/> Dashboard</Link>
        <div className="flex items-center gap-2 font-black text-blue-700 dark:text-blue-300"><BookOpenCheck size={19}/> SABI LEARNING</div>
        <button onClick={()=>void loadOverview()} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700" aria-label="Refresh progress"><RefreshCw size={16}/></button>
      </div>
    </header>
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
      <section className="space-y-2"><span className="text-xs uppercase tracking-widest font-black text-blue-600">Real learning services</span><h1 className="text-3xl font-black">Learn. Practise. Improve.</h1><p className="text-sm text-slate-500 dark:text-slate-400">Questions, answer checks, attempts, mastery and review schedules are saved through your authenticated SABI account.</p></section>
      {error&&<div role="alert" className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-sm">{error}</div>}
      {!session&&<section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-5">
        <div className="flex items-center gap-2"><Target className="text-blue-600"/><h2 className="text-lg font-black">Start a learning session</h2></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold space-y-2">Learning mode<select value={mode} onChange={e=>setMode(e.target.value as Mode)} className="w-full rounded-xl border p-3 bg-transparent text-sm"><option value="diagnostic">Diagnostic</option><option value="smart_practice">Smart Practice</option><option value="blitz">Blitz</option><option value="cbt">CBT Simulator</option><option value="custom">Custom Practice</option></select></label>
          {mode==='cbt'?<label className="text-xs font-bold space-y-2">CBT format<select value={configurationKey} onChange={e=>setConfigurationKey(e.target.value as any)} className="w-full rounded-xl border p-3 bg-transparent text-sm"><option value="quick-mock">Quick Mock</option><option value="full-mock">Full UTME Mock</option></select></label>:subjects.length?<label className="text-xs font-bold space-y-2">Subjects<input readOnly value={subjects.join(', ')} className="w-full rounded-xl border p-3 bg-slate-50 dark:bg-slate-800 text-sm"/></label>:(mode==='diagnostic'||mode==='custom')&&<label className="text-xs font-bold space-y-2">Subject<select value={subject} onChange={e=>setSubject(e.target.value)} className="w-full rounded-xl border p-3 bg-transparent text-sm">{subjectOptions.map(s=><option key={s}>{s}</option>)}</select></label>}
          {(mode==='diagnostic'||mode==='custom')&&<label className="text-xs font-bold space-y-2">Question count<select value={limit} onChange={e=>setLimit(Number(e.target.value))} className="w-full rounded-xl border p-3 bg-transparent text-sm"><option value={10}>10 questions</option><option value={15}>15 questions</option><option value={20}>20 questions</option><option value={40}>40 questions</option><option value={60}>60 questions</option></select></label>}
          {mode==='custom'&&<>
            <label className="text-xs font-bold space-y-2">Topic (optional)<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Algebra" className="w-full rounded-xl border p-3 bg-transparent text-sm"/></label>
            <label className="text-xs font-bold space-y-2">Subtopic (optional)<input value={subtopic} onChange={e=>setSubtopic(e.target.value)} placeholder="e.g. Quadratic equations" className="w-full rounded-xl border p-3 bg-transparent text-sm"/></label>
            <label className="text-xs font-bold space-y-2">Difficulty (optional)<select value={difficulty} onChange={e=>setDifficulty(e.target.value)} className="w-full rounded-xl border p-3 bg-transparent text-sm"><option value="">Any approved difficulty</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
            <label className="text-xs font-bold space-y-2">Question year (optional)<input type="number" min="1990" max="2100" value={year} onChange={e=>setYear(e.target.value)} placeholder="e.g. 2024" className="w-full rounded-xl border p-3 bg-transparent text-sm"/></label>
          </>}
        </div>
        <button disabled={loading} onClick={()=>void start()} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm disabled:opacity-60 inline-flex items-center gap-2">{loading?<LoaderCircle className="animate-spin" size={17}/>:<ArrowRight size={17}/>}Start {MODE_LABELS[mode]}</button>
        <p className="text-xs text-slate-500">Only reviewer-approved, published UTME questions with verified sources and permitted student-practice rights are served. If the eligible pool is too small, SABI blocks the session rather than serving unreviewed or uncleared content.</p>
      </section>}
      {session&&current&&!completed&&<section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap justify-between gap-3"><div><span className="text-xs font-black uppercase tracking-wider text-blue-600">{MODE_LABELS[session.mode]}</span><h2 className="text-lg font-black">{current.subject} · {current.topic}</h2></div><span className="text-xs font-bold text-slate-500">{['smart_practice','blitz'].includes(session.mode)?<>Question {index+1} · {session.answered_count} answered</>:<>Question {index+1} of {session.total_questions}</>}{session.mode==='cbt'&&cbtRemainingSeconds!==null&&<span> · {Math.floor(cbtRemainingSeconds/60)}:{String(cbtRemainingSeconds%60).padStart(2,'0')} remaining</span>}</span></div>
        {!['smart_practice','blitz'].includes(session.mode)&&<div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-blue-600" style={{width:`${Math.min(100,((index+1)/Math.max(1,session.total_questions))*100)}%`}}/></div>}
        {session.mode==='cbt'&&<div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-500">Question navigator · {questions.filter(q=>q.answerState).length} answered · {questions.filter(q=>q.markedForReview).length} flagged</p>
            <button onClick={()=>void toggleReviewFlag()} disabled={loading} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black ${current.markedForReview?'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200':'border-slate-200 dark:border-slate-700'}`}><Flag size={14}/>{current.markedForReview?'Remove review flag':'Mark for review'}</button>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">{questions.map((question,questionIndex)=><button key={question.id} type="button" onClick={()=>goToQuestion(questionIndex)} aria-label={`Go to question ${questionIndex+1}${question.answerState?' answered':''}${question.markedForReview?' flagged for review':''}`} className={`h-10 rounded-lg border text-xs font-black ${questionIndex===index?'border-blue-600 bg-blue-600 text-white':question.markedForReview?'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200':question.answerState?'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200':'border-slate-200 dark:border-slate-700'}`}>{questionIndex+1}</button>)}</div>
        </div>}
        <div className="text-lg sm:text-xl font-bold leading-relaxed"><MathText text={current.question}/></div>
        <div className="grid gap-3">{(['A','B','C','D'] as const).map(key=><button key={key} disabled={Boolean(answerResult)||Boolean(current.answerState)||loading} onClick={()=>setChoice(key)} className={`text-left p-4 rounded-xl border flex gap-3 items-start ${(choice===key||current.answerState?.selectedOption===key)?'border-blue-500 bg-blue-50 dark:bg-blue-950/40':'border-slate-200 dark:border-slate-700'}`}><span className="font-black">{key}.</span><span><MathText text={current.options[key]||''}/></span></button>)}</div>
        {(answerResult||current.answerState)&&<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2"><div className="font-black flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600"/>Answer recorded by SABI</div>{session.mode==='cbt'&&!completed?<p className="text-sm">Your response has been recorded. Correct answers and feedback will be available after the exam.</p>:<><p className="text-sm">{(answerResult||current.answerState).isCorrect?'Correct answer.':'Answer saved. Review the correct option and explanation below.'} Correct option: {(answerResult||current.answerState).correctOption||'Recorded'}</p>{(answerResult||current.answerState).explanation&&<p className="text-sm text-slate-600 dark:text-slate-300"><MathText text={(answerResult||current.answerState).explanation}/></p>}</>}{session.mode!=='cbt'&&<button disabled={aiLoading} onClick={()=>void requestAIExplanation()} className="mt-2 px-4 py-2 rounded-lg border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-800 text-sm font-black disabled:opacity-60">{aiLoading?'Preparing explanation…':'Explain this answer with Sabi AI'}</button>}{aiExplanation?.aiAvailable&&<div className="mt-3 border-t pt-3 text-sm leading-relaxed"><b className="block mb-2">Sabi AI explanation</b><MathText text={aiExplanation.explanation}/></div>}{aiExplanation?.reason==='AI_CONSENT_REQUIRED'&&<div className="mt-3 space-y-2"><p className="text-xs text-slate-500">If you enable AI, Sabi will send this question and your selected answer to the configured AI provider to prepare a tutoring explanation. This does not change your score. You can revoke consent later.</p><button onClick={()=>void grantAIConsentAndExplain()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-black">Agree and enable AI explanations</button></div>}{aiExplanation&&!aiExplanation.aiAvailable&&aiExplanation.reason!=='AI_CONSENT_REQUIRED'&&<p role="status" className="mt-2 text-xs text-slate-500">{aiExplanation.storedExplanation?'AI is currently unavailable. The approved explanation above is still available.':(aiExplanation.message||'AI explanations are not configured yet.')}</p>}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={startAnother} className="px-4 py-3 rounded-xl border font-bold text-sm">Exit session</button>
          <div className="flex flex-wrap gap-2">
            {session.mode==='cbt'&&<button disabled={loading} onClick={()=>void submitSession()} className="px-4 py-3 rounded-xl border border-amber-300 text-amber-800 dark:text-amber-200 font-black text-sm disabled:opacity-50">Submit CBT</button>}
            {['smart_practice','blitz'].includes(session.mode)&&<button disabled={loading} onClick={()=>void submitSession()} className="px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm disabled:opacity-50">Finish practice</button>}
            {!answerResult&&!current.answerState?<button disabled={!choice||loading} onClick={()=>void submit()} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm disabled:opacity-50">{loading?'Saving…':'Submit answer'}</button>:index<questions.length-1?<button disabled={loading} onClick={()=>void next()} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm disabled:opacity-50">Next question <ArrowRight size={16} className="inline"/></button>:['smart_practice','blitz'].includes(session.mode)?<button disabled={loading} onClick={()=>void next()} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm disabled:opacity-50">{loading?'Finding question…':'Next personalized question'} <ArrowRight size={16} className="inline"/></button>:session.mode==='cbt'?<button disabled={loading} onClick={()=>void submitSession()} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm disabled:opacity-50">Submit CBT</button>:<button onClick={()=>void resume(session.id)} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm">Refresh final result</button>}
          </div>
        </div>
      </section>}
      {session&&completed&&<section className="rounded-3xl border border-emerald-200 bg-white dark:bg-slate-900 p-6 space-y-4"><CheckCircle2 size={32} className="text-emerald-600"/><h2 className="text-2xl font-black">Session completed</h2><p className="text-lg font-bold">{session.correct_count} / {session.total_questions} correct · {accuracy}% accuracy</p><p className="text-sm text-slate-500">Your answers and topic mastery have been saved to your SABI account. Review your responses below and request an AI explanation whenever you need one.</p><div className="space-y-3">{questions.map((q,i)=><details key={q.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"><summary className="cursor-pointer font-bold text-sm">Question {i+1} · {q.subject} · {q.topic} · {q.answerState ? (q.answerState.isCorrect?'Correct':'Incorrect') : 'Unanswered'}{q.markedForReview?' · Flagged for review':''}</summary><div className="pt-3 space-y-3"><div className="text-sm leading-relaxed"><MathText text={q.question}/></div><p className="text-sm">Your answer: <b>{q.answerState?.selectedOption||'Not answered'}</b> · Correct option: <b>{q.answerState?.correctOption||'—'}</b></p>{q.answerState?.explanation&&<div className="text-sm text-slate-600 dark:text-slate-300"><MathText text={q.answerState.explanation}/></div>}<button disabled={postExamBusyId===q.id} onClick={()=>void requestPostExamExplanation(q.id)} className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-800 text-sm font-black disabled:opacity-60">{postExamBusyId===q.id?'Preparing explanation…':'Explain this answer with Sabi AI'}</button>{postExamAI[q.id]?.aiAvailable&&<div className="border-t pt-3 text-sm leading-relaxed"><b className="block mb-2">Sabi AI explanation</b><MathText text={postExamAI[q.id].explanation}/></div>}{postExamAI[q.id]?.reason==='AI_CONSENT_REQUIRED'&&<div className="space-y-2"><p className="text-xs text-slate-500">AI will process this question and your selected answer to prepare a tutoring explanation. Your exam score will not change.</p><button onClick={()=>void grantAIConsentAndExplainPostExam(q.id)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-black">Agree and enable AI explanations</button></div>}{postExamAI[q.id]&&!postExamAI[q.id].aiAvailable&&postExamAI[q.id].reason!=='AI_CONSENT_REQUIRED'&&<p role="status" className="text-xs text-slate-500">{postExamAI[q.id].storedExplanation?'AI is currently unavailable. The approved explanation remains available above.':(postExamAI[q.id].message||'AI explanations are not configured yet.')}</p>}</div></details>)}</div>{(session.mode==='smart_practice'||session.mode==='blitz')&&<div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30"><h3 className="font-black text-blue-900 dark:text-blue-200">Ready to keep learning?</h3><p className="mt-1 text-sm text-blue-800 dark:text-blue-300">Your answers have updated your learning evidence. Continue to start a fresh adaptive session using your latest progress and recommendations.</p><button onClick={()=>{setSession(null);setQuestions([]);setIndex(0);setChoice(null);setAnswerResult(null);setAiExplanation(null);setPostExamAI({});setError('');void start();}} className="mt-3 px-5 py-3 rounded-xl bg-blue-600 text-white font-black">Continue with updated recommendations</button></div>}<button onClick={startAnother} className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-black">Start another session</button></section>}
      <section className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"><h3 className="font-black mb-3">Your topic mastery</h3>{mastery.length?mastery.slice(0,6).map((m,i)=><div key={i} className="py-2 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 text-sm"><span>{m.subject} · {m.topic}</span><b>{m.mastery_score}%</b></div>):<p className="text-sm text-slate-500">Complete a session to establish mastery data.</p>}</div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"><h3 className="font-black mb-3">Recent learning sessions</h3>{history.length?history.slice(0,6).map((h:any)=><button key={h.id} onClick={()=>void resume(h.id)} className="w-full py-2 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 text-left text-sm"><span>{MODE_LABELS[h.mode as Mode]||h.mode} · {h.answered_count}/{h.total_questions}</span><span className="text-blue-600 font-bold">{h.status==='completed'?'View':'Resume'}</span></button>):<p className="text-sm text-slate-500">No saved sessions yet.</p>}</div>
      </section>
      {recommendations?.nextAction&&<p className="text-xs text-slate-500">Next recommended action: {recommendations.nextAction.type==='diagnostic'?'Complete a diagnostic':`${recommendations.nextAction.type} · ${recommendations.nextAction.subject||''} ${recommendations.nextAction.topic||''}`}</p>}
    </div>
  </main>;
}
