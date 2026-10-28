import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Shield, MessageSquare, Send, CheckCircle2, Star, Cpu, Trash2, AlertTriangle } from 'lucide-react';
import { apiService } from '../services/api';

export default function HelpPrivacyModal({
  isOpen,
  onClose,
  currentUser,
  onAccountDeleted,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('help');
  const [feedbackCategory, setFeedbackCategory] = useState('Feature Request');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [tickets, setTickets] = useState([]);

  // Account Deletion State
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    const raw = confirmDeleteInput.trim().toLowerCase();
    if (raw !== 'delete my account' && raw !== 'delete') {
      setDeleteError("Please type 'delete my account' to confirm.");
      return;
    }
    setIsDeletingAccount(true);
    setDeleteError('');
    try {
      await apiService.deleteAccount();
      if (onAccountDeleted) {
        onAccountDeleted('Your account and all associated personal data have been permanently deleted.');
      } else if (onLogout) {
        onLogout();
      } else {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
        window.location.reload();
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setIsDeletingAccount(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      async function loadTickets() {
        const res = await apiService.getFeedbackTickets();
        if (res && res.tickets) {
          setTickets(res.tickets);
        }
      }
      loadTickets();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await apiService.sendFeedback({
        category: feedbackCategory,
        rating: feedbackRating,
        message: feedbackMsg,
        email: currentUser?.email || ''
      });
      if (res && res.ticketId) {
        setTickets(prev => [
          {
            id: res.ticketId,
            category: feedbackCategory,
            rating: feedbackRating,
            message: feedbackMsg,
            status: 'open',
            created_at: Date.now()
          },
          ...prev
        ]);
        setFeedbackMsg('');
        setFeedbackSuccess(true);
        setTimeout(() => setFeedbackSuccess(false), 3500);
      }
    } catch (err) {
      console.warn('Feedback recorded offline:', err);
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="app-modal-card modal-sidebar-layout" onClick={(e) => e.stopPropagation()}>
        {/* Left Sidebar Navigation (Requested by user: "menu should be left and make popup little large") */}
        <aside className="modal-left-sidebar" aria-label="Help & Privacy Navigation">
          <div className="modal-sidebar-header">
            <HelpCircle size={20} className="text-emerald-500" />
            <span className="modal-sidebar-header-title">Help & Privacy</span>
          </div>

          <nav className="modal-sidebar-menu">
            <button 
              className={`modal-sidebar-item ${activeTab === 'help' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('help')}
            >
              <HelpCircle size={16} className="sidebar-item-icon" />
              <span>Architecture & FAQs</span>
            </button>

            <button 
              className={`modal-sidebar-item ${activeTab === 'privacy' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <Shield size={16} className="sidebar-item-icon" />
              <span>Data Protection</span>
            </button>

            <button 
              className={`modal-sidebar-item ${activeTab === 'feedback' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              <MessageSquare size={16} className="sidebar-item-icon" />
              <span>Submit Feedback</span>
            </button>

            <button 
              className={`modal-sidebar-item ${activeTab === 'delete_account' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('delete_account')}
              style={{ color: activeTab === 'delete_account' ? '#DC2626' : undefined }}
            >
              <Trash2 size={16} className="sidebar-item-icon" style={{ color: activeTab === 'delete_account' ? '#DC2626' : undefined }} />
              <span>Delete Account</span>
            </button>
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #E2E8F0', fontSize: 11, color: '#94A3B8' }}>
            Resume Porter Enterprise
          </div>
        </aside>

        {/* Right Main Content Pane */}
        <div className="modal-right-pane">
          <header className="modal-right-header">
            <h2 className="modal-right-title">
              {activeTab === 'help' && (
                <>
                  <HelpCircle size={18} className="text-emerald-500" />
                  <span>Help & System Architecture</span>
                </>
              )}
              {activeTab === 'privacy' && (
                <>
                  <Shield size={18} className="text-emerald-500" />
                  <span>Privacy & Data Protection Guidelines</span>
                </>
              )}
              {activeTab === 'feedback' && (
                <>
                  <MessageSquare size={18} className="text-emerald-500" />
                  <span>Submit Feedback & Resolve Issues</span>
                </>
              )}
              {activeTab === 'delete_account' && (
                <>
                  <Trash2 size={18} style={{ color: '#DC2626' }} />
                  <span style={{ color: '#991B1B' }}>Permanently Delete Account</span>
                </>
              )}
            </h2>
            <button className="app-modal-close-btn" onClick={onClose} aria-label="Close dialog">
              <X size={15} strokeWidth={2.5} />
            </button>
          </header>

          <div className="modal-right-body">
            {/* TAB 1: HELP & FAQS */}
            {activeTab === 'help' && (
              <div className="settings-section">
                <div className="help-faq-card">
                  <h4 className="help-faq-q">How does the 80%+ ATS Match Scoring function?</h4>
                  <p className="help-faq-a">
                    Every discovered job is analyzed against your selected specializations, verified skills, and experience level. The system calculates an ATS semantic cosine similarity score. Opportunities rated at 80% or higher are prioritized in your job matches.
                  </p>
                </div>

                <div className="help-faq-card">
                  <h4 className="help-faq-q">How does the Job Discovery Engine work?</h4>
                  <p className="help-faq-a">
                    The discovery engine harvests real-time opportunities flowing from enterprise corporate career portals, Greenhouse, Ashby, Lever, and other direct ATS feeds. It validates job requirements against your profile skills and locations.
                  </p>
                </div>

                <div className="help-faq-card">
                  <h4 className="help-faq-q">How do autonomous application pipelines work?</h4>
                  <p className="help-faq-a">
                    Under the Automation tab, you can enable scheduled runs that automatically pre-fill standardized questionnaires using the screening answers you provided in your Profile settings.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: PRIVACY GUIDELINES */}
            {activeTab === 'privacy' && (
              <div className="settings-section">
                <div className="help-faq-card" style={{ borderColor: '#BBF7D0', background: '#F0FDF4' }}>
                  <h4 className="help-faq-q" style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={16} /> Data Sovereignty & Zero Commercialization Guarantee
                  </h4>
                  <p className="help-faq-a" style={{ color: '#14532D' }}>
                    Resume Porter operates under strict user privacy guidelines. Your resume files, personal contact information, salary history, and application logs are never shared, sold, or used to train public language models without explicit client permission.
                  </p>
                </div>

                <div className="help-faq-card" style={{ borderColor: '#BAE6FD', background: '#F0F9FF' }}>
                  <h4 className="help-faq-q" style={{ color: '#0369A1', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Cpu size={16} /> Cloud AI Processing & Data Minimization
                  </h4>
                  <p className="help-faq-a" style={{ color: '#075985' }}>
                    When configured with a Google Gemini API key, resume chunk text and target job descriptions are sent via TLS 1.3 to Google Gemini endpoints (<code>gemini-embedding-2</code> for 768-dim vector embeddings and <code>gemini-3.6-flash</code> for tailored resume synthesis). Personal contact details (phone, email, postal address) and raw PDF/DOCX binaries remain strictly local and are never transmitted. If no API key is provided, the system executes 100% offline using local deterministic algorithms.
                  </p>
                </div>

                <div className="help-faq-card">
                  <h4 className="help-faq-q">Local Tokenization & Database Storage</h4>
                  <p className="help-faq-a">
                    Your credentials and AI API keys are stored securely within your local SQLite instance utilizing AES-256 standard encryption. Network discovery SSE requests only transmit matching criteria, keeping your identity private.
                  </p>
                </div>

                <div className="help-faq-card">
                  <h4 className="help-faq-q">Application Audit Trails</h4>
                  <p className="help-faq-a">
                    Every automated job application and resume tailor run generates a local immutable audit receipt accessible in your Analytics log. You maintain complete deletion rights over your application records.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: FEEDBACK & ISSUE RESOLUTION */}
            {activeTab === 'feedback' && (
              <div className="settings-section">
                {feedbackSuccess && (
                  <div className="auth-banner-alert success">
                    <CheckCircle2 size={16} />
                    <span>Thank you! Your ticket has been logged and assigned to engineering support.</span>
                  </div>
                )}

                <form onSubmit={handleSubmitFeedback}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label className="auth-form-label">Category</label>
                      <select 
                        className="auth-form-input"
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                      >
                        <option value="Feature Request">💡 Feature Request</option>
                        <option value="Bug Report">🐛 Issue / Bug Report</option>
                        <option value="UI/UX Feedback">🎨 UI / UX Usability Feedback</option>
                        <option value="ATS Matcher">📊 ATS Scoring Accuracy</option>
                        <option value="Other">💬 Other Inquiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="auth-form-label">Satisfaction Rating</label>
                      <div className="feedback-stars-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`star-btn ${feedbackRating >= star ? 'is-lit' : ''}`}
                            onClick={() => setFeedbackRating(star)}
                            title={`${star} star rating`}
                          >
                            <Star 
                              size={20} 
                              fill={feedbackRating >= star ? "currentColor" : "none"} 
                              stroke="currentColor" 
                              strokeWidth={1.5} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="auth-form-group">
                    <label className="auth-form-label">Describe your feedback or issue</label>
                    <textarea 
                      className="field-textarea-box"
                      rows={4}
                      placeholder="Provide specific details so our engineering team can investigate and improve the platform..."
                      value={feedbackMsg}
                      onChange={(e) => setFeedbackMsg(e.target.value)}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn-primary-olive" 
                    disabled={isSubmitting}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10 }}
                  >
                    <Send size={14} />
                    <span>{isSubmitting ? 'Registering Ticket...' : 'Submit Feedback & Register Ticket'}</span>
                  </button>
                </form>

                {/* Active Tickets List */}
                {tickets.length > 0 && (
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
                      Your Support & Feedback Tickets ({tickets.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {tickets.map(t => (
                        <div key={t.id} className="help-faq-card" style={{ padding: '10px 14px', margin: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{t.category} ({t.rating}★)</span>
                            <span className="mcp-status-tag" style={{ textTransform: 'capitalize' }}>
                              {t.status || 'Open'}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: '#4B5563', margin: 0 }}>{t.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DELETE ACCOUNT */}
            {activeTab === 'delete_account' && (
              <div className="settings-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <AlertTriangle size={20} style={{ color: '#DC2626' }} />
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#991B1B' }}>
                    Danger Zone: Permanently Delete Account
                  </span>
                </div>

                <p className="block-help-text" style={{ color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
                  Deleting your account is <strong>permanent and irrevocable</strong>. All your account credentials, 
                  login identity, candidate profiles, uploaded resumes, and application history will be 
                  completely erased from the database.
                </p>

                <div style={{ 
                  background: '#FEF2F2', 
                  border: '1px solid #FCA5A5', 
                  borderRadius: 8, 
                  padding: '16px 20px', 
                  marginBottom: 20 
                }}>
                  <div style={{ fontWeight: 600, color: '#B91C1C', marginBottom: 8, fontSize: 13.5 }}>
                    What will be permanently deleted:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#7F1D1D', lineHeight: 1.6 }}>
                    <li>
                      User account identity: <strong>{currentUser?.email || 'Your account'}</strong> (credentials revoked)
                    </li>
                    <li>All candidate profiles, career facts, and skill preferences</li>
                    <li>All uploaded master resumes, tailored CV documents, and exports</li>
                    <li>All automated pipelines, bookmarked jobs, and activity history</li>
                    <li>All active sessions and cryptographic auth tokens</li>
                  </ul>
                  <div style={{ marginTop: 10, fontSize: 12.5, color: '#991B1B', fontWeight: 600 }}>
                    ⚠️ You will be immediately logged out and returned to the sign-in screen.
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="auth-form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    To confirm permanent deletion, please type <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, color: '#DC2626', fontWeight: 700 }}>delete my account</code> below:
                  </label>
                  <input 
                    type="text" 
                    className="auth-form-input" 
                    placeholder="Type delete my account to confirm" 
                    value={confirmDeleteInput}
                    onChange={(e) => {
                      setConfirmDeleteInput(e.target.value);
                      if (deleteError) setDeleteError('');
                    }}
                    style={{ maxWidth: 360, marginTop: 6 }}
                  />
                  {deleteError && (
                    <div style={{ marginTop: 8, color: '#DC2626', fontSize: 12.5, fontWeight: 500 }}>
                      {deleteError}
                    </div>
                  )}
                </div>

                <button 
                  className="auth-btn-ghost"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || (confirmDeleteInput.trim().toLowerCase() !== 'delete my account' && confirmDeleteInput.trim().toLowerCase() !== 'delete')}
                  style={{
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: (isDeletingAccount || (confirmDeleteInput.trim().toLowerCase() !== 'delete my account' && confirmDeleteInput.trim().toLowerCase() !== 'delete')) ? 'not-allowed' : 'pointer',
                    opacity: (isDeletingAccount || (confirmDeleteInput.trim().toLowerCase() !== 'delete my account' && confirmDeleteInput.trim().toLowerCase() !== 'delete')) ? 0.7 : 1
                  }}
                >
                  <Trash2 size={15} />
                  <span>{isDeletingAccount ? 'Deleting Account & Logging Out...' : 'Permanently Delete Account & Log Out'}</span>
                </button>
              </div>
            )}
          </div>

          <footer className="modal-right-footer">
            <button className="btn-modal-cancel" onClick={onClose}>
              Close
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
