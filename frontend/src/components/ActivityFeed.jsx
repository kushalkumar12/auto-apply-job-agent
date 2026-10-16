import React from 'react';
import { Trash2, Loader2, RotateCcw } from 'lucide-react';
import { PlatformIcon } from './BrandIcons';

export default function ActivityFeed({ activities, onClear, onReset }) {
  return (
    <div className="activity-feed-container">
      {/* Header */}
      <div className="activity-feed-topbar">
        <h2 className="activity-feed-title">Activity Feed</h2>
        {activities.length > 0 ? (
          <button 
            className="btn-clear-outline"
            onClick={onClear}
            title="Clear activity log"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        ) : (
          <button 
            className="btn-clear-outline"
            onClick={onReset}
            title="Restore activity log"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Activity Items List */}
      <div className="activity-stream-list">
        {activities.length === 0 ? (
          <div className="empty-feed-placeholder">
            <p>Activity feed is empty.</p>
            <button onClick={onReset} className="btn-restore-stream">Restore Log</button>
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
