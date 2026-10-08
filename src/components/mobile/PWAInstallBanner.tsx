import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, Sparkles, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { sound } from '../../utils/soundEffects';

interface PWAInstallBannerProps {
  onDismiss?: () => void;
}

export default function PWAInstallBanner({ onDismiss }: PWAInstallBannerProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  const handleInstallClick = async () => {
    sound.playTap();
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        sound.playCelebration();
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleClose = () => {
    sound.playTap();
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A1128] via-[#0D1B3E] to-[#102A54] p-3.5 text-white shadow-lg border border-emerald-500/30">
        <div className="absolute top-0 right-0 -mt-3 -mr-3 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Install Sabi Mobile App</span>
                <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/30 text-emerald-300 text-[9px] font-black tracking-wide">
                  OFFLINE CBT
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                Install to home screen for lightning-fast past questions without network.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition shrink-0"
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
          >
            <Download size={13} />
            <span>{isIOS ? 'Install on iPhone' : 'Install App'}</span>
          </button>

          {isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-medium"
            >
              How-To Guide
            </button>
          )}
        </div>
      </div>

      {/* iOS Safari Installation Guide Sheet */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#111A2E] p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <Smartphone size={16} />
                </div>
                <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                  Install on iOS Safari
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apple does not allow automatic 1-click install in Safari. Follow these 2 easy steps:
            </p>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                  <Share size={13} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Step 1: Tap Share</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tap the <strong>Share</strong> icon in the bottom menu bar of Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                  <PlusSquare size={13} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Step 2: Add to Home Screen</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Scroll down and select <strong>"Add to Home Screen"</strong>, then tap <strong>Add</strong>.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs"
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
