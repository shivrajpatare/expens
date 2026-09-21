/**
 * Phase 9: "What stands out" Insight Section Component
 * 
 * Embeds within the Understanding view. Renders prioritized insight cards
 * with subtle trust microcopy and graceful fallback messaging when needed.
 */

import React from 'react';
import type { InsightClaim } from '../../domain/insights/types';
import { InsightCard } from './InsightCard';

interface InsightSectionProps {
  insights: InsightClaim[];
  tier: 'local' | 'groq';
  fallbackNotice?: string;
  isLoading?: boolean;
}

export const InsightSection: React.FC<InsightSectionProps> = ({
  insights,
  tier: _tier,
  fallbackNotice,
  isLoading
}) => {
  if (insights.length === 0 && !isLoading) {
    return null;
  }

  return (
    <section className="insight-section" aria-labelledby="insights-stands-out-title">
      <div className="insight-section-header">
        <div className="insight-section-title-row">
          <h3 id="insights-stands-out-title" className="insight-section-title">
            What stands out
          </h3>
          {isLoading && (
            <span className="insight-loading-indicator" aria-live="polite">
              Synthesizing...
            </span>
          )}
        </div>
        <p className="insight-trust-microcopy">
          Financial amounts and calculations come from your local data. AI only helps phrase the patterns.
        </p>
      </div>

      {fallbackNotice && (
        <div className="insight-fallback-notice" role="status" aria-live="polite">
          <span className="insight-fallback-icon" aria-hidden="true">ℹ</span>
          <span>{fallbackNotice}</span>
        </div>
      )}

      <div className="insight-cards-list">
        {insights.map((claim) => (
          <InsightCard key={claim.id} claim={claim} />
        ))}
      </div>
    </section>
  );
};
