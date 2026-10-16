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
    <div className="profile-dropdown-card" ref={dropdownRef}>
      {/* Header: DP + Name + Connected by Google */}
      <div className="profile-dropdown-header">
        <StaticAvatar 
          avatarId={currentUser?.avatar || 'avatar_1'} 
          size={42} 
        />
        <div className="profile-dropdown-user-info">
          <span className="profile-dropdown-name">{currentUser?.name || 'Kushal Kumar'}</span>
          <span className="profile-dropdown-status">
            {currentUser?.authProvider === 'google' ? 'Connected by Google' : (currentUser?.email || 'Connected')}
          </span>
        </div>
      </div>

      {/* Menu List: 1. Theme → 2. Help & Privacy → 3. Settings → 4. Logout */}
      <div className="profile-dropdown-menu-list">
        {/* 1. Theme */}
        <button 
          className="profile-dropdown-item" 
          onClick={() => { onClose(); onOpenThemes(); }}
        >
          <Palette size={16} />
          <span>Themes</span>
        </button>

        {/* 2. Help & Privacy */}
        <button 
          className="profile-dropdown-item" 
          onClick={() => { onClose(); onOpenHelp(); }}
        >
          <HelpCircle size={16} />
          <span>Help and Privacy</span>
        </button>

        {/* 3. Settings */}
        <button 
          className="profile-dropdown-item" 
          onClick={() => { onClose(); onOpenSettings(); }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>

        {/* 4. Logout */}
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
