import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ONBOARDING_QUESTIONS, SUBJECTS_POOL } from '../data/onboardingQuestions';
import type { SubjectName } from '../types';

const STORAGE_KEY = 'sabi_onboarding_preview_v1';
const CLASS_OPTIONS = ['SS2', 'SS3', 'Out-of-school candidate / resitter'];
const ATTEMPT_OPTIONS = ['0', '1', '2 or more'];

type Answers = Record<string, string | string[] | Record<string, number>>;

function readAnswers(): Answers {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as Answers : {};
  } catch {
    return {};
  }
}

export function OnboardingPage() {
  const { step } = useParams();
  const navigate = useNavigate();
  const stepNumber = Number(step);
  const validStep = Number.isInteger(stepNumber) && stepNumber >= 1 && stepNumber <= ONBOARDING_QUESTIONS.length;
  const question = ONBOARDING_QUESTIONS[Math.min(Math.max(stepNumber, 1), ONBOARDING_QUESTIONS.length) - 1];
  const [answers, setAnswers] = useState<Answers>(readAnswers);
  const [storageWarning, setStorageWarning] = useState(false);
  const selectedSubjects = (answers.chosenSubjects as string[] | undefined) ?? ['English Language'];
  const confidence = (answers.subjectConfidence as Record<string, number> | undefined) ?? {};

  useEffect(() => {
    if (!validStep) navigate('/onboarding/1', { replace: true });
  }, [navigate, validStep]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [answers]);

  const setAnswer = (key: string, value: Answers[string]) => setAnswers(previous => ({ ...previous, [key]: value }));

  const toggleSubject = (subject: SubjectName) => {
    if (subject === 'English Language') return;
    setAnswers(previous => {
      const previousSubjects = Array.isArray(previous.chosenSubjects)
        ? previous.chosenSubjects as string[]
        : ['English Language'];
      const selected = previousSubjects.includes(subject);
      const updated = selected
        ? previousSubjects.filter(item => item !== subject)
        : previousSubjects.length < 4 ? [...previousSubjects, subject] : previousSubjects;
      return { ...previous, chosenSubjects: ['English Language', ...updated.filter(item => item !== 'English Language')] };
    });
  };

  const canContinue = useMemo(() => {
    switch (question.id) {
      case 1: return Boolean(answers.name);
      case 2: return selectedSubjects.length === 4;
      case 3: return Boolean(answers.currentClass && answers.attempts);
      case 4: return Boolean(answers.targetCourse && answers.targetUniversity);
      case 5: return Boolean(answers.monthsUntilExam);
      case 6: return selectedSubjects.every(subject => confidence[subject] >= 1);
      case 7: return selectedSubjects.includes(String(answers.prioritySubject));
      case 8: return Boolean(answers.struggleType);
      case 9: return true;
      case 10:
      case 11:
      case 12:
      case 13:
      case 14: return Boolean(answers[question.fieldName]);
      case 15: return Boolean(answers.motivation);
      default: return false;
    }
  }, [answers, confidence, question, selectedSubjects]);

  const goNext = () => {
    if (!canContinue) return;
    if (question.id === 15) navigate('/diagnostic');
    else navigate(`/onboarding/${question.id + 1}`);
  };

  if (!validStep) return null;

  return (
    <main className="onboarding-page">
      <header className="flow-header">
        <Link className="brand-lockup brand-lockup--compact" to="/welcome"><img src="/icon.svg" alt="" /><span>SABI</span></Link>
        <span className="preview-pill">Frontend preview</span>
        <Link className="flow-exit" to="/welcome">Exit setup</Link>
      </header>
      <section className="onboarding-content">
        <div className="onboarding-progress-head">
          <div><span className="eyebrow">Your JAMB profile</span><h1>Let’s get to know you.</h1></div>
          <span className="step-count">STEP {question.id} <span>OF 15</span></span>
        </div>
        <div className="progress-track" role="progressbar" aria-valuenow={question.id} aria-valuemin={1} aria-valuemax={15}>
          <span style={{ width: `${(question.id / 15) * 100}%` }} />
        </div>
        <div className="question-panel">
          <h2>{question.question}</h2>
          <p>{question.subtext}</p>
          {storageWarning && <div className="inline-warning">Your browser could not save this preview progress. Keep this tab open to continue.</div>}
          <div className="onboarding-inputs">
            {question.id === 1 && (
              <label className="field-label">Full name<input className="text-field" autoComplete="name" value={String(answers.name ?? '')} placeholder={question.placeholder} onChange={event => setAnswer('name', event.target.value)} /></label>
            )}
            {question.id === 2 && (
              <div>
                <div className="choice-caption">English Language is compulsory. Choose exactly 3 more.</div>
                <div className="subject-choice-grid">
                  {SUBJECTS_POOL.map(({ name, category }) => {
                    const checked = selectedSubjects.includes(name);
                    const disabled = name !== 'English Language' && !checked && selectedSubjects.length >= 4;
                    return (
                      <button key={name} type="button" aria-pressed={checked} disabled={disabled || name === 'English Language'} className={`subject-choice${checked ? ' is-selected' : ''}`} onClick={() => toggleSubject(name)}>
                        <span className="choice-check">{checked && <Check size={14} />}</span><span>{name}</span>
                        {name === 'English Language' ? <small>LOCKED</small> : <small>{category}</small>}
                      </button>
                    );
                  })}
                </div>
                <div className="choice-caption">{selectedSubjects.length}/4 subjects selected</div>
              </div>
            )}
            {question.id === 3 && (
              <div className="field-grid">
                <label className="field-label">Current class
                  <select className="text-field" value={String(answers.currentClass ?? '')} onChange={event => setAnswer('currentClass', event.target.value)}>
                    <option value="">Choose your current class</option>{CLASS_OPTIONS.map(option => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label className="field-label">Previous JAMB attempts
                  <select className="text-field" value={String(answers.attempts ?? '')} onChange={event => setAnswer('attempts', event.target.value)}>
                    <option value="">Choose an option</option>{ATTEMPT_OPTIONS.map(option => <option key={option}>{option}</option>)}
                  </select>
                </label>
              </div>
            )}
            {question.id === 4 && (
              <div className="field-grid">
                <label className="field-label">Target course<input className="text-field" value={String(answers.targetCourse ?? '')} placeholder="e.g. Medicine and Surgery" onChange={event => setAnswer('targetCourse', event.target.value)} /></label>
                <label className="field-label">Goal university<input className="text-field" value={String(answers.targetUniversity ?? '')} placeholder="e.g. University of Lagos" onChange={event => setAnswer('targetUniversity', event.target.value)} /></label>
              </div>
            )}
            {question.id === 5 && <ChoiceList field="monthsUntilExam" options={question.options ?? []} value={String(answers.monthsUntilExam ?? '')} onChange={setAnswer} />}
            {question.id === 6 && (
              <div className="confidence-list">
                {selectedSubjects.map(subject => (
                  <div className="confidence-row" key={subject}><span>{subject}</span><div className="rating-options" aria-label={`Confidence for ${subject}`}>
                    {[1, 2, 3, 4, 5].map(rating => <button type="button" key={rating} aria-pressed={confidence[subject] === rating} className={confidence[subject] === rating ? 'is-selected' : ''} onClick={() => setAnswer('subjectConfidence', { ...confidence, [subject]: rating })}>{rating}</button>)}
                  </div></div>
                ))}
                <div className="choice-caption">1 = not confident yet · 5 = very confident</div>
              </div>
            )}
            {question.id === 7 && <ChoiceList field="prioritySubject" options={selectedSubjects} value={String(answers.prioritySubject ?? '')} onChange={setAnswer} />}
            {question.id === 8 && <ChoiceList field="struggleType" options={question.options ?? []} value={String(answers.struggleType ?? '')} onChange={setAnswer} />}
            {question.id === 9 && <label className="field-label">Topic you find difficult<input className="text-field" value={String(answers.selfIdentifiedWeakTopic ?? '')} placeholder={question.placeholder} onChange={event => setAnswer('selfIdentifiedWeakTopic', event.target.value)} /></label>}
            {question.id >= 10 && question.id <= 14 && <ChoiceList field={question.fieldName} options={question.options ?? []} value={String(answers[question.fieldName] ?? '')} onChange={setAnswer} />}
            {question.id === 15 && <label className="field-label">Your motivation<textarea className="text-field text-area" rows={5} value={String(answers.motivation ?? '')} placeholder={question.placeholder} onChange={event => setAnswer('motivation', event.target.value)} /></label>}
          </div>
          <div className="onboarding-actions">
            <button className="button button--secondary" type="button" disabled={question.id === 1} onClick={() => navigate(`/onboarding/${question.id - 1}`)}><ArrowLeft size={17} /> Back</button>
            <button className="button button--primary" type="button" disabled={!canContinue} onClick={goNext}>{question.id === 15 ? 'Continue to diagnostic' : 'Continue'} <ArrowRight size={17} /></button>
          </div>
        </div>
        <p className="prototype-disclaimer"><LockKeyhole size={14} /> Preview only. Answers are stored in this browser for the prototype; they are not connected to an account.</p>
      </section>
    </main>
  );
}

function ChoiceList({ field, options, value, onChange }: { field: string; options: string[]; value: string; onChange: (field: string, value: string) => void }) {
  return (
    <div className="choice-list">
      {options.map(option => <button type="button" key={option} aria-pressed={value === option} className={`choice-option${value === option ? ' is-selected' : ''}`} onClick={() => onChange(field, option)}><span className="choice-radio" />{option}</button>)}
    </div>
  );
}
