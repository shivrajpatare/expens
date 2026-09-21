import React from 'react';

export const AuditCleanCard: React.FC = () => {
  return (
    <div className="audit-clean-card" role="region" aria-label="Audit clear">
      <div className="audit-clean-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="audit-clean-content">
        <h4 className="audit-clean-title">Audit clear</h4>
        <p className="audit-clean-desc">
          All recorded expenses and calculations are internally consistent for this period.
        </p>
      </div>
    </div>
  );
};
