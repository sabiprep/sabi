import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Top-center SABI 3D Purple Open-Book Emblem + Geometric Bold SABI Wordmark
 * Matches the uploaded Screen 2 (Welcome) and Screen 3 (Auth) design identity.
 */
export function SabiPurpleBookLogo({
  size = 'md',
  to = '/welcome',
}: {
  size?: 'sm' | 'md' | 'lg';
  to?: string;
}) {
  const iconSize =
    size === 'sm'
      ? 'w-12 h-10'
      : size === 'lg'
      ? 'w-16 h-13'
      : 'w-14 h-11 sm:w-16 sm:h-12';
  const textSize =
    size === 'sm'
      ? 'text-[34px] tracking-[0.05em]'
      : size === 'lg'
      ? 'text-[46px] tracking-[0.05em]'
      : 'text-[38px] sm:text-[44px] tracking-[0.05em]';

  return (
    <Link
      to={to}
      className="inline-flex flex-col items-center justify-center select-none group focus:outline-none"
      aria-label="SABI Home"
    >
      {/* 3D Two-Page Open Book Icon */}
      <svg
        viewBox="0 0 120 86"
        className={`${iconSize} object-contain drop-shadow-[0_4px_8px_rgba(109,30,224,0.22)] transition-transform duration-200 group-hover:scale-105`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sabiBookLeftPage" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9B4DFF" />
            <stop offset="100%" stopColor="#6E18E0" />
          </linearGradient>
          <linearGradient id="sabiBookRightPage" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D896FF" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        {/* Left Curved Page */}
        <path
          d="M12 16C12 11.5 16 8.5 21 9.5C35 12.2 48 18.5 56 26.5V77C47 69 34 63 18 60.5C14.2 59.9 12 56.8 12 53V16Z"
          fill="url(#sabiBookLeftPage)"
        />
        {/* Right Curved Page */}
        <path
          d="M108 16C108 11.5 104 8.5 99 9.5C85 12.2 72 18.5 64 26.5V77C73 69 86 63 102 60.5C105.8 59.9 108 56.8 108 53V16Z"
          fill="url(#sabiBookRightPage)"
        />
      </svg>

      {/* Bold Geometric SABI Wordmark */}
      <span
        className={`${textSize} font-black leading-none text-[#350075] -mt-0.5`}
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          letterSpacing: '0.05em',
        }}
      >
        SABI
      </span>
    </Link>
  );
}

/**
 * 3D Stack of Books (Green bottom book with golden bookmark + Purple middle book)
 * topped with a 3D Purple Graduation Cap & Golden Tassel.
 * Used as the central hero illustration on Screen 2 (WelcomePage).
 */
export function SabiGraduationBooksIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src="/assets/aistudio/sabi-academic-hero_0dfb21da.png"
        alt="SABI 3D Graduation Cap and Books"
        className="w-full max-w-[305px] sm:max-w-[345px] lg:max-w-[365px] h-auto object-contain drop-shadow-[0_14px_24px_rgba(180,115,0,0.24)] pointer-events-none select-none"
        draggable={false}
      />
    </div>
  );
}

/**
 * SABI Open-Book Character Mascot with Expressive Eyes & Golden Smile
 * Matches the onboarding speech-bubble header mascot in the uploaded Onboarding UI designs.
 */
export function SabiOnboardingMascot({ className = '' }: { className?: string }) {
  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      <svg
        viewBox="0 0 84 82"
        className="w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left Deep Purple Book Page */}
        <path
          d="M10 15 L39 23.5 V70 L10 61.5 Z"
          fill="#6C19E5"
        />
        {/* Right Lighter Purple Book Page */}
        <path
          d="M42.5 23.5 L71.5 15 V61.5 L42.5 70 Z"
          fill="#9E47FF"
        />

        {/* Left Eye (White Sclera + Dark Purple Pupil) */}
        <circle cx="25.5" cy="40.5" r="7.5" fill="#FFFFFF" />
        <circle cx="26" cy="40.5" r="3.6" fill="#2A055E" />

        {/* Right Eye (White Sclera + Dark Purple Pupil) */}
        <circle cx="56" cy="40.5" r="7.5" fill="#FFFFFF" />
        <circle cx="55.5" cy="40.5" r="3.6" fill="#2A055E" />

        {/* Golden-Yellow Smile Arc Across Center Spine */}
        <path
          d="M31 50.5 Q 40.75 58.5 50.5 50.5"
          stroke="#FFE61E"
          strokeWidth="4.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/**
 * 3D Floating Purple Cube (Top-Right corner of Auth Frosted Card in Image 2)
 */
export function FloatingPurpleCube3D({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 110 115"
      className={`select-none pointer-events-none drop-shadow-[0_14px_18px_rgba(88,28,135,0.28)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cubeTopFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B87BFF" />
          <stop offset="100%" stopColor="#8E38F7" />
        </linearGradient>
        <linearGradient id="cubeLeftFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B35F6" />
          <stop offset="100%" stopColor="#6315C9" />
        </linearGradient>
        <linearGradient id="cubeRightFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5D13BF" />
          <stop offset="100%" stopColor="#3B077E" />
        </linearGradient>
      </defs>
      {/* Top Face */}
      <path
        d="M55 10 L98 28 L55 48 L12 28 Z"
        fill="url(#cubeTopFace)"
        stroke="#B87BFF"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Left Face */}
      <path
        d="M12 28 L55 48 V98 L12 76 Z"
        fill="url(#cubeLeftFace)"
        stroke="#7C2AE8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Right Face */}
      <path
        d="M98 28 L55 48 V98 L98 76 Z"
        fill="url(#cubeRightFace)"
        stroke="#4C0E9F"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 3D Floating Purple Torus / Donut Ring (Bottom-Left corner of Auth Frosted Card in Image 2)
 */
export function FloatingPurpleTorus3D({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 110 110"
      className={`select-none pointer-events-none drop-shadow-[0_12px_18px_rgba(88,28,135,0.3)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="torusBodyGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#D8A4FF" />
          <stop offset="35%" stopColor="#8E36F7" />
          <stop offset="75%" stopColor="#5B10B8" />
          <stop offset="100%" stopColor="#38057A" />
        </radialGradient>
        <linearGradient id="torusInnerHole" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B077E" />
          <stop offset="100%" stopColor="#9B4DFF" />
        </linearGradient>
      </defs>
      <g transform="rotate(-24 55 55)">
        {/* Outer Torus Ring */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M55 12C81.5 12 103 29.5 103 52C103 74.5 81.5 92 55 92C28.5 92 7 74.5 7 52C7 29.5 28.5 12 55 12ZM55 34C67.7 34 78 42.1 78 52C78 61.9 67.7 70 55 70C42.3 70 32 61.9 32 52C32 42.1 42.3 34 55 34Z"
          fill="url(#torusBodyGrad)"
        />
        {/* Inner Rim Depth Shadow */}
        <ellipse
          cx="55"
          cy="52"
          rx="23"
          ry="18"
          stroke="url(#torusInnerHole)"
          strokeWidth="4"
          fill="none"
        />
        {/* Glossy Highlight Arc */}
        <path
          d="M24 38C30 25 45 19 64 21"
          stroke="#E9D5FF"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeOpacity="0.65"
        />
      </g>
    </svg>
  );
}

/**
 * Shared SABI Yellow Wonderland Background Canvas & Corner Illustrations
 * Exact match for both Screen 2 (Welcome) and Screen 3 (Create Account / Sign In),
 * engineered for both Android Mobile APK viewports and PC Desktop screens.
 */
export function SabiWonderlandShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Sync native Android status bar to #FFE51E yellow with dark icons while on Wonderland screens
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FFE51E' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    }
  }, []);

  return (
    <div
      className={`relative min-h-[100dvh] w-full overflow-x-hidden bg-[#FFE51E] text-[#2B055C] flex flex-col justify-between select-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${className}`}
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'linear-gradient(180deg, #FFEA24 0%, #FFE51E 55%, #FFDD12 100%)',
      }}
    >
      {/* ================================================================= */}
      {/* DECORATIVE CORNER ARTWORK (Matches Uploaded Images 1 & 2 1:1)      */}
      {/* Fixed viewport backdrop so Android keyboard never shifts corners  */}
      {/* ================================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* 1. TOP-LEFT CORNER: White Arc + Large Purple Circle + Orange Dot */}
        <div className="absolute top-0 left-0 w-48 h-48 sm:w-64 sm:h-64 lg:w-72 lg:h-72">
          <svg
            viewBox="0 0 240 240"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="tlPurpleOrb" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8429F5" />
                <stop offset="100%" stopColor="#5D12C2" />
              </linearGradient>
              <radialGradient id="tlOrangeBall" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#FFB74D" />
                <stop offset="55%" stopColor="#F57C00" />
                <stop offset="100%" stopColor="#E65100" />
              </radialGradient>
            </defs>
            {/* Sweeping Cream-White Circular Ring Arc */}
            <path
              d="M150 -10 A 135 135 0 0 1 -10 135"
              stroke="#FFF7CC"
              strokeWidth="13"
              strokeLinecap="round"
            />
            {/* Large Purple Circle on Left Edge */}
            <circle cx="8" cy="108" r="64" fill="url(#tlPurpleOrb)" />
            {/* Small Glossy Orange Sphere */}
            <circle cx="96" cy="108" r="13.5" fill="url(#tlOrangeBall)" />
          </svg>
        </div>

        {/* 2. TOP-RIGHT CORNER: 4-Point Purple Sparkle + Floating 3D Open Book with Orange Bookmark */}
        <div className="absolute top-0 right-0 w-52 h-52 sm:w-64 sm:h-64 lg:w-72 lg:h-72">
          <svg
            viewBox="0 0 250 240"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="trOpenBookPages" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#EAD6FF" />
                <stop offset="100%" stopColor="#C49BFF" />
              </linearGradient>
              <linearGradient id="trBookCoverLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8E36F7" />
                <stop offset="100%" stopColor="#5E14C4" />
              </linearGradient>
            </defs>

            {/* Geometric Purple Accent Orb Cluster */}
            <circle cx="104" cy="60" r="10" fill="#8B3DFF" />
            <circle cx="84" cy="46" r="4.5" fill="#FF9100" />

            {/* White Curved Ribbon Arc Under Book */}
            <path
              d="M204 176 Q 228 164 255 162"
              stroke="#FFF9D6"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* Floating Open 3D Book with Orange Bookmark */}
            <g transform="translate(120, 38) rotate(-14)">
              {/* Dark Purple Right Hardcover Base */}
              <path d="M58 76 L124 68 L136 82 L64 90 Z" fill="#23034D" />
              {/* Purple Left Hardcover Base */}
              <path d="M2 60 L60 76 L46 98 L-10 80 Z" fill="url(#trBookCoverLeft)" />
              {/* Left Open Pages Fan */}
              <path
                d="M6 48 C24 44 46 54 60 74 L56 80 C40 66 20 58 0 60 Z"
                fill="#D8B4FE"
              />
              <path
                d="M14 34 C34 34 50 48 60 74 C44 58 26 48 6 48 Z"
                fill="#FFFFFF"
              />
              {/* Right Open Pages Fan */}
              <path
                d="M60 74 C66 44 86 20 116 12 L132 58 C104 62 78 68 60 74 Z"
                fill="url(#trOpenBookPages)"
              />
              <path
                d="M60 74 C62 42 78 16 102 4 L114 14 C88 26 70 48 60 74 Z"
                fill="#FFFFFF"
              />
              {/* Orange Ribbon Bookmark Hanging Down */}
              <path d="M42 84 L56 86 L54 122 L46 113 L37 120 Z" fill="#FF9100" />
            </g>
          </svg>
        </div>

        {/* 3. BOTTOM-LEFT CORNER: Concentric Green & White Rainbow Arc + Geometric Accent Ring */}
        <div className="absolute bottom-0 left-0 w-48 h-44 sm:w-60 sm:h-56 lg:w-68 lg:h-60">
          <svg
            viewBox="0 0 230 210"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Cream-White Quarter Circle */}
            <circle cx="8" cy="205" r="112" stroke="#FFF7C2" strokeWidth="20" fill="none" />
            {/* Inner Emerald-Green Quarter Circle */}
            <circle cx="8" cy="205" r="88" stroke="#00B862" strokeWidth="24" fill="none" />
            {/* Geometric Purple Ring Accent */}
            <circle cx="132" cy="133" r="11" stroke="#8B3DFF" strokeWidth="5.5" fill="none" />
          </svg>
        </div>

        {/* 4. BOTTOM-RIGHT CORNER: Large Orange Dome + 3D Purple Pencil Drawing White Loop Line */}
        <div className="absolute bottom-0 right-0 w-60 h-48 sm:w-76 sm:h-60 lg:w-84 lg:h-68">
          <svg
            viewBox="0 0 300 230"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="brOrangeDome" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFA000" />
                <stop offset="100%" stopColor="#F57C00" />
              </linearGradient>
              <linearGradient id="pencilBodyPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="50%" stopColor="#7C2AE8" />
                <stop offset="100%" stopColor="#5812B8" />
              </linearGradient>
            </defs>

            {/* Large Warm Orange Circle at Bottom Right */}
            <circle cx="215" cy="215" r="108" fill="url(#brOrangeDome)" />

            {/* White Hand-Drawn Looping Scribble Line from Pencil Tip */}
            <path
              d="M32 232 C68 202 98 184 114 196 C128 206 104 222 96 208 C88 194 118 168 140 182 C158 194 194 176 221 156"
              stroke="#FFFDF0"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />

            {/* 3D Purple Pencil Angled Down-Left to Tip at (221, 156) */}
            <g transform="translate(221, 156) rotate(-52)">
              {/* Graphite Dark Tip */}
              <path d="M0 0 L12 -5 L12 5 Z" fill="#1E1035" />
              {/* Cream Wood Cone */}
              <path d="M12 -5 L32 -13 L32 13 L12 5 Z" fill="#FFF3C4" />
              {/* Purple Hexagonal Pencil Shaft */}
              <path d="M32 -13 L145 -13 L145 13 L32 13 Z" fill="url(#pencilBodyPurple)" />
              {/* Lighter Top Facet on Pencil Shaft for 3D Depth */}
              <path
                d="M32 -13 L145 -13 L145 -3 L32 -3 Z"
                fill="#B366FF"
                fillOpacity="0.65"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Main Content Foreground */}
      <div className="relative z-10 flex-1 flex flex-col justify-center w-full">
        {children}
      </div>
    </div>
  );
}
