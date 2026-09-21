import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../../types/expense';
import { ExpenseRow } from '../expense/ExpenseRow';
import { ExpenseEditor } from '../expense/ExpenseEditor';
import { DeleteExpenseDialog } from '../expense/DeleteExpenseDialog';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';
import { MotionButton } from '../motion/MotionButton';

interface HistoryExpenseListProps {
  expenses: Expense[];
  onOpenAddExpense: () => void;
}

export const HistoryExpenseList: React.FC<HistoryExpenseListProps> = ({
  expenses,
  onOpenAddExpense
}) => {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className="history-expenses-section" aria-labelledby="history-expenses-title">
      <div className="history-expenses-header">
        <div className="history-expenses-title-group">
          <h3 id="history-expenses-title" className="history-expenses-title">
            Expenses
          </h3>
          <span className="history-expenses-count">
            ({expenses.length})
          </span>
        </div>

        <motion.button
          type="button"
          className="calendar-today-shortcut-btn"
          onClick={onOpenAddExpense}
          aria-label="Add expense for this date"
          whileTap={prefersReducedMotion ? undefined : motionTokens.tap}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span style={{ marginLeft: 4 }}>Add Expense</span>
        </motion.button>
      </div>

      {expenses.length === 0 ? (
        <div className="history-empty-card">
          <div className="history-empty-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <span className="history-empty-title">No spending recorded on this date</span>
          <span className="history-empty-desc">
            Keep your spending journal complete by recording historical purchases.
          </span>
          <MotionButton
            type="button"
            className="btn-history-add"
            onClick={onOpenAddExpense}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Expense</span>
          </MotionButton>
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

      {/* Edit Sheet (Reused from Phase 4) */}
      <ExpenseEditor
        expense={editingExpense}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
      />

      {/* Delete Confirmation Dialog (Reused from Phase 4) */}
      <DeleteExpenseDialog
        expense={deletingExpense}
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
      />
    </section>
  );
};
