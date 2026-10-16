import React, { useState, useEffect } from 'react';
import { X, Sparkles, Cpu, Bot, CheckCircle2, ShieldCheck, Plus, Check } from 'lucide-react';
import StaticAvatar, { AVATAR_OPTIONS } from './StaticAvatar';
import { apiService } from '../services/api';

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateAvatar
}) {
  const [activeTab, setActiveTab] = useState('ai');
  const [loading, setLoading] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // AI & MCP State
  const [aiConfig, setAiConfig] = useState({
    openai_key: '',
    openai_model: 'gpt-4o',
    gemini_key: '',
    gemini_model: 'gemini-1.5-pro',
    claude_key: '',
    claude_model: 'claude-3-5-sonnet',
    mcp_servers: []
  });

  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpUrl, setNewMcpUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      async function loadAiSettings() {
        const data = await apiService.getAiSettings();
        if (data) {
          setAiConfig(data);
        }
      }
      loadAiSettings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await apiService.updateAiSettings(aiConfig);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2800);
    } catch (err) {
      console.warn('Saved locally:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMcpServer = () => {
    if (newMcpName.trim() && newMcpUrl.trim()) {
      const newServer = {
        id: `mcp-${Date.now()}`,
        name: newMcpName.trim(),
        url: newMcpUrl.trim(),
        status: 'active'
      };
      setAiConfig(prev => ({
        ...prev,
        mcp_servers: [...(prev.mcp_servers || []), newServer]
      }));
      setNewMcpName('');
      setNewMcpUrl('');
    }
  };

  const handleRemoveMcpServer = (id) => {
    setAiConfig(prev => ({
      ...prev,
      mcp_servers: (prev.mcp_servers || []).filter(s => s.id !== id)
    }));
  };

  return (
    <div className="app-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="app-modal-card modal-sidebar-layout" onClick={(e) => e.stopPropagation()}>
        {/* Left Sidebar Navigation */}
        <aside className="modal-left-sidebar" aria-label="Settings Navigation">
          <div className="modal-sidebar-header">
            <Cpu size={20} className="text-emerald-500" />
            <span className="modal-sidebar-header-title">Settings</span>
          </div>

          <nav className="modal-sidebar-menu">
            <button 
              className={`modal-sidebar-item ${activeTab === 'ai' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles size={16} className="sidebar-item-icon" />
              <span>AI Providers</span>
            </button>

            <button 
              className={`modal-sidebar-item ${activeTab === 'mcp' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('mcp')}
            >
              <Cpu size={16} className="sidebar-item-icon" />
              <span>MCP Protocol</span>
            </button>

            <button 
              className={`modal-sidebar-item ${activeTab === 'avatar' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('avatar')}
            >
              <Bot size={16} className="sidebar-item-icon" />
              <span>Profile Avatars</span>
            </button>
          </nav>

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #E2E8F0', fontSize: 11, color: '#94A3B8' }}>
            AI Engine v2.4 Active
          </div>
        </aside>

        {/* Right Main Content Pane */}
        <div className="modal-right-pane">
          <header className="modal-right-header">
            <h2 className="modal-right-title">
              {activeTab === 'ai' && (
                <>
                  <Sparkles size={18} className="text-emerald-500" />
                  <span>AI Providers (OpenAI, Gemini, Claude)</span>
                </>
              )}
              {activeTab === 'mcp' && (
                <>
                  <Cpu size={18} className="text-emerald-500" />
                  <span>Model Context Protocol (MCP) Hub</span>
                </>
              )}
              {activeTab === 'avatar' && (
                <>
                  <Bot size={18} className="text-emerald-500" />
                  <span>Curated Profile Avatars</span>
                </>
              )}
            </h2>
            <button className="app-modal-close-btn" onClick={onClose} aria-label="Close Settings">
              <X size={15} strokeWidth={2.5} />
            </button>
          </header>

          <div className="modal-right-body">
            {saveToast && (
              <div className="auth-banner-alert success" style={{ marginBottom: 18 }}>
                <CheckCircle2 size={15} />
                <span>Settings and configuration updated successfully.</span>
              </div>
            )}

            {/* TAB 1: AI PROVIDERS */}
            {activeTab === 'ai' && (
              <div className="settings-section">
                <p className="block-help-text" style={{ marginBottom: 20 }}>
                  Configure real API keys for autonomous ATS tailoring, resume generation, and intelligent interview preparation.
                </p>

                {/* OpenAI Card */}
                <div className="help-faq-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>OpenAI Integration</span>
                    <span className="mcp-status-tag">
                      {aiConfig.openai_key ? 'Configured' : 'Optional'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div>
                      <label className="auth-form-label">API Key</label>
                      <input 
                        type="password"
                        className="auth-form-input"
                        placeholder="sk-proj-..."
                        value={aiConfig.openai_key || ''}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, openai_key: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="auth-form-label">Model Engine</label>
                      <select 
                        className="auth-form-input"
                        value={aiConfig.openai_model || 'gpt-4o'}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, openai_model: e.target.value }))}
                      >
                        <option value="gpt-4o">gpt-4o (Omni)</option>
                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                        <option value="o1-preview">o1-preview (Reasoning)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Gemini Card */}
                <div className="help-faq-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Google Gemini Integration</span>
                    <span className="mcp-status-tag">
                      {aiConfig.gemini_key ? 'Configured' : 'Optional'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div>
                      <label className="auth-form-label">Gemini API Key</label>
                      <input 
                        type="password"
                        className="auth-form-input"
                        placeholder="AIzaSy..."
                        value={aiConfig.gemini_key || ''}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, gemini_key: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="auth-form-label">Model Engine</label>
                      <select 
                        className="auth-form-input"
                        value={aiConfig.gemini_model || 'gemini-1.5-pro'}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, gemini_model: e.target.value }))}
                      >
                        <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                        <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                        <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Claude Card */}
                <div className="help-faq-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Anthropic Claude Integration</span>
                    <span className="mcp-status-tag">
                      {aiConfig.claude_key ? 'Configured' : 'Optional'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div>
                      <label className="auth-form-label">Anthropic API Key</label>
                      <input 
                        type="password"
                        className="auth-form-input"
                        placeholder="sk-ant-api03-..."
                        value={aiConfig.claude_key || ''}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, claude_key: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="auth-form-label">Model Engine</label>
                      <select 
                        className="auth-form-input"
                        value={aiConfig.claude_model || 'claude-3-5-sonnet'}
                        onChange={(e) => setAiConfig(prev => ({ ...prev, claude_model: e.target.value }))}
                      >
                        <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                        <option value="claude-3-5-haiku">claude-3-5-haiku</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MCP PROTOCOL */}
            {activeTab === 'mcp' && (
              <div className="settings-section">
                <p className="block-help-text" style={{ marginBottom: 16 }}>
                  Connect your local or remote Model Context Protocol (MCP) servers to inject live portfolio assets, GitHub projects, and custom scrapers.
                </p>

                {/* Add new MCP server form */}
                <div className="help-faq-card" style={{ background: '#F8FAFC', marginBottom: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10 }}>
                    Register New MCP Server Endpoint
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: 10, alignItems: 'flex-end' }}>
                    <div>
                      <label className="auth-form-label">Server Name</label>
                      <input 
                        type="text"
                        className="auth-form-input"
                        placeholder="e.g. GitHub Repos"
                        value={newMcpName}
                        onChange={(e) => setNewMcpName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="auth-form-label">Endpoint URL / SSE Host</label>
                      <input 
                        type="text"
                        className="auth-form-input"
                        placeholder="http://localhost:8000/sse"
                        value={newMcpUrl}
                        onChange={(e) => setNewMcpUrl(e.target.value)}
                      />
                    </div>
                    <button 
                      type="button" 
                      className="btn-primary-olive"
                      onClick={handleAddMcpServer}
                      style={{ height: 38, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Plus size={15} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Server list */}
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: 'block', marginBottom: 10 }}>
                  Registered MCP Providers ({(aiConfig.mcp_servers || []).length})
                </span>
                <div className="mcp-servers-list">
                  {(aiConfig.mcp_servers || []).length === 0 ? (
                    <p style={{ fontSize: 12.5, color: '#6B7280', fontStyle: 'italic', padding: 8 }}>
                      No MCP servers connected yet. Add one above to integrate custom context providers.
                    </p>
                  ) : (
                    aiConfig.mcp_servers.map(server => (
                      <div key={server.id} className="mcp-server-card">
                        <div className="mcp-server-meta">
                          <span className="mcp-server-name">{server.name}</span>
                          <span className="mcp-server-url">{server.url}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="mcp-status-tag">Connected</span>
                          <button 
                            className="app-modal-close-btn"
                            style={{ width: 24, height: 24 }}
                            onClick={() => handleRemoveMcpServer(server.id)}
                            title="Remove Server"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: AVATAR PICKER */}
            {activeTab === 'avatar' && (
              <div className="settings-section">
                <span className="block-title" style={{ display: 'block' }}>Choose from 5 Curated Static Avatars</span>
                <p className="block-help-text" style={{ marginBottom: 18 }}>
                  Select a high-resolution static avatar to customize your personal profile across the application.
                </p>

                <div className="avatar-chooser-grid">
                  {AVATAR_OPTIONS.map(opt => {
                    const isCurrent = (currentUser?.avatar || 'avatar_1') === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
                      >
                        <button 
                          className={`avatar-choice-btn ${isCurrent ? 'is-active' : ''}`}
                          onClick={() => onUpdateAvatar(opt.id)}
                          title={`Select ${opt.label}`}
                        >
                          <StaticAvatar avatarId={opt.id} size={54} />
                        </button>
                        <span style={{ fontSize: 11, fontWeight: 500, color: isCurrent ? '#16A34A' : '#4B5563' }}>
                          {opt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <footer className="modal-right-footer">
            <button className="btn-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary-olive" onClick={handleSaveSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
