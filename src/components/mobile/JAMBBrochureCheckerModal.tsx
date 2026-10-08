import React, { useState, useMemo } from 'react';
import {
  X, Compass, CheckCircle2, AlertTriangle, Building, BookOpen,
  Award, Search, Sparkles, ChevronRight, Filter, ShieldCheck, ArrowRight,
  TrendingUp, Calculator, Check, Info
} from 'lucide-react';
import { StudentProfile, SubjectName } from '../../types';
import { JAMB_BROCHURE_COURSES, CourseBrochure, validateCandidateSubjectCombination } from '../../data/jambBrochureData';
import { sound } from '../../utils/soundEffects';

interface JAMBBrochureCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onUpdateProfileSubjects?: (subjects: SubjectName[], course?: string, university?: string) => void;
}

export default function JAMBBrochureCheckerModal({
  isOpen,
  onClose,
  profile,
  onUpdateProfileSubjects,
}: JAMBBrochureCheckerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('med-surg');
  const [activeTab, setActiveTab] = useState<'validator' | 'cutoffs' | 'aggregate'>('validator');
  const [simulatedScore, setSimulatedScore] = useState<number>(profile.priorScoreBaseline || 310);
  const [simulatedWAECPoints, setSimulatedWAECPoints] = useState<number>(18); // Max 20 points for 5 A1s (4 pts each in UNILAG)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return JAMB_BROCHURE_COURSES;
    const q = searchQuery.toLowerCase();
    return JAMB_BROCHURE_COURSES.filter(
      c => c.courseName.toLowerCase().includes(q) || c.faculty.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeCourse = useMemo(() => {
    return JAMB_BROCHURE_COURSES.find(c => c.id === selectedCourseId) || JAMB_BROCHURE_COURSES[0];
  }, [selectedCourseId]);

  const validation = useMemo(() => {
    return validateCandidateSubjectCombination(profile.chosenSubjects, activeCourse);
  }, [profile.chosenSubjects, activeCourse]);

  // Aggregate Calculator for UNILAG/UI style:
  // UNILAG model: UTME score / 8 (max 50) + WAEC 5 subjects (A1=4, B2=3.6, B3=3.2, C4=2.8, C5=2.4, C6=2.0 - max 20) + Post-UTME (max 30)
  // Let's model a realistic aggregate index:
  const utmeComponent = (simulatedScore / 8).toFixed(1);
  const waecComponent = simulatedWAECPoints.toFixed(1);
  const postUtmeSimulated = 22.5; // average high score out of 30
  const compositeAggregate = (Number(utmeComponent) + Number(waecComponent) + postUtmeSimulated).toFixed(2);

  const handleAutoFixSubjects = () => {
    if (!onUpdateProfileSubjects) return;
    sound.playCelebration();
    // Build ideal 4 subjects:
    const newSubjects: SubjectName[] = [...activeCourse.compulsorySubjects];
    if (newSubjects.length < 4 && activeCourse.optionalSubjectPool) {
      for (const opt of activeCourse.optionalSubjectPool) {
        if (!newSubjects.includes(opt) && newSubjects.length < 4) {
          newSubjects.push(opt);
        }
      }
    }
    // Fallback if still under 4
    if (newSubjects.length < 4) {
      const fallbacks: SubjectName[] = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics'];
      for (const fb of fallbacks) {
        if (!newSubjects.includes(fb) && newSubjects.length < 4) {
          newSubjects.push(fb);
        }
      }
    }

    onUpdateProfileSubjects(newSubjects, activeCourse.courseName);
    setToastMessage(`Updated! Your 4 subjects are now aligned with ${activeCourse.courseName}.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSetTargetCourse = () => {
    if (!onUpdateProfileSubjects) return;
    sound.playCorrect();
    onUpdateProfileSubjects(profile.chosenSubjects, activeCourse.courseName);
    setToastMessage(`Target course set to ${activeCourse.courseName}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full sm:max-w-xl bg-white dark:bg-[#0E1526] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-[730px]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-950/10 via-slate-900/5 to-teal-950/10 dark:from-emerald-950/40 dark:to-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Compass size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                  JAMB CAPS Brochure Advisor
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  IBASS 2027
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Official Subject Combinations, Cutoffs & O-Level Requirements
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Course Selector */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search course (e.g. Medicine, Law, Computer Science, Accounting)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick Course Pills */}
          <div className="flex gap-1.5 overflow-x-auto pt-2 no-scrollbar">
            {filteredCourses.map(course => (
              <button
                key={course.id}
                onClick={() => {
                  sound.playTap();
                  setSelectedCourseId(course.id);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition shrink-0 ${
                  selectedCourseId === course.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                {course.courseName.split(' ')[0]} {course.courseName.includes('&') ? '& ' + course.courseName.split('&')[1].trim().split(' ')[0] : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Switcher: Subject Validator | University Cutoffs | Aggregate Calculator */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-center">
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('validator');
            }}
            className={`py-1.5 rounded-lg transition ${
              activeTab === 'validator'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Subject Match
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('cutoffs');
            }}
            className={`py-1.5 rounded-lg transition ${
              activeTab === 'cutoffs'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Uni Cutoffs ({activeCourse.institutions.length})
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('aggregate');
            }}
            className={`py-1.5 rounded-lg transition ${
              activeTab === 'aggregate'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Aggregate Meter
          </button>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-bold flex items-center justify-between animate-in fade-in">
            <span>{toastMessage}</span>
            <Check size={14} />
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          
          {/* Active Course Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#101F42] text-white shadow-md relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  {activeCourse.faculty}
                </span>
                <h4 className="font-display text-base font-black text-white mt-0.5">
                  {activeCourse.courseName}
                </h4>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                  {activeCourse.description}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-300 block">Cutoff Avg</span>
                <span className="font-display text-xl font-black text-amber-400">
                  {activeCourse.averageCutoff}+
                </span>
                <span className="block text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 mt-0.5">
                  {activeCourse.nationalCompetitiveness}
                </span>
              </div>
            </div>

            {profile.targetCourse !== activeCourse.courseName && (
              <button
                onClick={handleSetTargetCourse}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-3 py-1.5 rounded-xl transition"
              >
                <span>Set as My Target Course</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>

          {/* TAB 1: SUBJECT COMBINATION VALIDATOR */}
          {activeTab === 'validator' && (
            <div className="space-y-3">
              {/* Validation Result Box */}
              <div
                className={`p-3.5 rounded-2xl border text-xs ${
                  validation.isValid
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-red-50/70 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {validation.isValid ? (
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-bold text-xs">
                      {validation.isValid
                        ? 'Eligible! Subject Combination Aligns with JAMB CAPS'
                        : 'Discrepancy Detected! Combination Not Permitted for CAPS'}
                    </h5>
                    <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                      {validation.recommendation}
                    </p>

                    {!validation.isValid && onUpdateProfileSubjects && (
                      <button
                        onClick={handleAutoFixSubjects}
                        className="mt-2.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Sparkles size={13} />
                        <span>Auto-Fix My 4 Subjects for {activeCourse.courseName}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Side by Side Comparison */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Official Compulsory */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    JAMB Official Requirements
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {activeCourse.compulsorySubjects.map(sub => (
                      <div key={sub} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{sub} (Compulsory)</span>
                      </div>
                    ))}
                    {activeCourse.optionalSubjectPool && (
                      <div className="pt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">+ Choice from:</span> {activeCourse.optionalSubjectPool.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Candidate's Current Selection */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    Your Current 4 Subjects
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {profile.chosenSubjects.map(sub => {
                      const isRequired = activeCourse.compulsorySubjects.includes(sub);
                      const isAllowed = isRequired || (activeCourse.optionalSubjectPool && activeCourse.optionalSubjectPool.includes(sub));
                      return (
                        <div key={sub} className="flex items-center justify-between text-[11px] font-bold">
                          <span className={isAllowed ? 'text-slate-800 dark:text-slate-200' : 'text-red-500 line-through'}>
                            {sub}
                          </span>
                          {isRequired ? (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-1 rounded">
                              Required
                            </span>
                          ) : isAllowed ? (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-950 px-1 rounded">
                              Valid Elective
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-red-600 bg-red-100 dark:bg-red-950 px-1 rounded">
                              Invalid
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* O'Level Prerequisite Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                  <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                  <span>Mandatory O'Level (WAEC / NECO / NABTEB) Standard</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeCourse.olevelRequirements}
                </p>
              </div>

              {/* Special Institutional Waivers */}
              {activeCourse.specialWaivers && activeCourse.specialWaivers.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Info size={14} className="text-blue-500" />
                    <span>Special Institutional Considerations:</span>
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 list-disc list-inside">
                    {activeCourse.specialWaivers.map((waiver, i) => (
                      <li key={i}>{waiver}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UNIVERSITY CUT-OFF MARKS EXPLORER */}
          {activeTab === 'cutoffs' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
                <span>Top Nigerian Institutions for {activeCourse.courseName}</span>
                <span className="font-bold">Merit vs Catchment</span>
              </div>

              {activeCourse.institutions.map(inst => {
                const candidateScore = profile.priorScoreBaseline || 310;
                const meetsMerit = candidateScore >= inst.meritCutoff;
                const meetsCatchment = inst.catchmentCutoff ? candidateScore >= inst.catchmentCutoff : false;

                return (
                  <div
                    key={inst.name}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 text-xs hover:border-emerald-400 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Building size={14} className="text-slate-400 shrink-0" />
                          <h6 className="font-bold text-slate-900 dark:text-white truncate">
                            {inst.name}
                          </h6>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {inst.type} University · {inst.state} State
                        </p>
                        {inst.notes && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                            Note: {inst.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-[10px] text-slate-400">Merit:</span>
                          <span className="font-display font-black text-slate-900 dark:text-white text-sm">
                            {inst.meritCutoff}+
                          </span>
                        </div>
                        {inst.catchmentCutoff && (
                          <div className="text-[10px] text-slate-400">
                            Catchment: <span className="font-bold text-slate-600 dark:text-slate-300">{inst.catchmentCutoff}+</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Eligibility Badge based on current user score */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">
                        Based on your target of {candidateScore}:
                      </span>
                      {meetsMerit ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={11} /> High Merit Probability
                        </span>
                      ) : meetsCatchment ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                          Catchment Range
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded-full">
                          Requires +{inst.meritCutoff - candidateScore} pts
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: AGGREGATE CALCULATOR SIMULATOR */}
          {activeTab === 'aggregate' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Calculator size={16} className="text-emerald-500" />
                  <span>Federal University Composite Aggregate Formula</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Top schools like UNILAG, UI, and OAU do not admit based on UTME raw score alone. They combine your UTME (50%), O'Level 5 grades (20%), and Post-UTME (30%).
                </p>
              </div>

              {/* Sliders / Inputs */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span>UTME Score (out of 400):</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{simulatedScore}</span>
                  </div>
                  <input
                    type="range"
                    min="180"
                    max="380"
                    step="2"
                    value={simulatedScore}
                    onChange={(e) => setSimulatedScore(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>180 (Minimum)</span>
                    <span>Component: {utmeComponent} / 50 pts</span>
                    <span>380 (National Best)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span>WAEC / NECO Points (5 core subjects):</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{simulatedWAECPoints} / 20 pts</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    step="0.5"
                    value={simulatedWAECPoints}
                    onChange={(e) => setSimulatedWAECPoints(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    A1=4.0, B2=3.6, B3=3.2, C4=2.8, C5=2.4, C6=2.0 (5 A1s = 20 pts maximum)
                  </p>
                </div>

                {/* Final Composite Aggregate Display */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-center shadow-md">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200">
                    Calculated Admission Aggregate
                  </span>
                  <div className="font-display text-3xl font-black mt-0.5">
                    {compositeAggregate}%
                  </div>
                  <p className="text-[11px] text-emerald-100 mt-1">
                    {Number(compositeAggregate) >= 80
                      ? '🟢 Elite Merit Tier: High probability of first-choice admission!'
                      : Number(compositeAggregate) >= 70
                      ? '🟡 Competitive Range: Solid chance for Catchment / Supplementary'
                      : '🔴 Below Average: Target 300+ in UTME to raise composite index'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Info size={14} className="text-emerald-500" />
            <span>Updated according to latest JAMB Central Admission Processing System (CAPS).</span>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
