import React from 'react';

interface LaundryLogoProps {
  size?: number;
  className?: string;
}

/**
 * Pure vector high-contrast monochrome laundry logo.
 * Designed specifically for 1-bit thermal receipt printers and standard prints.
 * Uses 100% solid black (#000000) strokes and fills with zero color halftoning/dithering.
 */
export function LaundryLogo({ size = 36, className = '' }: LaundryLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', margin: '0 auto' }}
    >
      {/* Outer Machine Housing (Bold Rounded Border) */}
      <rect
        x="6"
        y="5"
        width="36"
        height="38"
        rx="6"
        stroke="#000000"
        strokeWidth="3"
        fill="#ffffff"
      />

      {/* Control Panel Divider */}
      <line x1="6" y1="15" x2="42" y2="15" stroke="#000000" strokeWidth="2.5" />

      {/* Detergent Drawer */}
      <rect x="11" y="8.5" width="10" height="3.5" rx="1.5" fill="#000000" />

      {/* Control Knobs / Indicator Lights */}
      <circle cx="29" cy="10" r="1.5" fill="#000000" />
      <circle cx="35" cy="10" r="2.2" fill="#000000" />

      {/* Washing Drum Outer Frame */}
      <circle cx="24" cy="29" r="10" stroke="#000000" strokeWidth="3" fill="#ffffff" />

      {/* Washing Drum Inner Glass / Perforation Ring */}
      <circle
        cx="24"
        cy="29"
        r="7.2"
        stroke="#000000"
        strokeWidth="1.4"
        strokeDasharray="2.5 1.5"
      />

      {/* Water & Wash Wave */}
      <path
        d="M19 29.5C21 27.5 22.5 27.5 24 29.5C25.5 31.5 27 31.5 29 29.5"
        stroke="#000000"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Sparkling Clean Star */}
      <path
        d="M40 2L41.2 4.8L44 6L41.2 7.2L40 10L38.8 7.2L36 6L38.8 4.8L40 2Z"
        fill="#000000"
      />
      {/* Soap Bubble */}
      <circle cx="44" cy="11.5" r="1.3" fill="#000000" />
    </svg>
  );
}

