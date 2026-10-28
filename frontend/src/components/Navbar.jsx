import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  Play, 
  User, 
  BarChart3,
  Wrench,
  LogIn,
  Bell,
  Lock
} from 'lucide-react';
import StaticAvatar from './StaticAvatar';
import ProfileDropdown from './ProfileDropdown';
import Skill2RoleLogo from './Skill2RoleLogo';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  candidateProfile,
  activeCandidateProfile,
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
    { id: 'profile', label: 'Job Profile', enabled: true },
    { id: 'analytics', label: 'Analytics', enabled: true },
    { id: 'tools', label: 'Tools', enabled: true }
  ];

  const sourceItems = menuItems && menuItems.length > 0 ? menuItems : DEFAULT_NAV_ITEMS;
  const visibleNavItems = sourceItems
    .filter(item => item.enabled !== false)
    .map(item => ({
      ...item,
      label: item.id === 'profile' ? 'Job Profile' : item.label,
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
          const isProfileComplete = Boolean(activeCandidateProfile?.isComplete || candidateProfile?.isComplete);
          const GATED_TABS = ['explore', 'generation', 'automation', 'analytics'];
          const isItemLocked = GATED_TABS.includes(item.id) && !isProfileComplete;
          const Icon = isItemLocked ? Lock : item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isItemLocked) {
                  setActiveTab('profile');
                  if (onOpenProfileGate) onOpenProfileGate();
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`nav-tab-btn ${isActive ? 'nav-tab-active' : ''} ${isItemLocked ? 'nav-tab-locked' : ''}`}
              role="tab"
              aria-selected={isActive}
              aria-label={`Navigate to ${item.label}`}
              title={isItemLocked ? `${item.label} is locked until you complete your Candidate Profile (5 Primary Skills, Experience & Location)` : `Navigate to ${item.label}`}
              style={isItemLocked ? { opacity: 0.72, cursor: 'not-allowed' } : {}}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="nav-tab-icon" style={isItemLocked ? { color: '#f59e0b' } : {}} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: Actions, Notifications & Profile Menu */}
      <div className="nav-actions">
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
              aria-label="Open User Account Menu"
              aria-expanded={isDropdownOpen}
              title={`${currentUser.name || 'User'} (${currentUser.email || ''})`}
            >
              <StaticAvatar name={currentUser.name || currentUser.email || 'User'} size={34} />
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
