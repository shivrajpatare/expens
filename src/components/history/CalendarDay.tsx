import React from 'react';
import { motion } from 'motion/react';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

interface CalendarDayProps {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasExpenses: boolean;
  isOverLimit: boolean;
  spentAmount: number;
  overLimitAmount: number;
  currencySymbol: string;
  onSelect: (dateStr: string) => void;
}

export const CalendarDay: React.FC<CalendarDayProps> = ({
  dateStr,
  dayNumber,
  isCurrentMonth,
  isToday,
  isSelected,
  hasExpenses,
  isOverLimit,
  spentAmount,
  overLimitAmount,
  currencySymbol,
  onSelect
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!isCurrentMonth) {
    return (
      <button
        type="button"
        className="calendar-day-btn outside-month"
        disabled
        aria-hidden="true"
        tabIndex={-1}
      >
        <span className="tabular-nums">{dayNumber}</span>
      </button>
    );
  }

  // Generate rich, non-color-only accessible description
  const generateAriaLabel = (): string => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const formattedDate = d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const todayNote = isToday ? ', Today' : '';
      const selectedNote = isSelected ? ', Selected' : '';

      let spendingNote = ', no spending recorded';
      if (hasExpenses) {
        if (isOverLimit) {
          spendingNote = `, ${currencySymbol}${spentAmount} spent, over limit by ${currencySymbol}${overLimitAmount}`;
        } else {
          spendingNote = `, ${currencySymbol}${spentAmount} spent, within limit`;
        }
      }

      return `${formattedDate}${todayNote}${selectedNote}${spendingNote}`;
    } catch {
      return dateStr;
    }
  };

  const classNames = [
    'calendar-day-btn',
    isToday ? 'is-today' : '',
    isSelected ? 'is-selected' : ''
  ].filter(Boolean).join(' ');

  return (
    <motion.button
      type="button"
      className={classNames}
      onClick={() => onSelect(dateStr)}
      aria-label={generateAriaLabel()}
      aria-pressed={isSelected}
      aria-current={isToday ? 'date' : undefined}
      whileTap={prefersReducedMotion ? undefined : motionTokens.tap}
    >
      <span className="tabular-nums">{dayNumber}</span>

      <span className="calendar-day-indicators" aria-hidden="true">
        {hasExpenses && (
          <span
            className={`day-indicator-dot ${isOverLimit ? 'over-limit' : ''}`}
          />
        )}
      </span>
    </motion.button>
  );
};
