import React, { useState } from 'react';
import { X, Calculator, Delete } from 'lucide-react';
import { sound } from '../../utils/soundEffects';

interface JAMBCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JAMBCalculatorModal({ isOpen, onClose }: JAMBCalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    sound.playTap();
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleDecimal = () => {
    sound.playTap();
    if (waitingForOperand) {
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

  const handleClearEntry = () => {
    sound.playTap();
    setDisplay('0');
  };

  const handleSign = () => {
    sound.playTap();
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay(String(-val));
    }
  };

  const handleSqrt = () => {
    sound.playTap();
    const val = parseFloat(display);
    if (val < 0) {
      setDisplay('Error');
    } else {
      const res = Math.sqrt(val);
      setDisplay(String(Number(res.toFixed(8))));
      setEquation(`√(${val})`);
      setWaitingForOperand(true);
    }
  };

  const handlePercent = () => {
    sound.playTap();
    const val = parseFloat(display);
    setDisplay(String(val / 100));
  };

  const handleOperator = (nextOp: string) => {
    sound.playTap();
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
      setEquation(`${inputValue} ${nextOp}`);
    } else if (operator) {
      const current = prevValue || 0;
      let result = current;
      if (operator === '+') result = current + inputValue;
      else if (operator === '-') result = current - inputValue;
      else if (operator === '×') result = current * inputValue;
      else if (operator === '÷') result = inputValue !== 0 ? current / inputValue : 0;

      const rounded = Number(result.toFixed(8));
      setDisplay(String(rounded));
      setPrevValue(rounded);
      setEquation(`${rounded} ${nextOp}`);
    }

    setWaitingForOperand(true);
    setOperator(nextOp);
  };

  const handleEquals = () => {
    sound.playTap();
    if (operator === null || prevValue === null) return;
    const inputValue = parseFloat(display);
    let result = prevValue;

    if (operator === '+') result = prevValue + inputValue;
    else if (operator === '-') result = prevValue - inputValue;
    else if (operator === '×') result = prevValue * inputValue;
    else if (operator === '÷') result = inputValue !== 0 ? prevValue / inputValue : 0;

    const rounded = Number(result.toFixed(8));
    setEquation(`${prevValue} ${operator} ${inputValue} =`);
    setDisplay(String(rounded));
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl p-4 animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Calculator size={15} />
            </div>
            <div>
              <h3 className="font-display text-xs font-black tracking-wide text-white">
                JAMB CBT Calculator
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase">
                Official 8-Digit Standard
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X size={15} />
          </button>
        </div>

        {/* Display */}
        <div className="my-3.5 p-3 rounded-2xl bg-black/80 border border-slate-800/80 text-right">
          <div className="h-4 text-[10px] text-slate-400 font-mono truncate">
            {equation || ' '}
          </div>
          <div className="text-2xl font-mono font-black text-emerald-400 tracking-wider truncate">
            {display}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-2 text-xs font-black">
          {/* Row 1 */}
          <button
            onClick={handleClear}
            className="py-3 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50 active:scale-95 transition"
          >
            C
          </button>
          <button
            onClick={handleClearEntry}
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 transition"
          >
            CE
          </button>
          <button
            onClick={handleSqrt}
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95 transition"
          >
            √
          </button>
          <button
            onClick={() => handleOperator('÷')}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleDigit('7')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            7
          </button>
          <button
            onClick={() => handleDigit('8')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            8
          </button>
          <button
            onClick={() => handleDigit('9')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            9
          </button>
          <button
            onClick={() => handleOperator('×')}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition"
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            onClick={() => handleDigit('4')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            4
          </button>
          <button
            onClick={() => handleDigit('5')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            5
          </button>
          <button
            onClick={() => handleDigit('6')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            6
          </button>
          <button
            onClick={() => handleOperator('-')}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition"
          >
            -
          </button>

          {/* Row 4 */}
          <button
            onClick={() => handleDigit('1')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            1
          </button>
          <button
            onClick={() => handleDigit('2')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            2
          </button>
          <button
            onClick={() => handleDigit('3')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            3
          </button>
          <button
            onClick={() => handleOperator('+')}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95 transition"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            onClick={handleSign}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 active:scale-95 transition"
          >
            ±
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            0
          </button>
          <button
            onClick={handleDecimal}
            className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white active:scale-95 transition"
          >
            .
          </button>
          <button
            onClick={handleEquals}
            className="py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm active:scale-95 transition"
          >
            =
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-slate-400">
          JAMB allows basic operations only. Scientific functions are not permitted.
        </p>
      </div>
    </div>
  );
}
