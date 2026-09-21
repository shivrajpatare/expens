import React from 'react';
import { motion } from 'motion/react';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';
import { AnimatedNumber } from '../motion/AnimatedNumber';
import { AnimatedProgress } from '../motion/AnimatedProgress';

interface HeroBalanceCardProps {
  dailyLimit: number;
  spent: number;
  currencySymbol: string;
  hasOverride?: boolean;
  onEditLimit?: () => void;
}

export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = ({
  dailyLimit,
  spent,
  currencySymbol,
  hasOverride = false,
  onEditLimit
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const remaining = dailyLimit - spent;
  const isOverLimit = spent > dailyLimit;
  const overAmount = isOverLimit ? spent - dailyLimit : 0;
  const percentSpent = dailyLimit > 0 ? Math.round((spent / dailyLimit) * 100) : 0;
  const progressWidth = Math.min(Math.max(percentSpent, 0), 100);

  // Determine status (Safe, Near Limit, Over Limit)
  let statusType: 'safe' | 'warning' | 'over' = 'safe';
  let statusText = spent === 0 ? "No spending today" : "Within today's limit";

  if (isOverLimit) {
    statusType = 'over';
    statusText = `Over limit by ${currencySymbol}${overAmount.toLocaleString()}`;
  } else if (percentSpent >= 80) {
    statusType = 'warning';
    statusText = "Near today's limit";
  }

  return (
    <section className="hero-balance-card" aria-labelledby="hero-balance-label">
      {/* Header Row: Label + Color-Independent Status Badge */}
      <div className="hero-header-row">
        <span id="hero-balance-label" className="hero-label">
          Daily Remaining
        </span>

        <motion.div
          className={`hero-status-badge ${statusType}`}
          role="status"
          initial={false}
          animate={{ opacity: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: motionTokens.durations.overLimit,
                  ease: motionTokens.easings.overLimit
                }
          }
        >
          {statusType === 'over' ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : statusType === 'warning' ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ) : (
            <span className="status-dot" aria-hidden="true" />
          )}
          <span>{statusText}</span>
        </motion.div>
      </div>

      {/* Hero Remaining Amount (Strongest Visual Hierarchy with Tabular Interpolation) */}
      <div className="hero-amount-section">
        <div
          className={`hero-amount tabular-nums ${isOverLimit ? 'over-limit' : ''}`}
          aria-live="polite"
        >
          {remaining < 0 ? '-' : ''}{currencySymbol}
          <AnimatedNumber
            value={Math.abs(remaining)}
            formatFn={(val) => Math.round(val).toLocaleString()}
          />
        </div>
      </div>

      {/* Progress Track & Bar (Soft Spring) */}
      <div className="hero-progress-section">
        <AnimatedProgress
          value={progressWidth}
          className={`hero-progress-fill ${statusType}`}
          aria-valuenow={percentSpent}
          aria-label={`Spending progress: ${percentSpent}% of daily limit used`}
        />
      </div>

      {/* Metadata Row: Daily Limit & Total Spent */}
      <div className="hero-meta-row">
        <div
          className="hero-meta-item"
          onClick={onEditLimit}
          role={onEditLimit ? 'button' : undefined}
          tabIndex={onEditLimit ? 0 : undefined}
          onKeyDown={onEditLimit ? (e) => (e.key === 'Enter' || e.key === ' ') && onEditLimit() : undefined}
          style={{ cursor: onEditLimit ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4 }}
          title={onEditLimit ? 'Tap to adjust limit for this date' : undefined}
        >
          <span className="hero-meta-label">
            {hasOverride ? 'Custom limit' : 'Daily limit'}
          </span>
          <span className="hero-meta-value tabular-nums">
            {currencySymbol}{dailyLimit.toLocaleString()}
          </span>
          {onEditLimit && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          )}
        </div>

        <div className="hero-meta-item">
          <span className="hero-meta-label">Spent</span>
          <span className="hero-meta-value tabular-nums">
            {currencySymbol}
            <AnimatedNumber
              value={spent}
              formatFn={(val) => Math.round(val).toLocaleString()}
            />{' '}
            ({percentSpent}%)
          </span>
        </div>
      </div>
    </section>
  );
};
