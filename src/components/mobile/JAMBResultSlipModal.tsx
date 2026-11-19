import React, { useState, useRef } from 'react';
import {
  X, Printer, Share2, Award, CheckCircle2, ShieldCheck,
  Building, GraduationCap, Sparkles, Download, Copy, Check
} from 'lucide-react';
import { StudentProfile } from '../../types';
import { sound } from '../../utils/soundEffects';

interface JAMBResultSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile | null;
  mockResult?: {
    totalScore: number;
    subjects: { name: string; score: number; maxScore: number }[];
    date?: string;
  };
}

export default function JAMBResultSlipModal({
  isOpen,
  onClose,
  profile,
  mockResult,
}: JAMBResultSlipModalProps) {
  const [candidateName, setCandidateName] = useState(profile?.name || 'CHIDERA EZEUDO OKAFOR');
  const [regNumber] = useState('2026/SABI/049182EF');
  const [examCenter] = useState('SABI ACADEMY CBT CENTER 1, ABUJA');
  const [stateOfOrigin, setStateOfOrigin] = useState(profile?.stateOfOrigin || 'ANAMBRA');
  const [firstChoiceCourse, setFirstChoiceCourse] = useState(profile?.targetCourse || 'MEDICINE & SURGERY');
  const [firstChoiceUni, setFirstChoiceUni] = useState(profile?.targetUniversity || 'UNIVERSITY OF IBADAN (UI)');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Default or provided scores
  const defaultSubjects = [
    { name: 'Use of English', score: 76, maxScore: 100 },
    { name: 'Mathematics', score: 84, maxScore: 100 },
    { name: 'Physics', score: 78, maxScore: 100 },
    { name: 'Chemistry', score: 80, maxScore: 100 },
  ];

  const subjects = mockResult?.subjects || defaultSubjects;
  const totalScore = mockResult?.totalScore || subjects.reduce((sum, s) => sum + s.score, 0);

  if (!isOpen) return null;

  const handlePrint = () => {
    sound.playTap();
    window.print();
  };

  const handleShareWhatsApp = () => {
    sound.playTap();
    const message = `🎓 *JAMB UTME CBT MOCK RESULT SLIP*\n\n` +
      `👤 Candidate: *${candidateName}*\n` +
      `📝 Reg No: *${regNumber}*\n` +
      `🏛 Target: *${firstChoiceCourse}* at *${firstChoiceUni}*\n\n` +
      `📊 *Subject Breakdown:*\n` +
      subjects.map(s => `• ${s.name}: ${s.score}/100`).join('\n') +
      `\n\n🔥 *Aggregate Total: ${totalScore} / 400*\n` +
      `🎯 Status: *Eligible & Competitive for ${firstChoiceCourse}*\n\n` +
      `Practiced on *Sabi JAMB CBT App* (Offline CBT + AI Tutor).`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    sound.playTap();
    const text = `JAMB UTME Mock Result: ${candidateName} scored ${totalScore}/400 (${subjects.map(s => `${s.name}: ${s.score}`).join(', ')}) on Sabi CBT!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0E1729] shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award size={16} />
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-white">
                Official JAMB Result Slip
              </h3>
              <p className="text-[10px] text-slate-400">Authentic e-Facility Format</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-slate-200"
            >
              {isEditing ? 'Done' : 'Edit Info'}
            </button>
            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content Area with printable slip container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Editing Box if toggled */}
          {isEditing && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs space-y-2.5">
              <p className="font-bold text-amber-800 dark:text-amber-300">
                Customize Candidate Slip Details
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Candidate Full Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">State of Origin</label>
                  <input
                    type="text"
                    value={stateOfOrigin}
                    onChange={(e) => setStateOfOrigin(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">First Choice Institution</label>
                  <input
                    type="text"
                    value={firstChoiceUni}
                    onChange={(e) => setFirstChoiceUni(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500">Target Course</label>
                  <input
                    type="text"
                    value={firstChoiceCourse}
                    onChange={(e) => setFirstChoiceCourse(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Authentic JAMB Slip Card */}
          <div
            id="jamb-printable-slip"
            className="relative rounded-2xl bg-[#FCFBF7] dark:bg-[#0B132B] text-slate-900 dark:text-slate-100 p-4 border-2 border-emerald-700/80 shadow-md font-sans"
          >
            {/* Watermark effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <span className="text-7xl font-black uppercase text-emerald-950 dark:text-emerald-300 transform -rotate-45">
                JAMB UTME
              </span>
            </div>

            {/* JAMB Official Header */}
            <div className="border-b-2 border-emerald-800/80 pb-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-amber-300 font-black flex items-center justify-center text-xs shadow-xs">
                  JAMB
                </div>
              </div>
              <h2 className="text-xs sm:text-sm font-black tracking-wide text-emerald-900 dark:text-emerald-300 uppercase">
                JOINT ADMISSIONS AND MATRICULATION BOARD
              </h2>
              <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                National Headquarters, Bwari, P.M.B. 189, Garki, Abuja, Nigeria
              </p>
              <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-emerald-800 text-white font-mono text-[9px] font-bold">
                2026 UTME NOTIFICATION OF RESULTS (CBT MOCK)
              </div>
            </div>

            {/* Candidate Metadata Grid */}
            <div className="mt-3.5 grid grid-cols-3 gap-2 text-[10px] pb-3 border-b border-dashed border-slate-300 dark:border-slate-800">
              <div className="col-span-2 space-y-1">
                <p>
                  <span className="font-bold text-slate-500">Reg Number:</span>{' '}
                  <span className="font-mono font-black text-slate-900 dark:text-white">{regNumber}</span>
                </p>
                <p>
                  <span className="font-bold text-slate-500">Candidate Name:</span>{' '}
                  <span className="font-black text-emerald-800 dark:text-emerald-300 uppercase">{candidateName}</span>
                </p>
                <p>
                  <span className="font-bold text-slate-500">State / LGA:</span>{' '}
                  <span className="font-bold">{stateOfOrigin} / AWKA SOUTH</span>
                </p>
                <p className="truncate">
                  <span className="font-bold text-slate-500">Examination Center:</span>{' '}
                  <span className="font-bold text-[9px]">{examCenter}</span>
                </p>
              </div>

              {/* Passport Photo Simulation */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-18 rounded-lg bg-slate-200 dark:bg-slate-800 border-2 border-emerald-800 flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-xs">
                  <GraduationCap size={24} className="text-emerald-700 dark:text-emerald-400" />
                  <span className="text-[8px] font-bold text-slate-500 mt-1">PASSPORT</span>
                </div>
                <span className="text-[8px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">VERIFIED</span>
              </div>
            </div>

            {/* Subject Scores Table */}
            <div className="mt-3">
              <h4 className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider mb-1.5 flex items-center justify-between">
                <span>Subject Assessment Scores</span>
                <span className="text-[9px] font-normal text-slate-500">Max Mark: 100</span>
              </h4>

              <div className="rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-emerald-800 text-white text-[9px] uppercase font-bold">
                    <tr>
                      <th className="p-2">Subject</th>
                      <th className="p-2 text-center">Score</th>
                      <th className="p-2 text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {subjects.map((sub) => {
                      const percentage = (sub.score / sub.maxScore) * 100;
                      let remark = 'Excellent';
                      if (percentage < 50) remark = 'Below Par';
                      else if (percentage < 65) remark = 'Good';
                      else if (percentage < 80) remark = 'Very Good';

                      return (
                        <tr key={sub.name} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/40">
                          <td className="p-2 font-bold">{sub.name}</td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-800 dark:text-emerald-300">
                            {sub.score} / {sub.maxScore}
                          </td>
                          <td className="p-2 text-right font-bold text-[10px]">
                            <span className={percentage >= 70 ? 'text-emerald-600' : 'text-amber-600'}>
                              {remark}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aggregate Score Highlight */}
            <div className="mt-3 p-3 rounded-xl bg-emerald-900 text-white flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-200">
                  Aggregate Total UTME Score
                </p>
                <p className="font-display text-2xl font-black text-amber-300">
                  {totalScore} <span className="text-xs text-white/80 font-normal">/ 400</span>
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-800 border border-emerald-700 text-emerald-200 text-[10px] font-bold">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span>Top 3% Nationally</span>
                </span>
                <p className="text-[9px] text-slate-300 mt-1">High Distinction</p>
              </div>
            </div>

            {/* University Cutoff Verdict */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[10px] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <Building size={12} className="text-emerald-600" />
                <span>Admission Cutoff Assessment:</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Candidate score ({totalScore}) surpasses standard departmental cutoff mark (250 - 280) for <strong>{firstChoiceCourse}</strong> at <strong>{firstChoiceUni}</strong>.
              </p>
            </div>

            {/* Footer QR & Barcode Simulation */}
            <div className="mt-3 pt-2 border-t border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-between text-[8px] text-slate-500">
              <div className="font-mono">
                AUTHENTICATION HASH: 8A4F-29E1-CBT-SABI-2026
              </div>
              <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={10} />
                <span>e-FACILITY CERTIFIED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition"
          >
            <Printer size={14} />
            <span>Print Slip</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition shadow-xs"
          >
            <Share2 size={14} />
            <span>Share WhatsApp</span>
          </button>

          <button
            onClick={handleCopyText}
            className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
            title="Copy Result Text"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
