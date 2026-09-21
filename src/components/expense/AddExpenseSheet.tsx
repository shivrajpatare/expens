import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { useExpenses } from '../../context/ExpenseContext';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';
import { MotionButton } from '../motion/MotionButton';
import { useFocusTrap } from '../../lib/a11y/useFocusTrap';

interface AddExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddExpenseSheet: React.FC<AddExpenseSheetProps> = ({ isOpen, onClose }) => {
  const { activeDate, currencySymbol } = useApp();
  const { addExpense } = useExpenses();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [descError, setDescError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);

  useFocusTrap(sheetRef, isOpen, {
    onEscape: onClose,
    initialFocusRef: descInputRef
  });

  // Reset form when sheet opens
  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setAmountStr('');
      setDescError(null);
      setAmountError(null);
    }
  }, [isOpen]);

  // Format date context e.g. "Logging to Today" or "Logging to 14 Oct"
  const getDateContextLabel = (): string => {
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];

    if (activeDate === todayIso) {
      return 'Logging to Today';
    }

    try {
      const d = new Date(activeDate + 'T00:00:00');
      const formatted = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
      return `Logging to ${formatted}`;
    } catch {
      return `Logging to ${activeDate}`;
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;

    // Validate description
    if (!description.trim()) {
      setDescError('Please enter what you spent on.');
      hasError = true;
    } else {
      setDescError(null);
    }

    // Validate amount
    const parsedAmount = parseFloat(amountStr);
    if (!amountStr || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError(`Enter an amount greater than ${currencySymbol}0.`);
      hasError = true;
    } else {
      setAmountError(null);
    }

    if (hasError) return;

    // Create in-memory expense
    addExpense({
      description: description.trim(),
      amount: parsedAmount
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="sheet-backdrop"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-expense-title"
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
                <h2 id="add-expense-title" className="sheet-title">Add Expense</h2>
                <span className="sheet-date-badge">{getDateContextLabel()}</span>
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
            <form className="expense-form" onSubmit={handleSave}>
              {/* Spending On */}
              <div className="form-group">
                <label htmlFor="spending-on-input" className="form-label">
                  Spending On
                </label>
                <input
                  id="spending-on-input"
                  ref={descInputRef}
                  type="text"
                  className={`form-input ${descError ? 'error' : ''}`}
                  placeholder="What did you spend on? (e.g. Lunch, Metro)"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (descError) setDescError(null);
                  }}
                  autoComplete="off"
                />
                {descError && <span className="form-error">{descError}</span>}
              </div>

              {/* Amount */}
              <div className="form-group">
                <label htmlFor="spending-amount-input" className="form-label">
                  Spending Amount
                </label>
                <div className={`amount-input-wrapper ${amountError ? 'error' : ''}`}>
                  <span className="amount-currency-prefix">{currencySymbol}</span>
                  <input
                    id="spending-amount-input"
                    type="number"
                    step="any"
                    min="0.01"
                    className="amount-input tabular-nums"
                    placeholder="0"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value);
                      if (amountError) setAmountError(null);
                    }}
                  />
                </div>
                {amountError && <span className="form-error">{amountError}</span>}
              </div>

              {/* Save Action */}
              <MotionButton type="submit" className="btn-primary-action">
                Save Expense
              </MotionButton>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
