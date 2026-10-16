import React, { useState } from 'react';
import { 
  Send, 
  User, 
  Percent, 
  BarChart3, 
  Calendar, 
  ChevronDown, 
  ArrowUpRight,
  Clock,
  ExternalLink
} from 'lucide-react';
import { PlatformIcon } from './BrandIcons';
import './AnalyticsView.css';

// 30-day timeline application counts matching the mock bar chart
const TIMELINE_DATA = [
  { day: 'Sep 1', count: 1 },
  { day: 'Sep 2', count: 0 },
  { day: 'Sep 3', count: 2 },
  { day: 'Sep 4', count: 4 },
  { day: 'Sep 5', count: 3 },
  { day: 'Sep 6', count: 2 },
  { day: 'Sep 7', count: 5 },
  { day: 'Sep 8', count: 2 },
  { day: 'Sep 9', count: 3 },
  { day: 'Sep 10', count: 6 },
  { day: 'Sep 11', count: 4 },
  { day: 'Sep 12', count: 2 },
  { day: 'Sep 13', count: 7 },
  { day: 'Sep 14', count: 3 },
  { day: 'Sep 15', count: 4 },
  { day: 'Sep 16', count: 3 },
  { day: 'Sep 17', count: 5 },
  { day: 'Sep 18', count: 6 },
  { day: 'Sep 19', count: 11 },
  { day: 'Sep 20', count: 9 },
  { day: 'Sep 21', count: 8 },
  { day: 'Sep 22', count: 11 },
  { day: 'Sep 23', count: 14 },
  { day: 'Sep 24', count: 12 },
  { day: 'Sep 25', count: 16 },
  { day: 'Sep 26', count: 10 },
  { day: 'Sep 27', count: 15 },
  { day: 'Sep 28', count: 17 },
  { day: 'Sep 29', count: 12 },
  { day: 'Sep 30', count: 18 }
];

export default function AnalyticsView() {
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [hoveredBar, setHoveredBar] = useState(null);

  return (
    <div className="analytics-view-wrapper">
      {/* 1. Header with Time Filter */}
      <div className="analytics-header-section">
        <div>
          <h1 className="analytics-main-title">Application Analytics</h1>
          <p className="analytics-subtitle">
            Track your job search progress and application results.
          </p>
        </div>

        <div className="analytics-time-picker">
          <Calendar size={14} className="cal-icon" />
          <span>{timeRange}</span>
          <ChevronDown size={14} className="chev-icon" />
        </div>
      </div>

      {/* 2. Top Metric Cards (4 Cards) */}
      <div className="analytics-stats-grid">
        {/* Card 1: Applications Sent */}
        <div className="analytics-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-blue">
              <Send size={18} />
            </div>
            <div>
              <div className="stat-card-label">Applications Sent</div>
              <div className="stat-card-num">128</div>
              <div className="stat-card-trend">
                <span className="trend-green">↑ 24%</span>
                <span className="trend-muted">vs previous 30 days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Interviews */}
        <div className="analytics-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-blue">
              <User size={18} />
            </div>
            <div>
              <div className="stat-card-label">Interviews</div>
              <div className="stat-card-num">14</div>
              <div className="stat-card-trend">
                <span className="trend-green">↑ 40%</span>
                <span className="trend-muted">vs previous 30 days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Response Rate */}
        <div className="analytics-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-blue">
              <Percent size={18} />
            </div>
            <div>
              <div className="stat-card-label">Response Rate</div>
              <div className="stat-card-num">18.7%</div>
              <div className="stat-card-trend">
                <span className="trend-green">↑ 5.2%</span>
                <span className="trend-muted">vs previous 30 days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Avg ATS Match */}
        <div className="analytics-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-blue">
              <BarChart3 size={18} />
            </div>
            <div>
              <div className="stat-card-label">Avg ATS Match</div>
              <div className="stat-card-num">86%</div>
              <div className="stat-card-trend">
                <span className="trend-green">↑ 6%</span>
                <span className="trend-muted">vs previous 30 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Applications Over Time Bar Chart */}
      <div className="analytics-card-panel">
        <div className="panel-header-flex">
          <h2 className="panel-title">Applications Over Time</h2>
          <div className="chart-legend">
            <span className="legend-dot blue-dot"></span>
            <span className="legend-text">Applications Sent</span>
          </div>
        </div>

        <div className="barchart-container">
          {/* Y-axis Ticks */}
          <div className="chart-y-axis">
            <span>20</span>
            <span>15</span>
            <span>10</span>
            <span>5</span>
            <span>0</span>
          </div>

          {/* Chart Content Area */}
          <div className="chart-content-area">
            {/* Background horizontal grid lines */}
            <div className="chart-grid-line line-20"></div>
            <div className="chart-grid-line line-15"></div>
            <div className="chart-grid-line line-10"></div>
            <div className="chart-grid-line line-5"></div>
            <div className="chart-grid-line line-0"></div>

            {/* Bars */}
            <div className="chart-bars-row">
              {TIMELINE_DATA.map((item, idx) => {
                const heightPercent = (item.count / 20) * 100;
                const isHovered = hoveredBar === idx;
                return (
                  <div 
                    key={idx} 
                    className="bar-wrapper"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {isHovered && (
                      <div className="bar-tooltip">
                        <span>{item.day}: <strong>{item.count}</strong></span>
                      </div>
                    )}
                    <div 
                      className="bar-fill" 
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="chart-x-axis">
              <span>Sep 1</span>
              <span>Sep 4</span>
              <span>Sep 7</span>
              <span>Sep 10</span>
              <span>Sep 13</span>
              <span>Sep 16</span>
              <span>Sep 19</span>
              <span>Sep 22</span>
              <span>Sep 25</span>
              <span>Sep 28</span>
              <span>Sep 30</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Grid: Application Funnel & Application Status */}
      <div className="analytics-two-col-grid">
        {/* Left: Application Funnel */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">Application Funnel</h2>
          <div className="funnel-container">
            {/* Funnel Graphic */}
            <div className="funnel-graphic">
              <div className="funnel-tier tier-1"></div>
              <div className="funnel-tier tier-2"></div>
              <div className="funnel-tier tier-3"></div>
              <div className="funnel-tier tier-4"></div>
              <div className="funnel-tier tier-5"></div>
            </div>

            {/* Funnel Data Rows */}
            <div className="funnel-data-list">
              <div className="funnel-row">
                <span className="funnel-stage-name">Jobs Found</span>
                <span className="funnel-stage-count">1,240</span>
                <span className="funnel-stage-pct">100%</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-stage-name">Tailored Resumes</span>
                <span className="funnel-stage-count">420</span>
                <span className="funnel-stage-pct">34%</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-stage-name">Applications</span>
                <span className="funnel-stage-count">128</span>
                <span className="funnel-stage-pct">10%</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-stage-name">Interviews</span>
                <span className="funnel-stage-count">14</span>
                <span className="funnel-stage-pct">1.1%</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-stage-name">Offers</span>
                <span className="funnel-stage-count">2</span>
                <span className="funnel-stage-pct">0.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Application Status */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">Application Status</h2>
          <div className="status-bars-list">
            {/* Applied */}
            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-blue"></span>
                <span className="status-name">Applied</span>
              </div>
              <span className="status-val">128</span>
              <div className="progress-track">
                <div className="progress-fill fill-blue" style={{ width: '62%' }}></div>
              </div>
              <span className="status-pct">62%</span>
            </div>

            {/* In Progress */}
            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-cyan"></span>
                <span className="status-name">In Progress</span>
              </div>
              <span className="status-val">32</span>
              <div className="progress-track">
                <div className="progress-fill fill-cyan" style={{ width: '15%' }}></div>
              </div>
              <span className="status-pct">15%</span>
            </div>

            {/* Interview */}
            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-indigo"></span>
                <span className="status-name">Interview</span>
              </div>
              <span className="status-val">14</span>
              <div className="progress-track">
                <div className="progress-fill fill-indigo" style={{ width: '7%' }}></div>
              </div>
              <span className="status-pct">7%</span>
            </div>

            {/* Rejected */}
            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-red"></span>
                <span className="status-name">Rejected</span>
              </div>
              <span className="status-val">28</span>
              <div className="progress-track">
                <div className="progress-fill fill-red" style={{ width: '14%' }}></div>
              </div>
              <span className="status-pct">14%</span>
            </div>

            {/* Offer */}
            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-green"></span>
                <span className="status-name">Offer</span>
              </div>
              <span className="status-val">2</span>
              <div className="progress-track">
                <div className="progress-fill fill-green" style={{ width: '1%' }}></div>
              </div>
              <span className="status-pct">1%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Two-Column Grid: Source Effectiveness & Top Job Roles */}
      <div className="analytics-two-col-grid">
        {/* Left: Source Effectiveness Table */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">Source Effectiveness</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Applications</th>
                <th>Interviews</th>
                <th>Response Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="source-cell-flex">
                    <PlatformIcon type="linkedin" size={16} />
                    <span>LinkedIn</span>
                  </div>
                </td>
                <td>52</td>
                <td>8</td>
                <td><span className="response-green">15.4%</span></td>
              </tr>
              <tr>
                <td>
                  <div className="source-cell-flex">
                    <PlatformIcon type="indeed" size={16} />
                    <span>Indeed</span>
                  </div>
                </td>
                <td>38</td>
                <td>4</td>
                <td><span className="response-green">10.5%</span></td>
              </tr>
              <tr>
                <td>
                  <div className="source-cell-flex">
                    <PlatformIcon type="company" size={16} />
                    <span>Company Sites</span>
                  </div>
                </td>
                <td>24</td>
                <td>2</td>
                <td><span className="response-green">8.3%</span></td>
              </tr>
              <tr>
                <td>
                  <div className="source-cell-flex">
                    <PlatformIcon type="naukri" size={16} />
                    <span>Naukri</span>
                  </div>
                </td>
                <td>14</td>
                <td>0</td>
                <td><span className="response-neutral">0%</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: Top Job Roles Table */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">Top Job Roles</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Applications</th>
                <th>Interviews</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Software Engineer</td>
                <td>48</td>
                <td>6</td>
              </tr>
              <tr>
                <td>Backend Developer</td>
                <td>32</td>
                <td>4</td>
              </tr>
              <tr>
                <td>Java Developer</td>
                <td>28</td>
                <td>3</td>
              </tr>
              <tr>
                <td>DevOps Engineer</td>
                <td>12</td>
                <td>1</td>
              </tr>
              <tr>
                <td>Cloud Engineer</td>
                <td>8</td>
                <td>0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Bottom Row: ATS Score Distribution & Recent Activity */}
      <div className="analytics-two-col-grid">
        {/* Left: ATS Score Distribution */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">ATS Score Distribution</h2>
          <div className="ats-dist-flex">
            {/* Donut Chart */}
            <div className="ats-donut-wrap">
              <svg viewBox="0 0 36 36" className="ats-circular-svg">
                <path className="ats-bg-ring" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="ats-stroke-ring" strokeDasharray="86, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="ats-donut-center">
                <span className="donut-num">86%</span>
                <span className="donut-label">Average ATS Score</span>
              </div>
            </div>

            {/* Score Range Bars */}
            <div className="ats-ranges-list">
              <div className="ats-range-item">
                <span className="range-label">90-100%</span>
                <div className="range-bar-track">
                  <div className="range-bar-fill fill-blue" style={{ width: '42%' }}></div>
                </div>
                <span className="range-pct">42%</span>
              </div>

              <div className="ats-range-item">
                <span className="range-label">70-89%</span>
                <div className="range-bar-track">
                  <div className="range-bar-fill fill-cyan" style={{ width: '38%' }}></div>
                </div>
                <span className="range-pct">38%</span>
              </div>

              <div className="ats-range-item">
                <span className="range-label">50-69%</span>
                <div className="range-bar-track">
                  <div className="range-bar-fill fill-softblue" style={{ width: '15%' }}></div>
                </div>
                <span className="range-pct">15%</span>
              </div>

              <div className="ats-range-item">
                <span className="range-label">Below 50%</span>
                <div className="range-bar-track">
                  <div className="range-bar-fill fill-faint" style={{ width: '5%' }}></div>
                </div>
                <span className="range-pct">5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="analytics-card-panel">
          <div className="panel-header-flex">
            <h2 className="panel-title">Recent Activity</h2>
            <button className="btn-view-all-link" onClick={() => alert('View all activity logs')}>
              View All
            </button>
          </div>

          <div className="activity-timeline-list">
            <div className="timeline-item">
              <span className="item-time">Today, 10:24 AM</span>
              <span className="item-text">Applied to Software Engineer at Google</span>
              <span className="activity-badge badge-green">ATS: 92%</span>
            </div>

            <div className="timeline-item">
              <span className="item-time">Today, 09:12 AM</span>
              <span className="item-text">Interview scheduled with Microsoft</span>
              <span className="activity-badge badge-green">📅 20 Oct</span>
            </div>

            <div className="timeline-item">
              <span className="item-time">Yesterday, 06:45 PM</span>
              <span className="item-text">Received response from Amazon</span>
              <span className="activity-badge badge-green">Shortlisted</span>
            </div>

            <div className="timeline-item">
              <span className="item-time">Yesterday, 04:10 PM</span>
              <span className="item-text">Applied to Backend Developer at Netflix</span>
              <span className="activity-badge badge-green">ATS: 88%</span>
            </div>

            <div className="timeline-item">
              <span className="item-time">19 Oct, 11:20 AM</span>
              <span className="item-text">Rejected by Adobe</span>
              <span className="activity-badge badge-red">Not a fit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
