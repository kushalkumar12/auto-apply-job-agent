import React from 'react';

/**
 * Skill2Role Master Brand Logo
 * Crafted with geometric precision:
 * - Left node & ribbon: "Skill" (capability, technical mastery)
 * - Central dynamic loop: "2" (hyper-link bridge, transformation)
 * - Right apex chevron: "Role" (career milestone, executive alignment)
 */
export default function Skill2RoleLogo({ size = 28, showText = false, className = '' }) {
  return (
    <div className={`s2r-logo-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', userSelect: 'none' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 36 36" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="s2r-logo-svg"
        style={{ flexShrink: 0, transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <defs>
          {/* Base Container Gradient */}
          <linearGradient id="s2r-container-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="60%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Core Brand Accent Gradient (Vibrant Emerald / Mint Tech) */}
          <linearGradient id="s2r-accent-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>

          {/* Secondary Ribbon Gradient (Electric Indigo / Sapphire) */}
          <linearGradient id="s2r-bridge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>

          {/* Subtle Inner Glow Filter */}
          <filter id="s2r-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Squircle Badge Container */}
        <rect 
          x="1" 
          y="1" 
          width="34" 
          height="34" 
          rx="9" 
          fill="url(#s2r-container-grad)" 
          stroke="rgba(255, 255, 255, 0.12)" 
          strokeWidth="1.2" 
        />
        
        {/* Subtle Diagonal Highlight */}
        <path 
          d="M2 10 C10 2, 26 2, 34 10" 
          stroke="rgba(255, 255, 255, 0.08)" 
          strokeWidth="1" 
          strokeLinecap="round" 
        />

        {/* 1. Skill Anchor (Origin Node at Bottom-Left) */}
        <circle cx="9.5" cy="24.5" r="2.5" fill="url(#s2r-accent-grad)" />
        <circle cx="9.5" cy="24.5" r="4.2" stroke="url(#s2r-accent-grad)" strokeWidth="0.8" strokeOpacity="0.4" />

        {/* 2. Dynamic 'S' to '2' Transition Ribbon */}
        <path 
          d="M9.5 24.5 C9.5 17, 14 13, 18 13 C22.5 13, 26 15.5, 23 20 C20 24.5, 13 25.5, 18 26.5 C23 27.5, 26 24, 27 21" 
          stroke="url(#s2r-bridge-grad)" 
          strokeWidth="2.4" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeOpacity="0.85"
        />

        {/* 3. Role Arrow / Career Apex Target (Top-Right High-Velocity Trajectory) */}
        <path 
          d="M15 11.5 L26.5 11.5 L26.5 23" 
          stroke="url(#s2r-accent-grad)" 
          strokeWidth="2.8" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          filter="url(#s2r-glow)"
        />

        {/* Forward Chevron Apex Pointer */}
        <path 
          d="M17.5 20.5 L26.5 11.5" 
          stroke="url(#s2r-accent-grad)" 
          strokeWidth="2.8" 
          strokeLinecap="round" 
        />

        {/* Target Destination Pulse Point (Top-Right) */}
        <circle cx="26.5" cy="11.5" r="1.8" fill="#ffffff" />
      </svg>

      {showText && (
        <span className="s2r-brand-wordmark" style={{ display: 'inline-flex', alignItems: 'center', letterSpacing: '-0.025em', fontWeight: 700, fontSize: '1.25rem', lineHeight: 1 }}>
          <span style={{ color: 'var(--text-primary, #0f172a)' }}>skill</span>
          <span style={{ 
            color: '#10b981', 
            fontWeight: 800, 
            padding: '0 1px',
            textShadow: '0 0 12px rgba(16, 185, 129, 0.35)'
          }}>2</span>
          <span style={{ color: 'var(--text-primary, #0f172a)' }}>role</span>
        </span>
      )}
    </div>
  );
}
