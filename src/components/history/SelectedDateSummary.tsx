import React from 'react';
import { useApp } from '../../context/AppContext';
import { useExpenses } from '../../context/ExpenseContext';

export const SelectedDateSummary: React.FC = () => {
  const { activeDate, setActiveDate, currencySymbol } = useApp();
  const { getDailyState, limitOverrides } = useExpenses();

  // Current real-world today
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isToday = activeDate === todayIso;

  // 100% Deterministic derived state from the Money Engine
  const dailyState = getDailyState(activeDate);
  const hasOverride = Boolean(limitOverrides[activeDate] && limitOverrides[activeDate].limit > 0);

  // Format date display (e.g. "14 October 2026")
  const formatDisplayDate = (isoDate: string): string => {
    try {
      const d = new Date(isoDate + 'T00:00:00');
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return isoDate;
    }
  };

  // Status Badge Configuration (color-independent: icon + text + semantic token)
  const getStatusConfig = () => {
    if (dailyState.dailySpent === 0) {
      return {
        label: isToday ? 'No spending today' : 'No spending recorded on this date',
        badgeClass: 'safe',
        fillClass: 'safe',
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )
      };
    }

    if (dailyState.isOverLimit) {
      return {
        label: `Over limit by ${currencySymbol}${dailyState.overLimitAmount.toFixed(2)}`,
        badgeClass: 'over',
        fillClass: 'over',
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
      };
    }

    if (dailyState.isNearLimit) {
      return {
        label: 'Near daily limit',
        badgeClass: 'warning',
        fillClass: 'warning',
        icon: (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )
      };
    }

    return {
      label: 'Within daily limit',
      badgeClass: 'safe',
      fillClass: 'safe',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    };
  };

  const statusConfig = getStatusConfig();
  const boundedPercentage = Math.min(dailyState.percentageUsed, 100);

  return (
    <div className="selected-date-summary-card" aria-labelledby="selected-date-title">
      {/* Date Header & Return to Today */}
      <div className="summary-card-header">
        <div className="summary-date-group">
          <h3 id="selected-date-title" className="summary-date-title">
            {formatDisplayDate(activeDate)}
          </h3>
          {hasOverride && (
            <span className="summary-custom-limit-badge">Custom limit</span>
          )}
        </div>

        {!isToday && (
          <button
            type="button"
            className="btn-return-today"
            onClick={() => setActiveDate(todayIso)}
            aria-label="Return to Today"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Today</span>
          </button>
        )}
      </div>

      {/* Metrics Row: Limit, Spent, Remaining */}
      <div className="summary-metrics-grid">
        <div className="summary-metric-item">
          <span className="summary-metric-label">Daily Limit</span>
          <span className="summary-metric-value tabular-nums">
            {currencySymbol}{dailyState.dailyLimit.toFixed(2)}
          </span>
        </div>

        <div className="summary-metric-item">
          <span className="summary-metric-label">Spent</span>
          <span className="summary-metric-value tabular-nums">
            {currencySymbol}{dailyState.dailySpent.toFixed(2)}
          </span>
        </div>

        <div className="summary-metric-item">
          <span className="summary-metric-label">Remaining</span>
          <span className={`summary-metric-value tabular-nums ${dailyState.isOverLimit ? 'over-limit' : ''}`}>
            {dailyState.remaining < 0 ? '-' : ''}{currencySymbol}{Math.abs(dailyState.remaining).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Status & Progress */}
      <div className="summary-status-row">
        <span className={`hero-status-badge ${statusConfig.badgeClass}`}>
          {statusConfig.icon}
          <span>{statusConfig.label}</span>
        </span>
        <span className="tabular-nums">{dailyState.percentageUsed.toFixed(0)}%</span>
      </div>

      {/* 4px Progress Track */}
      <div
        className="hero-progress-track"
        role="progressbar"
        aria-valuenow={dailyState.percentageUsed}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Daily spending progress"
      >
        <div
          className={`hero-progress-fill ${statusConfig.fillClass}`}
          style={{ width: `${boundedPercentage}%` }}
        />
      </div>
    </div>
  );
};
