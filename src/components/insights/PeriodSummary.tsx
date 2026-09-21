import React from 'react';

interface PeriodSummaryProps {
  totalSpent: number;
  dailyAverage: number;
  expenseCount: number;
  daysWithinLimit: number;
  totalDays: number;
  adherenceRate: number;
  currencySymbol: string;
}

export const PeriodSummary: React.FC<PeriodSummaryProps> = ({
  totalSpent,
  dailyAverage,
  expenseCount,
  daysWithinLimit,
  totalDays,
  adherenceRate,
  currencySymbol
}) => {
  return (
    <div className="period-summary-card" aria-label="Period spending summary">
      {/* Primary Metric: Total Spent */}
      <div className="summary-primary-section">
        <span className="summary-primary-label">Total Spent</span>
        <span className="summary-primary-value tabular-nums">
          {currencySymbol}{totalSpent.toFixed(2)}
        </span>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="summary-secondary-grid">
        <div className="summary-secondary-item">
          <span className="summary-secondary-label">Average / Day</span>
          <span className="summary-secondary-value tabular-nums">
            {currencySymbol}{dailyAverage.toFixed(2)}
          </span>
        </div>

        <div className="summary-secondary-item">
          <span className="summary-secondary-label">Expenses</span>
          <span className="summary-secondary-value tabular-nums">
            {expenseCount}
          </span>
        </div>

        <div className="summary-secondary-item">
          <span className="summary-secondary-label">Limit Adherence</span>
          <span className="summary-secondary-value tabular-nums">
            {daysWithinLimit} / {totalDays} days
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }} className="tabular-nums">
            {adherenceRate}% within limit
          </span>
        </div>
      </div>
    </div>
  );
};
