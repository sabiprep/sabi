import React, { useMemo } from 'react';
import { ArrowRight, Monitor, SlidersHorizontal, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, type SabiNavTab } from '../components/common/SabiAppChrome';
import { SabiGraduationBooksIllustration } from '../components/common/SabiWonderlandShell';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';

interface WonderlandComingNextScreenProps {
  tab: SabiNavTab;
  title: string;
  subtitle: string;
  detail: string;
  icon: 'cbt' | 'custom' | 'profile';
}

/**
 * Cohesive Wonderland placeholder surface for tabs/modes whose dedicated UI mockups
 * will arrive in the next upload batch (CBT Simulator, Custom Practice, Profile).
 * Ensures zero dead clicks across the bottom navigation bar and Home cards.
 */
export function WonderlandComingNextScreen({
  tab,
  title,
  subtitle,
  detail,
  icon,
}: WonderlandComingNextScreenProps) {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);

  return (
    <SabiAppChrome
      activeTab={tab}
      backdropVariant="home"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[440px] lg:max-w-[760px] mx-auto px-5 sm:px-6 pt-6 sm:pt-9">
        <header className="mb-5">
          <h1
            className="text-[30px] sm:text-[34px] font-bold text-[#260559] leading-tight"
            style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
          >
            {title}
          </h1>
          <p className="mt-1 text-[15px] font-semibold text-[#3C2263]">{subtitle}</p>
        </header>

        <section
          className="bg-white rounded-[24px] p-5 sm:p-7 text-center"
          style={{ boxShadow: '0 4px 0 #E2C700' }}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-[18px] bg-[#EFE6FF] text-[#6C19E5] flex items-center justify-center">
            {icon === 'cbt' && <Monitor size={28} strokeWidth={2.3} />}
            {icon === 'custom' && <SlidersHorizontal size={28} strokeWidth={2.3} />}
            {icon === 'profile' && <User size={28} strokeWidth={2.3} />}
          </div>

          <div className="max-w-[230px] mx-auto my-2">
            <SabiGraduationBooksIllustration />
          </div>

          <p className="text-[14.5px] font-semibold text-[#4F3B73] leading-relaxed max-w-[460px] mx-auto mb-6">
            {detail}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="py-3.5 px-6 rounded-[18px] bg-[#6C19E5] hover:brightness-105 text-white font-extrabold text-[15px] uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer"
              style={{
                fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 4px 0 #46099E',
              }}
            >
              <span>Back to Home</span>
              <ArrowRight size={18} />
            </button>

            {icon === 'profile' && (
              <button
                type="button"
                onClick={() => navigate('/onboarding/1')}
                className="py-3.5 px-6 rounded-[18px] bg-[#F3EEFD] hover:bg-[#E9DFFA] text-[#260559] font-extrabold text-[15px] cursor-pointer"
              >
                Edit Onboarding (1/10)
              </button>
            )}
          </div>
        </section>
      </main>
    </SabiAppChrome>
  );
}
