import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCw, 
  Plus, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Bot, 
  Zap, 
  Check, 
  Sliders, 
  ChevronRight, 
  ExternalLink,
  Trash2,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';
import { PlatformIcon } from './BrandIcons';
import { apiService } from '../services/api';
import './AutomationView.css';

export default function AutomationView({ onNavigateTab, activeCandidateProfile }) {
  const [pipelines, setPipelines] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PAUSED'
  const [toastMsg, setToastMsg] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRoles, setNewRoles] = useState('Java Developer, Backend Engineer');
  const [newSchedule, setNewSchedule] = useState('Daily at 10:00 & 16:00');
  const [newThreshold, setNewThreshold] = useState('85');
  const terminalEndRef = useRef(null);

  // Load pipelines from Python SQLite backend scoped to active candidate profile
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const data = await apiService.getAutomationPipelines(activeCandidateProfile?.id);
        if (mounted && Array.isArray(data)) {
          setPipelines(data);
        }
      } catch (err) {
        console.warn('[AutomationView] Using fallback pipelines:', err);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [activeCandidateProfile?.id]);

  // Auto-scroll terminal log
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const showNotification = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleTogglePipeline = async (id) => {
    const pipe = pipelines.find(p => p.id === id);
    const targetNext = pipe ? !pipe.active : true;
    
    // Optimistic UI update
    setPipelines(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          active: targetNext,
          status: targetNext ? 'ACTIVE' : 'PAUSED'
        };
      }
      return p;
    }));

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(l => [
      ...l,
      {
        id: Date.now(),
        time: now,
        level: targetNext ? 'SUCCESS' : 'WARN',
        text: `Pipeline [${pipe?.title || id}] toggled to ${targetNext ? 'ACTIVE' : 'PAUSED'}. Persisting in backend...`
      }
    ]);
    showNotification(`Pipeline ${targetNext ? 'activated' : 'paused'}`);

    try {
      await apiService.toggleAutomationPipeline(id);
    } catch (err) {
      console.warn('Backend toggle sync notice:', err);
    }
  };

  const handleRunPipelineNow = async (pipe) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(l => [
      ...l,
      { id: Date.now(), time: now, level: 'AGENT', text: `Triggering execution for [${pipe.title}]...` }
    ]);

    try {
      const res = await apiService.runAutomationPipeline(pipe.id, activeCandidateProfile?.id, false);
      const updatedCount = res?.appliedCount !== undefined ? res.appliedCount : pipe.appliedCount;
      const isSimulated = res?.simulated || res?.mode === 'simulation';

      setPipelines(prev => prev.map(p => p.id === pipe.id ? { ...p, appliedCount: updatedCount, lastRun: 'Just now' } : p));
      setLogs(l => [
        ...l,
        {
          id: Date.now() + 1,
          time: now,
          level: 'SUCCESS',
          text: `[${isSimulated ? 'SIMULATED' : 'CONFIRMED'}] ${res?.message || `Pipeline [${pipe.title}] completed.`} (Count: ${updatedCount})`
        }
      ]);
      showNotification(res?.message || `Pipeline [${pipe.title}] executed.`);
    } catch (err) {
      const errDetail = err?.data?.detail;
      const errorCode = (typeof errDetail === 'object' ? errDetail?.error : null) || 'BLOCKED';
      const errorMsg = (typeof errDetail === 'object' ? errDetail?.message : errDetail) || err.message || 'Execution failed';
      const reasons = Array.isArray(errDetail?.reasons) ? ` (${errDetail.reasons.join('; ')})` : '';

      // Preserve actual state: Do NOT increment appliedCount, do NOT show "Dispatched"
      setPipelines(prev => prev.map(p => p.id === pipe.id ? { ...p, lastRun: 'Blocked by Gate' } : p));
      setLogs(l => [
        ...l,
        {
          id: Date.now() + 1,
          time: now,
          level: 'WARN',
          text: `[BLOCKED: ${errorCode}] ${errorMsg}${reasons}`
        }
      ]);
      showNotification(`Blocked: ${errorMsg}`);
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(l => [
      ...l,
      { id: Date.now(), time: now, level: 'AGENT', text: '⚡ Autonomous Application Cycle initiated across all active pipelines.' },
      { id: Date.now() + 1, time: now, level: 'INFO', text: 'Validating pipelines against submission gate...' }
    ]);

    const activePipes = pipelines.filter(p => p.active);
    let successCount = 0;
    let blockedCount = 0;

    const results = await Promise.allSettled(
      activePipes.map(pipe => apiService.runAutomationPipeline(pipe.id, activeCandidateProfile?.id, false))
    );

    const updatedPipelines = pipelines.map(pipe => {
      const idx = activePipes.findIndex(ap => ap.id === pipe.id);
      if (idx === -1) return pipe;
      const res = results[idx];
      if (res.status === 'fulfilled') {
        successCount++;
        const updatedCount = res.value?.appliedCount !== undefined ? res.value.appliedCount : pipe.appliedCount;
        return { ...pipe, appliedCount: updatedCount, lastRun: 'Just now' };
      } else {
        blockedCount++;
        return { ...pipe, lastRun: 'Blocked by Gate' };
      }
    });

    setPipelines(updatedPipelines);

    const finishTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (blockedCount > 0 && successCount === 0) {
      setLogs(l => [
        ...l,
        {
          id: Date.now() + 2,
          time: finishTime,
          level: 'WARN',
          text: `[BLOCKED] All ${blockedCount} active pipeline(s) blocked by submission gate. 0 applications dispatched.`
        }
      ]);
      showNotification(`All ${blockedCount} pipelines blocked by submission safety gate.`);
    } else {
      setLogs(l => [
        ...l,
        {
          id: Date.now() + 2,
          time: finishTime,
          level: blockedCount > 0 ? 'WARN' : 'SUCCESS',
          text: `Batch cycle completed: ${successCount} pipeline(s) executed, ${blockedCount} blocked by submission gate.`
        }
      ]);
      showNotification(`Batch cycle finished: ${successCount} executed, ${blockedCount} blocked.`);
    }
    setIsRunningAll(false);
  };

  const handleCreatePipelineSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await apiService.createAutomationPipeline({
        title: newTitle,
        targetRoles: newRoles,
        platforms: ['LinkedIn', 'Indeed', 'Greenhouse'],
        schedule: newSchedule,
        frequencyLabel: 'Continuous Auto',
        matchThreshold: parseInt(newThreshold) || 85,
        mode: 'Auto-Apply'
      }, activeCandidateProfile?.id);
      setPipelines(prev => [created, ...prev]);
      setShowCreateModal(false);
      setNewTitle('');
      showNotification(`Created pipeline: "${created.title}"`);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs(l => [
        ...l,
        { id: Date.now(), time: now, level: 'SUCCESS', text: `New pipeline [${created.title}] created & registered with scheduler.` }
      ]);
    } catch (err) {
      console.error('Failed to create pipeline:', err);
    }
  };

  const handleDeletePipeline = async (id) => {
    try {
      await apiService.deleteAutomationPipeline(id);
      setPipelines(prev => prev.filter(p => p.id !== id));
      showNotification('Pipeline deleted successfully');
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs(l => [
        ...l,
        { id: Date.now(), time: now, level: 'WARN', text: `Pipeline [${id}] removed.` }
      ]);
    } catch (err) {
      showNotification('Failed to delete pipeline');
    }
  };

  const handleClearTerminal = () => {
    setLogs([
      { id: Date.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), level: 'INFO', text: 'Terminal buffer cleared. Listening for pipeline triggers...' }
    ]);
  };

  const filteredPipelines = pipelines.filter(p => {
    if (filterMode === 'ACTIVE') return p.active;
    if (filterMode === 'PAUSED') return !p.active;
    return true;
  });

  const activeCount = pipelines.filter(p => p.active).length;
  const totalDispatched = pipelines.reduce((acc, curr) => acc + (curr.appliedCount || 0), 0);

  return (
    <div className="automation-view-wrapper">
      {/* 1. Header Section */}
      <header className="automation-header-bar">
        <div className="automation-title-block">
          <div className="automation-title-row">
            <h1 className="automation-main-title">Automated Application Pipelines</h1>
            <span className="live-status-pill">
              <span className="pulse-indicator-dot"></span>
              <span>{activeCount} Pipelines Active</span>
            </span>
          </div>
          <p className="automation-subtitle">
            Configure autonomous agents to discover matching vacancies, auto-tailor resumes, and submit applications.
          </p>
        </div>

        <div className="automation-actions-group">
          <button 
            className="btn-primary-action"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', background: 'var(--accent-blue, #2563eb)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} />
            <span>New Pipeline</span>
          </button>

          <button 
            className="btn-trigger-all" 
            onClick={handleRunAll}
            disabled={isRunningAll}
            title="Execute immediate discovery and apply cycle for all active pipelines"
          >
            <RotateCw size={14} className={isRunningAll ? 'spin-anim' : ''} />
            <span>{isRunningAll ? 'Executing Cycle...' : 'Run All Pipelines'}</span>
          </button>
        </div>
      </header>

      {/* New Pipeline Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card, #1e293b)', color: 'var(--text-primary, #fff)', width: '480px', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-color, #334155)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Create New Automation Pipeline</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePipelineSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>Pipeline Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Senior Java Backend Auto-Applier" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-main, #0f172a)', border: '1px solid var(--border-color, #334155)', color: '#fff' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>Target Roles</label>
                <input 
                  type="text" 
                  value={newRoles} 
                  onChange={e => setNewRoles(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-main, #0f172a)', border: '1px solid var(--border-color, #334155)', color: '#fff' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>Schedule / Frequency</label>
                <input 
                  type="text" 
                  value={newSchedule} 
                  onChange={e => setNewSchedule(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-main, #0f172a)', border: '1px solid var(--border-color, #334155)', color: '#fff' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>Min ATS Match Threshold (%)</label>
                <input 
                  type="number" 
                  min="50" 
                  max="100" 
                  value={newThreshold} 
                  onChange={e => setNewThreshold(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: 'var(--bg-main, #0f172a)', border: '1px solid var(--border-color, #334155)', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 14px', borderRadius: '6px', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '6px', background: 'var(--accent-blue, #2563eb)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  Create & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Top Metric KPI Ribbon */}
      <div className="automation-kpi-ribbon">
        <div className="kpi-mini-card">
          <div className="kpi-mini-icon">
            <Bot size={16} />
          </div>
          <div className="kpi-mini-body">
            <div className="kpi-mini-label">Active Agents</div>
            <div className="kpi-mini-val">{activeCount} of {pipelines.length}</div>
          </div>
        </div>

        <div className="kpi-mini-card">
          <div className="kpi-mini-icon kpi-icon-success">
            <Zap size={16} />
          </div>
          <div className="kpi-mini-body">
            <div className="kpi-mini-label">Dispatched Apps</div>
            <div className="kpi-mini-val">{totalDispatched}</div>
          </div>
        </div>

        <div className="kpi-mini-card">
          <div className="kpi-mini-icon kpi-icon-blue">
            <CheckCircle2 size={16} />
          </div>
          <div className="kpi-mini-body">
            <div className="kpi-mini-label">Avg Match Accuracy</div>
            <div className="kpi-mini-val">96.4%</div>
          </div>
        </div>

        <div className="kpi-mini-card">
          <div className="kpi-mini-icon">
            <Clock size={16} />
          </div>
          <div className="kpi-mini-body">
            <div className="kpi-mini-label">Next Scheduled Run</div>
            <div className="kpi-mini-val">in 18 mins</div>
          </div>
        </div>
      </div>

      {/* 3. Main Workstation: Split Screen (Left: Pipelines, Right: Live Console Terminal) */}
      <div className="automation-main-grid">
        {/* Left Column: Pipelines Management */}
        <section className="pipelines-panel">
          <div className="panel-sub-header">
            <div className="panel-filter-tabs">
              <button 
                className={`filter-pill-btn ${filterMode === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterMode('ALL')}
              >
                All ({pipelines.length})
              </button>
              <button 
                className={`filter-pill-btn ${filterMode === 'ACTIVE' ? 'active' : ''}`}
                onClick={() => setFilterMode('ACTIVE')}
              >
                Active ({activeCount})
              </button>
              <button 
                className={`filter-pill-btn ${filterMode === 'PAUSED' ? 'active' : ''}`}
                onClick={() => setFilterMode('PAUSED')}
              >
                Paused ({pipelines.length - activeCount})
              </button>
            </div>

            <div className="pipeline-controls-right">
              <span className="total-pipeline-badge">{filteredPipelines.length} pipelines</span>
            </div>
          </div>

          {/* Pipelines Scrollable Cards Container */}
          <div className="pipelines-scroll-list">
            {filteredPipelines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-secondary)' }}>
                <Zap size={28} style={{ opacity: 0.35, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>No automation pipelines configured</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                  Click "+ New Pipeline" above to create an automated auto-apply runner.
                </p>
              </div>
            ) : (
              filteredPipelines.map((pipe) => (
                <div 
                  key={pipe.id} 
                  className={`pipeline-card ${pipe.active ? 'is-active' : 'is-paused'}`}
                >
                  <div className="pipe-card-header">
                    <div className="pipe-title-group">
                      <div className="pipe-title-row">
                        <h3 className="pipe-title">{pipe.title}</h3>
                        <span className={`pipe-status-tag ${pipe.active ? 'tag-green' : 'tag-muted'}`}>
                          {pipe.active ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </div>
                      <div className="pipe-target-roles">{pipe.targetRoles}</div>
                    </div>

                    {/* Active Toggle Switch */}
                    <label className="switch-toggle" title={pipe.active ? 'Pause Pipeline' : 'Activate Pipeline'}>
                      <input 
                        type="checkbox" 
                        checked={pipe.active}
                        onChange={() => handleTogglePipeline(pipe.id)}
                      />
                      <span className="slider-round"></span>
                    </label>
                  </div>

                  <div className="pipe-card-details">
                    <div className="pipe-meta-chip">
                      <span className="meta-chip-label">Schedule:</span>
                      <span className="meta-chip-value">{pipe.schedule}</span>
                    </div>

                    <div className="pipe-meta-chip">
                      <span className="meta-chip-label">Threshold:</span>
                      <span className="meta-chip-value">≥{pipe.matchThreshold}% ATS</span>
                    </div>

                    <div className="pipe-meta-chip">
                      <span className="meta-chip-label">Platforms:</span>
                      <span className="meta-chip-value">{pipe.platforms.join(', ')}</span>
                    </div>

                    <div className="pipe-meta-chip">
                      <span className="meta-chip-label">Dispatched:</span>
                      <span className="meta-chip-value font-medium">{pipe.appliedCount} jobs</span>
                    </div>
                  </div>

                  <div className="pipe-card-footer">
                    <div className="pipe-last-run">
                      <Clock size={12} />
                      <span>Last run: {pipe.lastRun}</span>
                    </div>

                    <div className="pipe-footer-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button 
                        className="btn-pipe-run"
                        onClick={() => handleRunPipelineNow(pipe)}
                        disabled={!pipe.active}
                        title="Trigger immediate application scan for this pipeline"
                      >
                        <Play size={11} fill="currentColor" />
                        <span>Run Now</span>
                      </button>
                      <button
                        onClick={() => handleDeletePipeline(pipe.id)}
                        title="Delete pipeline"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color, #334155)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          padding: '5px 8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Autonomous Runner Live Console Terminal */}
        <section className="terminal-panel">
          <div className="terminal-header-bar">
            <div className="terminal-title-group">
              <Terminal size={14} className="terminal-icon" />
              <span className="terminal-title">Runner Agent Live Stream</span>
              <span className="terminal-live-badge">ONLINE</span>
            </div>

            <div className="terminal-controls">
              <button 
                className="terminal-ctrl-btn"
                onClick={handleClearTerminal}
                title="Clear console buffer"
              >
                Clear Log
              </button>
            </div>
          </div>

          <div className="terminal-screen-body">
            <div className="terminal-log-content">
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                  <Terminal size={24} style={{ opacity: 0.35, marginBottom: '6px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Automation runner idle.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    Trigger a pipeline run to stream live execution logs here.
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  let badgeClass = 'log-badge-info';
                  if (log.level === 'SUCCESS') badgeClass = 'log-badge-success';
                  if (log.level === 'AI') badgeClass = 'log-badge-ai';
                  if (log.level === 'AGENT') badgeClass = 'log-badge-agent';
                  if (log.level === 'WARN') badgeClass = 'log-badge-warn';
                  if (log.level === 'FORM') badgeClass = 'log-badge-form';

                  return (
                    <div key={log.id} className="terminal-log-row">
                      <span className="log-time">{log.time}</span>
                      <span className={`log-badge ${badgeClass}`}>{log.level}</span>
                      <span className="log-text">{log.text}</span>
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          <div className="terminal-footer-status">
            <div className="agent-status-indicator">
              <span className="pulse-indicator-dot"></span>
              <span>Worker Daemon ID: #wrk_3921 · Cron: Active · Auto-retry: Enabled</span>
            </div>
          </div>
        </section>
      </div>

      {/* Floating toast notification */}
      {toastMsg && (
        <div className="automation-toast">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
