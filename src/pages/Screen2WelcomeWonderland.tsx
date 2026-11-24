import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  SabiWonderlandShell,
  SabiPurpleBookLogo,
  SabiGraduationBooksIllustration,
} from '../components/common/SabiWonderlandShell';

/**
 * SCREEN 2 (`/welcome`): WELCOME TO SABI. (UPLOADED IMAGE 1 DESIGN)
 * SABI Yellow (#FFE51E) & 3D Purple Wonderland welcome screen for both mobile APK and desktop.
 */
export function Screen2WelcomeWonderland() {
  const navigate = useNavigate();

  return (
    <SabiWonderlandShell>
      <main className="w-full flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-6 sm:py-10">
        <div className="w-full max-w-[405px] sm:max-w-[440px] mx-auto flex flex-col items-center text-center">
          {/* 1. Top SABI 3D Purple Open-Book Emblem + Wordmark */}
          <div className="mb-3.5 sm:mb-4">
            <SabiPurpleBookLogo size="md" to="/welcome" />
          </div>

          {/* 2. Headline: WELCOME TO SABI. */}
          <h1
            className="text-[28px] sm:text-[34px] font-bold tracking-[0.02em] text-[#31006E] leading-tight uppercase"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
            }}
          >
            WELCOME TO SABI.
          </h1>

          {/* 3. Subheadline: LEARN. CONNECT. GROW. */}
          <p
            className="mt-1 text-[15px] sm:text-[17px] font-bold tracking-[0.06em] text-[#31006E] uppercase"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
            }}
          >
            LEARN. CONNECT. GROW.
          </p>

          {/* 4. Center 3D Stacked Green & Purple Books + Graduation Cap Illustration */}
          <div className="w-full my-3.5 sm:my-5">
            <SabiGraduationBooksIllustration />
          </div>

          {/* 5. Adventure Copy */}
          <p className="text-[15px] sm:text-[16.5px] font-semibold text-[#1E1035] leading-[1.45] max-w-[335px] sm:max-w-[365px] mx-auto mb-6 sm:mb-7">
            Want an adventure into the wonderland of excellent academic performance? You are in the
            right place.
          </p>

          {/* 6. Primary 3D Glossy Purple Pill Button: SIGNUP -> */}
          <button
            type="button"
            onClick={() => navigate('/auth/sign-up')}
            className="w-full py-3.5 sm:py-4 px-8 rounded-full text-white font-bold text-[19px] sm:text-[21px] tracking-[0.04em] uppercase flex items-center justify-center gap-3 cursor-pointer transition-transform duration-150 active:scale-[0.98] hover:brightness-105"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              background: 'linear-gradient(180deg, #8F38F8 0%, #711AE3 65%, #5C11C2 100%)',
              boxShadow:
                '0 5px 0 #4A0B9E, 0 12px 24px rgba(92, 17, 194, 0.32), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
            }}
          >
            <span>SIGNUP</span>
            <ArrowRight size={23} strokeWidth={2.6} />
          </button>

          {/* 7. Bottom Link: Already have an account? Sign in */}
          <div className="mt-5 sm:mt-6 text-[15px] sm:text-[16px] font-semibold text-[#1E1035]">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={() => navigate('/auth/sign-in')}
              className="text-[#5E14C4] font-bold underline decoration-2 underline-offset-4 hover:text-[#3B077E] cursor-pointer transition-colors"
            >
              Sign in
            </button>
          </div>

          {/* 8. Direct Onboarding Preview Shortcut */}
          <button
            type="button"
            onClick={() => navigate('/onboarding/1')}
            className="mt-3 px-4 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#31006E] font-extrabold text-xs tracking-wide shadow-[0_2.5px_0_#E2C700] cursor-pointer transition-all"
          >
            Preview Onboarding Screens (1/10) →
          </button>
        </div>
      </main>
    </SabiWonderlandShell>
  );
}
