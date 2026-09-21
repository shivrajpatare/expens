import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../../types/expense';
import { useApp } from '../../context/AppContext';
import { useExpenses } from '../../context/ExpenseContext';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';
import { MotionButton } from '../motion/MotionButton';
import { useFocusTrap } from '../../lib/a11y/useFocusTrap';

interface DeleteExpenseDialogProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteExpenseDialog: React.FC<DeleteExpenseDialogProps> = ({
  expense,
  isOpen,
  onClose
}) => {
  const { currencySymbol } = useApp();
  const { deleteExpense } = useExpenses();
  const prefersReducedMotion = usePrefersReducedMotion();

  const dialogRef = React.useRef<HTMLDivElement>(null);
  const cancelBtnRef = React.useRef<HTMLButtonElement>(null);

  useFocusTrap(dialogRef, isOpen, {
    onEscape: onClose,
    initialFocusRef: cancelBtnRef
  });

  const handleDelete = () => {
    if (expense) {
      deleteExpense(expense.id);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && expense && (
        <motion.div
          className="sheet-backdrop"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            className="delete-dialog"
            onClick={(e) => e.stopPropagation()}
            initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    duration: motionTokens.durations.dialogEnter,
                    ease: motionTokens.easings.standard
                  }
            }
          >
            <h2 id="delete-dialog-title" className="delete-dialog-title">Delete this expense?</h2>

            <div className="delete-dialog-summary">
              <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {expense.description}
              </span>
              <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {currencySymbol}{expense.amount.toLocaleString()}
              </span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              This expense will be removed immediately from your records.
            </p>

            <div className="delete-dialog-actions">
              <MotionButton type="button" className="btn-secondary-action" onClick={onClose}>
                Cancel
              </MotionButton>
              <MotionButton type="button" className="btn-danger-action" onClick={handleDelete}>
                Delete
              </MotionButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
