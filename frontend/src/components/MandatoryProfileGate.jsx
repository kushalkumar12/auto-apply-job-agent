import React from 'react';
import { CheckCircle2, AlertCircle, Sparkles, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export default function MandatoryProfileGate({
  isOpen,
  onClose,
  validationData,
  onNavigateToProfile,
  onStartExplorer
}) {
  if (!isOpen) return null;

  const isComplete = validationData?.isComplete || false;
  const missing = validationData?.missingFields || [];
  const fieldStatus = validationData?.fieldStatus || {};
  const definitions = validationData?.mandatoryDefinitions || [
    { field: 'fullName', label: 'Full Name', description: 'Legal or professional candidate name' },
    { field: 'email', label: 'Contact Email', description: 'Candidate communication address' },
    { field: 'primarySkill', label: 'Primary Skill', description: 'Core technical capability anchoring job search (e.g. Java, Python)' },
    { field: 'skillsList', label: 'Technical Skills', description: 'At least 2 technical competencies in candidate skillset' },
    { field: 'selectedRoles', label: 'Target Roles', description: 'At least 1 target job title or role preference' },
    { field: 'userLocation', label: 'Location Preference', description: 'Target geographic location or remote preference' },
    { field: 'resume', label: 'Resume / CV', description: 'Uploaded resume document or structured professional summary' }
  ];

  const completedCount = definitions.filter(d => fieldStatus[d.field]).length;
  const totalCount = definitions.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  return (
    <div 
      className="modal-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="gate-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        className="gate-modal-card"
        style={{
          width: '100%',
          maxWidth: 540,
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          padding: '24px 28px',
          color: 'var(--text-primary, #f8fafc)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isComplete ? (
          // Polished, Accessible Theme-Adaptive Success State
          <div style={{ textAlign: 'center', padding: '12px 4px' }}>
            <div 
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#10b981'
              }}
            >
              <CheckCircle2 size={36} strokeWidth={2.2} />
            </div>

            <span 
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '3px 10px',
                borderRadius: 20,
                marginBottom: 8
              }}
            >
              Profile Complete · Explorer Ready
            </span>

            <h2 id="gate-modal-title" style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px 0' }}>
              Candidate Profile Verified
            </h2>

            <p style={{ fontSize: 13.5, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.5, marginBottom: 20 }}>
              All 7 mandatory candidate criteria have been verified. Explorer searches and real-time Radar discovery are now fully active for profile <strong>"{validationData?.profileName || 'Active Profile'}"</strong>.
            </p>

            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color, #334155)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 24,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <ShieldCheck size={24} color="#10b981" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #cbd5e1)' }}>
                Your job discoveries and ATS search queries are anchored strictly around your verified skills and resume specifications.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn-primary"
                onClick={() => {
                  onClose();
                  if (onStartExplorer) onStartExplorer();
                }}
                style={{
                  background: 'var(--accent-color, #3b82f6)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 24px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)'
                }}
              >
                <span>Launch Explorer Radar</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          // Incomplete State (Mandatory Gate)
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div 
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                  flexShrink: 0
                }}
              >
                <AlertCircle size={22} />
              </div>
              <div>
                <h2 id="gate-modal-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  Mandatory Profile Gate
                </h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                  Active Candidate Profile: <strong>{validationData?.profileName || 'Primary Profile'}</strong>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              To discover real, high-signal job matches, Explorer requires all mandatory candidate criteria before running searches. Complete the missing fields below:
            </p>

            {/* Progress Bar */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary, #cbd5e1)' }}>Completion Progress</span>
                <span style={{ color: pct === 100 ? '#10b981' : '#f59e0b' }}>{completedCount} of {totalCount} fields ({pct}%)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                <div 
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #f59e0b, #3b82f6)',
                    borderRadius: 4,
                    transition: 'width 0.3s ease'
                  }} 
                />
              </div>
            </div>

            {/* Field Checklist */}
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 250,
                overflowY: 'auto',
                marginBottom: 20,
                paddingRight: 4
              }}
            >
              {definitions.map((def) => {
                const isMet = fieldStatus[def.field];
                return (
                  <div 
                    key={def.field}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: isMet ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${isMet ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      borderRadius: 8
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                        {def.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
                        {def.description}
                      </div>
                    </div>
                    <div>
                      {isMet ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 11.5, fontWeight: 600 }}>
                          <CheckCircle2 size={16} /> Ready
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: 11.5, fontWeight: 600 }}>
                          <AlertCircle size={16} /> Required
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color, #334155)',
                  color: 'var(--text-secondary, #cbd5e1)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onNavigateToProfile) onNavigateToProfile();
                }}
                style={{
                  background: 'var(--accent-color, #3b82f6)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>Complete Profile Now</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
