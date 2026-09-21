import React from 'react';
import type { AuditFinding } from '../../domain/audit/types';
import { AuditFindingCard } from './AuditFindingCard';

interface AuditFindingsListProps {
  findings: AuditFinding[];
}

export const AuditFindingsList: React.FC<AuditFindingsListProps> = ({ findings }) => {
  return (
    <section className="audit-findings-section" aria-labelledby="audit-findings-title">
      <div className="audit-findings-header">
        <div className="audit-findings-title-group">
          <h4 id="audit-findings-title" className="audit-findings-title">
            Audit Findings
          </h4>
          <span className="audit-findings-count">
            ({findings.length})
          </span>
        </div>
      </div>

      <div className="audit-findings-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {findings.map((finding) => (
          <AuditFindingCard key={finding.id} finding={finding} />
        ))}
      </div>
    </section>
  );
};
