import React, { useState, useRef, useEffect } from 'react';
import { StudentProfile, SubjectName, MasteryMapItem } from '../types';
import { Send, Loader2, Sparkles, AlertCircle, Info, ChevronDown, BookOpen, ChevronRight } from 'lucide-react';
import MathText from './MathText';

interface ChatMessage {
  id: string;
  sender: 'user' | 'model';
  text: string;
}

interface SabiAIChatProps {
  profile: StudentProfile | null;
  onUpdateXp: (xp: number) => void;
  masteryMap?: Record<string, MasteryMapItem>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  chatSubject: 'English Language' | 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology';
  setChatSubject: (sub: 'English Language' | 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology') => void;
  chatTopic: string;
  setChatTopic: (topic: string) => void;
  isChatActive: boolean;
  setIsChatActive: (active: boolean) => void;
}

const TOPICS_BY_SUBJECT: Record<string, string[]> = {
  'English Language': ['Proximity Concord', 'Synonyms', 'Subjunctive Mood'],
  'Mathematics': ['Quadratic Equations', 'Indices', 'Calculus'],
  'Physics': ['Mechanics', 'Electricity', 'Waves & Optics'],
  'Chemistry': ['Atomic Structure', 'Gases', 'Acids, Bases & Salts'],
  'Biology': ['Cell Biology', 'Genetics', 'Ecology']
};

export default function SabiAIChat({
  profile,
  onUpdateXp,
  masteryMap = {},
  messages,
  setMessages,
  chatSubject,
  setChatSubject,
  chatTopic,
  setChatTopic,
  isChatActive,
  setIsChatActive
}: SabiAIChatProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeBottomSheet, setActiveBottomSheet] = useState<'subject' | 'topic' | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Hook for network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compute dynamic performance statement linked to actual student history
  const currentMasteryItem = Object.values(masteryMap || {}).find(
    (m: any) => m.topic === chatTopic && m.subject === chatSubject
  );
  const missedCount = currentMasteryItem?.history?.filter((h: any) => !h.correct).length || 0;
  const totalAttempts = currentMasteryItem?.history?.length || 0;

  let performanceText = `You haven't attempted any question on ${chatTopic} yet. Sabi AI recommends building a solid foundation here to avoid blind spots in your JAMB exam!`;
  if (missedCount > 0) {
    performanceText = `You missed ${missedCount} question${missedCount > 1 ? 's' : ''} on ${chatTopic} during your recent practice sessions. Let's close your knowledge gaps and master this topic together!`;
  } else if (totalAttempts > 0) {
    performanceText = `Superb achievement! You got all ${totalAttempts} practice question${totalAttempts > 1 ? 's' : ''} correct on ${chatTopic}. Sabi AI is standing by to take you through advanced formulas and tricky catch questions!`;
  }

  // Get topics for active subject sorted by mastery_score in ascending order (weakest first)
  const sortedTopics = (TOPICS_BY_SUBJECT[chatSubject] || []).map(topic => {
    const item = Object.values(masteryMap || {}).find(
      (m: any) => m.topic === topic && m.subject === chatSubject
    );
    return {
      topic,
      score: item ? item.score : 40 // Default to 40% if hasn't been practiced
    };
  }).sort((a, b) => a.score - b.score);

  const handleSend = async (textOverride?: string) => {
    if (!isOnline) return;
    const textToSend = textOverride || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) {
      setInput('');
    }
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          currentTopic: chatTopic,
          currentSubject: chatSubject,
          studentProfile: profile,
          topicMemory: profile?.topicMemories?.[chatTopic] || ''
        })
      });

      const data = await response.json();
      
      const modelMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        sender: 'model',
        text: data.reply || `I didn't capture that concept note. Ask me another question on ${chatTopic}!`
      };

      setMessages((prev) => [...prev, modelMsg]);
      onUpdateXp(15); // Reward 15 XP for studying with Sabi AI
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `m-error-${Date.now()}`,
        sender: 'model',
        text: `My friend, I hit a slight connection glitch. But make we focus! Under "${chatTopic}", make sure you grab the core formulas/cases. Try asking again.`
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const latestMessage = messages[messages.length - 1];
  const isLatestModel = latestMessage && latestMessage.sender === 'model';

  return (
    <div id="tutor-chat-screen" className="flex flex-col flex-1 h-full w-full bg-white border border-[#D6E4F0] rounded-2xl overflow-hidden shadow-sm relative min-h-0">
      
      {/* Sabi Tutor Header */}
      <div className="p-3.5 border-b border-[#D6E4F0] bg-gradient-to-r from-[#0A1128] to-[#4A90D9] text-white flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#F5C518] text-[#0A1128] flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-display uppercase tracking-wide">Grounding RAG Coach</h4>
            <p className="text-[9px] text-[#D6E4F0]/90">Dual-Pass Verified JAMB Syllabus Logic</p>
          </div>
        </div>
        <div className="flex bg-white/20 p-1.5 rounded-lg border border-white/20">
          <Sparkles className="h-4 w-4 text-[#F5C518]" />
        </div>
      </div>

      {/* ZONE 1: Context Bar (Top) with end-spacing content style */}
      <div className="p-2.5 border-b border-indigo-50/50 bg-slate-50 flex gap-2 overflow-x-auto shrink-0 z-10 select-none scrollbar-none" style={{ paddingRight: 24 }}>
        <button
          onClick={() => setActiveBottomSheet('subject')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#4A90D9] rounded-full text-[10px] font-black text-slate-700 uppercase tracking-wider transition shrink-0"
        >
          <BookOpen className="h-3 w-3 text-[#4A90D9]" />
          <span>Subject: {chatSubject}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
        <button
          onClick={() => setActiveBottomSheet('topic')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#4A90D9] rounded-full text-[10px] font-black text-[#0A1128] uppercase tracking-wider transition shrink-0 max-w-[200px]"
        >
          <Sparkles className="h-3 w-3 text-[#F5C518]" />
          <span className="truncate">Topic: {chatTopic}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
        <div className="w-6 shrink-0" style={{ minWidth: 24 }} />
      </div>

      {/* ZONE 2 or ACTIVE CHAT STAGE (ZONE 3 & 4) */}
      {!isChatActive ? (
        <div className="flex-1 p-4 flex flex-col justify-center items-center bg-[#F4F7FB]/40 overflow-y-auto z-10">
          <div className="bg-white border border-[#D6E4F0] rounded-2xl p-5 w-full max-w-sm shadow-md space-y-4 animate-fade-in relative overflow-hidden bg-gradient-to-br from-white to-[#F8FBFF]">
            <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-24 h-24 bg-sky-50/40 rounded-full filter blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#EBF1FA] text-[#4A90D9] flex items-center justify-center border border-[#D0E1F9]">
                <Sparkles className="h-4.5 w-4.5 text-[#4A90D9]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#0A1128] uppercase tracking-wider">
                  Hello {profile?.name?.trim().split(' ')[0] || 'Student'}!
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your Personalized Sabi Coach</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-650 font-bold leading-normal text-[#0A1128]">
                {performanceText}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                I am your syllabus boundaries buddy. Pick your focus topic above or let me guide you through the next best concept!
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <span className="text-[8.5px] font-bold text-slate-405 uppercase tracking-wider block">Quick study starters:</span>
              <button
                onClick={() => {
                  setIsChatActive(true);
                  handleSend("Walk me through the method");
                }}
                disabled={!isOnline}
                className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-[#4A90D9]/50 hover:bg-slate-50 text-slate-700 hover:text-[#0A1128] transition font-extrabold text-[11px] flex justify-between items-center disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>📖 Walk me through the method</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-450" />
              </button>
              <button
                onClick={() => {
                  setIsChatActive(true);
                  handleSend("I have a specific question");
                }}
                disabled={!isOnline}
                className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-[#4A90D9]/50 hover:bg-slate-50 text-slate-700 hover:text-[#0A1128] transition font-extrabold text-[11px] flex justify-between items-center disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>✍️ I have a specific question</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-450" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ZONE 3: Chat Messages thread list viewport */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8f9fc]/30 scrollbar-none z-10 min-h-0 flex flex-col">
            <div className="space-y-3 flex-1">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] text-[11px] leading-relaxed shadow-sm border ${m.sender === 'user' ? 'bg-[#0A1128] text-white border-[#0A1128] rounded-br-[2px]' : 'bg-white text-slate-800 border-[#D6E4F0] rounded-bl-[2px]'}`}>
                    {m.sender === 'model' && (
                      <span className="block text-[8px] uppercase tracking-wider font-extrabold text-[#4A90D9] mb-1">
                        Sabi AI Coach
                      </span>
                    )}
                    <div className="leading-relaxed font-sans text-[11px] overflow-x-hidden">
                      <MathText text={m.text} />
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start animate-pulse-slow">
                  <div className="bg-white border border-[#D6E4F0] p-3 rounded-2xl rounded-bl-[2px] shadow-sm flex flex-col gap-1.5">
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#4A90D9]">
                      Sabi AI Coach
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-0.5 py-1">
                        <div className="w-1.5 h-1.5 bg-[#4A90D9] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-[#4A90D9] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-[#4A90D9] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-[10px] text-slate-550 font-bold">Concept retrieval matches...</span>
                    </div>
                  </div>
                </div>
              )}

              {isLatestModel && !loading && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-1 animate-fade-in pb-1 select-none">
                  {['Show me an example', 'Test me on this topic', 'Simplify this explanation'].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSend(chip)}
                      className="px-2.5 py-1.5 bg-[#EBF1FA] text-[#0A1128] hover:bg-[#4A90D9]/10 border border-[#D0E1F9] hover:border-[#4A90D9] rounded-xl text-[10px] font-extrabold transition shadow-sm shrink-0"
                    >
                      ✨ {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* ZONE 4: Network Aware Input Bar (Bottom) */}
          <div className="flex-shrink-0 z-10 border-t border-[#D6E4F0] bg-white">
            {!isOnline && (
              <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2 text-[10px] text-red-650 animate-fade-in font-extrabold uppercase tracking-wide">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span>Tutor requires internet. Practice is still available offline.</span>
              </div>
            )}
            
            <div className="p-2 flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder={isOnline ? `Ask Sabi AI about ${chatTopic}...` : `Tutor requires internet. Practice is still available offline.`}
                disabled={!isOnline}
                className={`flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#4A90D9] font-bold ${!isOnline ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-150' : 'bg-slate-50/50 text-slate-800'}`}
              />
              {isOnline && (
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="p-2 rounded-xl bg-[#0A1128] text-[#F5C518] hover:bg-[#040814] transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="h-3.5 w-3.5 animate-pulse-slow" />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Interactive Bottom Sheet Select Drawer */}
      {activeBottomSheet && (
        <div className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex flex-col justify-end">
          <div className="flex-1" onClick={() => setActiveBottomSheet(null)} />
          <div className="bg-white rounded-t-3xl p-5 border-t border-slate-200 animate-slide-up flex flex-col max-h-[75%] shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-black text-[#0A1128] uppercase tracking-widest flex items-center gap-2">
                {activeBottomSheet === 'subject' ? '🎯 Select Focus Subject' : '🧠 Select Weakest Topic First'}
              </h4>
              <button
                onClick={() => setActiveBottomSheet(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2.5 py-1 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
            
            <div className="overflow-y-auto space-y-2 flex-1 pb-4 min-h-0 select-none scrollbar-none">
              {activeBottomSheet === 'subject' ? (
                (((profile as any)?.subjects || profile?.chosenSubjects || ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology']) as SubjectName[]).map(sub => (
                  <button
                    key={sub}
                    onClick={() => {
                      setChatSubject(sub as any);
                      
                      // Cascading Dropdown state logic reset
                      const topicsList = TOPICS_BY_SUBJECT[sub] || [];
                      const sorted = topicsList.map(t => {
                        const item = Object.values(masteryMap || {}).find((m: any) => m.topic === t && m.subject === sub);
                        return { topic: t, score: item ? item.score : 40 };
                      }).sort((a, b) => a.score - b.score);
                      
                      if (sorted.length > 0) {
                        setChatTopic(sorted[0].topic);
                      }
                      
                      // Clear active chat session slice on explicit subject change
                      setMessages([]);
                      setIsChatActive(false);
                      setActiveBottomSheet(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border font-bold text-xs transition flex justify-between items-center ${chatSubject === sub ? 'bg-[#0A1128] text-white border-[#0A1128]' : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'}`}
                  >
                    <span>{sub}</span>
                    {chatSubject === sub && <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Active</span>}
                  </button>
                ))
              ) : (
                sortedTopics.map(({ topic, score }) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setChatTopic(topic);
                      // Clear active chat session slice on explicit topic change
                      setMessages([]);
                      setIsChatActive(false);
                      setActiveBottomSheet(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border font-bold text-xs transition flex justify-between items-center ${chatTopic === topic ? 'bg-[#0A1128] text-white border-[#0A1128]' : 'bg-slate-50 text-slate-705 border-slate-100 hover:bg-slate-100'}`}
                  >
                    <div className="flex flex-col pr-2 min-w-0">
                      <span className="truncate">{topic}</span>
                      <span className={`text-[9px] mt-0.5 ${chatTopic === topic ? 'text-slate-350' : 'text-slate-450'}`}>
                        Topic Score: {score}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-extrabold uppercase font-mono ${score < 55 ? 'bg-red-100 text-red-650' : score < 75 ? 'bg-yellow-100 text-yellow-650' : 'bg-emerald-100 text-emerald-650'}`}>
                        {score < 55 ? 'Weakest' : score < 75 ? 'Growing' : 'Mastered'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
