import React, { useEffect, useState } from 'react';

interface SabiIronManAssembleProps {
  onComplete?: () => void;
  autoCompleteDelay?: number;
}

export function SabiIronManAssemble({ onComplete, autoCompleteDelay = 4200 }: SabiIronManAssembleProps) {
  const [stage, setStage] = useState<'scattered' | 'assembling' | 'locked' | 'reactor_pulse'>('scattered');
  const [shockwave, setShockwave] = useState(false);

  useEffect(() => {
    // Stage 1: Mach-speed flight begins immediately
    const assembleTimer = setTimeout(() => {
      setStage('assembling');
    }, 150);

    // Stage 2: Heavy hydraulic lock & Arc reactor dot impact
    const lockTimer = setTimeout(() => {
      setStage('locked');
      setShockwave(true);
    }, 2400);

    // Stage 3: Full energy sheen pulse & reactor ignition
    const pulseTimer = setTimeout(() => {
      setStage('reactor_pulse');
    }, 3000);

    // Stage 4: Seamless auto-transition to next screen
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, autoCompleteDelay);

    return () => {
      clearTimeout(assembleTimer);
      clearTimeout(lockTimer);
      clearTimeout(pulseTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, autoCompleteDelay]);

  return (
    <div className="relative w-full max-w-xl flex flex-col items-center justify-center select-none py-6">
      {/* Dynamic Thruster & Arc Glow in background */}
      <div 
        className={`absolute w-80 h-80 rounded-full bg-blue-600/25 blur-3xl transition-all duration-1000 pointer-events-none ${
          stage === 'locked' || stage === 'reactor_pulse' ? 'scale-125 opacity-90' : 'scale-50 opacity-20'
        }`} 
      />
      
      {/* Reactor Gold Shockwave ring when the sun dot impacts */}
      {shockwave && (
        <div 
          className="absolute w-28 h-28 rounded-full border-2 border-amber-400 animate-ping pointer-events-none" 
          style={{ right: '15%', top: '25%' }}
        />
      )}

      {/* The Iron Man Assembling Sabi SVG — Perfectly Centered viewBox */}
      <div className="w-full flex items-center justify-center perspective-[1200px]">
        <svg 
          viewBox="205 15 650 345" 
          className="w-full max-w-[500px] sm:max-w-[560px] max-h-52 sm:max-h-64 object-contain overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Ribbon Top Outer Curve Gradient (High Saturation Cyan to Electric Blue) */}
            <linearGradient id="ironRibbonTop" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0055FF"/>
              <stop offset="45%" stopColor="#0099FF"/>
              <stop offset="100%" stopColor="#00E5FF"/>
            </linearGradient>

            {/* Origami 3D Shadow Fold (Deep High-Tech Indigo Navy) */}
            <linearGradient id="ironRibbonShadow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#021E68"/>
              <stop offset="50%" stopColor="#05339E"/>
              <stop offset="100%" stopColor="#0A1E52"/>
            </linearGradient>

            {/* Mid Swoop Gradient (Vivid Royal Blue) */}
            <linearGradient id="ironRibbonMid" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#0077FF"/>
              <stop offset="60%" stopColor="#0044DD"/>
              <stop offset="100%" stopColor="#0028A8"/>
            </linearGradient>

            {/* Book Pages Base Gradient */}
            <linearGradient id="ironBookBottom" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0066FF"/>
              <stop offset="100%" stopColor="#002DB3"/>
            </linearGradient>

            {/* High-Contrast Titanium Armor Gradient for 'abi' (Crisp, High-Tech, Brilliant) */}
            <linearGradient id="ironSilverArmour" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF"/>
              <stop offset="35%" stopColor="#F1F5F9"/>
              <stop offset="75%" stopColor="#E2E8F0"/>
              <stop offset="100%" stopColor="#CBD5E1"/>
            </linearGradient>

            {/* Golden Arc Reactor Sun Dot Gradient */}
            <linearGradient id="ironSunDot" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FFFBEB"/>
              <stop offset="30%" stopColor="#FFD000"/>
              <stop offset="80%" stopColor="#FF9900"/>
              <stop offset="100%" stopColor="#EA580C"/>
            </linearGradient>

            {/* Thruster Glow Filter */}
            <filter id="ironThrusterGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#00C8FF" floodOpacity="0.8"/>
            </filter>

            {/* Reactor Solar Flare Filter */}
            <filter id="ironReactorFlare" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="0" stdDeviation="16" floodColor="#FFB800" floodOpacity="0.95"/>
            </filter>

            {/* Metallic Drop Shadow for the entire mark */}
            <filter id="ironMarkShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#001F5C" floodOpacity="0.5"/>
            </filter>
          </defs>

          {/* Group wrapper with subtle hydraulic hover once assembled */}
          <g filter="url(#ironMarkShadow)" className={stage === 'reactor_pulse' ? 'animate-pulse' : ''}>

            {/* ========================================================= */}
            {/* PIECE 1: S - TOP RIBBON (Rockets from Upper-Left)        */}
            {/* ========================================================= */}
            <path
              d="M360 25 C375 24, 385 30, 380 44 C370 70, 315 130, 290 155 C275 140, 285 100, 325 55 C340 38, 352 28, 360 25 Z"
              fill="url(#ironRibbonTop)"
              filter="url(#ironThrusterGlow)"
              className="transition-all duration-700 ease-out origin-center"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(-380px, -200px, 120px) rotate(-60deg) scale(0.3)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scale(1)',
                opacity: stage === 'scattered' ? 0 : 1,
                transitionDelay: '180ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECE 2: S - MID SWOOP (Supersonic Top Entry)             */}
            {/* ========================================================= */}
            <path
              d="M375 42 C335 44, 280 85, 252 145 C235 180, 248 200, 290 220 C320 235, 345 250, 355 272 C370 305, 350 338, 305 344 C275 348, 250 342, 230 326 C228 320, 235 295, 275 285 C310 276, 320 250, 295 235 C260 215, 230 185, 235 130 C242 75, 295 32, 360 25 Z"
              fill="url(#ironRibbonMid)"
              className="transition-all duration-750 ease-out origin-center"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(-150px, -280px, 80px) rotate(30deg) scale(0.4)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scale(1)',
                opacity: stage === 'scattered' ? 0 : 1,
                transitionDelay: '350ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECE 3: S - SHADOW FOLD (3D Fold Interlock)              */}
            {/* ========================================================= */}
            <path
              d="M290 155 C275 170, 260 190, 290 220 C320 235, 345 250, 355 272 C325 245, 290 225, 270 200 C255 180, 265 165, 290 155 Z"
              fill="url(#ironRibbonShadow)"
              className="transition-all duration-650 ease-out origin-center"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(-200px, 60px, -50px) rotateX(80deg) scale(0.2)'
                  : 'translate3d(0, 0, 0) rotateX(0deg) scale(1)',
                opacity: stage === 'scattered' ? 0 : 1,
                transitionDelay: '520ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECE 4: S - BOOK BASE (Hydraulic Bottom Ascent)          */}
            {/* ========================================================= */}
            <path
              d="M230 326 C220 345, 240 354, 275 352 C320 350, 362 315, 360 270 C358 245, 335 235, 305 225 C260 240, 230 275, 230 326 Z"
              fill="url(#ironBookBottom)"
              className="transition-all duration-700 ease-out origin-center"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(-300px, 240px, 90px) rotate(40deg) scale(0.4)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scale(1)',
                opacity: stage === 'scattered' ? 0 : 1,
                transitionDelay: '680ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECES 5-7: 3 WHITE BOOK PAGE BLADES (Mach Snap)          */}
            {/* ========================================================= */}
            <path
              d="M255 265 Q285 285 325 315 Q290 295 248 280 Z"
              fill="#FFFFFF"
              className="transition-all duration-450 ease-out"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(-150px, 50px, 0) scale(0.1)'
                  : 'translate3d(0, 0, 0) scale(1)',
                opacity: stage === 'scattered' ? 0 : 0.98,
                transitionDelay: '840ms',
              }}
            />
            <path
              d="M242 290 Q275 310 315 335 Q280 320 236 305 Z"
              fill="#FFFFFF"
              className="transition-all duration-450 ease-out"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(-170px, 65px, 0) scale(0.1)'
                  : 'translate3d(0, 0, 0) scale(1)',
                opacity: stage === 'scattered' ? 0 : 0.98,
                transitionDelay: '940ms',
              }}
            />
            <path
              d="M232 315 Q262 332 298 348 Q268 338 228 326 Z"
              fill="#FFFFFF"
              className="transition-all duration-450 ease-out"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(-190px, 80px, 0) scale(0.1)'
                  : 'translate3d(0, 0, 0) scale(1)',
                opacity: stage === 'scattered' ? 0 : 0.98,
                transitionDelay: '1040ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECE 8: LETTER 'a' (Titanium Armor Blast from Right)     */}
            {/* ========================================================= */}
            <g
              className="transition-all duration-700 ease-out origin-center"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(200px, 220px, 70px) rotate(25deg) scale(0.5)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scale(1)',
                opacity: stage === 'scattered' ? 0 : 1,
                transitionDelay: '1200ms',
              }}
            >
              <path
                d="M472 165 C430 165, 396 195, 396 242 C396 290, 430 325, 475 325 C496 325, 514 314, 526 298 L526 320 L566 320 L566 172 L526 172 L526 193 C514 176, 495 165, 472 165 Z M484 204 C508 204, 526 222, 526 245 C526 268, 508 286, 484 286 C460 286, 442 268, 442 245 C442 222, 460 204, 442 204 C454 204, 472 204, 484 204 Z"
                fill="url(#ironSilverArmour)"
                stroke="#00C4FF"
                strokeWidth="1.5"
                strokeOpacity="0.4"
                fillRule="evenodd"
              />
            </g>

            {/* ========================================================= */}
            {/* PIECE 9: LETTER 'b' (Heavy Mach Plummet from Above)       */}
            {/* ========================================================= */}
            <g
              className="transition-all duration-700 ease-out origin-center"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(30px, -300px, 100px) rotate(-15deg) scaleY(1.3)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scaleY(1)',
                opacity: stage === 'scattered' ? 0 : 1,
                transitionDelay: '1450ms',
              }}
            >
              <path
                d="M592 108 L592 320 L632 320 L632 298 C644 314, 664 325, 686 325 C732 325, 768 290, 768 244 C768 198, 732 165, 686 165 C664 165, 644 176, 632 192 L632 108 Z M678 204 C704 204, 724 222, 724 245 C724 268, 704 286, 678 286 C652 286, 632 268, 632 245 C632 222, 652 204, 678 204 Z"
                fill="url(#ironSilverArmour)"
                stroke="#00C4FF"
                strokeWidth="1.5"
                strokeOpacity="0.4"
                fillRule="evenodd"
              />
            </g>

            {/* ========================================================= */}
            {/* PIECE 10: LETTER 'i' STEM (Ground Hydraulic Lock)         */}
            {/* ========================================================= */}
            <g
              className="transition-all duration-650 ease-out origin-center"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(50px, 280px, 50px) rotate(-10deg)'
                  : 'translate3d(0, 0, 0) rotate(0deg)',
                opacity: stage === 'scattered' ? 0 : 1,
                transitionDelay: '1700ms',
              }}
            >
              <rect 
                x="794" 
                y="172" 
                width="42" 
                height="148" 
                rx="8" 
                fill="url(#ironSilverArmour)"
                stroke="#00C4FF"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
            </g>

            {/* ========================================================= */}
            {/* PIECE 11: GOLDEN ARC-REACTOR SUN DOT (The Climax Impact) */}
            {/* ========================================================= */}
            <g
              className="transition-all duration-550 ease-out origin-center"
              style={{
                transform: stage === 'scattered'
                  ? 'translate3d(320px, -200px, 180px) scale(3.5)'
                  : 'translate3d(0, 0, 0) scale(1)',
                opacity: stage === 'scattered' ? 0 : 1,
                transitionDelay: '2000ms',
              }}
            >
              <circle
                cx="815"
                cy="122"
                r="26"
                fill="url(#ironSunDot)"
                filter="url(#ironReactorFlare)"
              />
            </g>
          </g>
        </svg>
      </div>

      {/* High-Tech Assembly Status Tagline (Centered & Clean) */}
      <div 
        className={`mt-6 flex items-center justify-center gap-2 text-xs font-mono tracking-widest uppercase transition-opacity duration-500 ${
          stage === 'locked' || stage === 'reactor_pulse' ? 'opacity-90' : 'opacity-40'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
        <span className="text-slate-300 font-bold tracking-widest">
          {stage === 'locked' || stage === 'reactor_pulse' ? 'SABI ONLINE' : 'ASSEMBLING SABI'}
        </span>
      </div>
    </div>
  );
}
