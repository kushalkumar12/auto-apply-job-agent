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
  RefreshCw,
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
                borderColor: (selectedHistoryDay && selectedHistoryDay.dayOffset > 0) ? '#f59e0b' : 'var(--border-color, #334155)',
                color: (selectedHistoryDay && selectedHistoryDay.dayOffset > 0) ? '#f59e0b' : 'var(--text-primary, #f8fafc)'
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
                  background: 'var(--bg-card, #1e293b)',
                  border: '1px solid var(--border-color, #334155)',
                  borderRadius: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
                  padding: '6px',
                  zIndex: 200
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', padding: '4px 8px 6px 8px' }}>
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
                        color: selectedHistoryDay?.dayOffset === opt.dayOffset ? 'var(--accent-color, #3b82f6)' : 'var(--text-primary, #f8fafc)',
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
          {onToggleProfileDriven && (
            <button
              type="button"
              className="profile-tailor-toggle-pill"
              onClick={onToggleProfileDriven}
              title={profileDriven ? "Jobs are tailored to your Profile data. Click to show all jobs unfiltered." : "Showing all jobs. Click to filter by your Profile data."}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: profileDriven ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #cbd5e1',
                background: profileDriven ? 'rgba(16, 185, 129, 0.12)' : 'rgba(241, 245, 249, 0.6)',
                color: profileDriven ? '#10b981' : '#64748b'
              }}
            >
              <span>{profileDriven ? '🎯 Tailored to Profile: ON' : '🌐 All Jobs: Unfiltered'}</span>
              {profileDriven && activeProfileRoles && activeProfileRoles.length > 0 && (
                <span style={{ opacity: 0.85, fontWeight: 500, fontSize: '10px' }}>
                  ({activeProfileRoles.slice(0, 2).join(', ')})
                </span>
              )}
            </button>
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

          {/* Live ATS Sync Button */}
          <button 
            type="button"
            className={`btn-harvest-sync-compact ${isHarvesting ? 'syncing' : ''}`}
            onClick={() => onHarvestSync && onHarvestSync()}
            disabled={isHarvesting}
            title="Crawl live direct ATS feeds (Greenhouse, Ashby, Lever, RemoteOK)"
          >
            <RefreshCw size={13} className={isHarvesting ? 'spin-icon' : ''} />
            <span>{isHarvesting ? 'Harvesting...' : 'Harvest ATS'}</span>
            <span className="live-ping-dot" />
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
              <strong>Historical Archive:</strong> Viewing results from <strong>{selectedHistoryDay.formattedDate}</strong> ({selectedHistoryDay.label}). Radar orbit remains in the present.
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
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No opportunities found</span>
                      <span style={{ fontSize: '12px', opacity: 0.7 }}>Try adjusting your search criteria, sync your profile, or clear active filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedJobs.map((job) => (
                  <tr 
                    key={job.id} 
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
                        {job.primarySkillMatched && (
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
