import React from 'react';

interface CalendarHeaderProps {
  viewYear: number;
  viewMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToday: () => void;
  isCurrentMonth: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  viewYear,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  onJumpToday,
  isCurrentMonth
}) => {
  const monthTitle = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  return (
    <div className="calendar-nav-header">
      <h3 className="calendar-month-title">
        {monthTitle}
      </h3>

      <div className="calendar-nav-controls">
        {!isCurrentMonth && (
          <button
            type="button"
            className="calendar-today-shortcut-btn"
            onClick={onJumpToday}
            aria-label="Jump to current month"
          >
            Today
          </button>
        )}

        <button
          type="button"
          className="calendar-nav-btn"
          onClick={onPrevMonth}
          aria-label="Previous month"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          type="button"
          className="calendar-nav-btn"
          onClick={onNextMonth}
          aria-label="Next month"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};
