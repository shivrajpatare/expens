import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useExpenses } from '../../context/ExpenseContext';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';

export const HistoryCalendar: React.FC = () => {
  const { activeDate, setActiveDate, currencySymbol } = useApp();
  const { getDailyState, getExpensesForDate } = useExpenses();

  // Current real-world today
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const todayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Parse activeDate to determine initial calendar view
  const parseActiveDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return {
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10) - 1
        };
      }
    } catch {
      // Fallback to today
    }
    return { year: currentYear, month: currentMonth };
  };

  const initialView = parseActiveDate(activeDate);
  const [viewYear, setViewYear] = useState<number>(initialView.year);
  const [viewMonth, setViewMonth] = useState<number>(initialView.month);

  const isCurrentMonth = viewYear === currentYear && viewMonth === currentMonth;

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    setViewYear(currentYear);
    setViewMonth(currentMonth);
    setActiveDate(todayDateStr);
  };

  // Provide deterministic financial info for a date using Money Engine
  const getDayInfo = (dateStr: string) => {
    const expenses = getExpensesForDate(dateStr);
    const dailyState = getDailyState(dateStr);

    return {
      hasExpenses: expenses.length > 0 || dailyState.dailySpent > 0,
      isOverLimit: dailyState.isOverLimit,
      spentAmount: dailyState.dailySpent,
      overLimitAmount: dailyState.overLimitAmount
    };
  };

  return (
    <div className="calendar-card" aria-label="Monthly spending calendar">
      <CalendarHeader
        viewYear={viewYear}
        viewMonth={viewMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onJumpToday={handleJumpToday}
        isCurrentMonth={isCurrentMonth}
      />

      <CalendarGrid
        viewYear={viewYear}
        viewMonth={viewMonth}
        activeDate={activeDate}
        todayDate={todayDateStr}
        currencySymbol={currencySymbol}
        getDayInfo={getDayInfo}
        onSelectDate={(dateStr) => setActiveDate(dateStr)}
      />
    </div>
  );
};
