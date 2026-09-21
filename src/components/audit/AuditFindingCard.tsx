import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AuditFinding } from '../../domain/audit/types';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

interface AuditFindingCardProps {
  finding: AuditFinding;
}

export const AuditFindingCard: React.FC<AuditFindingCardProps> = ({ finding }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const hasDetails = Boolean(
    (finding.affectedDates && finding.affectedDates.length > 0) ||
    (finding.affectedExpenseIds && finding.affectedExpenseIds.length > 0) ||
    (finding.metadata && Object.keys(finding.metadata).length > 0)
  );

  const getSeverityBadge = () => {
    switch (finding.severity) {
      case 'attention':
        return <span className="severity-badge attention">Attention</span>;
      case 'info':
        return <span className="severity-badge info">Info</span>;
      case 'ok':
        return <span className="severity-badge ok">OK</span>;
    }
  };

  return (
    <div className="audit-finding-card" role="article" aria-label={finding.title}>
      <div className="audit-finding-header">
        <div className="audit-finding-title-group">
          {getSeverityBadge()}
          <h4 className="audit-finding-title">{finding.title}</h4>
        </div>
      </div>

      <p className="audit-finding-desc">{finding.description}</p>

      {hasDetails && (
        <>
          <motion.button
            type="button"
            className="audit-details-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls={`drawer-${finding.id}`}
            whileTap={prefersReducedMotion ? undefined : motionTokens.tap}
          >
            {isExpanded ? 'Hide details' : 'View details'}
          </motion.button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                id={`drawer-${finding.id}`}
                className="audit-finding-drawer"
                initial={
                  prefersReducedMotion
                    ? { opacity: 1, height: 'auto' }
                    : { opacity: 0, height: 0, overflow: 'hidden' }
                }
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, height: 0, overflow: 'hidden' }
                }
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        duration: motionTokens.durations.insert,
                        ease: motionTokens.easings.standard
                      }
                }
              >
                {finding.affectedDates && finding.affectedDates.length > 0 && (
                  <div className="audit-drawer-row">
                    <span className="audit-drawer-label">Affected Dates:</span>
                    <span className="audit-drawer-value">{finding.affectedDates.join(', ')}</span>
                  </div>
                )}

                {finding.affectedExpenseIds && finding.affectedExpenseIds.length > 0 && (
                  <div className="audit-drawer-row">
                    <span className="audit-drawer-label">Affected Records:</span>
                    <span className="audit-drawer-value">{finding.affectedExpenseIds.length} records</span>
                  </div>
                )}

                {finding.metadata && Object.entries(finding.metadata).map(([key, val]) => (
                  <div key={key} className="audit-drawer-row">
                    <span className="audit-drawer-label">{key}:</span>
                    <span className="audit-drawer-value tabular-nums">{String(val)}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};
