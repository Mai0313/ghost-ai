import React from 'react';

export function IconWaveBars({ color = 'white' }: { color?: string }) {
  return (
    <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
      <rect fill={color} height="4" opacity="0.9" rx="1" width="2" x="1" y="5" />
      <rect fill={color} height="8" opacity="0.9" rx="1" width="2" x="5" y="3" />
      <rect fill={color} height="12" opacity="0.9" rx="1" width="2" x="9" y="1" />
      <rect fill={color} height="8" opacity="0.9" rx="1" width="2" x="13" y="3" />
    </svg>
  );
}

export function IconText({ color = '#E6E6E6' }: { color?: string }) {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6h16M4 12h10M4 18h16" stroke={color} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function IconEyeOff({ color = '#E6E6E6' }: { color?: string }) {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3l18 18" stroke={color} strokeLinecap="round" strokeWidth="2" />
      <path
        d="M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.1A10.94 10.94 0 0112 5c7 0 10 7 10 7a15.54 15.54 0 01-4.11 4.78"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M6.12 6.12A15.38 15.38 0 002 12s3 7 10 7a10.88 10.88 0 005.9-1.64"
        stroke={color}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function IconGear({ color = '#E6E6E6' }: { color?: string }) {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth="2" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c0 .66.39 1.26 1 1.51.24.1.49.12.74.12H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function IconMic({ color = '#E6E6E6' }: { color?: string }) {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14a4 4 0 004-4V7a4 4 0 10-8 0v3a4 4 0 004 4z" stroke={color} strokeWidth="2" />
      <path d="M19 11a7 7 0 01-14 0" stroke={color} strokeLinecap="round" strokeWidth="2" />
      <path d="M12 18v3" stroke={color} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function IconMicOff({ color = '#ff6b6b' }: { color?: string }) {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14a4 4 0 004-4V7a4 4 0 00-6.83-2.83" stroke={color} strokeWidth="2" />
      <path d="M5 11a7 7 0 0011.07 5.64" stroke={color} strokeLinecap="round" strokeWidth="2" />
      <path d="M12 18v3" stroke={color} strokeLinecap="round" strokeWidth="2" />
      <path d="M3 3l18 18" stroke={color} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function IconDots({ color = '#E6E6E6' }: { color?: string }) {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="12" fill={color} r="2" />
      <circle cx="12" cy="12" fill={color} r="2" />
      <circle cx="19" cy="12" fill={color} r="2" />
    </svg>
  );
}

export function IconSend({ color = 'white' }: { color?: string }) {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22 2L11 13"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function IconX({ color = '#E6E6E6' }: { color?: string }) {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
