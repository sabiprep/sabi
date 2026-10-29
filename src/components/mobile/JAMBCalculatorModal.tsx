import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Calculator,
  Minus,
  Maximize2,
  Minimize2,
  GripHorizontal,
  Delete,
  RotateCcw,
} from 'lucide-react';
import { sound } from '../../utils/soundEffects';

interface JAMBCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CalcSizeMode = 'minimized' | 'standard' | 'enlarged';

export default function JAMBCalculatorModal({ isOpen, onClose }: JAMBCalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<number>(0);
  const [angleUnit, setAngleUnit] = useState<'DEG' | 'RAD'>('DEG');
  const [sizeMode, setSizeMode] = useState<CalcSizeMode>('standard');

  // Floating Draggable Position State
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 24, y: 72 };
    const startX = Math.max(12, Math.min(window.innerWidth - 360, window.innerWidth - 380));
    return { x: startX, y: 76 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.max(8, Math.min(prev.x, window.innerWidth - 260)),
        y: Math.max(8, Math.min(prev.y, window.innerHeight - 100)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Do not start dragging if user clicked a window control button
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragOffset.current = {
      dx: e.clientX - position.x,
      dy: e.clientY - position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const maxW = typeof window !== 'undefined' ? window.innerWidth - 180 : 1000;
    const maxH = typeof window !== 'undefined' ? window.innerHeight - 64 : 800;
    const nextX = Math.max(6, Math.min(maxW, e.clientX - dragOffset.current.dx));
    const nextY = Math.max(6, Math.min(maxH, e.clientY - dragOffset.current.dy));
    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
  };

  const formatNumber = (val: number): string => {
    if (!Number.isFinite(val)) return 'Error';
    const rounded = Number(val.toPrecision(10));
    return String(rounded);
  };

  const handleDigit = (digit: string) => {
    sound.playTap();
    if (waitingForOperand || display === 'Error') {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleDecimal = () => {
    sound.playTap();
    if (waitingForOperand || display === 'Error') {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    sound.playTap();
    setDisplay('0');
    setEquation('');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    sound.playTap();
    if (waitingForOperand || display === 'Error') {
      setDisplay('0');
      return;
    }
    if (display.length <= 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleSign = () => {
    sound.playTap();
    const val = parseFloat(display);
    if (!isNaN(val) && val !== 0) {
      setDisplay(String(-val));
    }
  };

  const handleConstant = (name: 'π' | 'e' | 'ANS') => {
    sound.playTap();
    const val = name === 'π' ? Math.PI : name === 'e' ? Math.E : lastAnswer;
    setDisplay(formatNumber(val));
    setEquation(name);
    setWaitingForOperand(true);
  };

  const handleUnaryScientific = (
    fn:
      | 'sqrt'
      | 'cbrt'
      | 'sq'
      | 'inv'
      | 'percent'
      | 'sin'
      | 'cos'
      | 'tan'
      | 'log'
      | 'ln'
      | 'exp10'
  ) => {
    sound.playTap();
    const val = parseFloat(display);
    if (isNaN(val)) return;

    const toRad = (v: number) => (angleUnit === 'DEG' ? (v * Math.PI) / 180 : v);
    let res = val;
    let label = '';

    switch (fn) {
      case 'sqrt':
        if (val < 0) {
          setDisplay('Error');
          setEquation(`√(${val})`);
          setWaitingForOperand(true);
          return;
        }
        res = Math.sqrt(val);
        label = `√(${val})`;
        break;
      case 'cbrt':
        res = Math.cbrt(val);
        label = `³√(${val})`;
        break;
      case 'sq':
        res = val * val;
        label = `(${val})²`;
        break;
      case 'inv':
        if (val === 0) {
          setDisplay('Error');
          return;
        }
        res = 1 / val;
        label = `1/(${val})`;
        break;
      case 'percent':
        res = val / 100;
        label = `${val}%`;
        break;
      case 'sin':
        res = Math.sin(toRad(val));
        label = `sin(${val}${angleUnit === 'DEG' ? '°' : ''})`;
        break;
      case 'cos':
        res = Math.cos(toRad(val));
        label = `cos(${val}${angleUnit === 'DEG' ? '°' : ''})`;
        break;
      case 'tan':
        res = Math.tan(toRad(val));
        label = `tan(${val}${angleUnit === 'DEG' ? '°' : ''})`;
        break;
      case 'log':
        if (val <= 0) {
          setDisplay('Error');
          return;
        }
        res = Math.log10(val);
        label = `log₁₀(${val})`;
        break;
      case 'ln':
        if (val <= 0) {
          setDisplay('Error');
          return;
        }
        res = Math.log(val);
        label = `ln(${val})`;
        break;
      case 'exp10':
        res = Math.pow(10, val);
        label = `10^(${val})`;
        break;
    }

    const formatted = formatNumber(res);
    setDisplay(formatted);
    if (formatted !== 'Error') {
      setLastAnswer(Number(formatted));
    }
    setEquation(label);
    setWaitingForOperand(true);
  };

  const evaluateBinary = (left: number, right: number, op: string): number => {
    if (op === '+') return left + right;
    if (op === '-') return left - right;
    if (op === '×') return left * right;
    if (op === '÷') return right !== 0 ? left / right : NaN;
    if (op === 'xʸ') return Math.pow(left, right);
    return right;
  };

  const handleOperator = (nextOp: string) => {
    sound.playTap();
    const inputValue = parseFloat(display);
    if (isNaN(inputValue)) return;

    if (prevValue === null) {
      setPrevValue(inputValue);
      setEquation(`${inputValue} ${nextOp === 'xʸ' ? '^' : nextOp}`);
    } else if (operator && !waitingForOperand) {
      const result = evaluateBinary(prevValue, inputValue, operator);
      const formatted = formatNumber(result);
      setDisplay(formatted);
      if (formatted !== 'Error') {
        const numeric = Number(formatted);
        setPrevValue(numeric);
        setLastAnswer(numeric);
        setEquation(`${formatted} ${nextOp === 'xʸ' ? '^' : nextOp}`);
      } else {
        setPrevValue(null);
      }
    } else {
      setEquation(`${prevValue} ${nextOp === 'xʸ' ? '^' : nextOp}`);
    }

    setWaitingForOperand(true);
    setOperator(nextOp);
  };

  const handleEquals = () => {
    sound.playTap();
    if (operator === null || prevValue === null) return;
    const inputValue = parseFloat(display);
    if (isNaN(inputValue)) return;

    const result = evaluateBinary(prevValue, inputValue, operator);
    const formatted = formatNumber(result);
    setEquation(`${prevValue} ${operator === 'xʸ' ? '^' : operator} ${inputValue} =`);
    setDisplay(formatted);
    if (formatted !== 'Error') {
      setLastAnswer(Number(formatted));
    }
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  // ==========================================================
  // 1. MINIMIZED FLOATING PILL STATE
  // ==========================================================
  if (sizeMode === 'minimized') {
    return (
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed z-[90] select-none shadow-[0_14px_34px_rgba(0,0,0,0.65)] rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 border-2 border-amber-400 text-white px-3.5 py-2.5 flex items-center gap-3 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black">
            <Calculator size={15} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block leading-none">
              SABI Calc (Drag Me)
            </span>
            <span className="text-sm font-mono font-black text-emerald-400 leading-tight block max-w-[110px] truncate">
              {display}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setSizeMode('standard');
            }}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
            title="Restore Calculator"
          >
            <Maximize2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer"
            title="Close Calculator"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================
  // 2. STANDARD OR ENLARGED SCIENTIFIC FLOATING WINDOW
  // ==========================================================
  const isEnlarged = sizeMode === 'enlarged';

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className={`fixed z-[90] select-none rounded-3xl bg-[#090F1E] border-2 border-amber-400/90 text-white shadow-[0_24px_60px_rgba(0,0,0,0.85)] transition-[width] duration-200 overflow-hidden ${
        isEnlarged ? 'w-[360px] sm:w-[430px]' : 'w-[300px] sm:w-[330px]'
      }`}
    >
      {/* DRAGGABLE GRIP HEADER BAR */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="px-3.5 py-2.5 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-b border-slate-800 flex items-center justify-between cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-sm">
            <Calculator size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-xs font-black tracking-wide text-white">
                SABI Scientific Calc
              </h3>
              <GripHorizontal size={13} className="text-amber-400/80" />
            </div>
            <p className="text-[9px] text-amber-300/90 font-bold uppercase tracking-wider">
              Drag Header Anywhere · {isEnlarged ? 'Expanded Lab Mode' : 'Compact Mode'}
            </p>
          </div>
        </div>

        {/* Window Controls: Minimize | Enlarge/Shrink | Close */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setSizeMode('minimized');
            }}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-amber-400 transition cursor-pointer"
            title="Minimize to Floating Pill"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setSizeMode(isEnlarged ? 'standard' : 'enlarged');
            }}
            className="w-7 h-7 rounded-lg bg-blue-700/80 hover:bg-blue-600 flex items-center justify-center text-white transition cursor-pointer"
            title={isEnlarged ? 'Switch to Compact Size' : 'Enlarge Scientific Functions'}
          >
            {isEnlarged ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-7 h-7 rounded-lg bg-rose-950/80 hover:bg-rose-600 border border-rose-700/50 flex items-center justify-center text-rose-200 hover:text-white transition cursor-pointer"
            title="Close Calculator"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* LCD MATRIX DISPLAY */}
      <div className="p-3.5">
        <div className="p-3 rounded-2xl bg-[#040811] border-2 border-slate-800 shadow-inner text-right relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 mb-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAngleUnit(prev => (prev === 'DEG' ? 'RAD' : 'DEG'))}
                className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-700/50 text-amber-400 text-[9px] font-black cursor-pointer"
              >
                {angleUnit}
              </button>
              <span className="text-[9px] text-slate-500">ANS: {formatNumber(lastAnswer)}</span>
            </div>
            <span className="truncate max-w-[160px] text-amber-300/90">{equation || 'READY'}</span>
          </div>
          <div
            className={`${
              isEnlarged ? 'text-3xl' : 'text-2xl'
            } font-mono font-black text-emerald-400 tracking-wider truncate`}
          >
            {display}
          </div>
        </div>

        {/* SCIENTIFIC RIBBON (Always accessible; expanded in Enlarged Mode) */}
        <div className={`mt-2.5 grid ${isEnlarged ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5 text-[11px] font-black`}>
          <button
            type="button"
            onClick={() => handleUnaryScientific('sin')}
            className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-amber-300 border border-slate-800 cursor-pointer"
          >
            sin
          </button>
          <button
            type="button"
            onClick={() => handleUnaryScientific('cos')}
            className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-amber-300 border border-slate-800 cursor-pointer"
          >
            cos
          </button>
          <button
            type="button"
            onClick={() => handleUnaryScientific('tan')}
            className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-amber-300 border border-slate-800 cursor-pointer"
          >
            tan
          </button>
          <button
            type="button"
            onClick={() => handleUnaryScientific('sqrt')}
            className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-cyan-300 border border-slate-800 cursor-pointer"
          >
            √x
          </button>
          {isEnlarged && (
            <button
              type="button"
              onClick={() => handleUnaryScientific('cbrt')}
              className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-cyan-300 border border-slate-800 cursor-pointer"
            >
              ³√x
            </button>
          )}

          <button
            type="button"
            onClick={() => handleUnaryScientific('sq')}
            className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-cyan-300 border border-slate-800 cursor-pointer"
          >
            x²
          </button>
          <button
            type="button"
            onClick={() => handleOperator('xʸ')}
            className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-cyan-300 border border-slate-800 cursor-pointer"
          >
            xʸ
          </button>
          <button
            type="button"
            onClick={() => handleUnaryScientific('log')}
            className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-amber-300 border border-slate-800 cursor-pointer"
          >
            log
          </button>
          <button
            type="button"
            onClick={() => handleUnaryScientific('ln')}
            className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-amber-300 border border-slate-800 cursor-pointer"
          >
            ln
          </button>
          {isEnlarged && (
            <button
              type="button"
              onClick={() => handleUnaryScientific('inv')}
              className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-cyan-300 border border-slate-800 cursor-pointer"
            >
              1/x
            </button>
          )}

          {isEnlarged && (
            <>
              <button
                type="button"
                onClick={() => handleConstant('π')}
                className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-emerald-300 border border-slate-800 cursor-pointer"
              >
                π
              </button>
              <button
                type="button"
                onClick={() => handleConstant('e')}
                className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-emerald-300 border border-slate-800 cursor-pointer"
              >
                e
              </button>
              <button
                type="button"
                onClick={() => handleUnaryScientific('exp10')}
                className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-emerald-300 border border-slate-800 cursor-pointer"
              >
                10ˣ
              </button>
              <button
                type="button"
                onClick={() => handleUnaryScientific('percent')}
                className="py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-emerald-300 border border-slate-800 cursor-pointer"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => handleConstant('ANS')}
                className="py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer"
              >
                ANS
              </button>
            </>
          )}
        </div>

        {/* MAIN NUMERIC & ARITHMETIC KEYPAD */}
        <div className="mt-2 grid grid-cols-4 gap-2 text-xs sm:text-sm font-black">
          <button
            type="button"
            onClick={handleClear}
            className="py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/50 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>AC</span>
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
          >
            <Delete size={14} />
            <span>DEL</span>
          </button>
          <button
            type="button"
            onClick={() => handleConstant('ANS')}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 active:scale-95 transition cursor-pointer"
          >
            ANS
          </button>
          <button
            type="button"
            onClick={() => handleOperator('÷')}
            className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm active:scale-95 transition cursor-pointer"
          >
            ÷
          </button>

          {['7', '8', '9'].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white active:scale-95 transition cursor-pointer"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('×')}
            className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm active:scale-95 transition cursor-pointer"
          >
            ×
          </button>

          {['4', '5', '6'].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white active:scale-95 transition cursor-pointer"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('-')}
            className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm active:scale-95 transition cursor-pointer"
          >
            −
          </button>

          {['1', '2', '3'].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white active:scale-95 transition cursor-pointer"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleOperator('+')}
            className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm active:scale-95 transition cursor-pointer"
          >
            +
          </button>

          <button
            type="button"
            onClick={handleSign}
            className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 active:scale-95 transition cursor-pointer"
          >
            ±
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white active:scale-95 transition cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDecimal}
            className="py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white active:scale-95 transition cursor-pointer"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black shadow-md active:scale-95 transition cursor-pointer"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
}
