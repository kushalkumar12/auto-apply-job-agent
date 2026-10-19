import React, { useState, useMemo } from 'react';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import './ActivityPad.css';

/**
 * Computes trailing 12 rolling calendar months dynamically relative to today.
 */
function getDynamicTrailingMonths() {
  const list = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthName = d.toLocaleString('en-US', { month: 'short' });
    const totalDaysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInMonth = (i === 0) ? currentDay : totalDaysInMonth;

    list.push({
      monthIndex: m,
      year: y,
      name: monthName,
      days: daysInMonth
    });
  }
  return list;
}

export default function ActivityPad({ heatmapData = null }) {
  // Filters: searches (DEFAULT), applied, failed, interviews, all
  const [activeFilter, setActiveFilter] = useState('searches');
  const [selectedYear, setSelectedYear] = useState('Current');
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [hoveredTradePoint, setHoveredTradePoint] = useState(null);

  // Dynamic 12 months computed directly from calendar
  const monthConfigs = useMemo(() => getDynamicTrailingMonths(), []);

  // Compute active dataset and stats dynamically from live backend response
  const { activeDataset, totals, activeDaysMap, maxStreaksMap } = useMemo(() => {
    if (heatmapData && heatmapData[activeFilter] !== undefined) {
      return {
        activeDataset: heatmapData[activeFilter] || {},
        totals: heatmapData.totals || { searches: 0, applied: 0, failed: 0, interviews: 0, all: 0 },
        activeDaysMap: heatmapData.activeDays || { searches: 0, applied: 0, failed: 0, interviews: 0, all: 0 },
        maxStreaksMap: heatmapData.maxStreaks || { searches: 0, applied: 0, failed: 0, interviews: 0, all: 0 }
      };
    }

    // Default clean baseline (0s across all metrics)
    return {
      activeDataset: {},
      totals: { searches: 0, applied: 0, failed: 0, interviews: 0, all: 0 },
      activeDaysMap: { searches: 0, applied: 0, failed: 0, interviews: 0, all: 0 },
      maxStreaksMap: { searches: 0, applied: 0, failed: 0, interviews: 0, all: 0 }
    };
  }, [heatmapData, activeFilter]);

  const currentTotal = totals[activeFilter] || 0;
  const currentActiveDays = activeDaysMap[activeFilter] || 0;
  const currentMaxStreak = maxStreaksMap[activeFilter] || 0;

  // Intensity level calculation (0 to 4)
  const getLevel = (count) => {
    if (!count || count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 8) return 3;
    return 4;
  };

  // Build the 12 month columns with weeks (7 days per column)
  const monthGroups = useMemo(() => {
    return monthConfigs.map(cfg => {
      const firstDate = new Date(cfg.year, cfg.monthIndex, 1);
      const startDayOfWeek = firstDate.getDay();

      const weeks = [];
      let currentWeek = [];

      for (let i = 0; i < startDayOfWeek; i++) {
        currentWeek.push({ isBlank: true, id: `pad-${cfg.year}-${cfg.monthIndex}-${i}` });
      }

      for (let day = 1; day <= cfg.days; day++) {
        const dStr = `${cfg.year}-${String(cfg.monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const count = activeDataset[dStr] || 0;

        currentWeek.push({
          isBlank: false,
          id: dStr,
          dateStr: dStr,
          day,
          monthName: cfg.name,
          year: cfg.year,
          count,
          level: getLevel(count)
        });

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }

      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({ isBlank: true, id: `tail-${cfg.year}-${cfg.monthIndex}-${currentWeek.length}` });
        }
        weeks.push(currentWeek);
      }

      return {
        ...cfg,
        weeks
      };
    });
  }, [monthConfigs, activeDataset]);

  // Mini Trade Graph: Compute trailing 14-day velocity dynamically from activeDataset
  const tradeMetrics = useMemo(() => {
    const daysCount = 14;
    const now = new Date();
    const points = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const val = activeDataset[dStr] || 0;
      points.push({ date: dStr, label, count: val });
    }

    const counts = points.map(p => p.count);
    const maxVal = Math.max(1, ...counts);
    const avgVal = Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10;

    // Trend calculation: Compare last 7 days vs previous 7 days
    const recent7 = counts.slice(7).reduce((a, b) => a + b, 0);
    const prev7 = counts.slice(0, 7).reduce((a, b) => a + b, 0);
    const delta = recent7 - prev7;
    const trendPct = prev7 > 0 ? Math.round((delta / prev7) * 100) : (recent7 > 0 ? 100 : 0);
    const isUp = trendPct >= 0;

    // SVG coordinates (width=220, height=54, padding=6)
    const svgW = 220;
    const svgH = 54;
    const pad = 6;
    const usableW = svgW - pad * 2;
    const usableH = svgH - pad * 2;

    const coordinates = points.map((p, idx) => {
      const x = pad + (idx / (points.length - 1)) * usableW;
      const y = pad + (1 - p.count / maxVal) * usableH;
      return { x, y, ...p };
    });

    // Build smooth SVG path
    let linePath = '';
    coordinates.forEach((pt, idx) => {
      if (idx === 0) {
        linePath += `M ${pt.x} ${pt.y}`;
      } else {
        const prev = coordinates[idx - 1];
        const cx1 = prev.x + (pt.x - prev.x) / 2;
        const cy1 = prev.y;
        const cx2 = prev.x + (pt.x - prev.x) / 2;
        const cy2 = pt.y;
        linePath += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
      }
    });

    const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${svgH} L ${coordinates[0].x} ${svgH} Z`;

    return {
      points,
      coordinates,
      maxVal,
      avgVal,
      trendPct,
      isUp,
      linePath,
      areaPath,
      latestPt: coordinates[coordinates.length - 1]
    };
  }, [activeDataset]);

  const filterLabels = {
    searches: 'searches',
    applied: 'applications',
    failed: 'failed / rejected',
    interviews: 'interviews',
    all: 'activities'
  };

  return (
    <div className="activity-pad-container" aria-label="Candidate Activity Pad">
      {/* 1. Header Row */}
      <div className="activity-pad-header">
        <div className="activity-pad-title-group">
          <span className="activity-pad-count">{currentTotal.toLocaleString()}</span>
          <span className="activity-pad-label">
            {filterLabels[activeFilter]} in the past one year
          </span>
          <span 
            className="activity-pad-info-icon" 
            title={`Real-time tracked daily ${filterLabels[activeFilter]} across all job feeds and automation stream`}
          >
            i
          </span>
        </div>

        <div className="activity-pad-stats">
          <span>
            Total active days: <strong className="activity-stat-highlight">{currentActiveDays}</strong>
          </span>
          <span>
            Max streak: <strong className="activity-stat-highlight">{currentMaxStreak}</strong>
          </span>

          <div className="activity-year-dropdown-wrapper">
            <button 
              className="activity-year-btn"
              onClick={() => setYearDropdownOpen(prev => !prev)}
              aria-label="Select Year Range"
            >
              <span>{selectedYear}</span>
              <ChevronDown size={13} />
            </button>

            {yearDropdownOpen && (
              <div className="activity-year-menu">
                {['Current', '2026', '2025'].map(yr => (
                  <button 
                    key={yr}
                    className={`activity-year-item ${selectedYear === yr ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedYear(yr);
                      setYearDropdownOpen(false);
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Filter Pills Row */}
      <div className="activity-filter-row" role="tablist" aria-label="Activity Filter">
        <button
          className={`activity-filter-pill ${activeFilter === 'searches' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('searches')}
          role="tab"
          aria-selected={activeFilter === 'searches'}
        >
          <span>Searches</span>
          <span className="activity-filter-badge">{(totals.searches || 0).toLocaleString()}</span>
        </button>

        <button
          className={`activity-filter-pill ${activeFilter === 'applied' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('applied')}
          role="tab"
          aria-selected={activeFilter === 'applied'}
        >
          <span>Applied</span>
          <span className="activity-filter-badge">{(totals.applied || 0).toLocaleString()}</span>
        </button>

        <button
          className={`activity-filter-pill ${activeFilter === 'failed' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('failed')}
          role="tab"
          aria-selected={activeFilter === 'failed'}
        >
          <span>Failed</span>
          <span className="activity-filter-badge">{(totals.failed || 0).toLocaleString()}</span>
        </button>

        <button
          className={`activity-filter-pill ${activeFilter === 'interviews' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('interviews')}
          role="tab"
          aria-selected={activeFilter === 'interviews'}
        >
          <span>Interviews</span>
          <span className="activity-filter-badge">{(totals.interviews || 0).toLocaleString()}</span>
        </button>

        <button
          className={`activity-filter-pill ${activeFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('all')}
          role="tab"
          aria-selected={activeFilter === 'all'}
        >
          <span>All Activity</span>
          <span className="activity-filter-badge">{(totals.all || 0).toLocaleString()}</span>
        </button>
      </div>

      {/* 3. Main Body Flex: Heatmap (Left) + Mini Trade Graph (Right) */}
      <div className="activity-pad-body-flex">
        {/* Left: 12-Month Heatmap Calendar */}
        <div className="activity-heatmap-col">
          <div className="activity-months-row">
            {monthGroups.map(mg => (
              <div key={`${mg.name}-${mg.year}`} className="activity-month-group">
                <div className="activity-month-weeks">
                  {mg.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="activity-week-col">
                      {week.map(cell => {
                        if (cell.isBlank) {
                          return (
                            <div 
                              key={cell.id} 
                              style={{ width: '11px', height: '11px', visibility: 'hidden' }} 
                            />
                          );
                        }
                        return (
                          <div
                            key={cell.id}
                            className={`activity-day-cell lvl-${cell.level}`}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const containerRect = e.currentTarget.closest('.activity-pad-container').getBoundingClientRect();
                              setHoveredCell({
                                ...cell,
                                x: rect.left - containerRect.left + 5.5,
                                y: rect.top - containerRect.top
                              });
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="activity-month-label">{mg.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Mini Trade Graph Panel */}
        <div className="activity-trade-col" aria-label="14-Day Velocity Trade Graph">
          <div className="trade-graph-header">
            <span className="trade-header-title">14D Trade Velocity</span>
            <div className={`trade-trend-badge ${tradeMetrics.isUp ? 'trend-up' : 'trend-down'}`}>
              {tradeMetrics.isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>{tradeMetrics.isUp ? `+${tradeMetrics.trendPct}%` : `${tradeMetrics.trendPct}%`}</span>
            </div>
          </div>

          <div className="trade-meta-row">
            <span>High: <span className="trade-meta-val">{tradeMetrics.maxVal}</span></span>
            <span>Avg: <span className="trade-meta-val">{tradeMetrics.avgVal}/d</span></span>
          </div>

          {/* Sparkline Curve */}
          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 220 54" className="trade-sparkline-canvas">
              <defs>
                <linearGradient id="tradeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={tradeMetrics.areaPath} fill="url(#tradeAreaGrad)" />
              <path 
                d={tradeMetrics.linePath} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              {tradeMetrics.latestPt && (
                <circle 
                  cx={tradeMetrics.latestPt.x} 
                  cy={tradeMetrics.latestPt.y} 
                  r="3.5" 
                  fill="#10b981" 
                  stroke="#ffffff" 
                  strokeWidth="1.5"
                />
              )}
              {tradeMetrics.coordinates.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="transparent"
                  cursor="pointer"
                  onMouseEnter={() => setHoveredTradePoint(pt)}
                  onMouseLeave={() => setHoveredTradePoint(null)}
                />
              ))}
            </svg>
          </div>

          {/* Mini Volume Histogram Bars */}
          <div className="trade-volume-row" title="14-Day Velocity Volume">
            {tradeMetrics.points.map((pt, idx) => {
              const hPct = Math.max(15, Math.min(100, Math.round((pt.count / tradeMetrics.maxVal) * 100)));
              return (
                <div 
                  key={idx} 
                  className="trade-vol-bar" 
                  style={{ height: `${hPct}%` }}
                  title={`${pt.label}: ${pt.count} ${filterLabels[activeFilter]}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Tooltips */}
      {hoveredCell && (
        <div 
          className="activity-floating-tooltip"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y}px`
          }}
        >
          {hoveredCell.count > 0 ? (
            <span>
              <strong>{hoveredCell.count} {filterLabels[activeFilter]}</strong> on {hoveredCell.monthName} {hoveredCell.day}, {hoveredCell.year}
            </span>
          ) : (
            <span>
              No {filterLabels[activeFilter]} on {hoveredCell.monthName} {hoveredCell.day}, {hoveredCell.year}
            </span>
          )}
        </div>
      )}

      {hoveredTradePoint && (
        <div 
          className="activity-floating-tooltip"
          style={{
            right: '20px',
            top: '40px'
          }}
        >
          <span>
            <strong>{hoveredTradePoint.count} {filterLabels[activeFilter]}</strong> on {hoveredTradePoint.label}
          </span>
        </div>
      )}
    </div>
  );
}
