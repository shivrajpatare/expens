import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useExpenses } from '../../context/ExpenseContext';

interface EditLimitDialogProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

export const EditLimitDialog: React.FC<EditLimitDialogProps> = ({ date, isOpen, onClose }) => {
  const { settings, currencySymbol } = useApp();
  const { limitOverrides, setDateOverride, removeDateOverride } = useExpenses();

  const currentOverride = limitOverrides[date]?.limit;
  const baselineLimit = settings.baselineDailyLimit;

  const [limitStr, setLimitStr] = useState((currentOverride || baselineLimit).toString());
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(limitStr);
    if (!limitStr || isNaN(val) || val <= 0) {
      setError(`Enter a valid limit greater than ${currencySymbol}0.`);
      return;
    }

    await setDateOverride(date, val);
    onClose();
  };

  const handleResetToBaseline = async () => {
    await removeDateOverride(date);
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="edit-limit-title">
      <div className="delete-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="edit-limit-title" className="delete-dialog-title">Daily Spending Limit</h2>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
          Adjust the spending limit for <strong>{date}</strong>. This sets a date-specific override without modifying your global baseline limit ({currencySymbol}{baselineLimit.toLocaleString()}).
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label htmlFor="limit-override-input" className="form-label">
              Limit for {date}
            </label>
            <div className={`amount-input-wrapper ${error ? 'error' : ''}`}>
              <span className="amount-currency-prefix">{currencySymbol}</span>
              <input
                id="limit-override-input"
                type="number"
                step="any"
                min="1"
                className="amount-input tabular-nums"
                value={limitStr}
                onChange={(e) => {
                  setLimitStr(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
            {error && <span className="form-error">{error}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <button type="submit" className="btn-primary-action">
              Save Limit for This Day
            </button>

            {currentOverride !== undefined && (
              <button
                type="button"
                className="btn-secondary-action"
                onClick={handleResetToBaseline}
                style={{ height: '44px' }}
              >
                Reset to Baseline ({currencySymbol}{baselineLimit.toLocaleString()})
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
