import type { ReactNode } from 'react';

const S = ({ children, size = 16 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const Icon = {
  proton: () => (
    <S>
      <circle cx="8" cy="8" r="5.2" fill="#e05d5d" stroke="none" />
      <path d="M8 5.6v4.8M5.6 8h4.8" stroke="#fff" />
    </S>
  ),
  neutron: () => (
    <S>
      <circle cx="8" cy="8" r="5.2" fill="#8a9aab" stroke="none" />
    </S>
  ),
  electron: () => (
    <S>
      <circle cx="8" cy="8" r="6" stroke="#4fb3ff" strokeOpacity="0.5" />
      <circle cx="8" cy="8" r="2.6" fill="#4fb3ff" stroke="none" />
    </S>
  ),
  remove: () => (
    <S>
      <path d="M3 13h10M5 11l6.5-6.5a1.4 1.4 0 0 0-2-2L3 9l2 2z" />
    </S>
  ),
  atom: () => (
    <S>
      <ellipse cx="8" cy="8" rx="6.3" ry="2.6" />
      <ellipse cx="8" cy="8" rx="6.3" ry="2.6" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6.3" ry="2.6" transform="rotate(-60 8 8)" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </S>
  ),
  reaction: () => (
    <S>
      <circle cx="3.2" cy="8" r="2" />
      <path d="M6.8 8h3.4M8.8 6.3L10.4 8l-1.6 1.7" />
      <circle cx="12.4" cy="6.4" r="1.6" />
      <circle cx="12.4" cy="10.2" r="1.6" />
    </S>
  ),
  bond: () => (
    <S>
      <circle cx="4.6" cy="8" r="3.3" />
      <circle cx="11.4" cy="8" r="3.3" />
      <circle cx="8" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="8" cy="9.4" r="0.8" fill="currentColor" stroke="none" />
    </S>
  ),
  compound: () => (
    <S>
      <rect x="1.8" y="4" width="5.4" height="3.6" rx="1" />
      <rect x="8.8" y="4" width="5.4" height="3.6" rx="1" />
      <rect x="4.2" y="9.2" width="7.6" height="3.6" rx="1" />
    </S>
  ),
  dice: () => (
    <S>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <circle cx="5.5" cy="5.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </S>
  ),
  swap: () => (
    <S>
      <path d="M3 5.5h9.5l-2-2M13 10.5H3.5l2 2" />
    </S>
  ),
  balance: () => (
    <S>
      <path d="M8 2.5v11M4.5 13.5h7M3 5h10M3 5l-1.8 4h3.6zM13 5l-1.8 4h3.6z" />
    </S>
  ),
  play: () => (
    <S>
      <path d="M4.5 2.5l9 5.5-9 5.5z" fill="currentColor" stroke="none" />
    </S>
  ),
  undo: () => (
    <S>
      <path d="M5.5 3.5L2.5 6.5l3 3" />
      <path d="M2.5 6.5H10a3.5 3.5 0 0 1 0 7H7" />
    </S>
  ),
  redo: () => (
    <S>
      <path d="M10.5 3.5l3 3-3 3" />
      <path d="M13.5 6.5H6a3.5 3.5 0 0 0 0 7h3" />
    </S>
  ),
  settings: () => (
    <S>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </S>
  ),
  help: () => (
    <S>
      <circle cx="8" cy="8" r="6.3" />
      <path d="M6.2 6.2a1.9 1.9 0 1 1 2.6 1.7c-.6.3-.8.7-.8 1.3v.3" />
      <circle cx="8" cy="11.6" r="0.5" fill="currentColor" />
    </S>
  ),
  trophy: () => (
    <S>
      <path d="M5 2.5h6v3.5a3 3 0 0 1-6 0zM5 3.5H2.5a2.5 2.5 0 0 0 2.6 3M11 3.5h2.5a2.5 2.5 0 0 1-2.6 3M8 9v2.5M5.5 13.5h5M6.5 11.5h3" />
    </S>
  ),
  clear: () => (
    <S>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9" />
    </S>
  ),
};
