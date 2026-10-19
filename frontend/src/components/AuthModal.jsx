import React, { useState } from 'react';
import { X, Lock, Mail, User, CheckCircle2, AlertCircle } from 'lucide-react';
import StaticAvatar, { AVATAR_OPTIONS } from './StaticAvatar';
import { apiService } from '../services/api';

export default function AuthModal({
  isOpen,
  onClose,
  initialView = 'login', // 'login' | 'register' | 'forgot'
  onAuthSuccess
}) {
  const [view, setView] = useState(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar_1');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAlert(null);
    if (!email) {
      setAlert({ type: 'error', message: 'Please enter your email address to continue.' });
      setLoading(false);
      return;
    }
    try {
      const res = await apiService.googleAuth(
        email,
        name || email.split('@')[0],
        selectedAvatar
      );
      if (res && res.user) {
        localStorage.setItem('rp_auth_token', res.token);
        localStorage.setItem('rp_user', JSON.stringify(res.user));
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Google Auth simulation encountered an issue.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      if (view === 'login') {
        const res = await apiService.login(email, password);
        if (res && res.user) {
          localStorage.setItem('rp_auth_token', res.token);
          localStorage.setItem('rp_user', JSON.stringify(res.user));
          onAuthSuccess(res.user);
          onClose();
        }
      } else if (view === 'register') {
        const res = await apiService.register(name, email, password, selectedAvatar);
        if (res && res.user) {
          localStorage.setItem('rp_auth_token', res.token);
          localStorage.setItem('rp_user', JSON.stringify(res.user));
          onAuthSuccess(res.user);
          onClose();
        }
      } else if (view === 'forgot') {
        const res = await apiService.forgotPassword(email);
        setAlert({ type: 'success', message: res.message || 'Password reset link sent.' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Authentication error. Please verify credentials.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="app-modal-card modal-auth" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="app-modal-header">
          <h2 className="app-modal-title">
            <Lock size={18} className="text-emerald-500" />
            <span>
              {view === 'login' && 'Sign in to Resume Porter'}
              {view === 'register' && 'Create your Account'}
              {view === 'forgot' && 'Reset your Password'}
            </span>
          </h2>
          <button className="app-modal-close-btn" onClick={onClose} aria-label="Close Authentication">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="app-modal-body">
          {alert && (
            <div className={`auth-banner-alert ${alert.type}`}>
              {alert.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{alert.message}</span>
            </div>
          )}

          {/* Connect with Google Button */}
          {view !== 'forgot' && (
            <>
              <button 
                type="button" 
                className="auth-google-btn" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="auth-divider-row">
                <span>or continue with email</span>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {view === 'register' && (
              <>
                <div className="auth-form-group">
                  <label className="auth-form-label">Full Name</label>
                  <input 
                    type="text"
                    className="auth-form-input"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-form-group">
                  <label className="auth-form-label">Select Profile DP</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {AVATAR_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`avatar-choice-btn ${selectedAvatar === opt.id ? 'is-active' : ''}`}
                        onClick={() => setSelectedAvatar(opt.id)}
                      >
                        <StaticAvatar avatarId={opt.id} size={36} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="auth-form-group">
              <label className="auth-form-label">Email Address</label>
              <input 
                type="email"
                className="auth-form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {view !== 'forgot' && (
              <div className="auth-form-group">
                <label className="auth-form-label">Password</label>
                <input 
                  type="password"
                  className="auth-form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Processing...' : (
                view === 'login' ? 'Sign In' :
                view === 'register' ? 'Create Account' :
                'Send Reset Instructions'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="auth-links-row">
            {view === 'login' && (
              <>
                <button type="button" className="auth-link-btn" onClick={() => { setView('forgot'); setAlert(null); }}>
                  Forgot password?
                </button>
                <button type="button" className="auth-link-btn" onClick={() => { setView('register'); setAlert(null); }}>
                  Don't have an account? Sign up
                </button>
              </>
            )}

            {view === 'register' && (
              <button type="button" className="auth-link-btn" onClick={() => { setView('login'); setAlert(null); }} style={{ margin: '0 auto' }}>
                Already have an account? Sign in
              </button>
            )}

            {view === 'forgot' && (
              <button type="button" className="auth-link-btn" onClick={() => { setView('login'); setAlert(null); }} style={{ margin: '0 auto' }}>
                Back to Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
