import React from 'react';

// Curated modern color palettes mapped deterministically by initial letter
const PALETTES = [
  { bg: 'linear-gradient(135deg, #10B981 0%, #047857 100%)', border: '#059669', color: '#FFFFFF' }, // Emerald
  { bg: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)', border: '#4F46E5', color: '#FFFFFF' }, // Indigo
  { bg: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', border: '#7C3AED', color: '#FFFFFF' }, // Violet
  { bg: 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)', border: '#D97706', color: '#FFFFFF' }, // Amber
  { bg: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)', border: '#0891B2', color: '#FFFFFF' }, // Cyan
  { bg: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)', border: '#DB2777', color: '#FFFFFF' }, // Pink
  { bg: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', border: '#2563EB', color: '#FFFFFF' }, // Blue
  { bg: 'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)', border: '#0D9488', color: '#FFFFFF' }  // Teal
];

export const AVATAR_OPTIONS = [];

export default function StaticAvatar({ 
  name = '', 
  avatarId, 
  size = 38, 
  className = '', 
  style = {} 
}) {
  // Extract the first letter from candidate / user name or email
  let displayChar = 'U';
  if (name && typeof name === 'string' && name.trim()) {
    displayChar = name.trim().charAt(0).toUpperCase();
  } else if (avatarId && typeof avatarId === 'string' && !avatarId.startsWith('avatar_') && avatarId.trim()) {
    displayChar = avatarId.trim().charAt(0).toUpperCase();
  }

  // Consistent color picking based on character code
  const charCode = displayChar.charCodeAt(0) || 85;
  const palette = PALETTES[charCode % PALETTES.length];
  const fontSize = Math.max(12, Math.round(size * 0.46));

  return (
    <div 
      className={`user-initial-avatar ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        background: palette.bg,
        color: palette.color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        lineHeight: 1,
        letterSpacing: '0.02em',
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
        border: `1.5px solid ${palette.border}`,
        textTransform: 'uppercase',
        ...style
      }}
      aria-label={`Avatar: ${displayChar}`}
    >
      {displayChar}
    </div>
  );
}
