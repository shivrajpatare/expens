/**
 * Phase 9: Restrained Insight Card Component
 * 
 * Displays an individual factual observation with its type and tier badge.
 * Adheres strictly to the Silent Ledger visual DNA — no chatbot bubbles or avatars.
 */

import React from 'react';
import { motion } from 'motion/react';
import type { InsightClaim } from '../../domain/insights/types';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

interface InsightCardProps {
  claim: InsightClaim;
}

const TYPE_LABELS: Record<string, string> = {
  PERIOD_CHANGE: 'Period Change',
  CATEGORY_PATTERN: 'Top Category',
  HIGH_SPEND_DAY: 'High Spend Day',
  LIMIT_PATTERN: 'Limit Pattern',
  PERIOD_SUMMARY: 'Period Summary'
};

export const InsightCard: React.FC<InsightCardProps> = ({ claim }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const typeLabel = TYPE_LABELS[claim.type] || claim.type;
  const isGroq = claim.tier === 'groq';

  return (
    <motion.div
      className="insight-card"
      data-insight-type={claim.type}
      data-source-facts={claim.sourceFactIds.join(',')}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              duration: motionTokens.durations.insert,
              ease: motionTokens.easings.standard
            }
      }
    >
      <div className="insight-card-header">
        <span className="insight-type-badge">{typeLabel}</span>
        <span className={`insight-tier-badge ${isGroq ? 'tier-groq' : 'tier-local'}`}>
          {isGroq ? 'Groq insight' : 'Local insight'}
        </span>
      </div>
      <p className="insight-card-text">{claim.text}</p>
    </motion.div>
  );
};
