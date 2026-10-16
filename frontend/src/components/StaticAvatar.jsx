import React from 'react';

export const AVATAR_OPTIONS = [
  { id: 'avatar_1', label: 'Neon Cyberpunk', theme: 'emerald' },
  { id: 'avatar_2', label: 'Indigo Architect', theme: 'indigo' },
  { id: 'avatar_3', label: 'Violet Matrix', theme: 'violet' },
  { id: 'avatar_4', label: 'Amber Developer', theme: 'amber' },
  { id: 'avatar_5', label: 'Crimson Sentinel', theme: 'crimson' }
];

export default function StaticAvatar({ avatarId = 'avatar_1', size = 38, className = '' }) {
  const s = size;

  switch (avatarId) {
    case 'avatar_2':
      // Indigo Architect
      return (
        <svg 
          width={s} 
          height={s} 
          viewBox="0 0 100 100" 
          className={`static-dp-svg dp-indigo ${className}`}
          style={{ width: s, height: s, borderRadius: '50%', flexShrink: 0 }}
        >
          <circle cx="50" cy="50" r="48" fill="#090D16" stroke="#38BDF8" strokeWidth="2.5" />
          <circle cx="50" cy="42" r="16" fill="none" stroke="#6366F1" strokeWidth="3" />
          <path d="M26 80 C 28 60, 72 60, 74 80" fill="none" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="42" r="6" fill="#38BDF8" />
        </svg>
      );

    case 'avatar_3':
      // Violet Matrix
      return (
        <svg 
          width={s} 
          height={s} 
          viewBox="0 0 100 100" 
          className={`static-dp-svg dp-violet ${className}`}
          style={{ width: s, height: s, borderRadius: '50%', flexShrink: 0 }}
        >
          <circle cx="50" cy="50" r="48" fill="#110B1E" stroke="#C084FC" strokeWidth="2.5" />
          <polygon points="50,26 68,62 32,62" fill="none" stroke="#C084FC" strokeWidth="3" />
          <circle cx="50" cy="50" r="5" fill="#E879F9" />
          <path d="M24 82 C 32 68, 68 68, 76 82" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeDasharray="3 3" />
        </svg>
      );

    case 'avatar_4':
      // Amber Developer
      return (
        <svg 
          width={s} 
          height={s} 
          viewBox="0 0 100 100" 
          className={`static-dp-svg dp-amber ${className}`}
          style={{ width: s, height: s, borderRadius: '50%', flexShrink: 0 }}
        >
          <circle cx="50" cy="50" r="48" fill="#140E06" stroke="#F59E0B" strokeWidth="2.5" />
          {/* Code brackets */}
          <path d="M40 38 L 28 50 L 40 62" fill="none" stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M60 38 L 72 50 L 60 62" fill="none" stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="53" y1="34" x2="47" y2="66" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'avatar_5':
      // Crimson Sentinel
      return (
        <svg 
          width={s} 
          height={s} 
          viewBox="0 0 100 100" 
          className={`static-dp-svg dp-crimson ${className}`}
          style={{ width: s, height: s, borderRadius: '50%', flexShrink: 0 }}
        >
          <circle cx="50" cy="50" r="48" fill="#160808" stroke="#EF4444" strokeWidth="2.5" />
          <path d="M50 24 L 74 34 V 54 C 74 68, 50 78, 50 78 C 50 78, 26 68, 26 54 V 34 Z" fill="none" stroke="#F87171" strokeWidth="3" />
          <circle cx="50" cy="48" r="6" fill="#EF4444" />
        </svg>
      );

    case 'avatar_1':
    default:
      // Exact design from user diagram: Black circle with green outline and glowing green stylized expression
      return (
        <svg 
          width={s} 
          height={s} 
          viewBox="0 0 100 100" 
          className={`static-dp-svg dp-emerald ${className}`}
          style={{ width: s, height: s, borderRadius: '50%', flexShrink: 0 }}
        >
          <circle cx="50" cy="50" r="48" fill="#0A0F0D" stroke="#22C55E" strokeWidth="2.5" />
          {/* Eyes */}
          <ellipse cx="37" cy="42" rx="3.5" ry="5.5" fill="#22C55E" />
          <ellipse cx="63" cy="42" rx="3.5" ry="5.5" fill="#22C55E" />
          {/* Stylized contour smile / expression from image */}
          <path d="M36 65 Q 50 56 64 65" fill="none" stroke="#22C55E" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
  }
}
