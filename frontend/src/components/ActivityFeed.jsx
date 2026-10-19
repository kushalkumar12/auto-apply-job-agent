import React, { useState } from 'react';
import { Trash2, Loader2, RotateCcw } from 'lucide-react';
import { PlatformIcon } from './BrandIcons';
import ConfirmDialog from './ConfirmDialog';

export default function ActivityFeed({ activities, onClear, onReset }) {
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleConfirmClear = () => {
    onClear();
    setShowConfirmClear(false);
  };

  return (
    <div className="activity-feed-container">
      {/* Header */}
      <div className="activity-feed-topbar">
        <h2 className="activity-feed-title">Activity Feed</h2>
        {activities.length > 0 && (
          <button 
            className="btn-clear-outline"
            onClick={() => setShowConfirmClear(true)}
            title="Clear activity log"
            aria-label="Clear activity log"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmClear}
        title="Clear Activity Log?"
        message="This action will clear all entries from your current activity history."
        confirmLabel="Clear Log"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setShowConfirmClear(false)}
      />

      {/* Activity Items List */}
      <div className="activity-stream-list">
        {activities.length === 0 ? (
          <div className="empty-feed-placeholder" style={{ padding: '36px 16px', textAlign: 'center' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0', fontSize: '14px' }}>No activity logged yet</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Live job applications, discovery scans, and profile sync events will be recorded here in real time.
            </p>
          </div>
        ) : (
          activities.map((item) => (
            <div key={item.id} className="activity-stream-row">
              {/* Status Dot */}
              <span className={`stream-bullet ${item.status === 'success' ? 'bullet-success' : ''}`}></span>

              {/* Time */}
              <span className="stream-timestamp">{item.time}</span>

              {/* Platform Logo / Status Icon */}
              <div className="stream-icon-cell">
                <PlatformIcon type={item.iconType} size={18} />
              </div>

              {/* Description Text */}
              <span className="stream-message-text">{item.text}</span>

              {/* Right Count Badge or Spinner */}
              <div className="stream-status-action">
                {item.status === 'scanning' ? (
                  <Loader2 size={16} className="scanning-spinner" />
                ) : item.countBadge ? (
                  <span className={`stream-count-pill ${item.status === 'success' ? 'count-pill-success' : ''}`}>
                    {item.countBadge}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
