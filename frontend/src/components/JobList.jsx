import React, { useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, Download, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { CompanyLogo } from './BrandIcons';

export default function JobList({ 
  jobs = [], 
  totalCount = 15500,
  page = 1,
  pageSize = 10,
  totalPages = 1550,
  onPageChange,
  companyFilter,
  onClearCompanyFilter,
  searchQuery = '',
  onSearchChange,
  activeWorkMode = 'All',
  onWorkModeChange,
  onApply, 
  onSelectJob, 
  onExport 
}) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(true);
  const [internalMode, setInternalMode] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 className="job-list-title">Job List ({totalCount.toLocaleString()})</h2>
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
              placeholder="Search 15,000+ jobs, company, role..." 
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

          {/* Sort Button */}
          <button 
            className="table-btn-outline"
            onClick={toggleSort}
            title={`Sort by ATS Score (${sortAsc ? 'Ascending' : 'Descending'})`}
          >
            <ArrowUpDown size={14} />
            <span>Sort</span>
          </button>

          {/* Export Button in Blue */}
          <button 
            className="table-btn-primary"
            onClick={onExport}
            title="Export jobs to CSV / Excel"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-responsive-wrapper">
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
              <th className="col-link">Link</th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((job) => (
              <tr 
                key={job.id} 
                className={`table-body-row ${job.applied ? 'row-applied' : ''}`}
                onClick={() => onSelectJob(job)}
              >
                <td className="cell-sno">{job.id}</td>
                <td className="cell-role">
                  <span className="role-heading">{job.role}</span>
                </td>
                <td className="cell-company">
                  <div className="company-logo-group">
                    <CompanyLogo name={job.company} />
                    <span className="company-title">{job.company}</span>
                  </div>
                </td>
                <td className="cell-source">{job.source}</td>
                <td className="cell-mode">
                  <span className="work-mode-plain-text">{job.workMode}</span>
                </td>
                <td className="cell-score">
                  <span className="ats-pill-badge">
                    {job.atsScore}%
                  </span>
                </td>
                <td className="cell-datetime">{job.dateTime}</td>
                <td className="cell-link" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className={`btn-apply-blue ${job.applied ? 'btn-apply-done' : ''}`}
                    onClick={() => onApply(job.id, job.company, job.role)}
                  >
                    {job.applied ? (
                      <>
                        <Check size={13} strokeWidth={2.8} />
                        <span>Applied</span>
                      </>
                    ) : (
                      <span>Apply</span>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            Page {page} of {totalPages}
          </span>
          <button 
            className="pagination-btn" 
            disabled={page >= totalPages} 
            onClick={() => onPageChange && onPageChange(page + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
