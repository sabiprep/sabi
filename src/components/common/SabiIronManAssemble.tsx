import React, { useEffect, useState } from 'react';

interface SabiIronManAssembleProps {
  onComplete?: () => void;
  autoCompleteDelay?: number;
}

export function SabiIronManAssemble({ onComplete, autoCompleteDelay = 4200 }: SabiIronManAssembleProps) {
  const [stage, setStage] = useState<'scattering' | 'assembling' | 'locked' | 'pulse'>('scattering');
  const [shockwave, setShockwave] = useState(false);

  useEffect(() => {
    // Stage 1: Trigger assembly immediately on mount
    const assembleTimer = setTimeout(() => {
      setStage('assembling');
    }, 120);

    // Stage 2: Lock pieces & trigger arc-reactor shockwave
    const lockTimer = setTimeout(() => {
      setStage('locked');
      setShockwave(true);
    }, 2500);

    // Stage 3: Full metallic sheen pulse
    const pulseTimer = setTimeout(() => {
      setStage('pulse');
    }, 3100);

    // Stage 4: Auto complete transition
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
    <div className="relative w-full max-w-xl flex flex-col items-center justify-center select-none">
      {/* Dynamic Thruster & Arc Glow in background */}
      <div 
        className={`absolute w-72 h-72 rounded-full bg-blue-500/20 blur-3xl transition-all duration-1000 pointer-events-none ${
          stage === 'locked' || stage === 'pulse' ? 'scale-150 opacity-80' : 'scale-75 opacity-20'
        }`} 
      />
      
      {/* Reactor Gold Shockwave ring when the sun dot impacts */}
      {shockwave && (
        <div 
          className="absolute w-24 h-24 rounded-full border-2 border-amber-400/80 animate-ping pointer-events-none" 
          style={{ right: '12%', top: '22%' }}
        />
      )}

      {/* The Iron Man Assembling Sabi SVG */}
      <div className="w-full h-auto p-4 flex items-center justify-center perspective-[1200px]">
        <svg 
          viewBox="0 0 900 360" 
          className="w-full max-h-48 sm:max-h-60 object-contain overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Top Outer Curve Ribbon Gradient */}
            <linearGradient id="ironRibbonTop" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0062FF"/>
              <stop offset="40%" stop-color="#0084FF"/>
              <stop offset="100%" stop-color="#00D2FF"/>
            </linearGradient>

            {/* Origami 3D Shadow Fold */}
            <linearGradient id="ironRibbonShadow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#022B8E"/>
              <stop offset="50%" stop-color="#063EB6"/>
              <stop offset="100%" stop-color="#0A2268"/>
            </linearGradient>

            {/* Mid Swoop Gradient */}
            <linearGradient id="ironRibbonMid" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stop-color="#0080FF"/>
              <stop offset="60%" stop-color="#004BE0"/>
              <stop offset="100%" stop-color="#002DB3"/>
            </linearGradient>

            {/* Book Pages Base Gradient */}
            <linearGradient id="ironBookBottom" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0066FF"/>
              <stop offset="100%" stop-color="#0033CC"/>
            </linearGradient>

            {/* Golden Arc Reactor Sun Dot Gradient */}
            <linearGradient id="ironSunDot" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stop-color="#FFF385"/>
              <stop offset="35%" stop-color="#FFC000"/>
              <stop offset="100%" stop-color="#F59E0B"/>
            </linearGradient>

            {/* Thruster Glow Filter */}
            <filter id="ironThrusterGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#0099FF" flood-opacity="0.6"/>
            </filter>

            {/* Reactor Flare Filter */}
            <filter id="ironReactorFlare" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="#FFB800" flood-opacity="0.8"/>
            </filter>
          </defs>

          {/* Group wrapper with subtle float once assembled */}
          <g className={stage === 'pulse' ? 'animate-pulse' : ''}>

            {/* ========================================================= */}
            {/* PIECE 1: S - TOP RIBBON (Rockets from Upper-Left)        */}
            {/* ========================================================= */}
            <path
              d="M360 25 C375 24, 385 30, 380 44 C370 70, 315 130, 290 155 C275 140, 285 100, 325 55 C340 38, 352 28, 360 25 Z"
              fill="url(#ironRibbonTop)"
              filter="url(#ironThrusterGlow)"
              className="transition-all duration-700 ease-out origin-center"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(-420px, -240px, 120px) rotate(-55deg) scale(0.3)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scale(1)',
                opacity: stage === 'scattering' ? 0 : 1,
                transitionDelay: '250ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECE 2: S - MID SWOOP (Flies from Above)                 */}
            {/* ========================================================= */}
            <path
              d="M375 42 C335 44, 280 85, 252 145 C235 180, 248 200, 290 220 C320 235, 345 250, 355 272 C370 305, 350 338, 305 344 C275 348, 250 342, 230 326 C228 320, 235 295, 275 285 C310 276, 320 250, 295 235 C260 215, 230 185, 235 130 C242 75, 295 32, 360 25 Z"
              fill="url(#ironRibbonMid)"
              className="transition-all duration-750 ease-out origin-center"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(-180px, -320px, 80px) rotate(35deg) scale(0.4)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scale(1)',
                opacity: stage === 'scattering' ? 0 : 1,
                transitionDelay: '420ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECE 3: S - SHADOW FOLD (Rotates into place)             */}
            {/* ========================================================= */}
            <path
              d="M290 155 C275 170, 260 190, 290 220 C320 235, 345 250, 355 272 C325 245, 290 225, 270 200 C255 180, 265 165, 290 155 Z"
              fill="url(#ironRibbonShadow)"
              className="transition-all duration-650 ease-out origin-center"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(-260px, 80px, -50px) rotateX(75deg) scale(0.2)'
                  : 'translate3d(0, 0, 0) rotateX(0deg) scale(1)',
                opacity: stage === 'scattering' ? 0 : 1,
                transitionDelay: '600ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECE 4: S - BOOK BASE (Rockets from Lower-Left)          */}
            {/* ========================================================= */}
            <path
              d="M230 326 C220 345, 240 354, 275 352 C320 350, 362 315, 360 270 C358 245, 335 235, 305 225 C260 240, 230 275, 230 326 Z"
              fill="url(#ironBookBottom)"
              className="transition-all duration-700 ease-out origin-center"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(-340px, 280px, 100px) rotate(45deg) scale(0.4)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scale(1)',
                opacity: stage === 'scattering' ? 0 : 1,
                transitionDelay: '780ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECES 5-7: 3 WHITE BOOK PAGE BLADES (Mach Snap)          */}
            {/* ========================================================= */}
            <path
              d="M255 265 Q285 285 325 315 Q290 295 248 280 Z"
              fill="#FFFFFF"
              className="transition-all duration-500 ease-out"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(-180px, 60px, 0) scale(0.1)'
                  : 'translate3d(0, 0, 0) scale(1)',
                opacity: stage === 'scattering' ? 0 : 0.98,
                transitionDelay: '950ms',
              }}
            />
            <path
              d="M242 290 Q275 310 315 335 Q280 320 236 305 Z"
              fill="#FFFFFF"
              className="transition-all duration-500 ease-out"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(-200px, 80px, 0) scale(0.1)'
                  : 'translate3d(0, 0, 0) scale(1)',
                opacity: stage === 'scattering' ? 0 : 0.98,
                transitionDelay: '1050ms',
              }}
            />
            <path
              d="M232 315 Q262 332 298 348 Q268 338 228 326 Z"
              fill="#FFFFFF"
              className="transition-all duration-500 ease-out"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(-220px, 100px, 0) scale(0.1)'
                  : 'translate3d(0, 0, 0) scale(1)',
                opacity: stage === 'scattering' ? 0 : 0.98,
                transitionDelay: '1150ms',
              }}
            />

            {/* ========================================================= */}
            {/* PIECE 8: LETTER 'a' (Blasts from Lower-Right)             */}
            {/* ========================================================= */}
            <g
              className="transition-all duration-700 ease-out origin-center"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(240px, 260px, 80px) rotate(35deg) scale(0.5)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scale(1)',
                opacity: stage === 'scattering' ? 0 : 1,
                transitionDelay: '1350ms',
              }}
            >
              <path
                d="M472 165 C430 165, 396 195, 396 242 C396 290, 430 325, 475 325 C496 325, 514 314, 526 298 L526 320 L566 320 L566 172 L526 172 L526 193 C514 176, 495 165, 472 165 Z M484 204 C508 204, 526 222, 526 245 C526 268, 508 286, 484 286 C460 286, 442 268, 442 245 C442 222, 460 204, 442 204 C454 204, 472 204, 484 204 Z"
                fill="#071333"
                className="dark:fill-[#E2E8F0]"
                fillRule="evenodd"
              />
            </g>

            {/* ========================================================= */}
            {/* PIECE 9: LETTER 'b' (Mach 2 Vertical Plummet)            */}
            {/* ========================================================= */}
            <g
              className="transition-all duration-700 ease-out origin-center"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(40px, -360px, 120px) rotate(-20deg) scaleY(1.4)'
                  : 'translate3d(0, 0, 0) rotate(0deg) scaleY(1)',
                opacity: stage === 'scattering' ? 0 : 1,
                transitionDelay: '1600ms',
              }}
            >
              <path
                d="M592 108 L592 320 L632 320 L632 298 C644 314, 664 325, 686 325 C732 325, 768 290, 768 244 C768 198, 732 165, 686 165 C664 165, 644 176, 632 192 L632 108 Z M678 204 C704 204, 724 222, 724 245 C724 268, 704 286, 678 286 C652 286, 632 268, 632 245 C632 222, 652 204, 678 204 Z"
                fill="#071333"
                className="dark:fill-[#E2E8F0]"
                fillRule="evenodd"
              />
            </g>

            {/* ========================================================= */}
            {/* PIECE 10: LETTER 'i' STEM (Upward Hydraulic Thrust)       */}
            {/* ========================================================= */}
            <g
              className="transition-all duration-650 ease-out origin-center"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(60px, 320px, 60px) rotate(-15deg)'
                  : 'translate3d(0, 0, 0) rotate(0deg)',
                opacity: stage === 'scattering' ? 0 : 1,
                transitionDelay: '1850ms',
              }}
            >
              <rect 
                x="794" 
                y="172" 
                width="42" 
                height="148" 
                rx="8" 
                fill="#071333" 
                className="dark:fill-[#E2E8F0]"
              />
            </g>

            {/* ========================================================= */}
            {/* PIECE 11: GOLDEN ARC-REACTOR SUN DOT (The Climax Impact) */}
            {/* ========================================================= */}
            <g
              className="transition-all duration-600 ease-out origin-center"
              style={{
                transform: stage === 'scattering'
                  ? 'translate3d(360px, -240px, 200px) scale(3.5)'
                  : 'translate3d(0, 0, 0) scale(1)',
                opacity: stage === 'scattering' ? 0 : 1,
                transitionDelay: '2150ms',
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

      {/* High-Tech Assembly Status Tagline (Minimal, No Lines) */}
      <div 
        className={`mt-4 flex items-center gap-2 text-xs font-mono tracking-widest uppercase transition-opacity duration-500 ${
          stage === 'locked' || stage === 'pulse' ? 'opacity-90' : 'opacity-40'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
        <span className="text-slate-300 font-bold tracking-widest">
          {stage === 'locked' || stage === 'pulse' ? 'SABI ONLINE' : 'ASSEMBLING SABI'}
        </span>
      </div>
    </div>
  );
}
