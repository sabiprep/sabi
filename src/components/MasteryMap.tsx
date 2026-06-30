import React, { useState } from 'react';
import { SubjectName, MasteryMapItem, StudentProfile } from '../types';
import { Play, Sparkles, BookOpen, AlertCircle, Info, CheckCircle, ArrowRight, X, Award, ChevronRight } from 'lucide-react';

interface MasteryMapProps {
  profile: StudentProfile | null;
  masteryMap: Record<string, MasteryMapItem>;
  selectedSubject: SubjectName;
  onSubjectChange: (sub: SubjectName) => void;
  onStartPractice: (topic: string) => void;
  onStartTutor?: (sub: 'English Language' | 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology', topic: string) => void;
}

const NODE_COORDINATES_IMPORTANCE: Record<string, 'high' | 'medium' | 'low'> = {
  'Lexis and Structure': 'high',
  'Synonyms': 'medium',
  'Antonyms': 'medium',
  'Prepositions': 'low',
  'Proximity Concord': 'high',
  'Idioms': 'medium',
  'Tense Alignment': 'high',
  'Modal Auxiliaries': 'medium',
  'Subjunctive Mood': 'high',
  'Algebra': 'high',
  'Quadratic Equations': 'high',
  'Indices': 'medium',
  'Logarithms': 'medium',
  'Sum and Product of Roots': 'high',
  'Surds Rationalization': 'medium',
  'Calculus': 'high',
  'Differentiation': 'medium',
  'Mechanics': 'high',
  "Newton's Laws": 'high',
  'Friction coefficient': 'medium',
  'Projectiles horizontal range': 'medium',
  'Waves & Optics': 'high',
  'Refractive Index speeds': 'medium',
  'Electricity': 'high',
  'Atomic Structure': 'high',
  'Quantum Numbers': 'high',
  'Solutions & Separation': 'medium',
  'Gases': 'high',
  'Chemical Bonding': 'medium',
  'Stoichiometry': 'high',
  'Acids, Bases & Salts': 'high',
  'Cell Biology': 'high',
  'Genetics': 'high',
  'Plant Physiology': 'medium',
  'Ecology': 'high',
  'Anatomy & Physiology': 'medium',
  'Skeletal System': 'low',
  'Excretion': 'high',
};

export default function MasteryMap({
  profile,
  masteryMap,
  selectedSubject,
  onSubjectChange,
  onStartPractice,
  onStartTutor
}: MasteryMapProps) {
  const [selectedTopicDetail, setSelectedTopicDetail] = useState<MasteryMapItem | null>(null);

  // SECTION 1 Calculations: Overall Readiness
  const topicsArray = Object.values(masteryMap || {});
  const totalScoreAll = topicsArray.reduce((acc, curr) => acc + curr.score, 0);
  const averageScoreAll = topicsArray.length > 0 ? totalScoreAll / topicsArray.length : 40;
  const avgScore = Math.min(100, Math.max(10, averageScoreAll));

  // Dynamic predicted JAMB score range (e.g., "Predicted Score: 275 - 310")
  const predictedMin = Math.max(120, Math.round((avgScore * 4) - 15));
  const predictedMax = Math.min(400, Math.round((avgScore * 4) + 15));

  let overallStatusMessage = "Sabi Coach recommends practicing highlighted weak areas to secure high-priority exam marks.";
  if (avgScore >= 75) {
    overallStatusMessage = "Outstanding readiness baseline! You are currently on track for a high-percentile national ranking.";
  } else if (avgScore >= 55) {
    overallStatusMessage = "Solid readiness foundation. Target remaining weak topics to push comfortably into the 300+ zone!";
  }

  // SECTION 2 Calculations: Subjects cards (exactly 4)
  const finalSubjectsList = profile?.chosenSubjects && profile.chosenSubjects.length >= 4
    ? profile.chosenSubjects.slice(0, 4)
    : Array.from(new Set(Object.values(masteryMap || {}).map(m => m.subject))).slice(0, 4);

  const subjectsToRender: SubjectName[] = [];
  finalSubjectsList.forEach(s => {
    if (subjectsToRender.length < 4 && !subjectsToRender.includes(s)) {
      subjectsToRender.push(s);
    }
  });
  // Pad if less than 4
  const defaultSubjects: SubjectName[] = ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
  defaultSubjects.forEach(s => {
    if (subjectsToRender.length < 4 && !subjectsToRender.includes(s)) {
      subjectsToRender.push(s);
    }
  });

  const getSubjectMetric = (subj: SubjectName) => {
    const subTopics = Object.values(masteryMap || {}).filter(m => m.subject === subj);
    const avg = subTopics.length > 0
      ? Math.round(subTopics.reduce((acc, curr) => acc + curr.score, 0) / subTopics.length)
      : 40;
    
    let statusText = "Critical";
    let colorClass = "text-rose-600 bg-rose-50 border-rose-100";
    if (avg >= 75) {
      statusText = "Mastered";
      colorClass = "text-emerald-700 bg-emerald-50 border-emerald-100";
    } else if (avg >= 50) {
      statusText = "Building";
      colorClass = "text-amber-700 bg-amber-50 border-amber-100";
    }
    return { avg, statusText, colorClass };
  };

  // SECTION 3 Calculations: Selected Subject Drill-Down sorted weakest first
  const activeSubjectTopics = Object.values(masteryMap || {})
    .filter(m => m.subject === selectedSubject)
    .sort((a, b) => a.score - b.score);

  const checkIsBlindSpot = (item: MasteryMapItem) => {
    return (item.score < 40 && item.attempts > 0);
  };

  // SECTION 4 Calculations: Highest relative syllabus weight + Lowest score recommendation 
  const priorityRecommendations = Object.values(masteryMap || {}).map(m => {
    const importance = NODE_COORDINATES_IMPORTANCE[m.topic] || 'medium';
    const weight = importance === 'high' ? 3 : importance === 'medium' ? 2 : 1;
    const priorityRating = weight * (100 - m.score);
    return { item: m, priorityRating };
  });
  const sortedRecs = [...priorityRecommendations].sort((a, b) => b.priorityRating - a.priorityRating);
  const bestOpp = sortedRecs.length > 0 ? sortedRecs[0] : null;

  let coachingCopy = "Your biggest opportunity: Spend 20 minutes on basic topics to boost your exam score by 15 points!";
  if (bestOpp) {
    const oppTopic = bestOpp.item.topic;
    const oppSubject = bestOpp.item.subject;
    const potentialBoost = Math.round((100 - bestOpp.item.score) * 0.35 + 8);
    coachingCopy = `Your biggest opportunity: Spend 20 minutes on ${oppTopic} in ${oppSubject} to boost your exam score by ${potentialBoost} marks!`;
  }

  return (
    <div id="mastery-dashboard-view" className="space-y-4 animate-fade-in text-[#0A1128] flex flex-col h-full relative select-none">
      
      {/* SECTION 1: Overall Readiness Summary */}
      <div id="mastery-section-readiness" className="bg-white border border-[#D6E4F0] rounded-2xl p-4 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-[#F8FBFF] shrink-0">
        <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-28 h-28 bg-[#4A90D9]/5 rounded-full filter blur-xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-[#4A90D9] tracking-wider block">Estimated Exam Competency</span>
            <h2 className="text-xl md:text-2xl font-black text-[#0A1128] font-display uppercase tracking-tight mt-0.5 animate-pulse-slow">
              Predicted Score: {predictedMin} - {predictedMax}
            </h2>
          </div>
          <div className="flex items-center gap-2 bg-[#0A1128] text-white px-3 py-1.5 rounded-xl border border-slate-800 self-start md:self-auto shadow-sm">
            <Award className="h-4 w-4 text-[#F5C518]" />
            <span className="font-mono text-xs font-bold">{Math.round(avgScore)}% Global Mastery</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-550 font-medium leading-relaxed mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
          <Info className="h-3.5 w-3.5 text-[#4A90D9] shrink-0" />
          <span>{overallStatusMessage}</span>
        </p>
      </div>

      {/* SECTION 2: Subject-Level Overview Horizontal Deck */}
      <div id="mastery-section-subject-deck" className="shrink-0 space-y-1.5">
        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block ml-1">Choose Focus Subject:</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {subjectsToRender.map((subj) => {
            const { avg, statusText, colorClass } = getSubjectMetric(subj);
            const isSelected = selectedSubject === subj;

            // Circular SVG calculations
            const size = 36;
            const strokeWidth = 3.5;
            const radius = (size - strokeWidth) / 2;
            const circumference = radius * 2 * Math.PI;
            const strokeDashoffset = circumference - (avg / 100) * circumference;

            return (
              <button
                key={subj}
                onClick={() => onSubjectChange(subj)}
                className={`text-left p-3 rounded-2xl border transition-all duration-300 relative flex flex-col justify-between h-[105px] overflow-hidden ${isSelected ? 'bg-[#0A1128] border-[#0A1128] text-white shadow-md scale-[1.01]' : 'bg-white border-[#D6E4F0] text-[#0A1128] hover:border-[#4A90D9] shadow-sm'}`}
              >
                <div className="flex justify-between items-start w-full">
                  <span className={`text-[10px] font-bold line-clamp-1 truncate max-w-[70%] font-display capitalize ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                    {subj.replace(' Language', '')}
                  </span>
                  
                  {/* Circular progress ring */}
                  <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                    <svg width={size} height={size} className="transform -rotate-95">
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={isSelected ? '#1E293B' : '#E2E8F0'}
                        strokeWidth={strokeWidth}
                      />
                      <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={isSelected ? '#F5C518' : '#4A90D9'}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[8.5px] font-mono font-bold">
                      {avg}%
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-left">
                  <span className={`text-[8.5px] px-2 py-0.5 rounded-full border inline-block font-extrabold uppercase tracking-wide ${isSelected ? 'bg-white/10 text-white border-white/20' : colorClass}`}>
                    {statusText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Topic Drill-Down Accordion Scrollable Area */}
      <div id="mastery-section-topic-accordion" className="flex-1 bg-white border border-[#D6E4F0] rounded-2xl p-4 shadow-sm flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-[#4A90D9]" />
            <h4 className="text-xs font-bold text-[#0A1128] font-display uppercase tracking-wider">
              {selectedSubject} Syllabus Gaps
            </h4>
          </div>
          <span className="text-[9px] text-[#4A90D9] font-bold uppercase bg-sky-50 px-2 py-0.5 rounded-full">
            Weakest topics first
          </span>
        </div>

        {/* Bounded vertical ScrollView list container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[290px] scrollbar-none min-h-0">
          {activeSubjectTopics.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <CompassIcon className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400 font-bold">No topic logs registered for {selectedSubject}.</p>
              <button
                onClick={() => onStartPractice(selectedSubject === 'English Language' ? 'Proximity Concord' : 'Algebra')}
                className="text-[10px] text-[#4A90D9] font-extrabold underline uppercase tracking-wider block mx-auto"
              >
                Launch First Concept
              </button>
            </div>
          ) : (
            activeSubjectTopics.map((topicItem) => {
              const isBlindSpot = checkIsBlindSpot(topicItem);
              const isLowConfidence = topicItem.attempts < 5;

              return (
                <div
                  key={topicItem.topic}
                  onClick={() => setSelectedTopicDetail(topicItem)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition relative hover:bg-slate-50 flex items-center justify-between gap-4 ${isBlindSpot ? 'border-amber-400 bg-amber-50/20 border-l-[6px] border-l-amber-500' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800 tracking-tight leading-tight block">
                        {topicItem.topic}
                      </span>
                      {isBlindSpot && (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[8px] font-black uppercase tracking-wider">
                          <AlertCircle className="h-3 w-3 text-amber-600" />
                          <span>Blind Spot</span>
                        </span>
                      )}
                      {isLowConfidence && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[8px] font-bold uppercase tracking-wider whitespace-nowrap">
                          Low Confidence
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Progress Bar Container with Opacity Mask for Low Confidence */}
                      <div className={`flex-1 h-2 bg-slate-150 rounded-full overflow-hidden relative ${isLowConfidence ? 'opacity-50' : 'opacity-100'}`} style={{ backgroundColor: '#E2E8F0' }}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${topicItem.score >= 75 ? 'bg-emerald-500' : topicItem.score >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
                          style={{ width: `${topicItem.score}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-700 w-8 text-right shrink-0">
                        {topicItem.score}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-slate-400 hover:text-slate-650 transition">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 hidden sm:inline block">Details</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 4: Action Recommendations (Sticky Baseline Footer) */}
      <div id="mastery-section-recommendations" className="bg-[#0A1128] border border-slate-900 rounded-2xl p-4 text-white shadow-lg shrink-0 flex items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-1.5 text-[#F5C518] text-[10px] uppercase font-black tracking-widest">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Smart Recommend Target</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-slate-100 font-medium font-sans">
            {coachingCopy}
          </p>
        </div>
        <button
          onClick={() => {
            if (bestOpp) {
              onStartPractice(bestOpp.item.topic);
            } else {
              onStartPractice(selectedSubject === 'English Language' ? 'Proximity Concord' : 'Algebra');
            }
          }}
          className="bg-[#F5C518] text-[#0A1128] font-black text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl border border-transparent hover:bg-white active:scale-95 transition shrink-0 flex items-center gap-1"
        >
          <span>Focus</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bottom Sheet Modal Detail Overlay */}
      {selectedTopicDetail && (
        <div className="absolute inset-0 z-50 bg-[#0A1128]/70 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
          <div className="flex-1" onClick={() => setSelectedTopicDetail(null)} />
          <div className="bg-white rounded-t-3xl p-6 border-t border-slate-200 shadow-2xl animate-slide-up space-y-4 max-h-[85%] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-2 border-b border-slate-100">
              <div className="space-y-1 flex-1 mr-2">
                <span className="text-[9px] font-extrabold uppercase bg-sky-50 text-[#4A90D9] border border-sky-100 px-2 py-0.5 rounded-full inline-block">
                  {selectedTopicDetail.subject}
                </span>
                <h4 className="text-sm font-black text-[#0A1128] uppercase tracking-wide leading-snug">
                  {selectedTopicDetail.topic}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Subtopic focus: {selectedTopicDetail.subtopic}</p>
              </div>
              <button
                onClick={() => setSelectedTopicDetail(null)}
                className="p-1 px-2.5 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition text-xs font-bold font-sans uppercase border border-slate-100 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Topic state mapping contextually */}
            {selectedTopicDetail.score < 40 && selectedTopicDetail.attempts > 0 ? (
              /* RED STATE / BLIND SPOT */
              <div className="space-y-4 bg-amber-50/50 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 animate-bounce" />
                  <span className="font-extrabold text-xs uppercase tracking-wider">CRITICAL BLIND SPOT DETECTED</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-slate-750 font-bold">
                  This topic is compromising your margins! Sabi AI recommends jumping straight into conceptual coaching before doing more practice mock questions.
                </p>
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onStartPractice(selectedTopicDetail.topic);
                      setSelectedTopicDetail(null);
                    }}
                    className="py-2 px-3 text-[10px] font-black uppercase text-[#0A1128] bg-white border border-[#D6E4F0] hover:bg-slate-50 rounded-xl transition shadow-sm text-center"
                  >
                    📝 Practice Topic
                  </button>
                  <button
                    onClick={() => {
                      if (onStartTutor) {
                        onStartTutor(selectedTopicDetail.subject as any, selectedTopicDetail.topic);
                      }
                      setSelectedTopicDetail(null);
                    }}
                    className="py-2 px-3 text-[10px] font-black uppercase text-white bg-[#0A1128] hover:bg-[#040814] rounded-xl transition shadow-sm text-center flex items-center justify-center gap-1"
                  >
                    <Sparkles className="h-3 w-3 text-[#F5C518]" />
                    <span>Ask Sabi AI</span>
                  </button>
                </div>
              </div>
            ) : selectedTopicDetail.score >= 75 ? (
              /* GREEN STATE / MASTERED */
              <div className="space-y-4 bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="font-extrabold text-xs uppercase tracking-wider">SECURED ACADEMIC DOMAIN</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-slate-750 font-medium">
                  Superb hold! You have acquired robust fluency on this syllabus key point. Perfect score is active. Next scheduled spaced recall check on:
                </p>
                <div className="bg-white px-3 py-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">Spaced repetition schedule</span>
                  <p className="font-mono font-bold text-[#0A1128] text-xs">
                    {new Date(selectedTopicDetail.nextReviewDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedTopicDetail(null)}
                    className="py-2 px-4 text-[10px] font-black uppercase text-slate-650 hover:text-slate-800 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* DEFAULT / UNTESTED OR BUILDING */
              <div className="space-y-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 text-[#4A90D9]">
                  <CompassIcon className="h-5 w-5 text-[#4A90D9] shrink-0" />
                  <span className="font-extrabold text-xs uppercase tracking-wider">FOUNDATIONAL ESTABLISHMENT TARGET</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-slate-750 font-medium">
                  {selectedTopicDetail.attempts === 0 
                    ? "This topic hasn't been tested in your practice runs yet. Establish your entry-level baseline scorecard right away!"
                    : "You are currently building fluency here! Engage in focused practice sets to secure your peak exam potential."
                  }
                </p>
                <div className="pt-2 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onStartPractice(selectedTopicDetail.topic);
                      setSelectedTopicDetail(null);
                    }}
                    className="py-2.5 px-3 text-[10px] font-black uppercase text-white bg-[#0A1128] hover:bg-[#040814] rounded-xl transition shadow-lg text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Start Practice Run</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (onStartTutor) {
                        onStartTutor(selectedTopicDetail.subject as any, selectedTopicDetail.topic);
                      }
                      setSelectedTopicDetail(null);
                    }}
                    className="py-2.5 px-3 text-[10px] font-black uppercase text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition text-center"
                  >
                    📖 Read Lesson Note
                  </button>
                </div>
              </div>
            )}

            {/* Performance Statistics */}
            <div className="bg-[#FAFBFD] p-4.5 rounded-2xl border border-[#D6E4F0] space-y-2.5 text-xs">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Performance Log Metrics</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block uppercase">Fluency Rating</span>
                  <span className="font-mono text-xs font-bold text-[#0A1128] block mt-0.5">{selectedTopicDetail.score}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block uppercase">Total Questions</span>
                  <span className="font-sans text-xs font-bold text-[#0A1128] block mt-0.5">{selectedTopicDetail.attempts} attempts</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block uppercase">Confidence Level</span>
                  <span className={`text-xs font-bold block mt-0.5 ${selectedTopicDetail.confidence === 'High' ? 'text-emerald-600' : selectedTopicDetail.confidence === 'Medium' ? 'text-amber-500' : 'text-rose-500'}`}>{selectedTopicDetail.confidence}</span>
                </div>
              </div>

              {selectedTopicDetail.history.length > 0 && (
                <div className="space-y-1.5 pt-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Recent performance entries</span>
                  <div className="space-y-1 max-h-20 overflow-y-auto scrollbar-none">
                    {selectedTopicDetail.history.map((h, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] p-1.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-slate-450">{new Date(h.timestamp).toLocaleDateString()}</span>
                        <span className={`font-bold ${h.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
