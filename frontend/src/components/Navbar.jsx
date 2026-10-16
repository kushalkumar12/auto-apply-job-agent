import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  Play, 
  User, 
  BarChart3,
  Wrench,
  LogIn
} from 'lucide-react';
import StaticAvatar from './StaticAvatar';
import ProfileDropdown from './ProfileDropdown';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onOpenAuthModal,
  onOpenHelp,
  onOpenSettings,
  onOpenThemes,
  onLogout
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navItems = [
    { id: 'explore', label: 'Explore', icon: Search },
    { id: 'generation', label: 'Generation', icon: FileText },
    { id: 'automation', label: 'Automation', icon: Play },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'tools', label: 'Tools', icon: Wrench }
  ];

  return (
    <header className="navbar-container">
      {/* Brand Logo & Title */}
      <div className="brand-group" onClick={() => setActiveTab('explore')} role="button" tabIndex={0}>
        <div className="logo-icon-wrapper">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h8l-3 4h7l-4 6h5l-10 6 3-7H4z"/>
          </svg>
        </div>
        <span className="brand-name">Resume Porter</span>
      </div>

      {/* Navigation Tabs */}
      <nav className="nav-tabs-wrapper" aria-label="Main Navigation">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-tab-btn ${isActive ? 'nav-tab-active' : ''}`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="nav-tab-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: User DP Trigger Button matching diagram */}
      <div className="nav-actions">
        {currentUser ? (
          <>
            <button 
              className="nav-avatar-trigger" 
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(prev => !prev);
              }}
              aria-label="Open User Profile Menu"
              title={`${currentUser.name} (${currentUser.email})`}
            >
              <StaticAvatar avatarId={currentUser.avatar || 'avatar_1'} size={34} />
            </button>
            <ProfileDropdown 
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              currentUser={currentUser}
              onOpenHelp={onOpenHelp}
              onOpenSettings={onOpenSettings}
              onOpenThemes={onOpenThemes}
              onLogout={onLogout}
            />
          </>
        ) : (
          <button 
            className="nav-signin-pill" 
            onClick={() => onOpenAuthModal('login')}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
