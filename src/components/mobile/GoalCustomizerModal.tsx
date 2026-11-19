import React, { useState } from 'react';
import { X, Check, School, Target, BookOpen, Award } from 'lucide-react';
import { StudentProfile, SubjectName } from '../../types';

interface GoalCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onSaveProfile: (updated: Partial<StudentProfile>) => void;
}

const UNIVERSITIES = [
  'University of Lagos (UNILAG)',
  'University of Ibadan (UI)',
  'Obafemi Awolowo University (OAU)',
  'University of Nigeria, Nsukka (UNN)',
  'Ahmadu Bello University (ABU)',
  'University of Benin (UNIBEN)',
  'Federal University of Technology, Akure (FUTA)',
  'University of Ilorin (UNILORIN)',
  'Covenant University',
  'Babcock University',
];

const COURSES = [
  'Medicine & Surgery',
  'Computer Science',
  'Software Engineering',
  'Law (Jurisprudence)',
  'Mechanical Engineering',
  'Pharmacy',
  'Nursing Science',
  'Accounting & Finance',
  'Economics',
  'Mass Communication',
];

const AVAILABLE_SUBJECTS: SubjectName[] = [
  'English Language',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Government',
  'Literature-in-English',
  'Christian Religious Studies',
  'Commerce',
  'Agricultural Science',
  'Geography',
];

export default function GoalCustomizerModal({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}: GoalCustomizerModalProps) {
  const [name, setName] = useState(profile.name);
  const [targetBaseline, setTargetBaseline] = useState(profile.priorScoreBaseline || 320);
  const [targetUni, setTargetUni] = useState(profile.targetUniversity || UNIVERSITIES[0]);
  const [targetCourse, setTargetCourse] = useState(profile.targetCourse || COURSES[0]);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectName[]>(
    profile.chosenSubjects && profile.chosenSubjects.length === 4
      ? profile.chosenSubjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry']
  );

  if (!isOpen) return null;

  const toggleSubject = (sub: SubjectName) => {
    if (sub === 'English Language') return; // Compulsory
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 2) {
        setSelectedSubjects(prev => prev.filter(s => s !== sub));
      }
    } else {
      if (selectedSubjects.length < 4) {
        setSelectedSubjects(prev => [...prev, sub]);
      }
    }
  };

  const handleSave = () => {
    onSaveProfile({
      name,
      priorScoreBaseline: targetBaseline,
      targetUniversity: targetUni,
      targetCourse: targetCourse,
      chosenSubjects: selectedSubjects,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0E1526] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
              <Target size={16} />
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                Customize Academic Target
              </h3>
              <p className="text-[10px] text-slate-400">JAMB 2027 Aspirant Profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 no-scrollbar">
          {/* Aspirant Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Your Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1.5 w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Target Score Slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-700 dark:text-slate-300">Target JAMB Score</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-display font-black text-sm">
                {targetBaseline}+
              </span>
            </div>
            <input
              type="range"
              min="240"
              max="360"
              step="10"
              value={targetBaseline}
              onChange={e => setTargetBaseline(Number(e.target.value))}
              className="w-full mt-2 accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
              <span>240 (Pass)</span>
              <span>290 (Cutoff)</span>
              <span>320 (Championship)</span>
              <span>360 (Top 1%)</span>
            </div>
          </div>

          {/* Target Institution */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              First Choice University
            </label>
            <select
              value={targetUni}
              onChange={e => setTargetUni(e.target.value)}
              className="mt-1.5 w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
            >
              {UNIVERSITIES.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Target Course */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Desired Course of Study
            </label>
            <select
              value={targetCourse}
              onChange={e => setTargetCourse(e.target.value)}
              className="mt-1.5 w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
            >
              {COURSES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 4 JAMB Subjects Selection */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold mb-1.5">
              <span className="text-slate-700 dark:text-slate-300">Choose 4 Subjects</span>
              <span className="text-emerald-600 font-bold text-[11px]">
                {selectedSubjects.length} of 4 Selected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {AVAILABLE_SUBJECTS.map(subj => {
                const isSelected = selectedSubjects.includes(subj);
                const isCompulsory = subj === 'English Language';

                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => toggleSubject(subj)}
                    className={`p-2 rounded-xl border text-xs text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{subj}</span>
                    {isCompulsory ? (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-200 text-emerald-800 font-bold shrink-0">
                        Req
                      </span>
                    ) : isSelected ? (
                      <Check size={14} className="text-emerald-600 shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black text-xs shadow-md active:scale-95 transition"
          >
            Save Target Goals
          </button>
        </div>
      </div>
    </div>
  );
}
