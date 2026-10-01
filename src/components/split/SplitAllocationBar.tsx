import React from 'react';
import { Participant } from '../../domain/split/types';

interface SplitAllocationBarProps {
  participants: Participant[];
  percentages: Record<string, number>;
  onPercentageChange: (participantId: string, newPercentage: number) => void;
  currencySymbol: string;
  totalAmount: number;
}

// Curated Silent Ledger harmonious segment palette
const SEGMENT_COLORS = [
  'var(--color-accent)',
  'var(--status-safe)',
  '#4A709C', // Muted slate blue
  '#8B687F', // Muted mauve
  '#A07855', // Muted amber wood
  '#5C7D68', // Muted sage
  '#7A6B8A'  // Muted heather
];

export const SplitAllocationBar: React.FC<SplitAllocationBarProps> = ({
  participants,
  percentages,
  onPercentageChange,
  currencySymbol,
  totalAmount
}) => {
  const totalPercentage = Math.round(
    participants.reduce((sum, p) => sum + (percentages[p.id] || 0), 0) * 100
  ) / 100;

  const isReconciled = Math.abs(totalPercentage - 100) < 0.001;

  return (
    <div className="split-allocation-container">
      {/* Proportion Header */}
      <div className="allocation-header">
        <span className="allocation-label">Allocation Bar</span>
        <div className="allocation-status">
          <span className={`allocation-total-badge ${isReconciled ? 'valid' : 'invalid'}`}>
            {totalPercentage}% / 100%
          </span>
        </div>
      </div>

      {/* Proportional Horizontal Bar */}
      <div
        className="allocation-bar-track"
        role="progressbar"
        aria-valuenow={totalPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Total bill allocation percentage"
      >
        {participants.map((p, idx) => {
          const pct = Math.max(0, percentages[p.id] || 0);
          if (pct === 0) return null;
          const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];

          return (
            <div
              key={p.id}
              className="allocation-bar-segment"
              style={{
                width: `${pct}%`,
                backgroundColor: color
              }}
              title={`${p.name}: ${pct}%`}
            />
          );
        })}
      </div>

      {/* Interactive Controls per Participant */}
      <div className="allocation-controls-list">
        {participants.map((p, idx) => {
          const currentPct = percentages[p.id] ?? 0;
          const participantAmount = totalAmount > 0 ? (totalAmount * currentPct) / 100 : 0;
          const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];

          return (
            <div key={p.id} className="allocation-control-row">
              <div className="allocation-person-meta">
                <span className="allocation-color-dot" style={{ backgroundColor: color }} />
                <span className={`allocation-person-name ${p.isCurrentUser ? 'current-user' : ''}`}>
                  {p.name} {p.isCurrentUser && <span className="you-pill">You</span>}
                </span>
              </div>

              {/* Slider & Number Control */}
              <div className="allocation-input-group">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={currentPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={currentPct}
                  aria-valuetext={`${p.name}: ${currentPct}%, ${currencySymbol}${participantAmount.toFixed(2)}`}
                  className="allocation-slider"
                  onChange={(e) => onPercentageChange(p.id, parseFloat(e.target.value) || 0)}
                />

                <div className="allocation-pct-stepper">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={currentPct}
                    className="allocation-num-input tabular-nums"
                    aria-label={`Percentage for ${p.name}`}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onPercentageChange(p.id, isNaN(val) ? 0 : val);
                    }}
                  />
                  <span className="pct-symbol">%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helper validation note */}
      {!isReconciled && (
        <div className="allocation-error-note" role="alert">
          {totalPercentage < 100
            ? `${(100 - totalPercentage).toFixed(1)}% remaining to allocate.`
            : `Over allocated by ${(totalPercentage - 100).toFixed(1)}%. Must total 100%.`}
        </div>
      )}
    </div>
  );
};
