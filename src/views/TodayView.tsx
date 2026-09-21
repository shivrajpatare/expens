import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useExpenses } from '../context/ExpenseContext';
import { HeroBalanceCard } from '../components/today/HeroBalanceCard';
import { EditLimitDialog } from '../components/today/EditLimitDialog';
import { AddExpenseSheet } from '../components/expense/AddExpenseSheet';
import { ExpenseList } from '../components/expense/ExpenseList';
import { MotionButton } from '../components/motion/MotionButton';
import '../components/today/today.css';
import '../components/expense/expense.css';

export const TodayView: React.FC = () => {
  const { currencySymbol, activeDate } = useApp();
  const { getDailyState, getExpensesForDate, limitOverrides } = useExpenses();

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isEditLimitOpen, setIsEditLimitOpen] = useState(false);

  // 100% Deterministic derived state from the Money Engine
  const dailyState = getDailyState(activeDate);
  const todayExpenses = getExpensesForDate(activeDate);
  const hasOverride = Boolean(limitOverrides[activeDate] && limitOverrides[activeDate].limit > 0);

  // Format date: e.g. "Saturday, 19 September 2026"
  const formatFullDate = (isoDate: string): string => {
    try {
      const date = new Date(isoDate + 'T00:00:00');
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="today-container">
      {/* Today Context Header */}
      <div className="today-context-row">
        <h2 className="today-context-title">Today's Position</h2>
        <span className="today-context-date">{formatFullDate(activeDate)}</span>
      </div>

      {/* Hero Balance Card — Powered 100% by the Deterministic Money Engine */}
      <HeroBalanceCard
        dailyLimit={dailyState.dailyLimit}
        spent={dailyState.dailySpent}
        currencySymbol={currencySymbol}
        hasOverride={hasOverride}
        onEditLimit={() => setIsEditLimitOpen(true)}
      />

      {/* Prominent Quick Add Trigger */}
      <MotionButton
        type="button"
        className="btn-add-expense-trigger"
        onClick={() => setIsAddSheetOpen(true)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>Add Expense</span>
      </MotionButton>

      {/* Today's Expense List — Powered by IndexedDB */}
      <ExpenseList expenses={todayExpenses} />

      {/* Quick Add Bottom Sheet */}
      <AddExpenseSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
      />

      {/* Date-Specific Limit Override Dialog */}
      <EditLimitDialog
        date={activeDate}
        isOpen={isEditLimitOpen}
        onClose={() => setIsEditLimitOpen(false)}
      />
    </div>
  );
};
