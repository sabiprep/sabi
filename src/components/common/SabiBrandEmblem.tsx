import React from 'react';

interface SabiBrandEmblemProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * Unique SABI Academic Crest Emblem (open study book + precision beacon arch).
 * Replaces generic 4-point AI sparkle icons across the entire SABI Wonderland UI.
 */
export function SabiBrandEmblem({
  size = 20,
  className = '',
  strokeWidth = 2.2,
}: SabiBrandEmblemProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Open Book Pages */}
      <path
        d="M3.5 7.5C3.5 6.67 4.17 6 5 6H9.2C10.75 6 12 7.25 12 8.8V19C12 17.9 11.1 17 10 17H5C4.17 17 3.5 16.33 3.5 15.5V7.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 7.5C20.5 6.67 19.83 6 19 6H14.8C13.25 6 12 7.25 12 8.8V19C12 17.9 12.9 17 14 17H19C19.83 17 20.5 16.33 20.5 15.5V7.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Top Study Beacon Dot + Arch */}
      <circle cx="12" cy="3.1" r="1.4" fill="currentColor" />
      <path
        d="M8.5 3.6C9.5 2.7 10.7 2.2 12 2.2C13.3 2.2 14.5 2.7 15.5 3.6"
        stroke="currentColor"
        strokeWidth={Math.max(1.6, strokeWidth - 0.5)}
        strokeLinecap="round"
      />
    </svg>
  );
}
