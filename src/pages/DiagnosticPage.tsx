import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenCheck, Check, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MathText from '../components/MathText';
import { SEED_QUESTIONS } from '../data/questions';
import type { Question } from '../types';

const ONBOARDING_KEY = 'sabi_onboarding_preview_v1';

function getSelectedSubjects(): string[] {
  try {
    const answers = JSON.parse(localStorage.getItem(ONBOARDING_KEY) ?? '{}') as Record<string, unknown>;
    const subjects = answers.chosenSubjects;
    return Array.isArray(subjects) && subjects.length > 0 ? subjects as string[] : ['English Language'];
  } catch {
    return ['English Language'];
  }
}

export function DiagnosticPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const questions = useMemo<Question[]>(() => {
    const subjects = getSelectedSubjects();
    const matching = SEED_QUESTIONS.filter(question => subjects.includes(question.subject));
    return (matching.length ? matching : SEED_QUESTIONS).slice(0, 8);
  }, []);
  const question = questions[index];

  if (completed) {
    return (
      <main className="diagnostic-page">
        <div className="diagnostic-complete">
          <div className="complete-icon"><Check size={30} /></div>
          <span className="eyebrow">Preview step complete</span>
          <h1>Your diagnostic journey starts here.</h1>
          <p>This frontend preview does not calculate or save a mastery score. The real diagnostic will be connected to SABI’s learning services after the backend is implemented.</p>
          <button className="button button--primary" onClick={() => navigate('/home')}>Continue to SABI preview <ArrowRight size={17} /></button>
        </div>
      </main>
    );
  }

  if (!question) {
    return <main className="diagnostic-page"><div className="question-panel"><h1>Diagnostic content is unavailable</h1><p>There are no preview questions to display.</p><Link className="button button--secondary" to="/home">Return home</Link></div></main>;
  }

  const advance = () => {
    if (!selected) return;
    if (index + 1 >= questions.length) setCompleted(true);
    else {
      setIndex(current => current + 1);
      setSelected(null);
    }
  };

  return (
    <main className="diagnostic-page">
      <header className="flow-header">
        <Link className="brand-lockup brand-lockup--compact" to="/welcome"><img src="/icon.svg" alt="" /><span>SABI</span></Link>
        <span className="preview-pill">Diagnostic preview</span>
        <Link className="flow-exit" to="/home">Exit</Link>
      </header>
      <section className="diagnostic-content">
        <Link className="back-link" to="/onboarding/15"><ArrowLeft size={16} /> Back to profile setup</Link>
        <div className="diagnostic-heading"><span className="eyebrow">JAMB diagnostic</span><h1>Let’s understand what you know.</h1><p>This is a short interface preview, not a full or scored diagnostic.</p></div>
        <div className="diagnostic-progress"><div className="progress-track"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><span>Preview question {index + 1} of {questions.length}</span></div>
        <article className="question-panel diagnostic-question">
          <div className="question-meta"><span>{question.subject}</span><span>{question.topic}</span></div>
          <h2><MathText text={question.question} /></h2>
          <div className="diagnostic-options">
            {(['A', 'B', 'C', 'D'] as const).map(key => (
              <button type="button" key={key} aria-pressed={selected === key} className={`diagnostic-option${selected === key ? ' is-selected' : ''}`} onClick={() => setSelected(key)}>
                <span className="option-key">{key}</span><span><MathText text={question.options[key]} /></span>{selected === key && <Check size={17} />}
              </button>
            ))}
          </div>
          {selected && <div className="diagnostic-feedback"><Info size={17} /><span>In the real experience, answer feedback and learning events will come from the backend. This preview will not calculate mastery.</span></div>}
          <div className="diagnostic-actions"><button className="button button--secondary" disabled={index === 0} onClick={() => { setIndex(current => Math.max(0, current - 1)); setSelected(null); }}>Previous</button><button className="button button--primary" disabled={!selected} onClick={advance}>{index === questions.length - 1 ? 'Finish preview' : 'Next question'} <ArrowRight size={17} /></button></div>
        </article>
        <p className="prototype-disclaimer"><BookOpenCheck size={14} /> Sample questions only. No score or mastery estimate is generated.</p>
      </section>
    </main>
  );
}
