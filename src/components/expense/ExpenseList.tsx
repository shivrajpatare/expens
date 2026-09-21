import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Expense } from '../../types/expense';
import { ExpenseRow } from './ExpenseRow';
import { ExpenseEditor } from './ExpenseEditor';
import { DeleteExpenseDialog } from './DeleteExpenseDialog';

interface ExpenseListProps {
  expenses: Expense[];
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses }) => {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  return (
    <section className="expense-list-section" aria-labelledby="today-expenses-title">
      <div className="expense-list-header">
        <h3 id="today-expenses-title" className="expense-list-title">
          Today's Expenses
        </h3>
        <span className="expense-list-count">
          {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
        </span>
      </div>

      {expenses.length === 0 ? (
        <div className="expense-empty-card">
          <div className="expense-empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <span className="expense-empty-text">No expenses recorded yet</span>
          <span className="expense-empty-subtext">Tap "+ Add Expense" above to record spending</span>
        </div>
      ) : (
        <div className="expense-items-container">
          <AnimatePresence initial={false}>
            {expenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onEdit={(exp) => setEditingExpense(exp)}
                onDelete={(exp) => setDeletingExpense(exp)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Sheet */}
      <ExpenseEditor
        expense={editingExpense}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteExpenseDialog
        expense={deletingExpense}
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
      />
    </section>
  );
};
