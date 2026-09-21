import React from 'react';
import { CalendarDay } from './CalendarDay';

interface DayFinancialInfo {
  hasExpenses: boolean;
  isOverLimit: boolean;
  spentAmount: number;
  overLimitAmount: number;
}

interface CalendarGridProps {
  viewYear: number;
  viewMonth: number; // 0-indexed
  activeDate: string; // YYYY-MM-DD
  todayDate: string; // YYYY-MM-DD
  currencySymbol: string;
  getDayInfo: (dateStr: string) => DayFinancialInfo;
  onSelectDate: (dateStr: string) => void;
}

const WEEKDAY_HEADERS = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' }
];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  viewYear,
  viewMonth,
  activeDate,
  todayDate,
  currencySymbol,
  getDayInfo,
  onSelectDate
}) => {
  // First day of current month
  const firstDayDate = new Date(viewYear, viewMonth, 1);
  // Monday-based day of week (Mon=0, Tue=1, ..., Sun=6)
  const startDayOfWeek = (firstDayDate.getDay() + 6) % 7;

  // Number of days in current month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Number of days in previous month
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Cells array
  interface CellData {
    key: string;
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
  }

  const cells: CellData[] = [];

  // 1. Previous month leading padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    cells.push({
      key: `prev-${dayNum}`,
      dateStr: '',
      dayNumber: dayNum,
      isCurrentMonth: false
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;

    cells.push({
      key: dateStr,
      dateStr,
      dayNumber: day,
      isCurrentMonth: true
    });
  }

  // 3. Next month trailing padding to complete the last week
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const trailingCount = 7 - remainder;
    for (let day = 1; day <= trailingCount; day++) {
      cells.push({
        key: `next-${day}`,
        dateStr: '',
        dayNumber: day,
        isCurrentMonth: false
      });
    }
  }

  return (
    <div className="calendar-grid" role="grid" aria-label="Calendar dates">
      {/* Weekday Header Row */}
      {WEEKDAY_HEADERS.map((day) => (
        <div
          key={day.short}
          className="calendar-weekday-cell"
          role="columnheader"
          aria-label={day.full}
        >
          {day.short}
        </div>
      ))}

      {/* Calendar Day Cells */}
      {cells.map((cell) => {
        if (!cell.isCurrentMonth) {
          return (
            <CalendarDay
              key={cell.key}
              dateStr=""
              dayNumber={cell.dayNumber}
              isCurrentMonth={false}
              isToday={false}
              isSelected={false}
              hasExpenses={false}
              isOverLimit={false}
              spentAmount={0}
              overLimitAmount={0}
              currencySymbol={currencySymbol}
              onSelect={() => {}}
            />
          );
        }

        const info = getDayInfo(cell.dateStr);
        const isToday = cell.dateStr === todayDate;
        const isSelected = cell.dateStr === activeDate;

        return (
          <CalendarDay
            key={cell.key}
            dateStr={cell.dateStr}
            dayNumber={cell.dayNumber}
            isCurrentMonth={true}
            isToday={isToday}
            isSelected={isSelected}
            hasExpenses={info.hasExpenses}
            isOverLimit={info.isOverLimit}
            spentAmount={info.spentAmount}
            overLimitAmount={info.overLimitAmount}
            currencySymbol={currencySymbol}
            onSelect={onSelectDate}
          />
        );
      })}
    </div>
  );
};
