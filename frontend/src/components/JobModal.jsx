import React from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  FileText,
  BadgePercent
} from 'lucide-react';

export default function JobModal({ job, onClose, onApply }) {
  if (!job) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
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

          <button onClick={onClose} className="modal-close-btn" aria-label="Close dialog">
            <X size={20} />
          </button>
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
                  Your primary resume matches <strong>{Math.round(job.atsScore * 0.9)}%</strong> of required core competencies.
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
          <div className="skills-section">
            <h3 className="section-subheading">Key Tech Stack & Competencies</h3>
            <div className="skills-pills-list">
              {job.skills?.map((skill, index) => (
                <span key={index} className="skill-pill">
                  <CheckCircle2 size={13} className="skill-icon" />
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="description-section">
            <h3 className="section-subheading">Role Overview</h3>
            <p className="description-text">{job.description}</p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer">
          <button 
            className="tailor-resume-btn"
            onClick={() => alert(`Tailoring Resume for ${job.role} at ${job.company} via AI Engine!`)}
          >
            <Sparkles size={16} />
            <span>Tailor Resume</span>
          </button>

          <button 
            className={`modal-apply-btn ${job.applied ? 'btn-applied' : ''}`}
            onClick={() => onApply(job.id, job.company, job.role)}
          >
            {job.applied ? (
              <>
                <CheckCircle2 size={16} />
                <span>Applied Successfully</span>
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                <span>Apply on {job.source}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
