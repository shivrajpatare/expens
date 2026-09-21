import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { DailyBreakdownItem, PeriodMode } from '../../domain/money/types';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

interface DailySpendingChartProps {
  breakdown: DailyBreakdownItem[];
  mode: PeriodMode;
  currencySymbol: string;
}

export const DailySpendingChart: React.FC<DailySpendingChartProps> = ({
  breakdown,
  mode,
  currencySymbol
}) => {
  const [showTable, setShowTable] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Determine scaling baseline: max of (max daily spent, max daily limit)
  const maxSpent = Math.max(...breakdown.map((d) => d.spent), 0);
  const maxLimit = Math.max(...breakdown.map((d) => d.limit), 1000);
  const chartScaleMax = Math.max(maxSpent, maxLimit, 100);

  const getStatusFillClass = (item: DailyBreakdownItem): string => {
    if (item.spent === 0) return 'zero';
    if (item.isOverLimit) return 'over';
    if (item.isNearLimit) return 'warning';
    return 'safe';
  };

  const getStatusText = (item: DailyBreakdownItem): string => {
    if (item.spent === 0) return 'No spending';
    if (item.isOverLimit) return `Over limit (${currencySymbol}${item.spent - item.limit})`;
    if (item.isNearLimit) return 'Near limit';
    return 'Within limit';
  };

  return (
    <div className="daily-chart-card" aria-label="Daily spending chart">
      {/* Header & Legend */}
      <div className="chart-header">
        <h4 className="chart-title">Daily Spending</h4>

        <div className="chart-legend" aria-hidden="true">
          <div className="legend-item">
            <span className="legend-dot safe" />
            <span>Within limit</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot warning" />
            <span>Near limit</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot over" />
            <span>Over limit</span>
          </div>
        </div>
      </div>

      {/* Mode-specific Chart Rendering */}
      {mode === 'week' ? (
        <div className="weekly-chart-grid" role="region" aria-label="Weekly daily spending bars">
          {breakdown.map((day) => {
            const heightPct = chartScaleMax > 0 ? Math.round((day.spent / chartScaleMax) * 100) : 0;
            const fillClass = getStatusFillClass(day);

            return (
              <div key={day.date} className="weekly-col">
                <span className="weekly-col-amount tabular-nums">
                  {day.spent > 0 ? `${currencySymbol}${day.spent}` : '—'}
                </span>

                <div className="weekly-bar-track">
                  <motion.div
                    className={`weekly-bar-fill ${fillClass}`}
                    initial={false}
                    animate={{ height: `${Math.max(heightPct, day.spent > 0 ? 4 : 0)}%` }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : {
                            duration: motionTokens.durations.number,
                            ease: motionTokens.easings.number
                          }
                    }
                    title={`${day.fullDate}: ${currencySymbol}${day.spent} / ${currencySymbol}${day.limit} (${getStatusText(day)})`}
                  />
                </div>

                <span className="weekly-col-label">{day.dayLabel}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="monthly-chart-container" role="region" aria-label="Monthly daily spending bars">
          <div className="monthly-chart-bars">
            {breakdown.map((day) => {
              const heightPct = chartScaleMax > 0 ? Math.round((day.spent / chartScaleMax) * 100) : 0;
              const fillClass = getStatusFillClass(day);

              return (
                <div key={day.date} className="monthly-bar-col">
                  <div className="monthly-bar-track">
                    <motion.div
                      className={`monthly-bar-fill ${fillClass}`}
                      initial={false}
                      animate={{ height: `${Math.max(heightPct, day.spent > 0 ? 4 : 0)}%` }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : {
                              duration: motionTokens.durations.number,
                              ease: motionTokens.easings.number
                            }
                      }
                      title={`${day.fullDate}: ${currencySymbol}${day.spent} / ${currencySymbol}${day.limit} (${getStatusText(day)})`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Restrained Monthly Axis Labels (375px mobile-friendly) */}
          <div className="monthly-axis-labels" aria-hidden="true">
            <span>Day 1</span>
            <span>Day 10</span>
            <span>Day 20</span>
            <span>Day {breakdown.length}</span>
          </div>
        </div>
      )}

      {/* Accessible Table / Text Fallback */}
      <div className="accessible-spending-table-wrapper">
        <motion.button
          type="button"
          className="accessible-toggle-btn"
          onClick={() => setShowTable(!showTable)}
          aria-expanded={showTable}
          whileTap={prefersReducedMotion ? undefined : motionTokens.tap}
        >
          {showTable ? 'Hide spending details table' : 'Show spending details table'}
        </motion.button>

        {showTable && (
          <table className="accessible-spending-table" aria-label="Daily spending data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Spent</th>
                <th>Daily Limit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((d) => (
                <tr key={d.date}>
                  <td>{d.date} ({d.dayLabel})</td>
                  <td className="tabular-nums">{currencySymbol}{d.spent.toFixed(2)}</td>
                  <td className="tabular-nums">{currencySymbol}{d.limit.toFixed(2)}</td>
                  <td>{getStatusText(d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
