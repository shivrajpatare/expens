import React from 'react';
import type { HighLowDay } from '../../domain/money/types';

interface HighestLowestDaysProps {
  highest: HighLowDay | null;
  lowest: HighLowDay | null;
  currencySymbol: string;
}

export const HighestLowestDays: React.FC<HighestLowestDaysProps> = ({
  highest,
  lowest,
  currencySymbol
}) => {
  if (!highest || !lowest) {
    return null;
  }

  return (
    <div className="high-low-card" aria-label="Highest and lowest spending days">
      {/* Highest Day */}
      <div className="high-low-item">
        <span className="high-low-label">Highest Day</span>
        <span className="high-low-day">{highest.dayName}</span>
        <span className="high-low-amount tabular-nums">
          {currencySymbol}{highest.amount.toFixed(2)}
        </span>
      </div>

      {/* Lowest Day */}
      <div className="high-low-item">
        <span className="high-low-label">Lowest Day</span>
        <span className="high-low-day">{lowest.dayName}</span>
        <span className="high-low-amount tabular-nums">
          {currencySymbol}{lowest.amount.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
