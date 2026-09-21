import React from 'react';

export const InsightsEmptyState: React.FC = () => {
  return (
    <div className="insights-empty-card" role="region" aria-label="No spending recorded">
      <div className="insights-empty-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <span className="insights-empty-title">Nothing recorded yet</span>
      <span className="insights-empty-desc">
        There is no spending to understand for this period. Record expenses in Today or History to see your spending patterns.
      </span>
    </div>
  );
};
