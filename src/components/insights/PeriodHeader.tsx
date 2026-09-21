import React from 'react';
import type { PeriodMode } from '../../domain/money/types';

interface PeriodHeaderProps {
  label: string;
  isCurrent: boolean;
  mode: PeriodMode;
  onPrev: () => void;
  onNext: () => void;
  onJumpCurrent: () => void;
}

export const PeriodHeader: React.FC<PeriodHeaderProps> = ({
  label,
  isCurrent,
  mode,
  onPrev,
  onNext,
  onJumpCurrent
}) => {
  const prevLabel = mode === 'week' ? 'Previous week' : 'Previous month';
  const nextLabel = mode === 'week' ? 'Next week' : 'Next month';
  const jumpLabel = mode === 'week' ? 'Current Week' : 'Current Month';

  return (
    <div className="period-nav-header">
      <div className="period-nav-title-group">
        <h3 className="period-nav-title">{label}</h3>
        {isCurrent && (
          <span className="period-current-badge">Current</span>
        )}
      </div>

      <div className="period-nav-controls">
        {!isCurrent && (
          <button
            type="button"
            className="period-jump-btn"
            onClick={onJumpCurrent}
            aria-label={`Jump to ${jumpLabel.toLowerCase()}`}
          >
            {jumpLabel}
          </button>
        )}

        <button
          type="button"
          className="period-nav-btn"
          onClick={onPrev}
          aria-label={prevLabel}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          type="button"
          className="period-nav-btn"
          onClick={onNext}
          aria-label={nextLabel}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};
