import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  Play, 
  User, 
  BarChart3,
  Wrench,
  LogIn,
  Bell
} from 'lucide-react';
import StaticAvatar from './StaticAvatar';
import ProfileDropdown from './ProfileDropdown';
import Skill2RoleLogo from './Skill2RoleLogo';
import CandidateProfileSwitcher from './CandidateProfileSwitcher';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  candidateProfile,
  activeCandidateProfile,
  onProfileSwitched,
  onOpenCreateProfile,
  onOpenProfileGate,
  onOpenAuthModal,
  onOpenHelp,
  onOpenSettings,
  onOpenThemes,
  onOpenNotifications,
  unreadNotifsCount = 0,
  onLogout,
  menuItems = []
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const ICON_MAP = {
    explore: Search,
    generation: FileText,
    automation: Play,
    profile: User,
    analytics: BarChart3,
    tools: Wrench
  };

  const DEFAULT_NAV_ITEMS = [
    { id: 'explore', label: 'Explore', enabled: true },
    { id: 'generation', label: 'Generation', enabled: true },
    { id: 'automation', label: 'Automation', enabled: true },
    { id: 'profile', label: 'Profile', enabled: true },
    { id: 'analytics', label: 'Analytics', enabled: true },
    { id: 'tools', label: 'Tools', enabled: true }
  ];

  const sourceItems = menuItems && menuItems.length > 0 ? menuItems : DEFAULT_NAV_ITEMS;
  const visibleNavItems = sourceItems
    .filter(item => item.enabled !== false)
    .map(item => ({
      ...item,
      icon: ICON_MAP[item.id] || Search
    }));

  const handleBrandClick = () => {
    const hasExplore = visibleNavItems.some(i => i.id === 'explore');
    if (hasExplore) {
      setActiveTab('explore');
    } else if (visibleNavItems.length > 0) {
      setActiveTab(visibleNavItems[0].id);
    }
  };

  const handleBrandKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBrandClick();
    }
  };

  return (
    <header className="navbar-container" role="banner">
      {/* Brand Logo & Title */}
      <div 
        className="brand-group" 
        onClick={handleBrandClick} 
        onKeyDown={handleBrandKeyDown}
        role="button" 
        tabIndex={0}
        aria-label="skill2role Home"
      >
        <Skill2RoleLogo size={32} showText={true} />
      </div>

      {/* Navigation Tabs */}
      <nav className="nav-tabs-wrapper" aria-label="Main Navigation" role="tablist">
        {visibleNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-tab-btn ${isActive ? 'nav-tab-active' : ''}`}
              role="tab"
              aria-selected={isActive}
              aria-label={`Navigate to ${item.label}`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="nav-tab-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Actions, Notifications & Profile Menu */}
      <div className="nav-actions">
        {/* Candidate Profile Persona Switcher */}
        <CandidateProfileSwitcher
          activeProfile={activeCandidateProfile}
          onProfileSwitched={onProfileSwitched}
          onOpenCreateProfile={onOpenCreateProfile}
          onOpenProfileGate={onOpenProfileGate}
        />

        {/* Global Notification Bell Trigger */}
        <button 
          className="nav-action-icon-btn" 
          onClick={onOpenNotifications} 
          aria-label={`Open notifications (${unreadNotifsCount} unread)`}
          title="Notifications"
        >
          <Bell size={17} />
          {unreadNotifsCount > 0 && (
            <span className="nav-notif-badge">{unreadNotifsCount}</span>
          )}
        </button>

        {currentUser ? (
          <>
            <button 
              className="nav-avatar-trigger" 
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(prev => !prev);
              }}
              aria-label="Open User Profile Menu"
              aria-expanded={isDropdownOpen}
              title={`${currentUser.name} (${currentUser.email})`}
            >
              {currentUser.avatar && (currentUser.avatar.startsWith('data:') || currentUser.avatar.startsWith('http')) ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name || 'User'} 
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '1.5px solid var(--border-color, #334155)' }} 
                />
              ) : (
                <StaticAvatar avatarId={currentUser.avatar || 'avatar_1'} size={34} />
              )}
            </button>
            <ProfileDropdown 
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              currentUser={currentUser}
              candidateProfile={candidateProfile}
              onNavigateProfile={() => setActiveTab('profile')}
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
            aria-label="Sign In"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
