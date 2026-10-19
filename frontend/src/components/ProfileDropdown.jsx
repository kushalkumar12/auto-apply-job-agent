import React, { useRef, useEffect } from 'react';
import { Palette, HelpCircle, Settings, LogOut, User, ChevronRight, ShieldCheck } from 'lucide-react';
import StaticAvatar from './StaticAvatar';

export default function ProfileDropdown({
  isOpen,
  onClose,
  currentUser,
  candidateProfile,
  onNavigateProfile,
  onOpenHelp,
  onOpenSettings,
  onOpenThemes,
  onLogout
}) {
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const candidateName = candidateProfile?.name || candidateProfile?.fullName || 'No Candidate Profile';
  const candidateTitle = candidateProfile?.title || candidateProfile?.summary || 'Add details in Profile & Resume';

  return (
    <div className="profile-dropdown-card" ref={dropdownRef} style={{ width: 280 }}>
      {/* 1. Login Person (Account) */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' }}>
        Logged In Account
      </div>
      <div className="profile-dropdown-header" style={{ marginBottom: 10, paddingBottom: 10 }}>
        {currentUser?.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http')) ? (
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name || 'User'} 
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--border-color, #334155)' }} 
          />
        ) : (
          <StaticAvatar 
            avatarId={currentUser?.avatar || 'avatar_1'} 
            size={38} 
          />
        )}
        <div className="profile-dropdown-user-info" style={{ minWidth: 0, flex: 1 }}>
          <span className="profile-dropdown-name" style={{ fontSize: 13.5 }}>{currentUser?.name || 'Guest User'}</span>
          <span className="profile-dropdown-status" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser?.authProvider === 'google' ? 'Google Account' : (currentUser?.email || 'Connected')}
          </span>
        </div>
      </div>

      {/* 2. Candidate Profile (Menu Data - Can be different from login person) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' }}>
          Candidate Profile
        </span>
        <span style={{ fontSize: 9.5, color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
          Live Profile
        </span>
      </div>
      <div 
        onClick={() => { onClose(); if (onNavigateProfile) onNavigateProfile(); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          cursor: 'pointer',
          marginBottom: 12,
          transition: 'all 120ms ease'
        }}
        className="profile-dropdown-candidate-box"
        title="Candidate Profile details can differ from your login account. Click to view & edit."
      >
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={16} color="#4F46E5" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {candidateName}
          </div>
          <div style={{ fontSize: 10.5, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {candidateTitle}
          </div>
        </div>
        <ChevronRight size={14} color="#94A3B8" />
      </div>

      {/* Menu List: 1. Profile Page → 2. Theme → 3. Help & Privacy → 4. Settings → 5. Logout */}
      <div className="profile-dropdown-menu-list">
        {/* 1. Candidate Profile */}
        <button 
          className="profile-dropdown-item" 
          onClick={() => { onClose(); if (onNavigateProfile) onNavigateProfile(); }}
        >
          <User size={16} />
          <span>Profile & Resume</span>
        </button>

        {/* 2. Theme */}
        <button 
          className="profile-dropdown-item" 
          onClick={() => { onClose(); onOpenThemes(); }}
        >
          <Palette size={16} />
          <span>Themes</span>
        </button>

        {/* 3. Help & Privacy */}
        <button 
          className="profile-dropdown-item" 
          onClick={() => { onClose(); onOpenHelp(); }}
        >
          <HelpCircle size={16} />
          <span>Help and Privacy</span>
        </button>

        {/* 4. Settings */}
        <button 
          className="profile-dropdown-item" 
          onClick={() => { onClose(); onOpenSettings(); }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>

        {/* 5. Logout */}
        <button 
          className="profile-dropdown-item item-logout" 
          onClick={() => { onClose(); onLogout(); }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

