import React, { useState, useEffect } from 'react';
import { 
  LogIn, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ShieldCheck, 
  Globe, 
  AlertTriangle,
  Link as LinkIcon,
  Briefcase,
  Target,
  Zap,
  Building2,
  Rocket
} from 'lucide-react';
import { apiService } from '../../services/api';

const INTEGRATION_PLATFORMS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Briefcase,
    color: '#0a66c2',
    loginUrl: 'https://www.linkedin.com/login',
    profileKey: 'linkedinUrl',
    description: ''
  },
  {
    id: 'indeed',
    name: 'Indeed',
    icon: Target,
    color: '#2164f3',
    loginUrl: 'https://secure.indeed.com/auth',
    profileKey: 'indeedUrl',
    description: 'Automate job discovery and quick apply workflows on Indeed.'
  },
  {
    id: 'naukri',
    name: 'Naukri',
    icon: Zap,
    color: '#f59e0b',
    loginUrl: 'https://www.naukri.com/nlogin/login',
    profileKey: 'naukriUrl',
    description: ''
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    icon: Building2,
    color: '#0caa41',
    loginUrl: 'https://www.glassdoor.com/profile/login_input.htm',
    profileKey: 'glassdoorUrl',
    description: ''
  },
  {
    id: 'wellfound',
    name: 'Wellfound (AngelList)',
    icon: Rocket,
    color: '#ef4444',
    loginUrl: 'https://wellfound.com/login',
    profileKey: 'wellfoundUrl',
    description: ''
  }
];

export default function Page9Integrations(props) {
  const profile = props.profile || props.profileData || {};
  const updateField = props.updateField || ((k, v) => {
    if (typeof props.onChange === 'function') props.onChange({ ...profile, [k]: v });
  });
  const [sessions, setSessions] = useState({ linkedin: false, indeed: false, naukri: false, glassdoor: false, wellfound: false });
  const [loginStatus, setLoginStatus] = useState({ open: false });
  const [loading, setLoading] = useState(false);
  const [activeMessage, setActiveMessage] = useState('');

  const refreshSessions = async () => {
    try {
      const data = await apiService.getLoginSessions();
      if (data) setSessions(prev => ({ ...prev, ...data }));
      const status = await apiService.getLoginStatus();
      if (status) setLoginStatus(status);
    } catch (err) {
      console.warn('Session refresh notice:', err);
    }
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  const handleOpenLogin = async (url, name) => {
    setLoading(true);
    setActiveMessage(`Launching browser for ${name}... Complete login or 2FA in the opened window.`);
    try {
      await apiService.openLoginBrowser(url);
      setLoginStatus({ open: true });
    } catch (err) {
      setActiveMessage(`Failed to launch browser: ${err.message || 'Error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseLogin = async () => {
    setLoading(true);
    try {
      await apiService.closeLoginBrowser();
      setLoginStatus({ open: false });
      setActiveMessage('Login browser closed. Refreshing sessions...');
      setTimeout(refreshSessions, 1000);
    } catch (err) {
      setActiveMessage(`Error closing browser: ${err.message || 'Error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jp-page-content" role="region" aria-label="Platform Integrations">

      {/* Distinction Banner */}
      <div className="jp-alert jp-alert-info" style={{ marginBottom: '1.5rem' }}>
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Authentication vs Saved URLs:</strong>
          <div style={{ marginTop: '0.25rem', fontSize: '13px', lineHeight: 1.5 }}>
            • <strong>Saved Profile URL:</strong> Public link added to your resume and shared with recruiters.<br />
            • <strong>Authenticated Session:</strong> Encrypted browser session maintained locally to automate one-click job submissions on supported platforms.
          </div>
        </div>
      </div>

      {/* Browser Controller Toolbar */}
      <div className="jp-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={18} style={{ color: 'var(--rp-primary)' }} />
              <h3 className="jp-card-title" style={{ margin: 0 }}>Interactive Browser Controller</h3>
            </div>
            <div className="jp-hint" style={{ marginTop: '0.25rem' }}>
              Status: {loginStatus.open ? (
                <span style={{ color: 'var(--rp-success, #22c55e)', fontWeight: 600 }}>Active Browser Window Open</span>
              ) : (
                <span>Closed</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="jp-btn jp-btn-secondary jp-btn-sm"
              onClick={refreshSessions}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh Sessions
            </button>

            {loginStatus.open && (
              <button
                type="button"
                className="jp-btn jp-btn-secondary jp-btn-sm"
                onClick={handleCloseLogin}
                disabled={loading}
                style={{ borderColor: 'var(--rp-error, #ef4444)', color: 'var(--rp-error, #ef4444)' }}
              >
                Close Login Browser
              </button>
            )}
          </div>
        </div>

        {activeMessage && (
          <div style={{ marginTop: '0.75rem', fontSize: '12.5px', color: 'var(--rp-primary)' }}>
            {activeMessage}
          </div>
        )}
      </div>

      {/* Platform Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {INTEGRATION_PLATFORMS.map((platform) => {
          const isConnected = !!sessions[platform.id];
          const savedUrl = profile[platform.profileKey] || (profile.links && profile.links[platform.id]) || '';

          return (
            <div 
              key={platform.id}
              className="jp-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderLeft: isConnected ? '4px solid var(--rp-success, #22c55e)' : '4px solid var(--rp-border, rgba(255,255,255,0.1))'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: 38, 
                    height: 38, 
                    borderRadius: 8, 
                    backgroundColor: '#f1f5f9', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: platform.color,
                    flexShrink: 0
                  }}>
                    <platform.icon size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{platform.name}</h4>
                      {isConnected ? (
                        <span className="jp-badge jp-badge-subtle" style={{ color: 'var(--rp-success, #22c55e)', border: '1px solid rgba(34,197,94,0.3)' }}>
                          <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Session Connected
                        </span>
                      ) : (
                        <span className="jp-badge jp-badge-subtle">
                          <XCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Disconnected
                        </span>
                      )}
                    </div>
                    {platform.description ? <p className="jp-hint" style={{ margin: '0.25rem 0 0' }}>{platform.description}</p> : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="jp-btn jp-btn-secondary jp-btn-sm"
                  onClick={() => handleOpenLogin(platform.loginUrl, platform.name)}
                  disabled={loading}
                >
                  <LogIn size={14} />
                  {isConnected ? 'Re-authenticate' : 'Connect Account'}
                </button>
              </div>

              {/* Public URL Field */}
              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--rp-border, rgba(255,255,255,0.06))' }}>
                <label className="jp-label" style={{ fontSize: '12px' }}>
                  <LinkIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Saved Public Profile URL
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="url"
                    className="jp-input"
                    value={savedUrl}
                    onChange={(e) => {
                      updateField(platform.profileKey, e.target.value);
                      if (platform.id === 'linkedin') updateField('linkedin', e.target.value);
                    }}
                    placeholder={`https://${platform.id}.com/...`}
                  />
                  {savedUrl && (
                    <a
                      href={savedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="jp-btn jp-btn-secondary jp-btn-sm"
                      title="Open Profile URL"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
