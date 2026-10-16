import React, { useState } from 'react';
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
import './GenerationView.css';

const MOCK_GENERATION_JOBS = [
  {
    id: 1,
    role: "Software Engineer",
    company: "Google",
    source: "LinkedIn",
    workMode: "Hybrid",
    atsScore: 78,
    date: "30-Sep-26",
    status: "completed",
    selected: false,
    candidate: {
      name: "KUSHAL KUMAR PULAKANTI",
      title: "Software Engineer | Java | Spring Boot | Cloud",
      location: "Hyderabad, India",
      email: "kushal@example.com",
      phone: "+91 98765 43210",
      linkedin: "linkedin.com/in/kushal",
      summary: "Software Engineer with 3+ years of experience in Java, Spring Boot, microservices, and cloud technologies. Experienced in building scalable backend systems, REST APIs, and working with AWS, Docker, Kubernetes. Strong problem-solving skills with hands-on experience in healthcare and life sciences domain.",
      skills: [
        { category: "Languages", items: "Java 8/11/17, SQL" },
        { category: "Frameworks", items: "Spring Boot, Spring Security, Spring Data JPA" },
        { category: "Cloud & DevOps", items: "AWS, Docker, Kubernetes, Jenkins, Terraform" },
        { category: "Tools", items: "Git, Maven, Postman, JMeter, Grafana" },
        { category: "Databases", items: "PostgreSQL, Oracle, SQL Server" },
        { category: "Others", items: "Kafka, Redis, OAuth2, JWT, Microservices, REST APIs" }
      ],
      experience: {
        company: "CGLIA Solutions LLP",
        role: "Java Developer",
        period: "Dec 2022 - Feb 2026 (3.2 years)",
        location: "Hyderabad, India",
        bullets: [
          "Developed and maintained backend services using Java, Spring Boot and microservices.",
          "Owned two business-critical modules for LARS-eProtocol and LAHS SaaS.",
          "Implemented OAuth2/JWT based authorization and role-based access control."
        ]
      }
    }
  },
  {
    id: 2,
    role: "Frontend Developer",
    company: "Microsoft",
    source: "Indeed",
    workMode: "Remote",
    atsScore: 85,
    date: "29-Sep-26",
    status: "processing",
    selected: false,
    candidate: {
      name: "KUSHAL KUMAR PULAKANTI",
      title: "Frontend Developer | React | TypeScript",
      location: "Hyderabad, India",
      email: "kushal@example.com",
      phone: "+91 98765 43210",
      linkedin: "linkedin.com/in/kushal",
      summary: "Frontend Developer with 3+ years of experience in React, JavaScript, TypeScript, and modern frontend tools. Experienced in building high-performance web applications and responsive design systems.",
      skills: [
        { category: "Languages", items: "JavaScript (ES6+), TypeScript, HTML5, CSS3" },
        { category: "Frameworks", items: "React, Next.js, Redux, Tailwind CSS" },
        { category: "Tools", items: "Git, Vite, Webpack, Postman, Figma" },
        { category: "Databases", items: "PostgreSQL, MongoDB" }
      ],
      experience: {
        company: "CGLIA Solutions LLP",
        role: "Frontend Engineer",
        period: "Dec 2022 - Feb 2026 (3.2 years)",
        location: "Hyderabad, India",
        bullets: [
          "Architected component systems and responsive dashboards.",
          "Optimized Core Web Vitals resulting in 40% performance gain.",
          "Integrated REST APIs with state management pipelines."
        ]
      }
    }
  },
  {
    id: 3,
    role: "Backend Developer",
    company: "Amazon",
    source: "Naukri",
    workMode: "On-site",
    atsScore: 72,
    date: "28-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 4,
    role: "Data Analyst",
    company: "Meta",
    source: "LinkedIn",
    workMode: "Hybrid",
    atsScore: 80,
    date: "27-Sep-26",
    status: "error",
    selected: false
  },
  {
    id: 5,
    role: "DevOps Engineer",
    company: "Netflix",
    source: "Referral",
    workMode: "Remote",
    atsScore: 88,
    date: "26-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 6,
    role: "Full Stack Developer",
    company: "Adobe",
    source: "Indeed",
    workMode: "Hybrid",
    atsScore: 75,
    date: "25-Sep-26",
    status: "pending",
    selected: false
  },
  {
    id: 7,
    role: "ML Engineer",
    company: "OpenAI",
    source: "Company Site",
    workMode: "Remote",
    atsScore: 91,
    date: "24-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 8,
    role: "Cloud Engineer",
    company: "IBM",
    source: "Naukri",
    workMode: "On-site",
    atsScore: 69,
    date: "23-Sep-26",
    status: "processing",
    selected: false
  },
  {
    id: 9,
    role: "QA Engineer",
    company: "Infosys",
    source: "LinkedIn",
    workMode: "Hybrid",
    atsScore: 74,
    date: "22-Sep-26",
    status: "error",
    selected: false
  },
  {
    id: 10,
    role: "Java Developer",
    company: "Oracle",
    source: "Referral",
    workMode: "Remote",
    atsScore: 82,
    date: "21-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 11,
    role: "Microservices Architect",
    company: "Uber",
    source: "LinkedIn",
    workMode: "Hybrid",
    atsScore: 92,
    date: "20-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 12,
    role: "Platform Engineer",
    company: "Stripe",
    source: "Company Site",
    workMode: "Remote",
    atsScore: 88,
    date: "19-Sep-26",
    status: "processing",
    selected: false
  },
  {
    id: 13,
    role: "Cloud Systems Architect",
    company: "Airbnb",
    source: "Indeed",
    workMode: "Hybrid",
    atsScore: 85,
    date: "18-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 14,
    role: "iOS Platform Engineer",
    company: "Apple",
    source: "Referral",
    workMode: "On-site",
    atsScore: 90,
    date: "17-Sep-26",
    status: "pending",
    selected: false
  },
  {
    id: 15,
    role: "Site Reliability Engineer",
    company: "Spotify",
    source: "Naukri",
    workMode: "Remote",
    atsScore: 87,
    date: "16-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 16,
    role: "Deep Learning Systems Engineer",
    company: "Nvidia",
    source: "Company Site",
    workMode: "On-site",
    atsScore: 94,
    date: "15-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 17,
    role: "Enterprise Software Engineer",
    company: "Salesforce",
    source: "LinkedIn",
    workMode: "Hybrid",
    atsScore: 86,
    date: "14-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 18,
    role: "Infrastructure Developer",
    company: "LinkedIn",
    source: "Indeed",
    workMode: "Remote",
    atsScore: 89,
    date: "13-Sep-26",
    status: "processing",
    selected: false
  },
  {
    id: 19,
    role: "Distributed Systems Architect",
    company: "Twitter / X",
    source: "Referral",
    workMode: "Hybrid",
    atsScore: 91,
    date: "12-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 20,
    role: "Network Cloud Engineer",
    company: "Cisco",
    source: "Naukri",
    workMode: "Remote",
    atsScore: 83,
    date: "11-Sep-26",
    status: "pending",
    selected: false
  },
  {
    id: 21,
    role: "Kernel Systems Developer",
    company: "Intel",
    source: "Company Site",
    workMode: "On-site",
    atsScore: 88,
    date: "10-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 22,
    role: "Compute Platform Engineer",
    company: "AMD",
    source: "LinkedIn",
    workMode: "Hybrid",
    atsScore: 85,
    date: "09-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 23,
    role: "Payments Backend Architect",
    company: "PayPal",
    source: "Indeed",
    workMode: "Remote",
    atsScore: 89,
    date: "08-Sep-26",
    status: "processing",
    selected: false
  },
  {
    id: 24,
    role: "DevOps & Cloud Engineer",
    company: "Atlassian",
    source: "Referral",
    workMode: "Hybrid",
    atsScore: 93,
    date: "07-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 25,
    role: "Media Pipeline Developer",
    company: "Zoom",
    source: "Naukri",
    workMode: "Remote",
    atsScore: 84,
    date: "06-Sep-26",
    status: "error",
    selected: false
  },
  {
    id: 26,
    role: "Commerce Platform Engineer",
    company: "Shopify",
    source: "Company Site",
    workMode: "Remote",
    atsScore: 90,
    date: "05-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 27,
    role: "Distributed Cache Architect",
    company: "Flipkart",
    source: "LinkedIn",
    workMode: "On-site",
    atsScore: 87,
    date: "04-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 28,
    role: "High-Throughput API Developer",
    company: "Swiggy",
    source: "Indeed",
    workMode: "Hybrid",
    atsScore: 86,
    date: "03-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 29,
    role: "Logistics Systems Engineer",
    company: "Zomato",
    source: "Referral",
    workMode: "Remote",
    atsScore: 85,
    date: "02-Sep-26",
    status: "completed",
    selected: false
  },
  {
    id: 30,
    role: "Fintech Core Services Engineer",
    company: "Razorpay",
    source: "Naukri",
    workMode: "On-site",
    atsScore: 91,
    date: "01-Sep-26",
    status: "completed",
    selected: false
  }
];

export default function GenerationView() {
  const [jobs, setJobs] = useState(MOCK_GENERATION_JOBS);
  const [selectedJobId, setSelectedJobId] = useState(1);
  const [previewTab, setPreviewTab] = useState('resume'); // 'resume' | 'cover-letter'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [workModeFilter, setWorkModeFilter] = useState('All Work Modes');
  const [currentPage, setCurrentPage] = useState(1);

  // Selected count: when none selected on this page, show default 12 from mock, otherwise count
  const checkedCount = jobs.filter(j => j.selected).length;
  const selectedCount = checkedCount > 0 ? checkedCount : 12;
  const allSelected = jobs.length > 0 && jobs.every(j => j.selected);


  const toggleSelectAll = () => {
    const nextState = !allSelected;
    setJobs(prev => prev.map(j => ({ ...j, selected: nextState })));
  };

  const toggleSelectRow = (id) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, selected: !j.selected } : j));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All Status');
    setSourceFilter('All Sources');
    setWorkModeFilter('All Work Modes');
  };

  // Filtered jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'All Status' || 
      job.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesSource = 
      sourceFilter === 'All Sources' || 
      job.source.toLowerCase() === sourceFilter.toLowerCase();

    const matchesMode = 
      workModeFilter === 'All Work Modes' || 
      job.workMode.toLowerCase() === workModeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSource && matchesMode;
  });

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(filteredJobs.length / PAGE_SIZE) || 1;
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedJobs = filteredJobs.slice(startIdx, startIdx + PAGE_SIZE);
  const startItem = filteredJobs.length === 0 ? 0 : startIdx + 1;
  const endItem = Math.min(startIdx + PAGE_SIZE, filteredJobs.length);

  const activeJob = jobs.find(j => j.id === selectedJobId) || jobs[0];
  const candidate = activeJob?.candidate || MOCK_GENERATION_JOBS[0].candidate;

  const handleDownloadResume = () => {
    const textContent = `${candidate.name}\n${candidate.title}\n${candidate.location} | ${candidate.email} | ${candidate.phone}\n\nSUMMARY\n${candidate.summary}\n\nEXPERIENCE\n${candidate.experience.company} - ${candidate.experience.role} (${candidate.experience.period})\n${candidate.experience.bullets.join('\n')}`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidate.name.replace(/\s+/g, '_')}_Resume.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCoverLetter = () => {
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
          <button 
            className="btn-generate-primary"
            onClick={() => alert(`Starting generation for ${selectedCount} selected jobs...`)}
          >
            <FileText size={16} />
            <span>Generate for Selected ({selectedCount})</span>
          </button>

          <button 
            className="btn-import-outline"
            onClick={() => alert('Import Jobs from CSV / LinkedIn file dialog')}
          >
            <Upload size={16} />
            <span>Import Jobs</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Metric Cards (Processing, Error, Completed, Pending) */}
      <div className="gen-stats-grid">
        {/* Processing Card */}
        <div className="gen-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-blue">
              <FileText size={20} />
            </div>
            <div>
              <div className="stat-card-num">12</div>
              <div className="stat-card-label">Processing</div>
            </div>
          </div>
          <div className="stat-ring-container">
            <svg viewBox="0 0 36 36" className="stat-circular-chart">
              <path className="stat-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="stat-circle-stroke stroke-blue" strokeDasharray="35, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
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
              <div className="stat-card-num">4</div>
              <div className="stat-card-label">Error</div>
            </div>
          </div>
          <div className="stat-ring-container">
            <svg viewBox="0 0 36 36" className="stat-circular-chart">
              <path className="stat-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="stat-circle-stroke stroke-red" strokeDasharray="15, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
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
              <div className="stat-card-num">12</div>
              <div className="stat-card-label">Completed</div>
            </div>
          </div>
          <div className="stat-ring-container">
            <svg viewBox="0 0 36 36" className="stat-circular-chart">
              <path className="stat-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="stat-circle-stroke stroke-green" strokeDasharray="45, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
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
              <div className="stat-card-num">28</div>
              <div className="stat-card-label">Pending</div>
            </div>
          </div>
          <div className="stat-ring-container">
            <svg viewBox="0 0 36 36" className="stat-circular-chart">
              <path className="stat-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="stat-circle-stroke stroke-gray" strokeDasharray="25, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
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
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="error">Error</option>
                <option value="pending">Pending</option>
              </select>

              <select 
                value={sourceFilter} 
                onChange={(e) => setSourceFilter(e.target.value)}
                className="gen-select-pill"
              >
                <option>All Sources</option>
                <option value="linkedin">LinkedIn</option>
                <option value="indeed">Indeed</option>
                <option value="naukri">Naukri</option>
                <option value="referral">Referral</option>
                <option value="company site">Company Site</option>
              </select>

              <select 
                value={workModeFilter} 
                onChange={(e) => setWorkModeFilter(e.target.value)}
                className="gen-select-pill"
              >
                <option>All Work Modes</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
                <option value="on-site">On-site</option>
              </select>

              <div className="date-range-pill" title="Filter by date range">
                <Calendar size={14} className="filter-icon-muted" />
                <span>Date Range</span>
                <ChevronDown size={14} className="filter-icon-muted" />
              </div>
            </div>
          </div>

          {/* Jobs Generation Table */}
          <div className="gen-table-scroll">
            <table className="gen-jobs-table">
              <thead>
                <tr>
                  <th className="th-checkbox">
                    <input 
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="custom-checkbox"
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
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedJobs.map((job) => {
                  const isRowActive = job.id === selectedJobId;
                  return (
                    <tr 
                      key={job.id} 
                      className={`gen-table-row ${isRowActive ? 'row-active' : ''}`}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <td className="td-checkbox" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={job.selected}
                          onChange={() => toggleSelectRow(job.id)}
                          className="custom-checkbox"
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
                })}
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
              {previewTab === 'resume' ? (
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
                  <div className="doc-section">
                    <h3 className="doc-section-title">TECHNICAL SKILLS</h3>
                    <ul className="doc-skills-list">
                      {candidate.skills?.map((sk, idx) => (
                        <li key={idx}>
                          <strong>{sk.category}:</strong> {sk.items}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Experience Section */}
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
                      <ul className="doc-bullets-list">
                        {candidate.experience.bullets?.map((bullet, idx) => (
                          <li key={idx}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
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
                    <p>
                      In my previous role at {candidate.experience.company}, I spearheaded the delivery of resilient backend architectures, cutting API latency by 35% and automating CI/CD release cycles. My technical foundation across Java, Spring Boot, AWS, and modern frontends aligns directly with your team’s posted requirements.
                    </p>
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
              <button className="btn-doc-download" onClick={handleDownloadResume}>
                <Download size={14} />
                <span>Download Resume</span>
              </button>

              <button className="btn-doc-outline" onClick={handleDownloadCoverLetter}>
                <FileText size={14} />
                <span>Download Cover Letter</span>
              </button>

              <button 
                className="btn-doc-outline" 
                onClick={() => alert(`Regenerating tailored content for ${activeJob.role} at ${activeJob.company}...`)}
              >
                <RefreshCw size={14} />
                <span>Regenerate</span>
              </button>

              <button className="btn-doc-more" title="More Document Actions">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
