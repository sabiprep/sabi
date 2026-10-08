import React, { useState } from 'react';
import { X, BookOpen, Search, Copy, Check, Sparkles } from 'lucide-react';
import MathText from '../MathText';
import { SubjectName } from '../../types';

interface FormulaCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormulaItem {
  title: string;
  subject: SubjectName;
  formula: string;
  notes: string;
  mnemonic?: string;
}

const CHEAT_SHEET_ITEMS: FormulaItem[] = [
  // Physics
  {
    title: 'Critical Angle & Refractive Index',
    subject: 'Physics',
    formula: '$\\sin(\\theta_c) = \\frac{1}{n} = \\frac{v_1}{v_2}$',
    notes: 'Total internal reflection only occurs when light travels from dense medium to rarer medium at angle > $\\theta_c$.',
    mnemonic: 'Light must be in dense water trying to escape to air.',
  },
  {
    title: "Newton's Second Law & Momentum",
    subject: 'Physics',
    formula: '$F = ma = \\frac{m(v - u)}{t}$',
    notes: 'Impulse $I = F \\times t = \\Delta p = m(v - u)$. Unit is $N\\cdot s$ or $kg\\cdot m/s$.',
  },
  {
    title: 'Simple Harmonic Motion Period',
    subject: 'Physics',
    formula: '$T = 2\\pi \\sqrt{\\frac{L}{g}} \\quad \\text{and} \\quad T = 2\\pi \\sqrt{\\frac{m}{k}}$',
    notes: 'Pendulum period does NOT depend on bob mass or small amplitude!',
  },
  {
    title: 'Electric Current & Ohm’s Law',
    subject: 'Physics',
    formula: '$V = IR \\quad \\text{and} \\quad P = IV = I^2R = \\frac{V^2}{R}$',
    notes: 'In series resistors add directly: $R_{eq} = R_1 + R_2$. In parallel: $1/R_{eq} = 1/R_1 + 1/R_2$.',
  },

  // Mathematics
  {
    title: 'Quadratic Roots Relationship',
    subject: 'Mathematics',
    formula: '$\\alpha + \\beta = -\\frac{b}{a}, \\quad \\alpha\\beta = \\frac{c}{a}$',
    notes: 'Equation with roots $\\alpha, \\beta$: $x^2 - (\\alpha+\\beta)x + \\alpha\\beta = 0$.',
  },
  {
    title: 'Arithmetic Progression (A.P.)',
    subject: 'Mathematics',
    formula: '$T_n = a + (n-1)d, \\quad S_n = \\frac{n}{2}[2a + (n-1)d]$',
    notes: 'Common difference $d = T_n - T_{n-1}$.',
  },
  {
    title: 'Calculus: Power Rule',
    subject: 'Mathematics',
    formula: '$\\frac{d}{dx}(x^n) = nx^{n-1}, \\quad \\int x^n dx = \\frac{x^{n+1}}{n+1} + C$',
    notes: 'At turning point / stationary point, set $\\frac{dy}{dx} = 0$.',
  },

  // Chemistry
  {
    title: 'Ideal Gas Equation & General Law',
    subject: 'Chemistry',
    formula: '$PV = nRT \\quad \\text{and} \\quad \\frac{P_1 V_1}{T_1} = \\frac{P_2 V_2}{T_2}$',
    notes: 'Always convert temperature to Kelvin: $T(K) = ^\\circ C + 273$.',
  },
  {
    title: 'Graham’s Law of Diffusion',
    subject: 'Chemistry',
    formula: '$\\frac{R_1}{R_2} = \\sqrt{\\frac{M_2}{M_1}} = \\frac{t_2}{t_1}$',
    notes: 'Lighter gases diffuse faster than heavier gases! E.g. $NH_3$ (17) diffuses faster than $HCl$ (36.5).',
  },
  {
    title: 'Molarity & Neutralization',
    subject: 'Chemistry',
    formula: '$\\frac{C_a V_a}{C_b V_b} = \\frac{n_a}{n_b}$',
    notes: '$C_a, C_b$ are concentrations in $mol/dm^3$. $n_a, n_b$ are mole coefficients from balanced equation.',
  },

  // English
  {
    title: 'Proximity Concord Rule',
    subject: 'English Language',
    formula: 'Neither A nor B + Verb (agrees with B)',
    notes: 'When subjects are connected by "either...or" or "neither...nor", the verb must agree in number with the closer subject.',
    mnemonic: 'Closest subject wins the verb agreement!',
  },
  {
    title: 'Subjunctive Mood',
    subject: 'English Language',
    formula: 'Demand / Recommend / Insist that + Bare Infinitive',
    notes: 'E.g., "The teacher recommended that he *be* present" (not *is* or *was*).',
  },
];

export default function FormulaCheatSheetModal({
  isOpen,
  onClose,
}: FormulaCheatSheetModalProps) {
  const [selectedSub, setSelectedSub] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = CHEAT_SHEET_ITEMS.filter(item => {
    const matchSub = selectedSub === 'All' || item.subject === selectedSub;
    const matchSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSub && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0E1526] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                Formula & Rule Cheat Sheets
              </h3>
              <p className="text-[10px] text-slate-400">High-yield JAMB rules & formulas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Subject Tabs */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search formula, rule, or concept..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {['All', 'Physics', 'Mathematics', 'Chemistry', 'English Language'].map(s => (
              <button
                key={s}
                onClick={() => setSelectedSub(s)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  selectedSub === s
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {s.replace(' Language', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Formulas list */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 no-scrollbar">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{item.title}</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {item.subject}
                </span>
              </div>

              {/* Formula display */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-center">
                <MathText text={item.formula} />
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                <MathText text={item.notes} />
              </p>

              {item.mnemonic && (
                <div className="pt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Sparkles size={12} />
                  <span>Mnemonic: {item.mnemonic}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
