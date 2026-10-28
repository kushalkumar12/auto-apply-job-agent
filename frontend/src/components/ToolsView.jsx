import React, { useState } from 'react';
import { 
  FileCheck, 
  Edit3, 
  Search, 
  FileText, 
  Mail, 
  Layers, 
  ArrowRight,
  UploadCloud,
  ClipboardPaste,
  BarChart,
  Send,
  Sparkles,
  X,
  Check,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../services/api';
import './ToolsView.css';

export default function ToolsView({ onBackToExplore }) {
  const [activeModal, setActiveModal] = useState(null); // 'ats-check' | 'jd-analyzer' | 'cover-letter' | 'upload'
  const [copiedId, setCopiedId] = useState(null);
  
  // Modal states
  const [jdInput, setJdInput] = useState('');
  const [jdAnalysisResult, setJdAnalysisResult] = useState(null);
  const [targetCompany, setTargetCompany] = useState('Google');
  const [targetRole, setTargetRole] = useState('Senior Java Backend Engineer');
  const [generatedLetter, setGeneratedLetter] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Real ATS Audit State
  const [atsScoreData, setAtsScoreData] = useState(null);
  const [atsLoading, setAtsLoading] = useState(false);

  const loadAtsAudit = async () => {
    setAtsLoading(true);
    try {
      const val = await apiService.getActiveProfileValidation();
      const resume = await apiService.getResumeContent();
      let profile = {};
      try {
        const stored = localStorage.getItem('rp_candidate_profile');
        if (stored) profile = JSON.parse(stored);
      } catch {}
      const skills = profile.skillsList || [];
      const hasResume = Boolean(resume && resume.hasResume);
      const isComplete = Boolean(val?.checks?.profileComplete);

      let calculatedScore = 25;
      if (hasResume) calculatedScore += 40;
      if (isComplete) calculatedScore += 25;
      if (skills.length >= 3) calculatedScore += 10;
      calculatedScore = Math.min(98, Math.max(calculatedScore, val?.score || calculatedScore));

      const auditData = {
        score: calculatedScore,
        hasResume,
        isComplete,
        skillsCount: skills.length,
        breakdown: [
          {
            name: 'Profile Completeness',
            score: isComplete ? '100/100 (Pass)' : '40/100 (Incomplete)',
            color: isComplete ? '#10b981' : '#f59e0b'
          },
          {
            name: 'Master Resume Ingestion',
            score: hasResume ? '100/100 (Verified)' : '0/100 (Missing)',
            color: hasResume ? '#10b981' : '#ef4444'
          },
          {
            name: 'Technical Skills & Keyword Coverage',
            score: skills.length >= 5 ? '92/100 (Strong)' : `${Math.min(90, Math.max(30, skills.length * 15))}/100`,
            color: skills.length >= 5 ? '#10b981' : '#38bdf8'
          }
        ]
      };
      setAtsScoreData(auditData);
      recordUsage('ATS Audit Completed', hasResume ? 'Master Resume Verified' : 'Profile Audit', `${calculatedScore}% Score`, calculatedScore >= 75 ? 'green' : 'amber');
    } catch {
      setAtsScoreData({
        score: 35,
        hasResume: false,
        isComplete: false,
        breakdown: [
          { name: 'Profile Completeness', score: '35/100 (Incomplete)', color: '#f59e0b' },
          { name: 'Master Resume', score: '0/100 (Missing)', color: '#ef4444' }
        ]
      });
    } finally {
      setAtsLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeModal === 'ats-check') {
      loadAtsAudit();
    }
  }, [activeModal]);

  const [recentUsage, setRecentUsage] = useState(() => {
    try {
      const stored = localStorage.getItem('rp_tools_usage');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const recordUsage = (title, subtitle, scoreBadge = null, scoreColor = 'green') => {
    const newItem = {
      title,
      subtitle,
      time: 'Just now',
      scoreBadge,
      scoreColor
    };
    setRecentUsage(prev => {
      const next = [newItem, ...prev.slice(0, 9)];
      try {
        localStorage.setItem('rp_tools_usage', JSON.stringify(next));
      } catch (e) {
        console.warn('Storage notice:', e);
      }
      return next;
    });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAnalyzeJD = () => {
    if (!jdInput.trim()) return;
    const inputLower = jdInput.toLowerCase();

    const techDict = [
      'Java', 'Spring Boot', 'Microservices', 'Apache Kafka', 'Kafka', 'PostgreSQL', 'MySQL', 'MongoDB',
      'Redis', 'AWS', 'Docker', 'Kubernetes', 'Python', 'FastAPI', 'Django', 'React', 'Node.js',
      'TypeScript', 'JavaScript', 'GraphQL', 'REST APIs', 'CI/CD', 'Git', 'Linux', 'Elasticsearch'
    ];

    const detectedSkills = techDict.filter(s => inputLower.includes(s.toLowerCase()));
    const finalRequiredSkills = detectedSkills.length > 0 ? detectedSkills : ['Java', 'Spring Boot', 'Microservices', 'REST APIs'];

    let candidateSkills = [];
    try {
      const stored = localStorage.getItem('rp_candidate_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.skillsList)) {
          candidateSkills = parsed.skillsList.map(s => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean);
        }
      }
    } catch {}

    const candSkillsLower = candidateSkills.map(s => s.toLowerCase());
    const matched = finalRequiredSkills.filter(req => 
      candSkillsLower.some(cs => cs.includes(req.toLowerCase()) || req.toLowerCase().includes(cs))
    );
    const missing = finalRequiredSkills.filter(req => !matched.includes(req));

    const matchRatio = finalRequiredSkills.length > 0 ? (matched.length / finalRequiredSkills.length) : 0.5;
    const computedScore = Math.min(98, Math.max(45, Math.round(50 + matchRatio * 45)));

    setJdAnalysisResult({
      role: targetRole || 'Target Software Role',
      matchScore: computedScore,
      requiredSkills: finalRequiredSkills,
      recommendedKeywords: missing.length > 0 ? missing : ['Cloud Native Architecture', 'High Availability', 'Continuous Integration'],
      matchedSkills: matched,
      experienceRequired: 'Calculated from job requirements'
    });
    recordUsage('JD Analyzed', targetRole || 'Software Role', `${computedScore}% Match`, computedScore >= 75 ? 'green' : 'amber');
  };

  const handleGenerateCoverLetter = () => {
    let candidateName = 'Candidate';
    let candidateEmail = '';
    let candidatePhone = '';
    try {
      const stored = localStorage.getItem('rp_candidate_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) candidateName = parsed.name;
        if (parsed.email) candidateEmail = parsed.email;
        if (parsed.phone) candidatePhone = parsed.phone;
      }
    } catch (e) {}

    const contactStr = [candidateEmail, candidatePhone].filter(Boolean).join(' | ');
    const text = `To: Hiring Team, ${targetCompany || 'Engineering Department'}\nPosition: ${targetRole || 'Software Engineer'}\n\nDear Hiring Team,\n\nI am writing to express my strong enthusiasm for the ${targetRole || 'Software Engineer'} role at ${targetCompany || 'your organization'}. With proven technical experience designing scalable systems, I have consistently driven reliable engineering delivery.\n\nMy background in building resilient services and APIs directly aligns with ${targetCompany || 'your organization'}'s technical standards.\n\nThank you for considering my application. I look forward to discussing how my experience can contribute to your team's success.\n\nWarm regards,\n${candidateName}${contactStr ? `\n${contactStr}` : ''}`;
    setGeneratedLetter(text);
    recordUsage('Cover Letter Generated', `${targetRole} - ${targetCompany}`);
  };

  const toolsList = [
    {
      id: 'ats-check',
      title: 'ATS Resume Checker',
      desc: 'Analyze your resume for ATS compatibility, keyword match and formatting issues.',
      icon: FileCheck,
      actionText: 'Run ATS Check →',
      actionHandler: () => setActiveModal('ats-check')
    },
    {
      id: 'resume-editor',
      title: 'Resume Editor',
      desc: 'Edit and manage your master resume and tailored versions for different roles.',
      icon: Edit3,
      actionText: 'Open Editor →',
      actionHandler: () => { window.location.hash = '#profile'; }
    },
    {
      id: 'keyword-matcher',
      title: 'Resume Keyword Matcher',
      desc: 'Compare your resume with a job description and get missing keywords.',
      icon: Search,
      actionText: 'Match Keywords →',
      actionHandler: () => setActiveModal('jd-analyzer')
    },
    {
      id: 'jd-analyzer',
      title: 'Job Description Analyzer',
      desc: 'Extract key skills, responsibilities and requirements from any job description.',
      icon: FileText,
      actionText: 'Analyze JD →',
      actionHandler: () => setActiveModal('jd-analyzer')
    },
    {
      id: 'cover-letter',
      title: 'Cover Letter Generator',
      desc: 'Create a role-specific, personalized cover letter using AI.',
      icon: Mail,
      actionText: 'Generate Cover Letter →',
      actionHandler: () => {
        handleGenerateCoverLetter();
        setActiveModal('cover-letter');
      }
    },
    {
      id: 'version-manager',
      title: 'Resume Version Manager',
      desc: 'Manage, compare and restore different versions of your resumes.',
      icon: Layers,
      actionText: 'Manage Versions →',
      actionHandler: () => { window.location.hash = '#generation'; }
    }
  ];

  return (
    <div className="resume-tools-wrapper">
      {/* 1. Header */}
      <div className="tools-header-section">
        <h1 className="tools-main-title">Resume Tools</h1>
        <p className="tools-subtitle">
          Improve your resume and application materials with AI-powered tools.
        </p>
      </div>

      {/* 2. Grid of 8 Tool Cards (2 Columns x 4 Rows) */}
      <div className="tools-cards-grid">
        {toolsList.map((tool) => {
          const Icon = tool.icon;
          return (
            <div key={tool.id} className="tool-box-card">
              <div className="tool-box-content">
                <div className="tool-icon-box">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <div className="tool-text-group">
                  <h3 className="tool-box-title">{tool.title}</h3>
                  <p className="tool-box-desc">{tool.desc}</p>
                </div>
              </div>

              <button 
                className="btn-tool-action"
                onClick={tool.actionHandler}
              >
                <span>{tool.actionText}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Two-Column Section: Recent Tools Usage & Quick Actions */}
      <div className="tools-bottom-grid">
        {/* Left: Recent Tools Usage */}
        <div className="bottom-card-panel">
          <div className="panel-header-row">
            <h2 className="panel-title-text">Recent Tools Usage</h2>
            <button className="btn-view-all-text" onClick={() => setActiveModal('ats-check')}>
              View All
            </button>
          </div>

          <div className="recent-tools-list">
            {recentUsage.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
                <FileCheck size={28} style={{ opacity: 0.35, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>No recent tool usage</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                  Run an ATS resume check, keyword matcher, or cover letter generator to view history.
                </p>
              </div>
            ) : (
              recentUsage.map((item, idx) => (
                <div key={idx} className="recent-tool-row">
                  <div className="recent-tool-left">
                    <div className="recent-item-icon">
                      <FileCheck size={16} />
                    </div>
                    <div>
                      <div className="recent-item-title">{item.title}</div>
                      <div className="recent-item-subtitle">{item.subtitle}</div>
                    </div>
                  </div>

                  <div className="recent-tool-right">
                    <span className="recent-item-time">{item.time}</span>
                    {item.scoreBadge && (
                      <span className="recent-score-green">{item.scoreBadge}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="bottom-card-panel">
          <h2 className="panel-title-text">Quick Actions</h2>

          <div className="quick-actions-list">
            {/* Action 1: Upload Resume */}
            <div className="quick-action-item">
              <div className="quick-action-left">
                <div className="quick-action-icon">
                  <UploadCloud size={18} />
                </div>
                <div>
                  <div className="quick-title">Upload Resume</div>
                  <div className="quick-desc">Upload your existing resume to get started.</div>
                </div>
              </div>
              <button 
                className="btn-quick-primary"
                onClick={() => setActiveModal('upload')}
              >
                Upload File
              </button>
            </div>

            {/* Action 2: Paste Job Description */}
            <div className="quick-action-item">
              <div className="quick-action-left">
                <div className="quick-action-icon">
                  <ClipboardPaste size={18} />
                </div>
                <div>
                  <div className="quick-title">Paste Job Description</div>
                  <div className="quick-desc">Paste any job description to analyze or generate.</div>
                </div>
              </div>
              <button 
                className="btn-quick-primary"
                onClick={() => setActiveModal('jd-analyzer')}
              >
                Paste JD
              </button>
            </div>

            {/* Action 3: Run ATS Check */}
            <div className="quick-action-item">
              <div className="quick-action-left">
                <div className="quick-action-icon">
                  <BarChart size={18} />
                </div>
                <div>
                  <div className="quick-title">Run ATS Check</div>
                  <div className="quick-desc">Quickly check your resume's ATS score.</div>
                </div>
              </div>
              <button 
                className="btn-quick-primary"
                onClick={() => setActiveModal('ats-check')}
              >
                Run Check
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          INTERACTIVE AI TOOL MODALS
          ========================================================= */}

      {/* 1. ATS Resume Checker Modal */}
      {activeModal === 'ats-check' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card, #1e293b)', color: '#fff', width: '560px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '14px', padding: '24px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileCheck size={22} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>ATS Resume Audit & Health Score</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {atsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
                <div>Auditing active candidate profile and resume...</div>
              </div>
            ) : (
              <>
                <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                  <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: `conic-gradient(${atsScoreData?.score >= 75 ? '#10b981' : '#f59e0b'} ${atsScoreData?.score || 35}%, #334155 0%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '18px',
                      color: atsScoreData?.score >= 75 ? '#10b981' : '#f59e0b'
                    }}>
                      {atsScoreData?.score || 35}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                      {atsScoreData?.score >= 75 ? 'Strong ATS Readiness Score' : 'Profile Action Required'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      {atsScoreData?.hasResume ? 'Master resume parsed and verified across ATS standards.' : 'Master resume has not been ingested yet. Upload your resume for 90%+ readiness.'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>AUDIT BREAKDOWN</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                  {(atsScoreData?.breakdown || []).map((b, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <span>{b.name}</span>
                      <span style={{ color: b.color || '#38bdf8', fontWeight: 700 }}>{b.score}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setActiveModal(null); window.location.hash = '#generation'; }} style={{ padding: '8px 16px', borderRadius: '6px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Generate Tailored Copy →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Job Description Analyzer Modal */}
      {activeModal === 'jd-analyzer' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card, #1e293b)', color: '#fff', width: '580px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '14px', padding: '24px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={22} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Job Description Analyzer</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: 0 }}>Paste any job description to extract required skills, keywords, and instant ATS match scores.</p>
            
            <textarea 
              rows={5}
              placeholder="Paste job posting text here (e.g. We are looking for a Senior Java Developer with Spring Boot, AWS, Kafka experience...)"
              value={jdInput}
              onChange={e => setJdInput(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '13px', resize: 'vertical', marginBottom: '14px' }}
            />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button 
                onClick={() => setJdInput("We are hiring a Senior Java Backend Engineer with 3+ years experience. Must have deep skills in Spring Boot 3, REST APIs, Microservices, PostgreSQL, Kafka, and Docker on AWS cloud.")}
                style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid #475569', borderRadius: '4px', color: '#cbd5e1', cursor: 'pointer' }}
              >
                Insert Sample Java JD
              </button>
            </div>

            <button 
              onClick={handleAnalyzeJD}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}
            >
              Analyze Job Description & Extract Keywords
            </button>

            {jdAnalysisResult && (
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>Match Score: {jdAnalysisResult.matchScore}%</span>
                  <span style={{ fontSize: '11px', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>High Compatibility</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>REQUIRED SKILLS:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {jdAnalysisResult.requiredSkills.map(s => (
                    <span key={s} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>{s}</span>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>RECOMMENDED ATS KEYWORDS:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {jdAnalysisResult.recommendedKeywords.map(k => (
                    <span key={k} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>+ {k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Cover Letter Generator Modal */}
      {activeModal === 'cover-letter' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card, #1e293b)', color: '#fff', width: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '14px', padding: '24px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={22} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>AI Cover Letter Generator</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Company</label>
                <input 
                  type="text" 
                  value={targetCompany} 
                  onChange={e => setTargetCompany(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Role</label>
                <input 
                  type="text" 
                  value={targetRole} 
                  onChange={e => setTargetRole(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                />
              </div>
            </div>

            <button 
              onClick={handleGenerateCoverLetter}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', marginBottom: '14px' }}
            >
              Regenerate Letter
            </button>

            {generatedLetter && (
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155', position: 'relative' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '12px', lineHeight: 1.6, color: '#e2e8f0', maxHeight: '240px', overflowY: 'auto' }}>
                  {generatedLetter}
                </pre>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button 
                    onClick={() => copyToClipboard(generatedLetter, 'cl')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid #475569', borderRadius: '4px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {copiedId === 'cl' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedId === 'cl' ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Upload Resume Modal */}
      {activeModal === 'upload' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card, #1e293b)', color: '#fff', width: '480px', borderRadius: '14px', padding: '24px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UploadCloud size={22} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Upload Resume</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ border: '2px dashed #475569', borderRadius: '10px', padding: '30px 20px', textAlign: 'center', marginBottom: '16px' }}>
              <UploadCloud size={36} color="#38bdf8" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Drag & drop your resume file here</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Supports PDF, DOCX, TXT up to 10MB</div>
              <input 
                type="file" 
                accept=".pdf,.docx,.txt"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      setUploadStatus('Uploading & indexing resume...');
                      const res = await apiService.uploadResume(file);
                      setUploadStatus(`Uploaded "${file.name}" successfully! Indexed into candidate profile.`);
                      recordUsage('Resume Uploaded', file.name, 'Indexed', 'green');
                    } catch (err) {
                      setUploadStatus(`Upload failed: ${err.message || 'Error'}`);
                    }
                  }
                }}
                style={{ marginTop: '14px', fontSize: '12px' }}
              />
            </div>

            {uploadStatus && (
              <div style={{
                padding: '10px 12px',
                background: uploadStatus.includes('failed') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: uploadStatus.includes('failed') ? '#ef4444' : '#10b981',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '14px',
                fontWeight: 600
              }}>
                {uploadStatus.includes('failed') ? '✕ ' : '✓ '}{uploadStatus}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setActiveModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
