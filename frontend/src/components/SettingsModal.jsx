import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Cpu, CheckCircle2, ShieldCheck, Plus, Check, Trash2, 
  AlertTriangle, Database, Menu, GripVertical, ChevronUp, ChevronDown, 
  RotateCcw, Search, FileText, Play, User, BarChart3, Wrench, SlidersHorizontal, Info
} from 'lucide-react';
import { apiService } from '../services/api';

const DEFAULT_MENU_ITEMS = [
  { id: 'explore', label: 'Explore', description: 'Job Discovery Radar & Live ATS Feed', enabled: true },
  { id: 'generation', label: 'Generation', description: 'AI Resume & Cover Letter Studio', enabled: true },
  { id: 'automation', label: 'Automation', description: 'Autonomous Application Pipelines', enabled: true },
  { id: 'profile', label: 'Job Profile', description: 'Candidate Identity & ATS Resume Data', enabled: true },
  { id: 'analytics', label: 'Analytics', description: 'Application Metrics & Conversion Rates', enabled: true },
  { id: 'tools', label: 'Tools', description: 'MCP Integrations & ATS Diagnostic Utilities', enabled: true }
];

const MENU_ICON_MAP = {
  explore: Search,
  generation: FileText,
  automation: Play,
  profile: User,
  analytics: BarChart3,
  tools: Wrench
};

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  menuItems = [],
  onUpdateMenu
}) {
  const [activeTab, setActiveTab] = useState('ai');
  const [loading, setLoading] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Menu Management State
  const [menuList, setMenuList] = useState(() => {
    const list = menuItems && menuItems.length > 0 ? menuItems : DEFAULT_MENU_ITEMS;
    return list.map(item => item.id === 'profile' ? { ...item, label: 'Job Profile' } : item);
  });
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuToast, setMenuToast] = useState('');
  const [menuError, setMenuError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);

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

  // Scoped User Data Reset State
  const [confirmResetInput, setConfirmResetInput] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetUserData = async () => {
    const raw = confirmResetInput.trim();
    const clean = raw.toLowerCase().replace(/[\s-_]/g, '');
    const valid = clean === 'skill2role' || clean === 'reset' || clean === 'resumeporter' || clean === 'jobsonly' || clean.includes('reset') || clean.includes('skill');
    if (!valid) {
      setResetError("Verification failed. Please type 'reset' or 'skill2role' to confirm.");
      return;
    }
    setIsResetting(true);
    setResetError('');
    try {
      const res = await apiService.resetUserData(raw || 'reset');

      // Clear cached candidate profile and drafts from localStorage
      try {
        localStorage.removeItem('rp_candidate_profile');
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('rp_profile_draft_') || key.startsWith('skill2role_draft_'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.warn('Local draft cleanup note:', e);
      }

      setResetSuccess(true);
      window.dispatchEvent(new CustomEvent('rp_profile_updated', {
        detail: { profile: res?.profile || null }
      }));
      window.dispatchEvent(new CustomEvent('rp_refresh_jobs'));

      setTimeout(() => {
        setIsResetting(false);
        setResetSuccess(false);
        setConfirmResetInput('');
        if (onClose) onClose();
        window.location.hash = '#profile';
      }, 1000);
    } catch (err) {
      setResetError(err.message || 'Failed to reset user data. Please try again.');
      setIsResetting(false);
    }
  };


  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      setMenuList(menuItems.map(item => item.id === 'profile' ? { ...item, label: 'Job Profile' } : item));
    }
  }, [menuItems]);

  useEffect(() => {
    if (isOpen) {
      async function loadSettings() {
        try {
          const [aiData, menuData] = await Promise.all([
            apiService.getAiSettings(),
            apiService.getMenuSettings()
          ]);
          if (aiData) setAiConfig(aiData);
          if (menuData && Array.isArray(menuData) && menuData.length > 0) {
            setMenuList(menuData.map(item => item.id === 'profile' ? { ...item, label: 'Job Profile' } : item));
          }
        } catch (e) {
          console.warn('Settings load notice:', e);
        }
      }
      loadSettings();
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

  // Reorder Handlers
  const handleMoveMenu = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= menuList.length) return;
    setMenuList(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setMenuError('');
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setMenuList(prev => {
      const copy = [...prev];
      const draggedItem = copy[draggedIndex];
      copy.splice(draggedIndex, 1);
      copy.splice(index, 0, draggedItem);
      return copy;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Visibility Toggle with Safeguard
  const handleToggleMenuVisibility = (id) => {
    const target = menuList.find(i => i.id === id);
    if (!target) return;

    if (target.enabled) {
      const enabledCount = menuList.filter(i => i.enabled !== false).length;
      if (enabledCount <= 1) {
        setMenuError('At least one navigation menu item must remain visible.');
        return;
      }
    }

    setMenuError('');
    setMenuList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, enabled: !item.enabled };
      }
      return item;
    }));
  };

  // Reset Menu to Factory Defaults
  const handleResetMenu = async () => {
    setMenuLoading(true);
    setMenuError('');
    try {
      const res = await apiService.resetMenuSettings();
      const rawUpdated = res.items || DEFAULT_MENU_ITEMS;
      const updated = rawUpdated.map(item => item.id === 'profile' ? { ...item, label: 'Job Profile' } : item);
      setMenuList(updated);
      if (onUpdateMenu) onUpdateMenu(updated);
      setMenuToast('Navigation menu layout reset to defaults.');
      setTimeout(() => setMenuToast(''), 3000);
    } catch {
      const fallback = DEFAULT_MENU_ITEMS.map(item => item.id === 'profile' ? { ...item, label: 'Job Profile' } : item);
      setMenuList(fallback);
      if (onUpdateMenu) onUpdateMenu(fallback);
      setMenuToast('Navigation menu layout reset to defaults.');
      setTimeout(() => setMenuToast(''), 3000);
    } finally {
      setMenuLoading(false);
    }
  };

  // Save Menu Configuration
  const handleSaveMenu = async () => {
    const hasEnabled = menuList.some(i => i.enabled !== false);
    if (!hasEnabled) {
      setMenuError('At least one navigation menu item must remain visible.');
      return;
    }

    setMenuLoading(true);
    setMenuError('');
    try {
      const res = await apiService.updateMenuSettings(menuList);
      const savedItems = res.items || menuList;
      setMenuList(savedItems);
      if (onUpdateMenu) onUpdateMenu(savedItems);
      setMenuToast('Menu layout and visibility saved to database.');
      setTimeout(() => setMenuToast(''), 3000);
    } catch (err) {
      setMenuError(err.message || 'Failed to save menu configuration');
    } finally {
      setMenuLoading(false);
    }
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
              className={`modal-sidebar-item ${activeTab === 'menu' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('menu')}
            >
              <Menu size={16} className="sidebar-item-icon" />
              <span>Menu</span>
            </button>


            <button 
              className={`modal-sidebar-item ${activeTab === 'database' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('database')}
              style={{ color: activeTab === 'database' ? '#EF4444' : undefined }}
            >
              <Database size={16} className="sidebar-item-icon" />
              <span>Data & Reset</span>
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
              {activeTab === 'menu' && (
                <>
                  <Menu size={18} className="text-emerald-500" />
                  <span>Navigation Menu Layout & Ordering</span>
                </>
              )}
              {activeTab === 'database' && (
                <>
                  <Database size={18} className="text-red-500" style={{ color: '#EF4444' }} />
                  <span>Data & Database Management</span>
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
                        <option value="gpt-4o">gpt-4o (Omni Flagship)</option>
                        <option value="gpt-4o-mini">gpt-4o-mini (High Speed)</option>
                        <option value="gpt-4-turbo">gpt-4-turbo</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Google Gemini Card */}
                <div className="help-faq-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Google Gemini</span>
                    <span className="mcp-status-tag">
                      {aiConfig.gemini_key ? 'Configured' : 'Optional'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div>
                      <label className="auth-form-label">API Key</label>
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
                        <option value="gemini-1.5-pro">gemini-1.5-pro (2M Context)</option>
                        <option value="gemini-1.5-flash">gemini-1.5-flash (Low Latency)</option>
                        <option value="gemini-2.0-flash-exp">gemini-2.0-flash (Experimental)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Anthropic Claude Card */}
                <div className="help-faq-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Anthropic Claude</span>
                    <span className="mcp-status-tag">
                      {aiConfig.claude_key ? 'Configured' : 'Optional'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                    <div>
                      <label className="auth-form-label">API Key</label>
                      <input 
                        type="password"
                        className="auth-form-input"
                        placeholder="sk-ant-..."
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
                        <option value="claude-3-opus">claude-3-opus</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MODEL CONTEXT PROTOCOL (MCP) */}
            {activeTab === 'mcp' && (
              <div className="settings-section">
                <p className="block-help-text" style={{ marginBottom: 18 }}>
                  Connect Model Context Protocol (MCP) servers to grant autonomous agents secure access to your local files, resumes, and ATS connectors.
                </p>

                <div className="mcp-servers-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {(aiConfig.mcp_servers && aiConfig.mcp_servers.length > 0) ? (
                    aiConfig.mcp_servers.map(server => (
                      <div key={server.id} className="help-faq-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{server.name}</span>
                            <span className="mcp-status-tag connected">Active</span>
                          </div>
                          <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{server.url}</span>
                        </div>
                        <button 
                          className="auth-btn-ghost"
                          style={{ padding: '4px 8px', color: '#EF4444', fontSize: 12 }}
                          onClick={() => handleRemoveMcpServer(server.id)}
                        >
                          Disconnect
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: 8, color: '#64748B', fontSize: 13 }}>
                      No external MCP servers attached.
                    </div>
                  )}
                </div>

                {/* Add New MCP Server */}
                <div className="help-faq-card" style={{ background: '#F8FAFC', padding: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10 }}>Connect MCP Server</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8 }}>
                    <input 
                      type="text" 
                      className="auth-form-input" 
                      placeholder="Server Label (e.g., ATS Knowledge)" 
                      value={newMcpName}
                      onChange={(e) => setNewMcpName(e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="auth-form-input" 
                      placeholder="SSE or Stdio Endpoint (e.g. http://localhost:5000/mcp)" 
                      value={newMcpUrl}
                      onChange={(e) => setNewMcpUrl(e.target.value)}
                    />
                    <button 
                      className="btn-primary-olive" 
                      style={{ padding: '0 14px', height: '100%' }}
                      onClick={handleAddMcpServer}
                    >
                      <Plus size={16} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MENU CONFIGURATION & REORDERING */}
            {activeTab === 'menu' && (
              <div className="settings-section menu-settings-container">
                <div>
                  <span className="block-title" style={{ display: 'block', marginBottom: 4 }}>
                    Application Menu Navigation
                  </span>
                  <p className="block-help-text" style={{ margin: 0 }}>
                    Reorder top navigation tabs and toggle visibility on or off. All modifications are synchronized directly to your SQLite database.
                  </p>
                </div>

                {menuToast && (
                  <div className="auth-banner-alert success" style={{ marginBottom: 4 }}>
                    <CheckCircle2 size={15} />
                    <span>{menuToast}</span>
                  </div>
                )}

                {menuError && (
                  <div className="auth-banner-alert error" style={{ marginBottom: 4 }}>
                    <AlertTriangle size={15} />
                    <span>{menuError}</span>
                  </div>
                )}

                {/* Live Navigation Preview Bar */}
                <div className="menu-preview-card">
                  <div className="menu-preview-header">
                    <span className="menu-preview-title">
                      <SlidersHorizontal size={13} />
                      <span>Live Navbar Preview</span>
                    </span>
                    <span className="menu-preview-badge">
                      {menuList.filter(i => i.enabled !== false).length} of {menuList.length} Visible
                    </span>
                  </div>
                  <div className="menu-preview-bar">
                    {menuList.filter(i => i.enabled !== false).map((item) => {
                      const Icon = MENU_ICON_MAP[item.id] || Search;
                      return (
                        <div key={item.id} className="menu-preview-chip">
                          <Icon size={13} />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                    {menuList.filter(i => i.enabled !== false).length === 0 && (
                      <span className="menu-preview-empty-hint">No tabs enabled. Select at least one item.</span>
                    )}
                  </div>
                </div>

                {/* Reorderable Items List */}
                <div className="menu-items-list" role="list" aria-label="Reorderable Menu Items">
                  {menuList.map((item, index) => {
                    const Icon = MENU_ICON_MAP[item.id] || Search;
                    const isFirst = index === 0;
                    const isLast = index === menuList.length - 1;
                    const isEnabled = item.enabled !== false;
                    const isOnlyOneEnabled = isEnabled && menuList.filter(i => i.enabled !== false).length === 1;

                    return (
                      <div 
                        key={item.id} 
                        className={`menu-item-row ${!isEnabled ? 'is-disabled' : ''} ${draggedIndex === index ? 'is-dragging' : ''}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        role="listitem"
                      >
                        {/* Drag Handle */}
                        <div 
                          className="menu-drag-handle" 
                          title="Click and drag to reorder"
                          aria-label={`Drag ${item.label} to reorder`}
                        >
                          <GripVertical size={16} />
                        </div>

                        {/* Order Position Badge */}
                        <div className="menu-order-pill" title={`Menu Position #${index + 1}`}>
                          #{index + 1}
                        </div>

                        {/* Category Icon Box */}
                        <div className={`menu-item-icon-box icon-${item.id}`}>
                          <Icon size={17} strokeWidth={2.2} />
                        </div>

                        {/* Content: Title & Purpose Description */}
                        <div className="menu-item-content">
                          <div className="menu-item-title-row">
                            <h4 className="menu-item-title">{item.label}</h4>
                          </div>
                          <p className="menu-item-desc">{item.description || `${item.label} module navigation tab`}</p>
                        </div>

                        {/* Move Up / Move Down Arrow Buttons */}
                        <div className="menu-reorder-actions" aria-label={`Reorder ${item.label}`}>
                          <button
                            type="button"
                            className="menu-reorder-btn"
                            disabled={isFirst}
                            onClick={() => handleMoveMenu(index, -1)}
                            title={isFirst ? "Already at top" : "Move Up"}
                            aria-label={`Move ${item.label} Up`}
                          >
                            <ChevronUp size={15} />
                          </button>
                          <button
                            type="button"
                            className="menu-reorder-btn"
                            disabled={isLast}
                            onClick={() => handleMoveMenu(index, 1)}
                            title={isLast ? "Already at bottom" : "Move Down"}
                            aria-label={`Move ${item.label} Down`}
                          >
                            <ChevronDown size={15} />
                          </button>
                        </div>

                        {/* Visibility Toggle Switch */}
                        <div className="menu-switch-group">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            aria-label={`Toggle visibility of ${item.label}`}
                            className={`menu-toggle-switch ${isEnabled ? 'is-active' : ''}`}
                            disabled={isOnlyOneEnabled}
                            onClick={() => handleToggleMenuVisibility(item.id)}
                            title={isOnlyOneEnabled ? "At least one item must remain active" : (isEnabled ? "Disable tab" : "Enable tab")}
                          >
                            <span className="menu-toggle-knob" />
                          </button>

                          <span className={`menu-status-pill ${isEnabled ? 'is-visible' : 'is-hidden'}`}>
                            {isEnabled ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Section Action Bar */}
                <div className="menu-section-actions">
                  <button 
                    type="button" 
                    className="menu-reset-btn" 
                    onClick={handleResetMenu}
                    disabled={menuLoading}
                  >
                    <RotateCcw size={13} />
                    <span>Reset to Defaults</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn-primary-olive" 
                    onClick={handleSaveMenu}
                    disabled={menuLoading}
                    style={{ padding: '7px 18px', fontSize: 13 }}
                  >
                    <Check size={14} />
                    <span>{menuLoading ? 'Saving...' : 'Save Menu Layout'}</span>
                  </button>
                </div>
              </div>
            )}



            {/* TAB 4: DATA & RESET (SCOPED USER DATA RESET) */}
            {activeTab === 'database' && (
              <div className="settings-section">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <AlertTriangle size={20} style={{ color: '#DC2626' }} />
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#991B1B' }}>
                    Reset User Profile & Application Data
                  </span>
                </div>

                <p className="block-help-text" style={{ color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
                  This action clears all candidate profile records, uploaded resumes, generated tailored CVs, bookmarks, 
                  and activity logs associated with <strong>your account</strong>.
                  <span style={{ display: 'block', marginTop: 6, color: '#047857', fontWeight: 600 }}>
                    ✓ Your account login credentials remain active and you will stay logged in. Other users' profiles and global jobs are preserved.
                  </span>
                </p>

                <div style={{ 
                  background: '#FEF2F2', 
                  border: '1px solid #FCA5A5', 
                  borderRadius: 8, 
                  padding: '16px 20px', 
                  marginBottom: 20 
                }}>
                  <div style={{ fontWeight: 600, color: '#B91C1C', marginBottom: 8, fontSize: 13.5 }}>
                    What gets reset for your account:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#7F1D1D', lineHeight: 1.6 }}>
                    <li>Candidate profile & preferences (re-enters fresh onboarding state)</li>
                    <li>Uploaded master resumes and extracted skill facts</li>
                    <li>Generated tailored resumes and exported CV files</li>
                    <li>Saved automation pipelines, bookmarks, and activity feed entries</li>
                  </ul>
                </div>

                {resetSuccess && (
                  <div style={{ 
                    background: '#ECFDF5', 
                    border: '1px solid #A7F3D0', 
                    color: '#065F46', 
                    padding: '12px 16px', 
                    borderRadius: 8, 
                    marginBottom: 16,
                    fontSize: 13.5,
                    fontWeight: 600
                  }}>
                    ✓ User data has been reset successfully! Redirecting to profile onboarding...
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label className="auth-form-label" style={{ fontWeight: 600, color: '#334155' }}>
                    To confirm, please type <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, color: '#DC2626', fontWeight: 700 }}>reset</code> or <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, color: '#DC2626', fontWeight: 700 }}>skill2role</code> below:
                  </label>
                  <input 
                    type="text" 
                    className="auth-form-input" 
                    placeholder="Type reset or skill2role to confirm" 
                    value={confirmResetInput}
                    onChange={(e) => {
                      setConfirmResetInput(e.target.value);
                      if (resetError) setResetError('');
                    }}
                    style={{ maxWidth: 360, marginTop: 6 }}
                  />
                  {resetError && (
                    <div style={{ marginTop: 8, color: '#DC2626', fontSize: 12.5, fontWeight: 500 }}>
                      {resetError}
                    </div>
                  )}
                </div>

                <button 
                  className="auth-btn-ghost"
                  onClick={handleResetUserData}
                  disabled={isResetting || !confirmResetInput.trim()}
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
                    cursor: (isResetting || !confirmResetInput.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (isResetting || !confirmResetInput.trim()) ? 0.7 : 1
                  }}
                >
                  <Trash2 size={15} />
                  <span>{isResetting ? 'Resetting User Data...' : 'Reset My User Data'}</span>
                </button>
              </div>
            )}
          </div>

          <footer className="modal-right-footer">
            <button className="btn-modal-cancel" onClick={onClose}>
              {activeTab === 'database' || activeTab === 'login' ? 'Close' : 'Cancel'}
            </button>
            {activeTab === 'menu' && (
              <button 
                className="btn-primary-olive" 
                onClick={handleSaveMenu} 
                disabled={menuLoading}
              >
                {menuLoading ? 'Saving...' : 'Save Menu Configuration'}
              </button>
            )}
            {activeTab !== 'database' && activeTab !== 'menu' && activeTab !== 'login' && (
              <button className="btn-primary-olive" onClick={handleSaveSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
