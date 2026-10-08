import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Loader2, ArrowRight } from 'lucide-react';
import { SubjectName } from '../../types';
import MathText from '../MathText';

interface MobileAITutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: SubjectName;
  initialTopic?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export default function MobileAITutorModal({
  isOpen,
  onClose,
  initialSubject = 'Physics',
  initialTopic = 'Waves & Optics',
}: MobileAITutorModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Hello David! 👋 I am **Sabi AI**, your personal JAMB tutor. Ask me any question, formula breakdown, or past question explanation in English or Nigerian Pidgin!`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: 'DAILY-CHALLENGE-1',
          preference: 'step-by-step',
          userCustomPrompt: textToSend,
        }),
      });
      const data = await res.json();
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.explanation || 'Critical angle occurs when the angle of incidence produces an angle of refraction of 90 degrees. Remember: $\\sin(\\theta_c) = 1/n$.',
      };
      setMessages(prev => [...prev, aiReply]);
    } catch (err) {
      // Fallback response
      const fallback: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Here is the key breakdown for **${initialSubject}**: Whenever light moves from a denser medium (like water, $n=1.33$) to a rarer medium (air), the critical angle satisfies $\\sin(\\theta_c) = 1/n = 1/1.33 = 0.75$. Always remember this formula for your JAMB exam!`,
      };
      setMessages(prev => [...prev, fallback]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0E1526] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-[650px]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Sabi AI Tutor</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                  Online
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">Step-by-step doubt solver</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <Bot size={15} />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl text-xs max-w-[82%] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white rounded-tr-xs'
                    : 'bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                }`}
              >
                <MathText text={msg.text} />
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-9">
              <Loader2 size={14} className="animate-spin text-violet-600" />
              <span>Sabi AI is typing explanation...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            'Explain Proximity Concord',
            'How to solve refractive index?',
            'Explain am for Pidgin 🇳🇬',
          ].map(prompt => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-violet-400 border border-transparent transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-[#0E1526]">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask Sabi AI anything..."
            className="flex-1 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-violet-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || loading}
            className="p-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white disabled:opacity-40 transition active:scale-95"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
