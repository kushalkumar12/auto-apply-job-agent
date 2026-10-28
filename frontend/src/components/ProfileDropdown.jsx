import React, { useRef, useEffect } from 'react';
import { Palette, HelpCircle, Settings, LogOut } from 'lucide-react';
import StaticAvatar from './StaticAvatar';

export default function ProfileDropdown({
  isOpen,
  onClose,
  currentUser,
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

  return (
    <div className="profile-dropdown-card" ref={dropdownRef} style={{ width: 280 }}>
      {/* User Account Header */}
      <div className="profile-dropdown-header" style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
        <StaticAvatar 
          name={currentUser?.name || currentUser?.email || 'User'} 
          size={38} 
        />
        <div className="profile-dropdown-user-info" style={{ minWidth: 0, flex: 1 }}>
          <span className="profile-dropdown-name" style={{ fontSize: 13.5, fontWeight: 600 }}>{currentUser?.name || 'Guest User'}</span>
          <span className="profile-dropdown-status" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser?.authProvider === 'google' ? 'Google Account' : (currentUser?.email || 'Connected')}
          </span>
        </div>
      </div>

      {/* Menu List: 1. Theme → 2. Help & Privacy → 3. Settings → 4. Logout */}
      <div className="profile-dropdown-menu-list">

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

