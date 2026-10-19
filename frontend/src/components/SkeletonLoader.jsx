import React from 'react';

/**
 * SkeletonLoader — Shimmer loading placeholder
 * Usage:
 *   <SkeletonLoader variant="text" width="200px" />
 *   <SkeletonLoader variant="card" height="200px" />
 *   <SkeletonLoader variant="circle" size="40px" />
 *   <SkeletonLoader variant="table-row" columns={6} />
 */
export function SkeletonLoader({ variant = 'text', width, height, size, columns = 5, rows = 6, className = '' }) {
  const baseClass = `skeleton-shimmer ${className}`;

  switch (variant) {
    case 'circle':
      return (
        <div
          className={`${baseClass} skeleton-circle`}
          style={{ width: size || '40px', height: size || '40px' }}
        />
      );

    case 'card':
      return (
        <div className={`${baseClass} skeleton-card`} style={{ width, height: height || '160px' }}>
          <div className="skeleton-line skeleton-line-title" />
          <div className="skeleton-line skeleton-line-body" />
          <div className="skeleton-line skeleton-line-body short" />
        </div>
      );

    case 'stat-cards':
      return (
        <div className="skeleton-stat-cards-row">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`${baseClass} skeleton-stat-card`}>
              <div className="skeleton-circle" style={{ width: '36px', height: '36px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-line skeleton-line-label" />
                <div className="skeleton-line skeleton-line-value" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'table-row':
      return (
        <div className="skeleton-table">
          <div className="skeleton-table-header">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className={`${baseClass} skeleton-line skeleton-th`} />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="skeleton-table-row">
              {Array.from({ length: columns }).map((_, c) => (
                <div key={c} className={`${baseClass} skeleton-line skeleton-td`} />
              ))}
            </div>
          ))}
        </div>
      );

    case 'profile':
      return (
        <div className="skeleton-profile">
          <div className="skeleton-profile-header">
            <div className={`${baseClass} skeleton-circle`} style={{ width: '64px', height: '64px' }} />
            <div style={{ flex: 1 }}>
              <div className={`${baseClass} skeleton-line skeleton-line-title`} />
              <div className={`${baseClass} skeleton-line skeleton-line-body short`} />
            </div>
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`${baseClass} skeleton-line skeleton-line-section`} />
          ))}
        </div>
      );

    case 'text':
    default:
      return (
        <div
          className={`${baseClass} skeleton-line`}
          style={{ width: width || '100%', height: height || '14px' }}
        />
      );
  }
}

/**
 * PageSkeleton — Full-page loading skeleton per view
 */
export function ExplorePageSkeleton() {
  return (
    <div className="skeleton-page-wrapper">
      {/* Radar area skeleton */}
      <div className="skeleton-shimmer skeleton-radar-placeholder" />
      {/* Two column layout */}
      <div className="skeleton-two-col">
        <div className="skeleton-col-main">
          <SkeletonLoader variant="table-row" columns={7} rows={8} />
        </div>
        <div className="skeleton-col-side">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer skeleton-activity-row" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="skeleton-page-wrapper">
      <SkeletonLoader variant="stat-cards" />
      <SkeletonLoader variant="card" height="300px" />
    </div>
  );
}

export default SkeletonLoader;
