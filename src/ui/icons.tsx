import type { ReactNode } from 'react';

/** Small line icons (24px grid). They are decoration only: the label next to them carries the meaning. */
const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  learn: <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />,
  practice: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>,
  ask: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.6a2.6 2.6 0 1 1 3.6 2.4c-.7.4-1.1.9-1.1 1.7" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></>,
  teach: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  dna: <><path d="M5 18l5-9 7 5 2-9" /><circle cx="5" cy="18" r="1.8" fill="currentColor" /><circle cx="10" cy="9" r="1.8" fill="currentColor" /><circle cx="17" cy="14" r="1.8" fill="currentColor" /><circle cx="19" cy="5" r="1.8" fill="currentColor" /></>,
  settings: <><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
  fix: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2.3-.7-.7-2.3z" />,
  review: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  contrast: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></>,
  listen: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></>,
  check: <><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></>,
};
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

/** The NOVA mark: a four-point star with a soft glow. */
export function StarMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14" fill="var(--glow)" />
      <path d="M16 2.5l3.2 10.3L29.5 16l-10.3 3.2L16 29.5l-3.2-10.3L2.5 16l10.3-3.2z" fill="var(--starf)" />
      <circle cx="16" cy="16" r="2.2" fill="var(--card)" />
    </svg>
  );
}
