import React, { useState, useEffect } from 'react';
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
import { apiService } from '../services/api';
import ActivityPad from './ActivityPad';
import './AnalyticsView.css';

export default function AnalyticsView() {
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [hoveredBar, setHoveredBar] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [aData, actData] = await Promise.all([
          apiService.getAnalytics(),
          apiService.getActivities()
        ]);
        if (mounted) {
          if (aData) setAnalytics(aData);
          if (actData) {
            const list = Array.isArray(actData) ? actData : (actData.activities || []);
            setRecentActivities(list);
          }
        }
      } catch (err) {
        console.warn('[AnalyticsView] Error fetching live metrics:', err);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const totalApps = analytics?.totalApplications || 0;
  const interviewsCount = analytics?.interviews || 0;
  const respRate = analytics?.responseRate || '0%';
  const avgAts = analytics?.averageAtsScore || '0%';
  const timelineBars = analytics?.timelineData || [];

  const funnel = analytics?.funnel || {
    jobsFound: analytics?.totalJobsInDb || 0,
    tailoredResumes: 0,
    applications: totalApps,
    interviews: interviewsCount,
    offers: analytics?.offers || 0
  };

  const statusDist = analytics?.statusDistribution || {
    applied: totalApps,
    inProgress: 0,
    interview: interviewsCount,
    rejected: 0,
    offer: analytics?.offers || 0
  };

  const platformMetrics = analytics?.platformMetrics || [];
  const topRoles = analytics?.topRoles || [];
  const atsBrackets = analytics?.atsBrackets || {
    bracket90: 0,
    bracket80: 0,
    bracket70: 0,
    bracketBelow70: 0
  };

  const totalAtsCategorized = (atsBrackets.bracket90 + atsBrackets.bracket80 + atsBrackets.bracket70 + atsBrackets.bracketBelow70) || 1;
  const pct90 = Math.round((atsBrackets.bracket90 / totalAtsCategorized) * 100);
  const pct80 = Math.round((atsBrackets.bracket80 / totalAtsCategorized) * 100);
  const pct70 = Math.round((atsBrackets.bracket70 / totalAtsCategorized) * 100);
  const pctBelow = Math.round((atsBrackets.bracketBelow70 / totalAtsCategorized) * 100);

  const baseCount = funnel.jobsFound || 1;
  const funnelFoundPct = '100%';
  const funnelTailoredPct = `${Math.round((funnel.tailoredResumes / baseCount) * 100)}%`;
  const funnelAppsPct = `${Math.round((funnel.applications / baseCount) * 100)}%`;
  const funnelIntPct = `${Math.round((funnel.interviews / baseCount) * 100)}%`;
  const funnelOfferPct = `${Math.round((funnel.offers / baseCount) * 100)}%`;

  const totalStatusApps = (statusDist.applied + statusDist.inProgress + statusDist.interview + statusDist.rejected + statusDist.offer) || 1;
  const appliedPct = `${Math.round((statusDist.applied / totalStatusApps) * 100)}%`;
  const inProgressPct = `${Math.round((statusDist.inProgress / totalStatusApps) * 100)}%`;
  const interviewPct = `${Math.round((statusDist.interview / totalStatusApps) * 100)}%`;
  const rejectedPct = `${Math.round((statusDist.rejected / totalStatusApps) * 100)}%`;
  const offerPct = `${Math.round((statusDist.offer / totalStatusApps) * 100)}%`;

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

      {/* 2. Top Summary KPI Cards (4 columns) */}
      <div className="analytics-stats-grid">
        {/* Card 1: Total Applications */}
        <div className="analytics-stat-card">
          <div className="stat-card-left">
            <div className="stat-icon-wrapper stat-icon-blue">
              <Send size={18} />
            </div>
            <div>
              <div className="stat-card-label">Total Applications</div>
              <div className="stat-card-num">{totalApps}</div>
              <div className="stat-card-trend">
                <span className="trend-muted">{totalApps > 0 ? 'Live database applications' : 'No applications logged'}</span>
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
              <div className="stat-card-num">{interviewsCount}</div>
              <div className="stat-card-trend">
                <span className="trend-muted">{interviewsCount > 0 ? 'Active pipeline' : '0 scheduled'}</span>
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
              <div className="stat-card-num">{respRate}</div>
              <div className="stat-card-trend">
                <span className="trend-muted">From submitted roles</span>
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
              <div className="stat-card-num">{avgAts}</div>
              <div className="stat-card-trend">
                <span className="trend-muted">Profile alignment</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Applications Over Time: LeetCode Daily Tracking Pad on top, with Timeline below */}
      <div className="analytics-card-panel">
        <div className="panel-header-flex" style={{ marginBottom: 18 }}>
          <h2 className="panel-title">Applications Over Time</h2>
        </div>

        {/* 1. Candidate Activity Pad with Mini Trade Graph (100% dynamic API metrics) */}
        <ActivityPad 
          heatmapData={analytics?.heatmap}
        />

        {/* 2. Detailed Velocity Bar Chart */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-color, #e5e7eb)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Recent Velocity & Application Pipeline
            </h3>
            <div className="chart-legend">
              <span className="legend-dot blue-dot"></span>
              <span className="legend-text">Applications Sent</span>
            </div>
          </div>

          {timelineBars.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
              <BarChart3 size={28} style={{ opacity: 0.35, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>No active 7-day velocity logged</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                Direct applications submitted from Explore will plot daily velocity points here.
              </p>
            </div>
          ) : (
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
              <div className="chart-grid-line line-20"></div>
              <div className="chart-grid-line line-15"></div>
              <div className="chart-grid-line line-10"></div>
              <div className="chart-grid-line line-5"></div>
              <div className="chart-grid-line line-0"></div>

              <div className="chart-bars-row">
                {timelineBars.map((item, idx) => {
                  const heightPercent = Math.min(100, Math.max(5, (item.count / 20) * 100));
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
                          <span>{item.day}: <strong>{item.count}</strong> apps</span>
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
            </div>
          </div>
        )}
      </div>
    </div>

      {/* 4. Two-Column Grid: Application Funnel & Application Status */}
      <div className="analytics-two-col-grid">
        {/* Left: Application Funnel */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">Application Funnel</h2>
          <div className="funnel-container">
            <div className="funnel-graphic">
              <div className="funnel-tier tier-1"></div>
              <div className="funnel-tier tier-2"></div>
              <div className="funnel-tier tier-3"></div>
              <div className="funnel-tier tier-4"></div>
              <div className="funnel-tier tier-5"></div>
            </div>

            <div className="funnel-data-list">
              <div className="funnel-row">
                <span className="funnel-stage-name">Jobs Found</span>
                <span className="funnel-stage-count">{funnel.jobsFound.toLocaleString()}</span>
                <span className="funnel-stage-pct">{funnelFoundPct}</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-stage-name">Tailored Resumes</span>
                <span className="funnel-stage-count">{funnel.tailoredResumes.toLocaleString()}</span>
                <span className="funnel-stage-pct">{funnelTailoredPct}</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-stage-name">Applications</span>
                <span className="funnel-stage-count">{funnel.applications.toLocaleString()}</span>
                <span className="funnel-stage-pct">{funnelAppsPct}</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-stage-name">Interviews</span>
                <span className="funnel-stage-count">{funnel.interviews.toLocaleString()}</span>
                <span className="funnel-stage-pct">{funnelIntPct}</span>
              </div>
              <div className="funnel-row">
                <span className="funnel-stage-name">Offers</span>
                <span className="funnel-stage-count">{funnel.offers.toLocaleString()}</span>
                <span className="funnel-stage-pct">{funnelOfferPct}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Application Status */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">Application Status</h2>
          <div className="status-bars-list">
            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-blue"></span>
                <span className="status-name">Applied</span>
              </div>
              <span className="status-val">{statusDist.applied}</span>
              <div className="progress-track">
                <div className="progress-fill fill-blue" style={{ width: appliedPct }}></div>
              </div>
              <span className="status-pct">{appliedPct}</span>
            </div>

            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-cyan"></span>
                <span className="status-name">In Progress</span>
              </div>
              <span className="status-val">{statusDist.inProgress}</span>
              <div className="progress-track">
                <div className="progress-fill fill-cyan" style={{ width: inProgressPct }}></div>
              </div>
              <span className="status-pct">{inProgressPct}</span>
            </div>

            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-indigo"></span>
                <span className="status-name">Interview</span>
              </div>
              <span className="status-val">{statusDist.interview}</span>
              <div className="progress-track">
                <div className="progress-fill fill-indigo" style={{ width: interviewPct }}></div>
              </div>
              <span className="status-pct">{interviewPct}</span>
            </div>

            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-red"></span>
                <span className="status-name">Rejected</span>
              </div>
              <span className="status-val">{statusDist.rejected}</span>
              <div className="progress-track">
                <div className="progress-fill fill-red" style={{ width: rejectedPct }}></div>
              </div>
              <span className="status-pct">{rejectedPct}</span>
            </div>

            <div className="status-progress-row">
              <div className="status-label-group">
                <span className="status-bullet-dot dot-green"></span>
                <span className="status-name">Offer</span>
              </div>
              <span className="status-val">{statusDist.offer}</span>
              <div className="progress-track">
                <div className="progress-fill fill-green" style={{ width: offerPct }}></div>
              </div>
              <span className="status-pct">{offerPct}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Two-Column Grid: Source Effectiveness & Top Job Roles */}
      <div className="analytics-two-col-grid">
        {/* Left: Source Effectiveness Table */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">Source Effectiveness</h2>
          {platformMetrics.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>No source data recorded</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                Applied positions will aggregate portal conversion and response rates here.
              </p>
            </div>
          ) : (
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
                {platformMetrics.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="source-cell-flex">
                        <PlatformIcon type={(p.name || '').toLowerCase()} size={16} />
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td>{p.applications}</td>
                    <td>{p.interviews}</td>
                    <td><span className="response-green">{p.successRate}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Top Job Roles Table */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">Top Job Roles</h2>
          {topRoles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>No role data recorded</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                Applied positions will aggregate top roles and conversion rates here.
              </p>
            </div>
          ) : (
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Applications</th>
                  <th>Interviews</th>
                </tr>
              </thead>
              <tbody>
                {topRoles.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.role}</td>
                    <td>{r.applications}</td>
                    <td>{r.interviews}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 6. Bottom Row: ATS Score Distribution & Recent Activity */}
      <div className="analytics-two-col-grid">
        {/* Left: ATS Score Distribution */}
        <div className="analytics-card-panel">
          <h2 className="panel-title">ATS Score Distribution</h2>
          <div className="ats-dist-flex">
            <div className="ats-donut-wrap">
              <svg viewBox="0 0 36 36" className="ats-circular-svg">
                <path className="ats-bg-ring" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="ats-stroke-ring" strokeDasharray={`${parseInt(avgAts) || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="ats-donut-center">
                <span className="donut-num">{avgAts}</span>
                <span className="donut-label">Average ATS Score</span>
              </div>
            </div>

            <div className="ats-ranges-list">
              <div className="ats-range-item">
                <span className="range-label">90-100%</span>
                <div className="range-bar-track">
                  <div className="range-bar-fill fill-blue" style={{ width: `${pct90}%` }}></div>
                </div>
                <span className="range-pct">{atsBrackets.bracket90} ({pct90}%)</span>
              </div>

              <div className="ats-range-item">
                <span className="range-label">80-89%</span>
                <div className="range-bar-track">
                  <div className="range-bar-fill fill-cyan" style={{ width: `${pct80}%` }}></div>
                </div>
                <span className="range-pct">{atsBrackets.bracket80} ({pct80}%)</span>
              </div>

              <div className="ats-range-item">
                <span className="range-label">70-79%</span>
                <div className="range-bar-track">
                  <div className="range-bar-fill fill-softblue" style={{ width: `${pct70}%` }}></div>
                </div>
                <span className="range-pct">{atsBrackets.bracket70} ({pct70}%)</span>
              </div>

              <div className="ats-range-item">
                <span className="range-label">Below 70%</span>
                <div className="range-bar-track">
                  <div className="range-bar-fill fill-faint" style={{ width: `${pctBelow}%` }}></div>
                </div>
                <span className="range-pct">{atsBrackets.bracketBelow70} ({pctBelow}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="analytics-card-panel">
          <div className="panel-header-flex">
            <h2 className="panel-title">Recent Activity</h2>
            <button className="btn-view-all-link" onClick={() => { window.location.hash = '#explore'; }}>
              View in Feed →
            </button>
          </div>

          <div className="activity-timeline-list">
            {recentActivities && recentActivities.length > 0 ? (
              recentActivities.slice(0, 6).map((item, idx) => (
                <div key={item.id || idx} className="timeline-item">
                  <span className="item-time">{item.time || 'Recent'}</span>
                  <span className="item-text">{item.text}</span>
                  <span className="activity-badge badge-green">{item.countBadge || 'Recorded'}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
                <Clock size={24} style={{ opacity: 0.35, marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>No recent activity</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                  Job applications and sync events will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
