import React from 'react';
import { motion } from 'motion/react';
import { Expense } from '../../types/expense';
import { CategoryIcon } from './categoryIcons';
import { useApp } from '../../context/AppContext';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

interface ExpenseRowProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export const ExpenseRow: React.FC<ExpenseRowProps> = ({ expense, onEdit, onDelete }) => {
  const { currencySymbol } = useApp();
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      layout={!prefersReducedMotion}
      initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        prefersReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, height: 0, overflow: 'hidden' }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              duration: motionTokens.durations.insert,
              ease: motionTokens.easings.standard,
              layout: {
                duration: motionTokens.durations.insert,
                ease: motionTokens.easings.standard
              }
            }
      }
      whileTap={prefersReducedMotion ? undefined : motionTokens.tap}
      className="expense-row"
      onClick={() => onEdit(expense)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(expense);
        }
      }}
      aria-label={`Edit ${expense.description}, ${currencySymbol}${expense.amount}`}
    >
      <div className="expense-row-left">
        <div className="expense-cat-badge">
          <CategoryIcon category={expense.category} size={18} />
        </div>

        <div className="expense-info-group">
          <span className="expense-desc">{expense.description}</span>
          <span className="expense-meta">
            <span>{expense.time}</span>
            <span className="expense-meta-dot" />
            <span>{expense.category}</span>
          </span>
        </div>
      </div>

      <div className="expense-row-right">
        <span className="expense-amount tabular-nums">
          -{currencySymbol}{expense.amount.toLocaleString()}
        </span>

        {/* Delete action trigger */}
        <motion.button
          type="button"
          className="expense-action-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(expense);
          }}
          aria-label={`Delete ${expense.description}`}
          title="Delete expense"
          whileTap={prefersReducedMotion ? undefined : motionTokens.tap}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
};
