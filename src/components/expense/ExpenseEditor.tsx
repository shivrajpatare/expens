import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../../types/expense';
import { useApp } from '../../context/AppContext';
import { useExpenses } from '../../context/ExpenseContext';
import { ALL_CATEGORIES } from '../../utils/categoryClassifier';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';
import { MotionButton } from '../motion/MotionButton';
import { useFocusTrap } from '../../lib/a11y/useFocusTrap';

interface ExpenseEditorProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseEditor: React.FC<ExpenseEditorProps> = ({ expense, isOpen, onClose }) => {
  const { currencySymbol } = useApp();
  const { updateExpense } = useExpenses();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [description, setDescription] = useState(expense?.description || '');
  const [amountStr, setAmountStr] = useState(expense?.amount.toString() || '');
  const [date, setDate] = useState(expense?.date || '');
  const [category, setCategory] = useState(expense?.category || '');
  const [descError, setDescError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  useFocusTrap(sheetRef, isOpen, {
    onEscape: onClose,
    initialFocusRef: descInputRef
  });

  // Sync state when expense changes
  React.useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmountStr(expense.amount.toString());
      setDate(expense.date);
      setCategory(expense.category);
      setDescError(null);
      setAmountError(null);
    }
  }, [expense]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;

    let hasError = false;

    if (!description.trim()) {
      setDescError('Please enter what you spent on.');
      hasError = true;
    } else {
      setDescError(null);
    }

    const parsedAmount = parseFloat(amountStr);
    if (!amountStr || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError(`Enter an amount greater than ${currencySymbol}0.`);
      hasError = true;
    } else {
      setAmountError(null);
    }

    if (hasError) return;

    updateExpense(expense.id, {
      description: description.trim(),
      amount: parsedAmount,
      date,
      category
    });

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
          aria-labelledby="edit-expense-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <motion.div
            ref={sheetRef}
            tabIndex={-1}
            className="bottom-sheet"
            onClick={(e) => e.stopPropagation()}
            initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 80 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    y: motionTokens.springs.sheet,
                    opacity: { duration: 0.2 }
                  }
            }
          >
            {/* Header */}
            <div className="sheet-header">
              <div className="sheet-title-group">
                <h2 id="edit-expense-title" className="sheet-title">Edit Expense</h2>
                <span className="sheet-date-badge">Record Correction</span>
              </div>

              <motion.button
                type="button"
                className="sheet-close-btn"
                onClick={onClose}
                aria-label="Close"
                whileTap={prefersReducedMotion ? undefined : motionTokens.tap}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            </div>

            {/* Form */}
            <form className="expense-form" onSubmit={handleUpdate}>
              {/* Spending On */}
              <div className="form-group">
                <label htmlFor="edit-spending-on" className="form-label">Spending On</label>
                <input
                  id="edit-spending-on"
                  ref={descInputRef}
                  type="text"
                  className={`form-input ${descError ? 'error' : ''}`}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (descError) setDescError(null);
                  }}
                />
                {descError && <span className="form-error">{descError}</span>}
              </div>

              {/* Amount */}
              <div className="form-group">
                <label htmlFor="edit-amount" className="form-label">Spending Amount</label>
                <div className={`amount-input-wrapper ${amountError ? 'error' : ''}`}>
                  <span className="amount-currency-prefix">{currencySymbol}</span>
                  <input
                    id="edit-amount"
                    type="number"
                    step="any"
                    min="0.01"
                    className="amount-input tabular-nums"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value);
                      if (amountError) setAmountError(null);
                    }}
                  />
                </div>
                {amountError && <span className="form-error">{amountError}</span>}
              </div>

              {/* Category Override */}
              <div className="form-group">
                <label htmlFor="edit-category" className="form-label">Category</label>
                <select
                  id="edit-category"
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Correction */}
              <div className="form-group">
                <label htmlFor="edit-date" className="form-label">Date</label>
                <input
                  id="edit-date"
                  type="date"
                  className="form-input tabular-nums"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Update Action */}
              <MotionButton type="submit" className="btn-primary-action">
                Save Changes
              </MotionButton>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
