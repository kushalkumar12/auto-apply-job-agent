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
  Sparkles
} from 'lucide-react';
import { PlatformIcon } from './BrandIcons';
import './AutomationView.css';

const INITIAL_PIPELINES = [
  {
    id: 'pipe-1',
    title: 'Senior & Staff Full-Stack Engineer',
    targetRoles: 'Full-Stack, React, Node.js, Distributed Systems',
    platforms: ['LinkedIn', 'Greenhouse'],
    schedule: 'Daily at 09:00 & 18:00',
    frequencyLabel: 'Twice daily',
    matchThreshold: 88,
    appliedCount: 48,
    active: true,
    lastRun: '14 mins ago',
    status: 'ACTIVE',
    mode: 'Auto-Apply'
  },
  {
    id: 'pipe-2',
    title: 'Remote Java / Spring Boot Microservices',
    targetRoles: 'Senior Java Backend, Spring Boot 3, Kafka, AWS',
    platforms: ['Indeed', 'Naukri'],
    schedule: 'Every 4 hours',
    frequencyLabel: 'Continuous 4h',
    matchThreshold: 85,
    appliedCount: 64,
    active: true,
    lastRun: '1 hour ago',
    status: 'ACTIVE',
    mode: 'Auto-Apply'
  },
  {
    id: 'pipe-3',
    title: 'Tier-1 DevTools & AI Startups',
    targetRoles: 'AI Engineer, Systems Engineer, Infrastructure',
    platforms: ['Wellfound', 'Lever'],
    schedule: 'Continuous Event Stream',
    frequencyLabel: 'Instant webhook',
    matchThreshold: 92,
    appliedCount: 30,
    active: true,
    lastRun: '2 hours ago',
    status: 'ACTIVE',
    mode: 'Review & Send'
  },
  {
    id: 'pipe-4',
    title: 'Enterprise Cloud & DevOps Architect',
    targetRoles: 'Principal Architect, Kubernetes, SRE Lead',
    platforms: ['Greenhouse', 'LinkedIn'],
    schedule: 'Weekly on Mon & Thu',
    frequencyLabel: 'Bi-weekly batch',
    matchThreshold: 90,
    appliedCount: 18,
    active: false,
    lastRun: 'Yesterday',
    status: 'PAUSED',
    mode: 'Auto-Apply'
  }
];

const INITIAL_LOGS = [
  { id: 1, time: '14:48:02', level: 'INFO', text: 'Autonomous Runner Engine v2.4 initialized. 3 active workers listening.' },
  { id: 2, time: '14:48:15', level: 'AGENT', text: 'Pipeline [Remote Java] triggered scheduled discovery on Indeed & Naukri API.' },
  { id: 3, time: '14:48:22', level: 'SUCCESS', text: 'Discovered 14 new listings. 4 matched ATS filter (score >= 85%).' },
  { id: 4, time: '14:48:27', level: 'AI', text: 'Tailored Resume: "Senior Java Engineer" at Databricks (ATS compatibility: 94%).' },
  { id: 5, time: '14:48:33', level: 'FORM', text: 'Auto-filled 12 form fields, notice period (Immediate), work authorization (Citizen).' },
  { id: 6, time: '14:48:38', level: 'SUCCESS', text: 'Application dispatched. Confirmation receipt #DBX-98201 logged to Activity.' },
  { id: 7, time: '14:55:00', level: 'INFO', text: 'Worker #2 heartbeat OK. Listening for incoming job alerts...' }
];

export default function AutomationView({ onNavigateTab }) {
  const [pipelines, setPipelines] = useState(INITIAL_PIPELINES);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PAUSED'
  const [toastMsg, setToastMsg] = useState(null);
  const terminalEndRef = useRef(null);

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

  const handleTogglePipeline = (id) => {
    setPipelines(prev => prev.map(p => {
      if (p.id === id) {
        const nextActive = !p.active;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(l => [
          ...l,
          {
            id: Date.now(),
            time: now,
            level: nextActive ? 'SUCCESS' : 'WARN',
            text: `Pipeline [${p.title}] status switched to ${nextActive ? 'ACTIVE (listening)' : 'PAUSED'}.`
          }
        ]);
        showNotification(`Pipeline ${nextActive ? 'activated' : 'paused'}`);
        return {
          ...p,
          active: nextActive,
          status: nextActive ? 'ACTIVE' : 'PAUSED'
        };
      }
      return p;
    }));
  };

  const handleRunPipelineNow = (pipe) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(l => [
      ...l,
      { id: Date.now(), time: now, level: 'AGENT', text: `Manual dispatch invoked for [${pipe.title}]...` },
      { id: Date.now() + 1, time: now, level: 'AI', text: `Analyzing 6 newly indexed positions from ${pipe.platforms.join(' & ')}...` },
      { id: Date.now() + 2, time: now, level: 'SUCCESS', text: `Role matched: "Lead Engineer" at Snowflake (91% ATS). Application submitted.` }
    ]);
    setPipelines(prev => prev.map(p => p.id === pipe.id ? { ...p, appliedCount: p.appliedCount + 1, lastRun: 'Just now' } : p));
    showNotification(`Dispatched 1 new application for ${pipe.title}`);
  };

  const handleRunAll = () => {
    setIsRunningAll(true);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(l => [
      ...l,
      { id: Date.now(), time: now, level: 'AGENT', text: '⚡ Full Autonomous Application Cycle initiated across all active pipelines.' },
      { id: Date.now() + 1, time: now, level: 'INFO', text: 'Crawling LinkedIn Easy Apply, Indeed, Greenhouse endpoints...' }
    ]);

    setTimeout(() => {
      const finishTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLogs(l => [
        ...l,
        { id: Date.now() + 2, time: finishTime, level: 'SUCCESS', text: 'Scan complete: 3 applications dispatched, 2 saved for review. All pipelines nominal.' }
      ]);
      setPipelines(prev => prev.map(p => p.active ? { ...p, appliedCount: p.appliedCount + 1, lastRun: 'Just now' } : p));
      setIsRunningAll(false);
      showNotification('Automated batch execution complete: 3 jobs applied!');
    }, 1400);
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
  const totalDispatched = pipelines.reduce((acc, curr) => acc + curr.appliedCount, 0);

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
            {filteredPipelines.map((pipe) => (
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

                  <div className="pipe-footer-actions">
                    <button 
                      className="btn-pipe-run"
                      onClick={() => handleRunPipelineNow(pipe)}
                      disabled={!pipe.active}
                      title="Trigger immediate application scan for this pipeline"
                    >
                      <Play size={11} fill="currentColor" />
                      <span>Run Now</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
              {logs.map((log) => {
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
              })}
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
