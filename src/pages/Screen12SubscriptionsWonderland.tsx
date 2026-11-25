import React, { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  ChevronLeft,
  Crown,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { sound } from '../utils/soundEffects';

interface PlanCardItem {
  id: string;
  name: string;
  priceNgn: string;
  cadence: string;
  tagline: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
}

const SABI_PLANS: PlanCardItem[] = [
  {
    id: 'free',
    name: 'Free Scholar',
    priceNgn: '₦0',
    cadence: 'Forever free',
    tagline: 'Daily Smart Practice & Blitz fundamentals.',
    features: [
      'Smart Practice Guided & Blitz feed',
      'Subject mastery estimate rings',
      'Daily streak & Gold League access',
      '15 starter SABI AI Coach credits / month',
    ],
  },
  {
    id: 'season_unlock',
    name: 'JAMB Season Unlock',
    priceNgn: '₦4,000',
    cadence: 'One-time payment',
    tagline: 'Complete access through your entire JAMB sitting.',
    badge: 'MOST POPULAR',
    highlighted: true,
    features: [
      'Unlimited 180-Q Full Mock & 40-Q Quick CBT Simulator',
      'Full SABI AI Practice Studio & Study Blueprint',
      'Deep step-by-step & Pidgin AI explanations',
      'Saved Questions & Mistake Vault + Offline review',
      '250 SABI AI Coach credits included',
    ],
  },
  {
    id: 'monthly_pass',
    name: 'Monthly Pass',
    priceNgn: '₦1,500',
    cadence: 'Per month · 7-day trial',
    tagline: 'Flexible month-to-month full exam readiness.',
    features: [
      'Everything in JAMB Season Unlock',
      'Start with a 7-day free trial',
      '100 SABI AI Coach credits refreshed monthly',
      'Cancel anytime with zero lock-in',
    ],
  },
];

const AI_CREDIT_PACKS = [
  { id: 'pack_50', credits: 50, price: '₦500', label: 'Quick Top-Up' },
  { id: 'pack_150', credits: 150, price: '₦1,200', label: 'Exam Boost' },
  { id: 'pack_400', credits: 400, price: '₦2,500', label: 'Power Scholar' },
];

/**
 * SCREEN 12 (`/subscriptions`): SUBSCRIPTIONS, ENTITLEMENTS & AI CREDITS
 * Aligned with `sabi-main-doc.md` §24 Monetization Direction & Wonderland UI system.
 */
export function Screen12SubscriptionsWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);

  const [activePlanId, setActivePlanId] = useState<string>(
    () => (typeof window !== 'undefined' && localStorage.getItem('sabi_plan_id')) || 'free'
  );
  const [aiCredits, setAiCredits] = useState<number>(() => {
    if (typeof window === 'undefined') return 15;
    return Number(localStorage.getItem('sabi_ai_credits_preview') || '15') || 15;
  });
  const [selectedCheckout, setSelectedCheckout] = useState<{
    title: string;
    price: string;
    detail: string;
    planId?: string;
    creditDelta?: number;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activePlanObj = SABI_PLANS.find(p => p.id === activePlanId) || SABI_PLANS[0];

  const handleConfirmPreview = () => {
    if (!selectedCheckout) return;
    try {
      sound.playSuccess();
    } catch {
      // ignore
    }

    if (selectedCheckout.planId) {
      const matched = SABI_PLANS.find(p => p.id === selectedCheckout.planId);
      setActivePlanId(selectedCheckout.planId);
      if (typeof window !== 'undefined' && matched) {
        localStorage.setItem('sabi_plan_id', matched.id);
        localStorage.setItem('sabi_plan_label', matched.name);
      }
      if (selectedCheckout.planId === 'season_unlock') {
        const nextCredits = aiCredits + 250;
        setAiCredits(nextCredits);
        localStorage.setItem('sabi_ai_credits_preview', String(nextCredits));
      } else if (selectedCheckout.planId === 'monthly_pass') {
        const nextCredits = aiCredits + 100;
        setAiCredits(nextCredits);
        localStorage.setItem('sabi_ai_credits_preview', String(nextCredits));
      }
    }

    if (selectedCheckout.creditDelta) {
      const nextCredits = aiCredits + selectedCheckout.creditDelta;
      setAiCredits(nextCredits);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sabi_ai_credits_preview', String(nextCredits));
      }
    }

    setStatusMessage(
      `${selectedCheckout.title} preview activated. Live Paystack/Flutterwave server verification connects during backend billing rollout.`
    );
    setSelectedCheckout(null);
  };

  return (
    <SabiAppChrome
      activeTab="subscriptions"
      backdropVariant="home"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1340px] mx-auto px-3 sm:px-5 lg:px-8 pt-3 sm:pt-5 lg:pt-7">
        {/* 1. HEADER */}
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              aria-label="Back to Home"
              className="w-[44px] h-[44px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center transition-transform active:translate-y-[1.5px] cursor-pointer shrink-0"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <ChevronLeft size={22} strokeWidth={2.8} />
            </button>

            <div className="min-w-0">
              <h1
                className="text-[25px] sm:text-[32px] font-bold text-[#260559] leading-tight truncate"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                Subscriptions & Credits
              </h1>
              <p className="text-[13px] sm:text-[14.5px] font-semibold text-[#3C2263]">
                Unlock full CBT mocks, SABI AI Study Studio, and extra AI Coach credits.
              </p>
            </div>
          </div>
          <SabiMenuTriggerButton />
        </header>

        {/* Status Toast */}
        {statusMessage && (
          <div className="mb-4 rounded-[18px] bg-[#2A085E] text-[#FFE824] px-4 py-3 text-[13.5px] font-bold flex items-center justify-between gap-3">
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              aria-label="Dismiss message"
              className="text-white/80 hover:text-white cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* 2. CURRENT PLAN & AI CREDITS SUMMARY BANNER */}
        <section
          className="rounded-[24px] bg-[#3B0D91] p-5 sm:p-6 text-white mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ boxShadow: '0 5px 0 #23055B' }}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-[54px] h-[54px] rounded-[16px] bg-[#FFE824] text-[#260559] flex items-center justify-center shrink-0">
              <Crown size={27} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <div className="text-[11.5px] font-extrabold uppercase tracking-[0.07em] text-[#FFE824]">
                CURRENT ACCESS
              </div>
              <h2
                className="text-[22px] sm:text-[26px] font-bold text-white leading-tight"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                {activePlanObj.name}
              </h2>
              <p className="text-[13px] sm:text-[14px] font-medium text-[#DCD0F5] mt-0.5">
                {activePlanObj.tagline}
              </p>
            </div>
          </div>

          <div className="rounded-[18px] bg-white/12 px-4 py-3 flex items-center gap-3 shrink-0">
            <Sparkles size={20} className="text-[#FFE824] shrink-0" />
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#DCD0F5]">
                SABI AI Credits
              </div>
              <div className="text-[20px] font-extrabold text-[#FFE824] tabular-nums leading-tight">
                {aiCredits} credits
              </div>
            </div>
          </div>
        </section>

        {/* 3. PLANS GRID (1-Col Mobile, 3-Col Tablet/Desktop) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-6 items-stretch">
          {SABI_PLANS.map(plan => {
            const isCurrent = plan.id === activePlanId;
            return (
              <div
                key={plan.id}
                className={`relative rounded-[24px] bg-white p-5 sm:p-6 flex flex-col justify-between ${
                  plan.highlighted
                    ? 'border-[2.5px] border-[#6C19E5]'
                    : 'border-[2.5px] border-transparent'
                }`}
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                {plan.badge && (
                  <span className="absolute -top-3 right-5 px-3 py-1 rounded-full bg-[#FF7A00] text-white text-[10.5px] font-extrabold uppercase tracking-[0.05em]">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <div className="text-[18px] sm:text-[20px] font-extrabold text-[#260559]">
                    {plan.name}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className="text-[32px] sm:text-[36px] font-bold text-[#6C19E5] leading-none tabular-nums"
                      style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                    >
                      {plan.priceNgn}
                    </span>
                    <span className="text-[12.5px] font-bold text-[#5A467A]">{plan.cadence}</span>
                  </div>
                  <p className="mt-2 text-[13.5px] font-semibold text-[#4F3B73] leading-snug">
                    {plan.tagline}
                  </p>

                  <ul className="mt-4 space-y-2.5">
                    {plan.features.map(feat => (
                      <li
                        key={feat}
                        className="flex items-start gap-2.5 text-[13.5px] font-semibold text-[#260559] leading-snug"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#DEF7EC] text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={13} strokeWidth={3} />
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() =>
                      setSelectedCheckout({
                        title: plan.name,
                        price: `${plan.priceNgn} · ${plan.cadence}`,
                        detail: plan.tagline,
                        planId: plan.id,
                      })
                    }
                    className={`w-full py-3.5 px-4 rounded-[18px] font-bold text-[15.5px] uppercase tracking-wide transition-transform active:translate-y-[1.5px] ${
                      isCurrent
                        ? 'bg-[#EFE6FF] text-[#6C19E5] cursor-default'
                        : plan.highlighted
                        ? 'bg-[#6C19E5] hover:brightness-105 text-white cursor-pointer'
                        : 'bg-[#2A085E] hover:brightness-110 text-[#FFE824] cursor-pointer'
                    }`}
                    style={{
                      fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                      boxShadow: isCurrent
                        ? 'none'
                        : plan.highlighted
                        ? '0 4px 0 #46099E'
                        : '0 4px 0 #170338',
                    }}
                  >
                    {isCurrent ? 'Current Plan' : `Choose ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* 4. AI CREDITS TOP-UPS + SCHOOL LICENCES */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-stretch">
          <section
            className="md:col-span-7 bg-white rounded-[24px] p-5 sm:p-6"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-9 h-9 rounded-[12px] bg-[#FFE824] text-[#260559] flex items-center justify-center">
                <Zap size={19} className="fill-[#6C19E5] text-[#6C19E5]" />
              </div>
              <div>
                <h2 className="text-[17.5px] font-extrabold text-[#260559] leading-tight">
                  SABI AI Credit Top-Ups
                </h2>
                <p className="text-[12.5px] font-semibold text-[#5A467A]">
                  Extra credits for deep SABI AI tutoring, custom study plans & explanations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AI_CREDIT_PACKS.map(pack => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() =>
                    setSelectedCheckout({
                      title: `+${pack.credits} SABI AI Credits`,
                      price: pack.price,
                      detail: `${pack.label} bundle added to your AI Coach credit wallet.`,
                      creditDelta: pack.credits,
                    })
                  }
                  className="rounded-[18px] bg-[#FAF8FF] hover:bg-[#F3ECFF] border border-[#E5DAF9] p-4 text-left transition-transform active:translate-y-[1px] cursor-pointer"
                >
                  <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#6C19E5]">
                    {pack.label}
                  </div>
                  <div
                    className="mt-1 text-[22px] font-bold text-[#260559] tabular-nums"
                    style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                  >
                    +{pack.credits} Credits
                  </div>
                  <div className="mt-1.5 text-[14.5px] font-extrabold text-[#059669] tabular-nums">
                    {pack.price}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* SCHOOL / TUTORIAL CENTRE LICENCE */}
          <section
            className="md:col-span-5 bg-white rounded-[24px] p-5 sm:p-6 flex flex-col justify-between"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-[12px] bg-[#DEF7EC] text-[#047857] flex items-center justify-center">
                  <Building2 size={19} strokeWidth={2.4} />
                </div>
                <h2 className="text-[17.5px] font-extrabold text-[#260559]">
                  Schools & Tutorial Centres
                </h2>
              </div>
              <p className="text-[13.5px] font-semibold text-[#4F3B73] leading-relaxed">
                Preparing SS3 or JAMB classes together? Bulk school licences unlock cohort mastery
                analytics and CBT mock packs for every candidate.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2ECFC] flex items-center justify-between text-[12.5px] font-bold text-[#5A467A]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#059669]" />
                <span>Server-verified entitlements</span>
              </span>
              <span className="text-[#6C19E5] font-extrabold">Contact: schools@sabi.ng</span>
            </div>
          </section>
        </div>
      </main>

      {/* CHECKOUT CONFIRMATION MODAL */}
      {selectedCheckout && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm plan preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#170338]/65 backdrop-blur-xs px-4"
          onClick={() => setSelectedCheckout(null)}
        >
          <div
            className="w-full max-w-[410px] rounded-[26px] bg-white p-5 sm:p-6 text-[#260559]"
            style={{ boxShadow: '0 6px 0 #E2C700' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6C19E5]">
                  SUBSCRIPTION PREVIEW
                </div>
                <h3
                  className="text-[22px] font-bold text-[#260559] leading-tight mt-0.5"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {selectedCheckout.title}
                </h3>
                <div className="text-[15px] font-extrabold text-[#059669] mt-0.5">
                  {selectedCheckout.price}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCheckout(null)}
                aria-label="Close modal"
                className="w-9 h-9 rounded-full bg-[#F3EEFD] text-[#260559] flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[14px] font-semibold text-[#4F3B73] leading-relaxed mb-5">
              {selectedCheckout.detail} Payment confirmation will use verified Paystack /
              Flutterwave webhooks once backend billing is enabled.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleConfirmPreview}
                className="flex-1 py-3.5 rounded-[16px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[15px] uppercase tracking-wide cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 0 #46099E',
                }}
              >
                Activate Preview
              </button>
              <button
                type="button"
                onClick={() => setSelectedCheckout(null)}
                className="px-4 py-3.5 rounded-[16px] bg-[#F3EEFD] text-[#260559] font-extrabold text-[14px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </SabiAppChrome>
  );
}
