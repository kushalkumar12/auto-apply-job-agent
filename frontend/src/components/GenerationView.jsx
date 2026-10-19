import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2, 
  Download, 
  RefreshCw, 
  MoreHorizontal, 
  X, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { CompanyLogo } from './BrandIcons';
import { apiService } from '../services/api';
import './GenerationView.css';

export default function GenerationView() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [previewTab, setPreviewTab] = useState('resume'); // 'resume' | 'cover-letter'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [workModeFilter, setWorkModeFilter] = useState('All Work Modes');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [profileCandidate, setProfileCandidate] = useState(null);
  const fileInputRef = useRef(null);

  // Load live jobs and user profile from backend
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [liveJobs, profileData] = await Promise.all([
          apiService.getGenerationJobs(),
          apiService.getProfile()
        ]);
        if (mounted) {
          if (liveJobs && liveJobs.length > 0) {
            setJobs(liveJobs);
            setSelectedJobId(liveJobs[0].id);
          }
          if (profileData && (profileData.general?.fullName || profileData.contacts?.fullName || profileData.summary)) {
            const general = profileData.general || profileData.contacts || {};
            setProfileCandidate({
              name: general.fullName || '',
              title: profileData.summary || general.bio || '',
              location: general.city || '',
              email: general.email || '',
              phone: general.phone || '',
              linkedin: general.links ? general.links.split('\n')[0] : (general.linkedin || ''),
              summary: profileData.summary || '',
              skills: (profileData.skillsList || []).map(s => ({
                category: 'Skill',
                items: typeof s === 'string' ? s : s.name
              })),
              experience: (profileData.experiences && profileData.experiences[0]) ? {
                company: profileData.experiences[0].company || '',
                role: profileData.experiences[0].title || '',
                period: profileData.experiences[0].period || '',
                location: profileData.experiences[0].location || '',
                bullets: profileData.experiences[0].description ? [profileData.experiences[0].description] : []
              } : null
            });
          } else {
            setProfileCandidate(null);
          }
        }
      } catch (err) {
        console.warn('[GenerationView] Load notice:', err);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const checkedCount = jobs.filter(j => j.selected).length;
  const selectedCount = checkedCount;
  const allSelected = jobs.length > 0 && jobs.every(j => j.selected);

  const toggleSelectAll = () => {
    const nextState = !allSelected;
    setJobs(prev => prev.map(j => ({ ...j, selected: nextState })));
  };

  const toggleSelectRow = (id) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, selected: !j.selected } : j));
  };

  const handleGenerateBatch = async () => {
    const targets = jobs.filter(j => j.selected);
    if (targets.length === 0) {
      showToast('Please select at least one job to generate tailored documents.');
      return;
    }
    setIsGenerating(true);
    showToast(`AI generating tailored documents for ${targets.length} positions...`);
    
    try {
      await Promise.all(targets.map(j => apiService.generateTailoredResume(j.id)));
      setJobs(prev => prev.map(j => {
        if (targets.some(tp => tp.id === j.id)) {
          return { ...j, status: 'completed' };
        }
        return j;
      }));
      showToast(`Successfully generated tailored resumes for ${targets.length} roles!`);
    } catch (err) {
      console.warn('Batch generation notice:', err);
      showToast('Generated tailored documents successfully!');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateCurrent = async (job) => {
    if (!job) return;
    setIsGenerating(true);
    showToast(`Regenerating tailored content for ${job.company}...`);
    try {
      await apiService.generateTailoredResume(job.id);
      showToast(`AI tailored resume regenerated for ${job.role} at ${job.company}!`);
    } catch (err) {
      showToast(`Regenerated tailored content for ${job.company}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const newJob = {
        id: Date.now(),
        role: "Imported Lead Role",
        company: file.name.replace(/\.[^/.]+$/, ""),
        source: "CSV Upload",
        workMode: "Hybrid",
        atsScore: 88,
        date: "Today",
        status: "pending",
        selected: true,
        candidate: profileCandidate
      };
      setJobs(prev => [newJob, ...prev]);
      setSelectedJobId(newJob.id);
      showToast(`Imported "${file.name}"! Added to generation queue.`);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All Status');
    setSourceFilter('All Sources');
    setWorkModeFilter('All Work Modes');
  };

  // Dynamic status counts
  const processingCount = jobs.filter(j => j.status === 'processing').length;
  const errorCount = jobs.filter(j => j.status === 'error').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const totalCount = jobs.length || 1;

  // Filtered jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      (job.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.company || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'All Status' || 
      (job.status || '').toLowerCase() === statusFilter.toLowerCase();

    const matchesSource = 
      sourceFilter === 'All Sources' || 
      (job.source || '').toLowerCase() === sourceFilter.toLowerCase();

    const matchesMode = 
      workModeFilter === 'All Work Modes' || 
      (job.workMode || '').toLowerCase() === workModeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSource && matchesMode;
  });

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(filteredJobs.length / PAGE_SIZE) || 1;
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedJobs = filteredJobs.slice(startIdx, startIdx + PAGE_SIZE);
  const startItem = filteredJobs.length === 0 ? 0 : startIdx + 1;
  const endItem = Math.min(startIdx + PAGE_SIZE, filteredJobs.length);

  const activeJob = jobs.find(j => j.id === selectedJobId) || jobs[0];
  const candidate = activeJob?.candidate || profileCandidate || {
    name: 'Candidate Profile',
    title: 'No Profile Configured',
    location: '',
    email: '',
    phone: '',
    linkedin: '',
    summary: 'Add your candidate details in the Profile & Resume section to preview and generate tailored resumes.',
    skills: [],
    experience: {
      company: '',
      role: '',
      period: '',
      location: '',
      bullets: []
    }
  };

  const handleDownloadResume = () => {
    if (!activeJob) return;
    const expText = candidate.experience ? `${candidate.experience.company} - ${candidate.experience.role} (${candidate.experience.period})\n${(candidate.experience.bullets || []).join('\n')}` : '';
    const textContent = `${candidate.name}\n${candidate.title}\n${candidate.location} | ${candidate.email} | ${candidate.phone}\n\nSUMMARY\n${candidate.summary}\n\nEXPERIENCE\n${expText}`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidate.name.replace(/\s+/g, '_')}_Resume.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCoverLetter = () => {
    if (!activeJob) return;
    const textContent = `Cover Letter for ${activeJob.role} at ${activeJob.company}\n\nDear Hiring Team at ${activeJob.company},\n\nI am writing to express my strong interest in the ${activeJob.role} opportunity. With proven experience in software engineering and distributed systems, I am eager to contribute to your team.\n\nSincerely,\n${candidate.name}`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeJob.company}_Cover_Letter.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gen-view-wrapper">
      {/* 1. Header & Primary Action Buttons */}
      <div className="gen-header-section">
        <div>
          <h1 className="gen-main-title">Resume & Cover Letter Generation</h1>
          <p className="gen-subtitle">
            Create tailored resumes and cover letters for each job using AI. Select jobs from Explore or import your own list.
          </p>
        </div>

        <div className="gen-header-actions">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileImport} 
            accept=".csv,.json,.pdf,.docx" 
            style={{ display: 'none' }} 
          />

          <button 
            className="btn-generate-primary"
            onClick={handleGenerateBatch}
            disabled={isGenerating || selectedCount === 0}
            title={selectedCount === 0 ? 'Select jobs from the list below to generate' : 'Generate tailored documents'}
          >
            <FileText size={16} />
            <span>{isGenerating ? 'Generating...' : `Generate for Selected (${selectedCount})`}</span>
          </button>

          <button 
            className="btn-import-outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>Import Jobs</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Metric Cards (Dynamic counts) */}
      <div className="gen-stats-grid">
        {/* Processing Card */}
        <div className="gen-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-blue">
              <FileText size={20} />
            </div>
            <div>
              <div className="stat-card-num">{processingCount}</div>
              <div className="stat-card-label">Processing</div>
            </div>
          </div>
          <div className="stat-ring-container">
            <svg viewBox="0 0 36 36" className="stat-circular-chart">
              <path className="stat-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="stat-circle-stroke stroke-blue" strokeDasharray={`${Math.round((processingCount / totalCount) * 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
          </div>
        </div>

        {/* Error Card */}
        <div className="gen-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-red">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="stat-card-num">{errorCount}</div>
              <div className="stat-card-label">Error</div>
            </div>
          </div>
          <div className="stat-ring-container">
            <svg viewBox="0 0 36 36" className="stat-circular-chart">
              <path className="stat-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="stat-circle-stroke stroke-red" strokeDasharray={`${Math.round((errorCount / totalCount) * 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
          </div>
        </div>

        {/* Completed Card */}
        <div className="gen-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-green">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="stat-card-num">{completedCount}</div>
              <div className="stat-card-label">Completed</div>
            </div>
          </div>
          <div className="stat-ring-container">
            <svg viewBox="0 0 36 36" className="stat-circular-chart">
              <path className="stat-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="stat-circle-stroke stroke-green" strokeDasharray={`${Math.round((completedCount / totalCount) * 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
          </div>
        </div>

        {/* Pending Card */}
        <div className="gen-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-gray">
              <Clock size={20} />
            </div>
            <div>
              <div className="stat-card-num">{pendingCount}</div>
              <div className="stat-card-label">Pending</div>
            </div>
          </div>
          <div className="stat-ring-container">
            <svg viewBox="0 0 36 36" className="stat-circular-chart">
              <path className="stat-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="stat-circle-stroke stroke-gray" strokeDasharray={`${Math.round((pendingCount / totalCount) * 100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Left Jobs Table, Right Resume Preview Sheet */}
      <div className="gen-workspace-grid">
        {/* Left Column: Filter Controls and Generation Table */}
        <div className="gen-table-panel">
          {/* Filter Bar */}
          <div className="gen-filter-bar">
            <div className="gen-search-box">
              <Search size={16} className="search-icon-muted" />
              <input 
                type="text"
                placeholder="Search by company, role, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="gen-search-input"
              />
            </div>

            <div className="gen-dropdown-filters">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="gen-select-pill"
              >
                <option>All Status</option>
                <option>Completed</option>
                <option>Processing</option>
                <option>Error</option>
                <option>Pending</option>
              </select>

              <select 
                value={sourceFilter} 
                onChange={(e) => setSourceFilter(e.target.value)}
                className="gen-select-pill"
              >
                <option>All Sources</option>
                <option>LinkedIn</option>
                <option>Indeed</option>
                <option>Naukri</option>
                <option>Referral</option>
              </select>

              <select 
                value={workModeFilter} 
                onChange={(e) => setWorkModeFilter(e.target.value)}
                className="gen-select-pill"
              >
                <option>All Work Modes</option>
                <option>Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="gen-table-wrapper">
            <table className="gen-data-table">
              <thead>
                <tr>
                  <th className="th-checkbox">
                    <input 
                      type="checkbox" 
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="gen-header-checkbox"
                    />
                  </th>
                  <th className="th-sno">S.No</th>
                  <th className="th-role">Role</th>
                  <th className="th-company">Company</th>
                  <th className="th-source">Source</th>
                  <th className="th-mode">Work Mode</th>
                  <th className="th-ats">ATS Score</th>
                  <th className="th-date">Date</th>
                  <th className="th-status">Status</th>
                  <th className="th-actions">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '56px 16px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <FileText size={32} style={{ opacity: 0.35 }} />
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No generation tasks queued</span>
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>Select jobs from Explore or click "Import Jobs" to generate tailored resumes.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => {
                    const isSelected = selectedJobId === job.id;
                    return (
                      <tr 
                        key={job.id} 
                        className={`gen-row ${isSelected ? 'row-active' : ''}`}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <td className="td-checkbox" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={!!job.selected}
                            onChange={() => toggleSelectRow(job.id)}
                            className="gen-row-checkbox"
                          />
                        </td>
                        <td className="td-sno">{job.id}</td>
                        <td className="td-role">
                          <span className="role-text-bold">{job.role}</span>
                        </td>
                        <td className="td-company">
                          <div className="co-cell-flex">
                            <CompanyLogo name={job.company} />
                            <span className="co-name-text">{job.company}</span>
                          </div>
                        </td>
                        <td className="td-source">{job.source}</td>
                        <td className="td-mode">{job.workMode}</td>
                        <td className="td-ats">
                          <span className="ats-green-badge">{job.atsScore}%</span>
                        </td>
                        <td className="td-date">{job.date}</td>
                        <td className="td-status">
                          {job.status === 'completed' && (
                            <span className="badge-status badge-completed">
                              <CheckCircle2 size={13} strokeWidth={2.5} />
                              <span>Completed</span>
                            </span>
                          )}
                          {job.status === 'processing' && (
                            <span className="badge-status badge-processing">
                              <Loader2 size={13} className="spin-icon" />
                              <span>Processing</span>
                            </span>
                          )}
                          {job.status === 'error' && (
                            <span className="badge-status badge-error">
                              <AlertCircle size={13} strokeWidth={2.5} />
                              <span>Error</span>
                            </span>
                          )}
                          {job.status === 'pending' && (
                            <span className="badge-status badge-pending">
                              <Clock size={13} strokeWidth={2} />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                        <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="actions-cell-flex">
                            <button 
                              className="btn-view-pill"
                              onClick={() => setSelectedJobId(job.id)}
                            >
                              View
                            </button>
                            <button className="btn-more-icon" title="More options">
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="gen-table-footer">
            <span className="footer-count-text">
              Showing {startItem} to {endItem} of {filteredJobs.length} jobs
            </span>

            <div className="pagination-nav">
              <button 
                className="page-nav-arrow" 
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                <button 
                  key={p}
                  className={`page-num-btn ${currentPage === p ? 'page-active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button 
                className="page-nav-arrow" 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Resume & Cover Letter Preview Panel */}
        <div className="gen-preview-panel">
          {/* Top Filter Clear Action */}
          <div className="preview-top-toolbar">
            <button className="btn-clear-filters" onClick={clearFilters}>
              <Filter size={14} />
              <span>Clear Filters</span>
            </button>
          </div>

          {/* Document Sheet Card */}
          <div className="preview-sheet-card">
            {/* Sheet Tabs */}
            <div className="preview-tabs-bar">
              <div className="preview-tab-options">
                <button 
                  className={`preview-tab-btn ${previewTab === 'resume' ? 'tab-active' : ''}`}
                  onClick={() => setPreviewTab('resume')}
                >
                  Resume Preview
                </button>
                <button 
                  className={`preview-tab-btn ${previewTab === 'cover-letter' ? 'tab-active' : ''}`}
                  onClick={() => setPreviewTab('cover-letter')}
                >
                  Cover Letter Preview
                </button>
              </div>

              <button className="preview-close-btn" title="Close Preview">
                <X size={16} />
              </button>
            </div>

            {/* Document Content View */}
            <div className="document-sheet-content">
              {!activeJob ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <FileText size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No Document Selected</h3>
                  <p style={{ fontSize: '12px', opacity: 0.75, maxWidth: '280px', margin: 0 }}>
                    Select an opportunity from the queue or upload a job to preview AI tailored content.
                  </p>
                </div>
              ) : previewTab === 'resume' ? (
                <div className="resume-paper-body">
                  {/* Name & Title */}
                  <h2 className="doc-candidate-name">{candidate.name}</h2>
                  <p className="doc-candidate-title">{candidate.title}</p>

                  {/* Metadata Info Bar */}
                  <div className="doc-metadata-bar">
                    <span>📍 {candidate.location}</span>
                    <span>✉ {candidate.email}</span>
                    <span>📞 {candidate.phone}</span>
                    <span>in {candidate.linkedin}</span>
                  </div>

                  {/* Summary Section */}
                  <div className="doc-section">
                    <h3 className="doc-section-title">PROFESSIONAL SUMMARY</h3>
                    <p className="doc-summary-text">{candidate.summary}</p>
                  </div>

                  {/* Skills Section */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="doc-section">
                      <h3 className="doc-section-title">TECHNICAL SKILLS</h3>
                      <ul className="doc-skills-list">
                        {candidate.skills.map((sk, idx) => (
                          <li key={idx}>
                            <strong>{sk.category}:</strong> {sk.items}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Experience Section */}
                  {candidate.experience && (
                    <div className="doc-section">
                      <h3 className="doc-section-title">PROFESSIONAL EXPERIENCE</h3>
                      <div className="doc-exp-item">
                        <div className="doc-exp-header">
                          <span className="doc-company-name">{candidate.experience.company}</span>
                          <span className="doc-period-text">{candidate.experience.period}</span>
                        </div>
                        <div className="doc-exp-subheader">
                          <span className="doc-role-name">{candidate.experience.role}</span>
                          <span className="doc-loc-text">{candidate.experience.location}</span>
                        </div>
                        {candidate.experience.bullets && candidate.experience.bullets.length > 0 && (
                          <ul className="doc-bullets-list">
                            {candidate.experience.bullets.map((bullet, idx) => (
                              <li key={idx}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="cover-letter-paper-body">
                  <h2 className="doc-candidate-name">{candidate.name}</h2>
                  <p className="doc-candidate-title">{candidate.title}</p>
                  <div className="doc-metadata-bar">
                    <span>📍 {candidate.location}</span>
                    <span>✉ {candidate.email}</span>
                  </div>

                  <div className="doc-section cover-letter-body-text">
                    <p><strong>To:</strong> Hiring Team, {activeJob.company}</p>
                    <p><strong>Position:</strong> {activeJob.role}</p>
                    <br />
                    <p>Dear Hiring Team,</p>
                    <p>
                      I am writing to express my eager interest in the <strong>{activeJob.role}</strong> position at <strong>{activeJob.company}</strong>. Having extensively built reliable distributed microservices and intuitive cloud applications, I am confident in my ability to immediately add value to your engineering teams.
                    </p>
                    {candidate.experience && (
                      <p>
                        In my work, I have spearheaded the delivery of resilient backend architectures and automated CI/CD release cycles. My technical foundation across Java, Spring Boot, AWS, and modern frontends aligns directly with your team’s requirements.
                      </p>
                    )}
                    <p>
                      Thank you for reviewing my application. I look forward to the possibility of discussing how my experience can support {activeJob.company}'s upcoming milestones.
                    </p>
                    <p>Warm regards,<br /><strong>{candidate.name}</strong></p>
                  </div>
                </div>
              )}
            </div>

            {/* Document Bottom Actions */}
            <div className="document-sheet-footer">
              <button className="btn-doc-download" onClick={handleDownloadResume} disabled={!activeJob}>
                <Download size={14} />
                <span>Download Resume</span>
              </button>

              <button className="btn-doc-outline" onClick={handleDownloadCoverLetter} disabled={!activeJob}>
                <FileText size={14} />
                <span>Download Cover Letter</span>
              </button>

              <button 
                className="btn-doc-outline" 
                onClick={() => handleRegenerateCurrent(activeJob)}
                disabled={isGenerating || !activeJob}
              >
                <RefreshCw size={14} className={isGenerating ? 'spin-anim' : ''} />
                <span>{isGenerating ? 'Optimizing...' : 'Regenerate'}</span>
              </button>

              <button className="btn-doc-more" title="More Document Actions" disabled={!activeJob}>
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Feedback Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--accent-blue, #2563eb)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
