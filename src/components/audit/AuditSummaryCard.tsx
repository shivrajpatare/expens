import React from 'react';
import type { AuditSummaryData } from '../../domain/audit/types';

interface AuditSummaryCardProps {
  summary: AuditSummaryData;
}

export const AuditSummaryCard: React.FC<AuditSummaryCardProps> = ({ summary }) => {
  return (
    <div className="audit-summary-card" aria-label="Audit summary">
      <div className="audit-summary-grid">
        <div className="audit-summary-item">
          <span className="audit-summary-label">Expenses Reviewed</span>
          <span className="audit-summary-value tabular-nums">
            {summary.totalExpensesReviewed}
          </span>
        </div>

        <div className="audit-summary-item">
          <span className="audit-summary-label">Needs Attention</span>
          <span className={`audit-summary-value tabular-nums ${summary.attentionCount > 0 ? 'attention' : 'safe'}`}>
            {summary.attentionCount}
          </span>
        </div>

        <div className="audit-summary-item">
          <span className="audit-summary-label">Total Findings</span>
          <span className="audit-summary-value tabular-nums">
            {summary.findingCount}
          </span>
        </div>

        <div className="audit-summary-item">
          <span className="audit-summary-label">Reconciliation</span>
          <span className={`audit-summary-value ${summary.isReconciled ? 'safe' : 'attention'}`}>
            {summary.isReconciled ? 'Reconciled' : 'Mismatch'}
          </span>
        </div>
      </div>
    </div>
  );
};
