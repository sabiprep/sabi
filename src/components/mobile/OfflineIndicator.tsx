import React from 'react';
import { WifiOff, CheckCircle } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm px-3.5 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md shadow-xl border border-emerald-500/30 flex items-center gap-2.5 animate-bounce-subtle">
      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
        <WifiOff size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
          <span>Offline Practice Active</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </p>
        <p className="text-[10px] text-slate-300 truncate">
          1,519+ CBT Past Questions cached & ready without data.
        </p>
      </div>
    </div>
  );
}
