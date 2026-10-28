import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Download, 
  UploadCloud,
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  X,
  Globe,
  Database,
  Cpu,
  ExternalLink,
  Sparkles,
  History,
  Clock,
  RotateCcw,
  Star,
  Bookmark
} from 'lucide-react';
import { CompanyLogo } from './BrandIcons';
import SkeletonLoader from './SkeletonLoader';
import ExcelImportModal from './ExcelImportModal';

export default function JobList({ 
  jobs = [], 
  totalCount = 0,
  page = 1,
  pageSize = 10,
  totalPages = 0,
  onPageChange,
  companyFilter,
  onClearCompanyFilter,
  searchQuery = '',
  onSearchChange,
  activeWorkMode = 'All',
  onWorkModeChange,
  onApply, 
  onSelectJob, 
  onExport,
  isLoading = false,
  profileDriven = true,
  activeProfileRoles = [],
  onToggleProfileDriven,
  // 5-Day Historical Archive Props
  selectedHistoryDay = null,
  historyOptions = [],
  onSelectHistoryDay,
  // Live ATS Sync Action
  onHarvestSync,
  isHarvesting = false,
  // Marker Props
  isMarkedOnly = false,
  onToggleMarkedOnly,
  onToggleMarker,
  onImportSuccess
}) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [internalMode, setInternalMode] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const effectiveSearch = onSearchChange ? searchQuery : internalSearch;
  const effectiveMode = onWorkModeChange ? activeWorkMode : internalMode;

  const handleSearchInput = (val) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  const handleModeSelect = (mode) => {
    if (onWorkModeChange) {
      onWorkModeChange(mode);
    } else {
      setInternalMode(mode);
    }
    setShowFilterDropdown(false);
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !effectiveSearch || (
      job.role?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      job.company?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      job.source?.toLowerCase().includes(effectiveSearch.toLowerCase())
    );

    const matchesMode = 
      effectiveMode === 'All' || 
      job.workMode?.toLowerCase() === effectiveMode.toLowerCase();

    return matchesSearch && matchesMode;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const toggleSort = () => {
    setSortAsc(!sortAsc);
  };

  return (
    <div className="job-list-container">
      {/* Table Top Controls Bar */}
      <div className="job-list-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h2 className="job-list-title">Job List ({totalCount.toLocaleString()})</h2>

          {/* 5-Day Historical Archive Selector (Stage 1 Requirement 8) */}
          <div className="history-dropdown-anchor" style={{ position: 'relative' }}>
            <button
              type="button"
              className="table-btn-outline"
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
              title="Select date: Today or previous 4 days"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: (selectedHistoryDay && selectedHistoryDay.dayOffset > 0) ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                borderColor: (selectedHistoryDay && selectedHistoryDay.dayOffset > 0) ? '#f59e0b' : 'var(--border-card, #DDE2DE)',
                color: (selectedHistoryDay && selectedHistoryDay.dayOffset > 0) ? '#f59e0b' : 'var(--text-primary, #171A18)'
              }}
            >
              <Clock size={13} />
              <span>{selectedHistoryDay?.label || 'Today'}</span>
              <ChevronDown size={12} />
            </button>

            {showHistoryDropdown && (
              <div 
                className="history-popover-card"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: 230,
                  background: 'var(--bg-card, var(--surface-primary, #ffffff))',
                  border: '1px solid var(--border-card, #DDE2DE)',
                  borderRadius: 10,
                  boxShadow: 'var(--rp-shadow-md, 0 10px 25px rgba(0,0,0,0.15))',
                  padding: '6px',
                  zIndex: 200
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #777D79)', padding: '4px 8px 6px 8px' }}>
                  Discovery Date (Last 5 Days)
                </div>
                {historyOptions && historyOptions.length > 0 ? (
                  historyOptions.map(opt => (
                    <button
                      key={opt.dayOffset}
                      type="button"
                      onClick={() => {
                        if (onSelectHistoryDay) onSelectHistoryDay(opt);
                        setShowHistoryDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: 'none',
                        background: selectedHistoryDay?.dayOffset === opt.dayOffset ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: selectedHistoryDay?.dayOffset === opt.dayOffset ? 'var(--action-primary, #2563EB)' : 'var(--text-primary, #171A18)',
                        fontSize: 12,
                        fontWeight: selectedHistoryDay?.dayOffset === opt.dayOffset ? 600 : 500,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div>
                        <div>{opt.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted, #94a3b8)' }}>{opt.formattedDate}</div>
                      </div>
                      <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 10 }}>
                        {opt.count}
                      </span>
                    </button>
                  ))
                ) : (
                  <div style={{ padding: '8px', fontSize: 11.5, color: 'var(--text-muted, #94a3b8)' }}>Today (Live)</div>
                )}
              </div>
            )}
          </div>

          {companyFilter && (
            <span className="company-filter-active-pill">
              Company: {companyFilter}
              <X size={12} className="company-filter-clear" onClick={onClearCompanyFilter} title="Clear company filter" />
            </span>
          )}
        </div>

        <div className="job-list-control-actions">
          {/* Search Input */}
          <div className="table-search-box">
            <Search size={16} className="search-icon-subtle" />
            <input 
              type="text" 
              placeholder="Search jobs, company, role..." 
              value={effectiveSearch}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="table-search-input"
            />
          </div>

          {/* Profile-Driven Matching Toggle */}
          {onToggleProfileDriven && (
            <button
              type="button"
              className={`table-btn-outline ${profileDriven ? 'btn-active' : ''}`}
              onClick={onToggleProfileDriven}
              title={profileDriven ? "Profile matching is ON (filters by your skills, role, and location). Click to show all harvested jobs." : "Profile matching is OFF (showing all harvested jobs). Click to filter by your profile."}
              style={profileDriven ? { borderColor: 'var(--accent-primary, #10b981)', color: 'var(--accent-primary, #10b981)', background: 'rgba(16, 185, 129, 0.12)', fontWeight: 600 } : { opacity: 0.75 }}
            >
              <Sparkles size={14} />
              <span>{profileDriven ? 'Profile Match: ON' : 'Profile Match: OFF'}</span>
            </button>
          )}

          {/* Filters Toggle Button */}
          <div className="filter-dropdown-anchor">
            <button 
              className={`table-btn-outline ${showFilterDropdown ? 'btn-active' : ''}`}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              title="Filter by work mode"
            >
              <SlidersHorizontal size={14} />
              <span>{effectiveMode === 'All' ? 'Filters' : effectiveMode}</span>
            </button>

            {showFilterDropdown && (
              <div className="filter-popover-card">
                <div className="filter-popover-group">
                  <span className="popover-label">Work Mode</span>
                  <div className="popover-options">
                    {['All', 'Hybrid', 'Remote', 'On-site'].map(mode => (
                      <button 
                        key={mode}
                        onClick={() => handleModeSelect(mode)}
                        className={`popover-option-btn ${effectiveMode === mode ? 'active' : ''}`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Marked Only Filter Button */}
          {onToggleMarkedOnly && (
            <button 
              type="button"
              className={`table-btn-outline ${isMarkedOnly ? 'btn-active' : ''}`}
              onClick={onToggleMarkedOnly}
              title={isMarkedOnly ? "Showing marked jobs only. Click to show all." : "Filter to show marked jobs only"}
              style={isMarkedOnly ? { borderColor: '#f59e0b', color: '#d97706', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 600 } : {}}
            >
              <Bookmark size={14} fill={isMarkedOnly ? "#d97706" : "none"} />
              <span>{isMarkedOnly ? 'Marked Only' : 'Marked'}</span>
            </button>
          )}

          {/* Sort Button */}
          <button 
            className="table-btn-outline"
            onClick={toggleSort}
            title={`Sort by ATS Score (${sortAsc ? 'Ascending' : 'Descending'})`}
          >
            <ArrowUpDown size={14} />
            <span>Sort</span>
          </button>

          {/* Excel Import Button (Stage 1 Requirement 10) */}
          <button
            type="button"
            className="table-btn-outline"
            onClick={() => setIsImportModalOpen(true)}
            title="Import jobs from Excel or CSV spreadsheet"
          >
            <UploadCloud size={14} />
            <span>Import</span>
          </button>

          {/* Complete Excel / CSV Export Button (Stage 1 Requirement 9) */}
          <button 
            className="table-btn-primary"
            onClick={onExport}
            title="Export all matching jobs to sanitized CSV / Excel (bypasses page limits)"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Historical Archive Indication Banner (Stage 1 Requirement 8) */}
      {selectedHistoryDay && selectedHistoryDay.dayOffset > 0 && (
        <div 
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 8,
            padding: '8px 14px',
            margin: '0 16px 12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-primary, #f8fafc)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>
              <strong>Historical Archive:</strong> Viewing results from <strong>{selectedHistoryDay.formattedDate}</strong> ({selectedHistoryDay.label}). Live feeds reflect the present.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectHistoryDay && onSelectHistoryDay(historyOptions[0])}
            style={{
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#f59e0b',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Return to Today
          </button>
        </div>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(res) => {
          if (onImportSuccess) onImportSuccess(res);
        }}
      />

      {/* Main Table or Loading Skeleton */}
      <div className="table-responsive-wrapper">
        {isLoading ? (
          <div style={{ padding: '16px' }}>
            <SkeletonLoader variant="table-row" columns={8} rows={8} />
          </div>
        ) : (
          <table className="modern-jobs-table">
            <thead>
              <tr>
                <th className="col-sno">S.No</th>
                <th className="col-role">Role</th>
                <th className="col-company">Company</th>
                <th className="col-source">Source</th>
                <th className="col-mode">Work Mode</th>
                <th className="col-score">ATS Score</th>
                <th className="col-datetime">Date & Time</th>
                <th className="col-mark" style={{ width: '48px', textAlign: 'center' }}>Mark</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '56px 16px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Search size={28} style={{ opacity: 0.35 }} />
                      {(!selectedHistoryDay || selectedHistoryDay.dayOffset === 0) && !effectiveSearch && (!companyFilter || companyFilter === 'All') && effectiveMode === 'All' && !isMarkedOnly ? (
                        <>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            No opportunities discovered today yet
                          </span>
                          <span style={{ fontSize: '12px', opacity: 0.75, maxWidth: '440px', lineHeight: 1.5 }}>
                            Today's discovery space is fresh and ready. Click <strong>Sync Harvest</strong> to scan live ATS boards.
                          </span>
                          {historyOptions && historyOptions.find(o => o.dayOffset === 1 && o.count > 0) && (
                            <button
                              type="button"
                              className="table-btn-outline"
                              onClick={() => {
                                const yest = historyOptions.find(o => o.dayOffset === 1);
                                if (onSelectHistoryDay && yest) onSelectHistoryDay(yest);
                              }}
                              style={{
                                marginTop: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                borderColor: '#f59e0b',
                                color: '#f59e0b',
                                background: 'rgba(245, 158, 11, 0.1)'
                              }}
                            >
                              <Clock size={13} />
                              <span>Browse Yesterday's Archive ({historyOptions.find(o => o.dayOffset === 1).count.toLocaleString()} jobs)</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No opportunities found</span>
                          <span style={{ fontSize: '12px', opacity: 0.7 }}>Try adjusting your search criteria, sync your profile, or clear active filters</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedJobs.map((job, idx) => (
                  <tr 
                    key={job.id || `job-idx-${idx}-${job.company}-${job.role}`} 
                    className="table-body-row"
                    onClick={() => onSelectJob(job)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectJob(job);
                      }
                    }}
                    aria-label={`View details for ${job.role} at ${job.company}`}
                  >
                    <td className="cell-sno">{job.id}</td>
                    <td className="cell-role">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="role-heading">{job.role}</span>
                        
                        {/* 1. Primary Skills Matched Badge */}
                        {job.matchedPrimarySkills && job.matchedPrimarySkills.length > 0 ? (
                          <span 
                            title={`Matched Primary Skills: ${job.matchedPrimarySkills.join(', ')}`}
                            style={{ 
                              fontSize: '10.5px', 
                              fontWeight: 700, 
                              color: '#92400E', 
                              background: '#FEF3C7', 
                              border: '1px solid #FDE68A',
                              padding: '1px 6px', 
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Star size={10} color="#D97706" fill="#D97706" />
                            <span>{job.matchedPrimarySkills.slice(0, 2).join(', ')}{job.matchedPrimarySkills.length > 2 ? ` +${job.matchedPrimarySkills.length - 2}` : ''}</span>
                          </span>
                        ) : job.primarySkillMatched && (
                          <span 
                            title={`Top match for your Primary Skill: ${job.primarySkill}`}
                            style={{ 
                              fontSize: '10.5px', 
                              fontWeight: 700, 
                              color: '#92400E', 
                              background: '#FEF3C7', 
                              border: '1px solid #FDE68A',
                              padding: '1px 6px', 
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Star size={10} color="#D97706" fill="#D97706" />
                            <span>{job.primarySkill}</span>
                          </span>
                        )}

                        {/* 2. Experience Fit Badge */}
                        {job.experienceFit && (
                          <span 
                            title={`Candidate Exp: ${job.experienceFit.candidateYears ?? 'N/A'} yrs · Job Req: ${job.experienceFit.requiredText || 'Open'}`}
                            style={{ 
                              fontSize: '10.5px', 
                              fontWeight: 600, 
                              color: job.experienceFit.status === 'qualified' ? '#166534' : '#475569', 
                              background: job.experienceFit.status === 'qualified' ? '#dcfce7' : '#f1f5f9', 
                              border: `1px solid ${job.experienceFit.status === 'qualified' ? '#bbf7d0' : '#e2e8f0'}`,
                              padding: '1px 6px', 
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <span>⏳ {job.experienceFit.requiredText}</span>
                          </span>
                        )}

                        {/* 3. Location Match Badge */}
                        {job.location && (
                          <span 
                            title={`Location: ${job.location}`}
                            style={{ 
                              fontSize: '10.5px', 
                              fontWeight: 600, 
                              color: job.locationMatched ? '#1e40af' : '#64748b', 
                              background: job.locationMatched ? '#dbeafe' : '#f8fafc', 
                              border: `1px solid ${job.locationMatched ? '#bfdbfe' : '#e2e8f0'}`,
                              padding: '1px 6px', 
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <span>📍 {job.location.split(',')[0]}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="cell-company">
                      <div className="company-logo-group">
                        <CompanyLogo name={job.company} />
                        <span className="company-title">{job.company}</span>
                      </div>
                    </td>
                    <td className="cell-source">
                      {job.isHarvested || (job.atsSource && job.atsSource !== 'Local') ? (
                        <div className="harvested-source-cell">
                          <span className={`ats-badge ats-${(job.atsSource || 'ats').toLowerCase()}`}>
                            <span className="ats-dot" />
                            {job.atsSource || 'ATS'}
                          </span>
                          {job.url && (
                            <a 
                              href={job.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="direct-ats-link-icon"
                              title="Open original direct ATS job posting"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="local-source-tag">{job.source}</span>
                      )}
                    </td>
                    <td className="cell-mode">
                      <span className="work-mode-plain-text">{job.workMode}</span>
                    </td>
                    <td className="cell-score">
                      <span 
                        className="ats-pill-badge"
                        title={job.profileMatch ? `${job.matchedSkillsCount || 0} skills matched with your profile` : 'ATS Match Score'}
                        style={job.profileMatch ? {
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.08)',
                          fontWeight: 700
                        } : {}}
                      >
                        {job.atsScore}%
                      </span>
                    </td>
                    <td className="cell-datetime">{job.dateTime}</td>
                    <td className="cell-mark" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <button 
                        type="button"
                        className={`btn-job-marker ${job.marked ? 'is-marked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleMarker && onToggleMarker(job.id);
                        }}
                        title={job.marked ? "Remove marker" : "Mark this job"}
                        aria-label={job.marked ? "Remove marker" : "Mark this job"}
                        style={{
                          background: job.marked ? 'rgba(245, 158, 11, 0.16)' : 'transparent',
                          border: job.marked ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(148, 163, 184, 0.25)',
                          color: job.marked ? '#d97706' : '#94a3b8',
                          borderRadius: '6px',
                          padding: '5px 7px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Bookmark size={15} fill={job.marked ? "#d97706" : "none"} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="job-list-pagination">
        <div className="pagination-info">
          Showing {totalCount === 0 ? 0 : Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} positions
        </div>
        <div className="pagination-controls">
          <button 
            className="pagination-btn" 
            disabled={page <= 1} 
            onClick={() => onPageChange && onPageChange(page - 1)}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="pagination-current-page">
            Page {totalPages === 0 ? 0 : page} of {totalPages}
          </span>
          <button 
            className="pagination-btn" 
            disabled={page >= totalPages || totalPages === 0} 
            onClick={() => onPageChange && onPageChange(page + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
