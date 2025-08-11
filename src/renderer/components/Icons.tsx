import React from 'react';

export function IconWaveBars({ color = 'white' }: { color?: string }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="5" width="2" height="4" rx="1" fill={color} opacity="0.9" />
      <rect x="5" y="3" width="2" height="8" rx="1" fill={color} opacity="0.9" />
      <rect x="9" y="1" width="2" height="12" rx="1" fill={color} opacity="0.9" />
      <rect x="13" y="3" width="2" height="8" rx="1" fill={color} opacity="0.9" />
    </svg>
  );
}

export function IconText({ color = '#E6E6E6' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6h16M4 12h10M4 18h16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconEyeOff({ color = '#E6E6E6' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3l18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 5.1A10.94 10.94 0 0112 5c7 0 10 7 10 7a15.54 15.54 0 01-4.11 4.78"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.12 6.12A15.38 15.38 0 002 12s3 7 10 7a10.88 10.88 0 005.9-1.64"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconGear({ color = '#E6E6E6' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth="2" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c0 .66.39 1.26 1 1.51.24.1.49.12.74.12H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
