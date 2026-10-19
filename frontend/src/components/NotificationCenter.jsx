import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X, Sparkles, Briefcase, Zap, Info, ArrowRight } from 'lucide-react';

export default function NotificationCenter({
  isOpen,
  onClose,
  onNavigateTab
}) {
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('rp_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeFilter, setActiveFilter] = useState('all');
  const drawerRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
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

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const markSingleRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const handleAction = (n) => {
    markSingleRead(n.id);
    if (n.actionTab && onNavigateTab) {
      onNavigateTab(n.actionTab);
    }
    onClose();
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeFilter === 'unread') return n.unread;
    if (activeFilter === 'radar') return n.type === 'radar';
    if (activeFilter === 'pipeline') return n.type === 'pipeline';
    return true;
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  if (!isOpen) return null;

  return (
    <div className="notif-center-overlay" role="presentation">
      <div 
        className="notif-center-panel" 
        ref={drawerRef}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="notif-center-title"
      >
        {/* Header */}
        <div className="notif-center-header">
          <div className="notif-title-group">
            <Bell size={18} className="notif-header-icon" />
            <h2 id="notif-center-title" className="notif-center-title">Notifications</h2>
            {unreadCount > 0 && (
              <span className="notif-badge-pill">{unreadCount} new</span>
            )}
          </div>
          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button 
                className="notif-mark-all-btn" 
                onClick={markAllRead}
                title="Mark all as read"
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
            <button 
              className="notif-close-btn" 
              onClick={onClose}
              aria-label="Close notification panel"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="notif-filter-tabs">
          <button 
            className={`notif-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button 
            className={`notif-tab ${activeFilter === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button 
            className={`notif-tab ${activeFilter === 'radar' ? 'active' : ''}`}
            onClick={() => setActiveFilter('radar')}
          >
            Radar
          </button>
          <button 
            className={`notif-tab ${activeFilter === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveFilter('pipeline')}
          >
            Pipeline
          </button>
        </div>

        {/* Stream List */}
        <div className="notif-center-body">
          {filteredNotifs.length === 0 ? (
            <div className="notif-empty-state">
              <Info size={24} className="notif-empty-icon" />
              <p>No notifications in this filter.</p>
            </div>
          ) : (
            filteredNotifs.map((item) => (
              <div 
                key={item.id} 
                className={`notif-card-item ${item.unread ? 'is-unread' : ''}`}
                onClick={() => handleAction(item)}
              >
                <div className="notif-card-icon-col">
                  {item.type === 'radar' && <Sparkles size={16} className="notif-type-icon icon-radar" />}
                  {item.type === 'pipeline' && <Zap size={16} className="notif-type-icon icon-pipeline" />}
                  {item.type === 'generation' && <Briefcase size={16} className="notif-type-icon icon-gen" />}
                </div>
                <div className="notif-card-content">
                  <div className="notif-card-top">
                    <span className="notif-card-title">{item.title}</span>
                    <span className="notif-card-time">{item.time}</span>
                  </div>
                  <p className="notif-card-message">{item.message}</p>
                  <div className="notif-card-action-link">
                    <span>View in {item.actionTab}</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
                {item.unread && <span className="notif-unread-dot" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
