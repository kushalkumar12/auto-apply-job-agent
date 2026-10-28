import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  Cpu, 
  AlertCircle, 
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { apiService } from '../services/api';
import './AuthView.css';

export default function AuthView({ onAuthSuccess, initialAlert = null }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(initialAlert);

  // Guarantee that login page UI/UX theme and mode are strictly default
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'default');
    document.documentElement.setAttribute('data-mode', 'default');
    document.documentElement.setAttribute('data-page', 'auth');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your email address to receive password reset instructions.');
        }
        await apiService.forgotPassword(email.trim());
        setAlert({
          type: 'success',
          message: 'If an account exists for this email, password reset instructions have been sent.'
        });
      } else if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both your email address and password.');
        }
        const res = await apiService.login(email.trim(), password);
        if (res && res.token && res.user) {
          localStorage.removeItem('rp_candidate_profile');
          localStorage.setItem('rp_auth_token', res.token);
          localStorage.setItem('rp_user', JSON.stringify(res.user));
          onAuthSuccess(res.user);
        } else {
          throw new Error('Login succeeded but no session token was issued.');
        }
      } else {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Please fill in your name, email, and password.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        const res = await apiService.register(name.trim(), email.trim(), password);
        if (res && res.token && res.user) {
          localStorage.removeItem('rp_candidate_profile');
          localStorage.setItem('rp_auth_token', res.token);
          localStorage.setItem('rp_user', JSON.stringify(res.user));
          onAuthSuccess(res.user);
        } else {
          throw new Error('Account created but no session token was issued.');
        }
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Authentication failed. Please verify your credentials.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleNotice = () => {
    setAlert({
      type: 'error',
      message: 'Google Sign-In requires a verified Google Client ID in this environment. Please authenticate using Email & Password.'
    });
  };

  return (
    <div className="auth-gate-wrapper" data-theme="default" data-mode="default">
      {/* Dynamic Ambient Background */}
      <div className="auth-ambient-background" aria-hidden="true">
        <div className="auth-orb auth-orb-1" style={{ width: 450, height: 450, background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)' }}></div>
        <div className="auth-orb auth-orb-2" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)' }}></div>
      </div>

      <div className="auth-gate-card">
        {/* Brand Header */}
        <div className="auth-gate-header">
          <div className="auth-brand-logo">
            <Cpu size={32} strokeWidth={2.2} className="auth-cpu-icon" />
            <span className="auth-brand-title">
              Skill2<span className="brand-role-tint">Role</span>
            </span>
          </div>
        </div>

        {/* Tab Switcher - only show in login/register modes */}
        {mode !== 'forgot' ? (
          <div className="auth-tab-row" role="tablist">
            <button 
              type="button"
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setAlert(null); }}
              role="tab"
              aria-selected={mode === 'login'}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setAlert(null); }}
              role="tab"
              aria-selected={mode === 'register'}
            >
              Create Account
            </button>
          </div>
        ) : (
          <p className="auth-forgot-desc">
            Enter your registered email address and we will send you a password reset link.
          </p>
        )}

        {/* Alert Notification */}
        {alert && (
          <div className={`auth-gate-alert ${alert.type}`}>
            {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{alert.message}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-gate-form">
          {mode === 'register' && (
            <div className="auth-input-wrapper">
              <User size={18} className="auth-input-icon" />
              <input 
                id="reg-name"
                type="text"
                className="auth-input"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-input-wrapper">
            <Mail size={18} className="auth-input-icon" />
            <input 
              id="auth-email"
              type="email"
              className="auth-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {mode !== 'forgot' && (
            <>
              <div className="auth-input-wrapper">
                <Lock size={18} className="auth-input-icon" />
                <input 
                  id="auth-pwd"
                  type="password"
                  className="auth-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {mode === 'login' && (
                <div className="auth-sub-actions">
                  <button 
                    type="button" 
                    className="auth-link-btn" 
                    id="auth-forgot-btn"
                    onClick={() => { setMode('forgot'); setAlert(null); }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                <span>
                  {mode === 'forgot' ? 'Sending Reset Link...' : mode === 'login' ? 'Signing In...' : 'Creating Account...'}
                </span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'forgot' ? 'Send Reset Link' : mode === 'login' ? 'Sign In' : 'Create Account'}
                </span>
                <ArrowRight size={18} strokeWidth={2.4} />
              </>
            )}
          </button>
        </form>

        {mode === 'forgot' ? (
          <div className="auth-back-row">
            <button 
              type="button" 
              className="auth-link-btn"
              onClick={() => { setMode('login'); setAlert(null); }}
            >
              ← Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Divider */}
            <div className="auth-divider-section">
              <div className="auth-divider-line"></div>
              <span className="auth-divider-text">or</span>
              <div className="auth-divider-line"></div>
            </div>

            {/* Google CTA */}
            <button 
              type="button" 
              className="auth-google-cta"
              onClick={handleGoogleNotice}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
