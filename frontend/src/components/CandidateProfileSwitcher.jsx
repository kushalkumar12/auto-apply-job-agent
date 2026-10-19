import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, ChevronDown, Check, Plus, AlertCircle, Shield } from 'lucide-react';
import { apiService } from '../services/api';

export default function CandidateProfileSwitcher({
  activeProfile,
  onProfileSwitched,
  onOpenCreateProfile,
  onOpenProfileGate
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchProfiles = async () => {
    try {
      setIsLoading(true);
      const list = await apiService.getProfiles();
      setProfiles(list);
    } catch (e) {
      console.warn('Failed to load candidate profiles:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
    }
  }, [isOpen]);

  // Close outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectProfile = async (profileId) => {
    if (activeProfile?.id === profileId) {
      setIsOpen(false);
      return;
    }
    try {
      setIsLoading(true);
      await apiService.activateProfile(profileId);
      setIsOpen(false);
      if (onProfileSwitched) {
        onProfileSwitched(profileId);
      }
    } catch (err) {
      console.error('Failed to switch active profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = activeProfile?.isComplete || false;
  const activeName = activeProfile?.name || 'Primary Profile';

  return (
    <div className="candidate-profile-switcher-wrap" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Persistent Active Candidate Profile Trigger */}
      <button
        type="button"
        className="active-candidate-pill"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Active Candidate Profile: ${activeName}. Click to switch profiles.`}
        aria-expanded={isOpen}
        title="Candidate Profile controls job search, keywords, and matching persona."
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-card, rgba(30, 41, 59, 0.7))',
          border: '1px solid var(--border-color, rgba(148, 163, 184, 0.25))',
          borderRadius: 20,
          padding: '4px 12px 4px 10px',
          color: 'var(--text-primary, #f8fafc)',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <span 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: isComplete ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            color: isComplete ? '#10b981' : '#f59e0b'
          }}
        >
          <UserCheck size={12} strokeWidth={2.4} />
        </span>

        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #94a3b8)' }}>
            Candidate Profile
          </span>
          <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeName}
          </span>
        </span>

        <ChevronDown size={13} style={{ opacity: 0.65, marginLeft: 2 }} />
      </button>

      {/* Switcher Dropdown Popover */}
      {isOpen && (
        <div
          className="candidate-profiles-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 280,
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: 12,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            padding: '10px',
            zIndex: 1000,
            color: 'var(--text-primary, #f8fafc)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 8px 6px', borderBottom: '1px solid var(--border-color, #334155)', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted, #94a3b8)' }}>
              Switch Candidate Profile
            </span>
            <span style={{ fontSize: 10, color: isComplete ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              {isComplete ? 'Active: Ready' : 'Active: Incomplete'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
            {profiles.length > 0 ? (
              profiles.map(p => {
                const isActive = p.is_active === 1 || p.id === activeProfile?.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProfile(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      color: isActive ? 'var(--accent-color, #3b82f6)' : 'var(--text-primary, #f8fafc)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 12.5,
                      fontWeight: isActive ? 600 : 500,
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 10, color: p.is_complete ? '#10b981' : '#f59e0b', marginTop: 1 }}>
                        {p.is_complete ? 'Complete Profile' : 'Incomplete criteria'}
                      </div>
                    </div>
                    {isActive && <Check size={16} color="var(--accent-color, #3b82f6)" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })
            ) : (
              <div style={{ padding: '8px', fontSize: 12, color: 'var(--text-muted, #94a3b8)', textAlign: 'center' }}>
                {isLoading ? 'Loading profiles...' : 'Active: ' + activeName}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color, #334155)', marginTop: 8, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {!isComplete && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenProfileGate) onOpenProfileGate();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <AlertCircle size={14} />
                <span>Verify Mandatory Profile Fields</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenCreateProfile) onOpenCreateProfile();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary, #cbd5e1)',
                fontSize: 11.5,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} />
              <span>Manage / Create Candidate Profiles</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
