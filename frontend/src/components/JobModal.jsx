import React from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  FileText,
  Bookmark
} from 'lucide-react';

export default function JobModal({ job, onClose, onApply, onToggleMarker, onTailorResume }) {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && job) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [job, onClose]);

  if (!job) return null;

  const handleDirectApply = () => {
    const targetUrl = job.url || `https://www.google.com/search?q=${encodeURIComponent(job.company + ' ' + job.role + ' careers')}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Job details for ${job.role}`}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div className="modal-subtitle">
              <Building2 size={16} />
              <span>{job.company}</span>
              <span className="dot-separator">•</span>
              <MapPin size={15} />
              <span>{job.location}</span>
            </div>
            <h2 className="modal-title">{job.role}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button"
              onClick={() => onToggleMarker && onToggleMarker(job.id)}
              className={`modal-mark-btn ${job.marked ? 'is-marked' : ''}`}
              title={job.marked ? "Remove marker" : "Mark this job"}
              aria-label={job.marked ? "Remove marker" : "Mark this job"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: job.marked ? '1px solid #d97706' : '1px solid rgba(148, 163, 184, 0.3)',
                background: job.marked ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: job.marked ? '#d97706' : 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                transition: 'all 0.15s ease'
              }}
            >
              <Bookmark size={15} fill={job.marked ? "#d97706" : "none"} />
              <span>{job.marked ? 'Marked' : 'Mark'}</span>
            </button>
            <button onClick={onClose} className="modal-close-btn" aria-label="Close dialog">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* ATS Match Card */}
          <div className="modal-score-card">
            <div className="modal-score-header">
              <div className="score-ring-wrapper">
                <span className="score-val">{job.atsScore}%</span>
              </div>
              <div>
                <h4 className="match-heading">ATS Compatibility Score</h4>
                <p className="match-subtext">
                  Your primary profile matches <strong>{Math.round(job.atsScore * 0.9)}%</strong> of required core competencies.
                </p>
              </div>
            </div>

            <div className="score-bars">
              <div className="score-bar-item">
                <div className="score-bar-label">
                  <span>Keywords Match</span>
                  <span>{job.atsScore}%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${job.atsScore}%` }}></div>
                </div>
              </div>

              <div className="score-bar-item">
                <div className="score-bar-label">
                  <span>Experience Level Fit</span>
                  <span>92%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="quick-info-grid">
            <div className="info-cell">
              <span className="cell-label">Work Mode</span>
              <span className="cell-value">{job.workMode}</span>
            </div>
            <div className="info-cell">
              <span className="cell-label">Source Platform</span>
              <span className="cell-value">{job.source}</span>
            </div>
            <div className="info-cell">
              <span className="cell-label">Est. Salary</span>
              <span className="cell-value">{job.salary}</span>
            </div>
            <div className="info-cell">
              <span className="cell-label">Posted Date</span>
              <span className="cell-value">{job.dateTime}</span>
            </div>
          </div>

          {/* Skills Required */}
          {job.skills && job.skills.length > 0 && (
            <div className="skills-section">
              <h3 className="section-subheading">Key Tech Stack & Competencies</h3>
              <div className="skills-pills-list">
                {job.skills.map((skill, index) => (
                  <span key={index} className="skill-pill">
                    <CheckCircle2 size={13} className="skill-icon" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Entire Job Description Section */}
          <div className="description-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 className="section-subheading" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} />
                <span>Entire Job Description</span>
              </h3>
              {job.url && (
                <a 
                  href={job.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>View Original Post</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            <div 
              className="entire-jd-scroll-container"
              style={{
                background: 'rgba(15, 23, 42, 0.45)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '8px',
                padding: '16px',
                maxHeight: '380px',
                overflowY: 'auto',
                fontSize: '13.5px',
                lineHeight: 1.65,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit'
              }}
            >
              {job.description || 'No detailed description available for this posting.'}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer">
          <button 
            type="button"
            className="tailor-resume-btn"
            onClick={() => {
              if (onTailorResume) {
                onTailorResume(job);
              }
            }}
          >
            <Sparkles size={16} />
            <span>Tailor Resume</span>
          </button>

          <button 
            type="button"
            className="modal-apply-btn"
            onClick={handleDirectApply}
            title={`Redirect directly to ${job.company} job posting to apply manually`}
          >
            <ExternalLink size={16} />
            <span>Apply on {job.source || 'Company Board'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
