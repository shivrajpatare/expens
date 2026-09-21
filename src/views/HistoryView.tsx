import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useExpenses } from '../context/ExpenseContext';
import { HistoryCalendar } from '../components/history/HistoryCalendar';
import { SelectedDateSummary } from '../components/history/SelectedDateSummary';
import { HistoryExpenseList } from '../components/history/HistoryExpenseList';
import { AddExpenseSheet } from '../components/expense/AddExpenseSheet';
import '../styles/history.css';
import '../components/expense/expense.css';

export const HistoryView: React.FC = () => {
  const { activeDate } = useApp();
  const { getExpensesForDate } = useExpenses();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  // Retrieve expenses for the selected activeDate
  const dateExpenses = getExpensesForDate(activeDate);

  return (
    <div className="history-container">
      {/* History Header */}
      <div className="history-context-row">
        <h2 className="history-context-title">History</h2>
        <span className="history-context-subtitle">Daily Spending Journal</span>
      </div>

      {/* 1. Calendar exploration */}
      <HistoryCalendar />

      {/* 2. Selected Date Financial Summary */}
      <SelectedDateSummary />

      {/* 3. Daily Expense Timeline */}
      <HistoryExpenseList
        expenses={dateExpenses}
        onOpenAddExpense={() => setIsAddSheetOpen(true)}
      />

      {/* Quick Add Bottom Sheet (Targets activeDate automatically) */}
      <AddExpenseSheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
      />
    </div>
  );
};
