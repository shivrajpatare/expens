import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { useExpenses } from '../../context/ExpenseContext';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';
import { useFocusTrap } from '../../lib/a11y/useFocusTrap';
import { MotionButton } from '../motion/MotionButton';
import { Participant, SplitMode, SplitResult } from '../../domain/split/types';
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  validateSplitInput
} from '../../domain/split/splitCalculations';
import { SplitAllocationBar } from './SplitAllocationBar';
import { ParticipantRows } from './ParticipantRows';
import './split.css';

interface SplitBillSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type SplitStep = 'details' | 'participants' | 'mode' | 'result';

export const SplitBillSheet: React.FC<SplitBillSheetProps> = ({ isOpen, onClose }) => {
  const { currencySymbol, activeDate } = useApp();
  const { addExpense } = useExpenses();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Dialog Ref & Focus Trap
  const sheetRef = useRef<HTMLDivElement>(null);
  const initialInputRef = useRef<HTMLInputElement>(null);

  useFocusTrap(sheetRef, isOpen, {
    onEscape: onClose,
    initialFocusRef: initialInputRef
  });

  // Flow State
  const [step, setStep] = useState<SplitStep>('details');
  const [label, setLabel] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [mode, setMode] = useState<SplitMode>('equal');

  // Participants State (Current user is always index 0)
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'user_self', name: 'You', isCurrentUser: true },
    { id: 'user_p2', name: 'Friend A', isCurrentUser: false }
  ]);

  // Percentage Allocations State
  const [percentages, setPercentages] = useState<Record<string, number>>({
    user_self: 50,
    user_p2: 50
  });

  // Validation Errors
  const [labelError, setLabelError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);

  // Success Recording State
  const [isAdded, setIsAdded] = useState(false);

  // Reset form when sheet opens
  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setLabel('');
      setAmountStr('');
      setMode('equal');
      setParticipants([
        { id: 'user_self', name: 'You', isCurrentUser: true },
        { id: 'user_p2', name: 'Friend A', isCurrentUser: false }
      ]);
      setPercentages({
        user_self: 50,
        user_p2: 50
      });
      setLabelError(null);
      setAmountError(null);
      setParticipantsError(null);
      setModeError(null);
      setIsAdded(false);
    }
  }, [isOpen]);

  const parsedAmount = parseFloat(amountStr) || 0;

  // Sync default equal percentages when participant count changes
  const resetEqualPercentages = (currentParticipants: Participant[]) => {
    const count = currentParticipants.length;
    const basePct = Math.floor(100 / count);
    const rem = 100 - basePct * count;

    const newPctMap: Record<string, number> = {};
    currentParticipants.forEach((p, idx) => {
      newPctMap[p.id] = idx < rem ? basePct + 1 : basePct;
    });
    setPercentages(newPctMap);
  };

  // Participant Handlers
  const handleAddParticipant = () => {
    if (participants.length >= 12) return;
    const nextChar = String.fromCharCode(64 + participants.length); // e.g. Friend B, C, D
    const newPerson: Participant = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: `Friend ${nextChar}`,
      isCurrentUser: false
    };

    const nextList = [...participants, newPerson];
    setParticipants(nextList);
    resetEqualPercentages(nextList);
    setParticipantsError(null);
  };

  const handleRemoveParticipant = (id: string) => {
    if (participants.length <= 2) return;
    const nextList = participants.filter((p) => p.id !== id);
    setParticipants(nextList);
    resetEqualPercentages(nextList);
  };

  const handleUpdateName = (id: string, newName: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
    if (participantsError) setParticipantsError(null);
  };

  const handlePercentageChange = (participantId: string, newPct: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newPct * 10) / 10));
    setPercentages((prev) => ({
      ...prev,
      [participantId]: clamped
    }));
    setModeError(null);
  };

  // Live Computed Split Result
  const splitResult = useMemo<SplitResult | null>(() => {
    if (parsedAmount <= 0 || !label.trim() || participants.length < 2) return null;

    try {
      if (mode === 'equal') {
        return calculateEqualSplit(parsedAmount, label, participants);
      } else {
        const val = validateSplitInput(parsedAmount, label, participants, 'percentage', percentages);
        if (!val.isValid) return null;
        return calculatePercentageSplit(parsedAmount, label, participants, percentages);
      }
    } catch {
      return null;
    }
  }, [parsedAmount, label, participants, mode, percentages]);

  // Step 1 validation
  const validateStep1 = (): boolean => {
    let valid = true;
    if (!label.trim()) {
      setLabelError('Please enter what this bill was for.');
      valid = false;
    } else {
      setLabelError(null);
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError(`Enter a bill amount greater than ${currencySymbol}0.`);
      valid = false;
    } else {
      setAmountError(null);
    }

    return valid;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    if (participants.length < 2) {
      setParticipantsError('A split requires at least 2 participants.');
      return false;
    }

    const trimmed = participants.map((p) => p.name.trim().toLowerCase());
    if (trimmed.some((n) => !n)) {
      setParticipantsError('All participants must have a name.');
      return false;
    }

    const unique = new Set(trimmed);
    if (unique.size !== trimmed.length) {
      setParticipantsError('Participant names must be unique.');
      return false;
    }

    setParticipantsError(null);
    return true;
  };

  // Navigation Handlers
  const handleProceedFromDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep('participants');
    }
  };

  const handleProceedFromParticipants = () => {
    if (validateStep2()) {
      setStep('mode');
    }
  };

  const handleProceedToResult = () => {
    if (mode === 'percentage') {
      const val = validateSplitInput(parsedAmount, label, participants, 'percentage', percentages);
      if (!val.isValid) {
        setModeError(val.error || 'Percentage allocation must total 100%.');
        return;
      }
    }
    setModeError(null);
    setStep('result');
  };

  // Final Action: Add ONLY User's Share to Expense Ledger
  const handleAddMyShareToExpenses = async () => {
    if (!splitResult) return;

    // Call existing addExpense boundary with ONLY the user's portion
    await addExpense({
      description: splitResult.label,
      amount: splitResult.userShare.amount,
      date: activeDate
    });

    setIsAdded(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const formatStepTitle = () => {
    switch (step) {
      case 'details':
        return 'Split Bill — Bill Details';
      case 'participants':
        return 'Split Bill — Who Was There?';
      case 'mode':
        return 'Split Bill — How to Split?';
      case 'result':
        return 'Split Bill — Summary';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="sheet-backdrop"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="split-bill-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
        >
          <motion.div
            ref={sheetRef}
            tabIndex={-1}
            className="bottom-sheet split-bill-sheet"
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
            {/* Sheet Header */}
            <div className="sheet-header">
              <div className="sheet-title-group">
                <h2 id="split-bill-title" className="sheet-title">
                  {formatStepTitle()}
                </h2>
                <div className="split-step-indicators">
                  <span className={`step-dot ${step === 'details' ? 'active' : 'done'}`} />
                  <span className={`step-dot ${step === 'participants' ? 'active' : step === 'mode' || step === 'result' ? 'done' : ''}`} />
                  <span className={`step-dot ${step === 'mode' ? 'active' : step === 'result' ? 'done' : ''}`} />
                  <span className={`step-dot ${step === 'result' ? 'active' : ''}`} />
                </div>
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

            {/* STEP 1: BILL DETAILS */}
            {step === 'details' && (
              <form className="split-form-step" onSubmit={handleProceedFromDetails}>
                <div className="form-group">
                  <label htmlFor="split-label-input" className="form-label">
                    What was the bill for?
                  </label>
                  <input
                    id="split-label-input"
                    ref={initialInputRef}
                    type="text"
                    className={`form-input ${labelError ? 'error' : ''}`}
                    placeholder="e.g. Dinner with friends, Team pizza, Taxi"
                    value={label}
                    autoComplete="off"
                    onChange={(e) => {
                      setLabel(e.target.value);
                      if (labelError) setLabelError(null);
                    }}
                  />
                  {labelError && <span className="form-error">{labelError}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="split-amount-input" className="form-label">
                    Bill Amount
                  </label>
                  <div className={`amount-input-wrapper ${amountError ? 'error' : ''}`}>
                    <span className="amount-currency-prefix">{currencySymbol}</span>
                    <input
                      id="split-amount-input"
                      type="number"
                      step="any"
                      min="0.01"
                      className="amount-input tabular-nums"
                      placeholder="0.00"
                      value={amountStr}
                      onChange={(e) => {
                        setAmountStr(e.target.value);
                        if (amountError) setAmountError(null);
                      }}
                    />
                  </div>
                  {amountError && <span className="form-error">{amountError}</span>}
                </div>

                <div className="split-action-row">
                  <MotionButton type="submit" className="btn-primary-action">
                    Continue to Participants
                  </MotionButton>
                </div>
              </form>
            )}

            {/* STEP 2: PARTICIPANTS */}
            {step === 'participants' && (
              <div className="split-form-step">
                <div className="step-prompt-note">
                  Define who was part of this bill. You are always included as participant 1.
                </div>

                <ParticipantRows
                  participants={participants}
                  currencySymbol={currencySymbol}
                  onUpdateName={handleUpdateName}
                  onAddParticipant={handleAddParticipant}
                  onRemoveParticipant={handleRemoveParticipant}
                />

                {participantsError && <span className="form-error">{participantsError}</span>}

                <div className="split-dual-actions">
                  <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={() => setStep('details')}
                  >
                    Back
                  </button>
                  <MotionButton
                    type="button"
                    className="btn-primary-action"
                    onClick={handleProceedFromParticipants}
                  >
                    Continue to Split Mode
                  </MotionButton>
                </div>
              </div>
            )}

            {/* STEP 3: SPLIT MODE */}
            {step === 'mode' && (
              <div className="split-form-step">
                {/* Segmented Mode Selector */}
                <div className="split-mode-selector" role="radiogroup" aria-label="Split mode">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === 'equal'}
                    className={`split-mode-tab ${mode === 'equal' ? 'active' : ''}`}
                    onClick={() => {
                      setMode('equal');
                      setModeError(null);
                    }}
                  >
                    Equal Split
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === 'percentage'}
                    className={`split-mode-tab ${mode === 'percentage' ? 'active' : ''}`}
                    onClick={() => {
                      setMode('percentage');
                      setModeError(null);
                    }}
                  >
                    Percentage Split
                  </button>
                </div>

                {/* Equal Mode View */}
                {mode === 'equal' && splitResult && (
                  <div className="equal-split-view">
                    <div className="equal-formula-badge">
                      <span>Total: {currencySymbol}{parsedAmount.toFixed(2)}</span>
                      <span>÷ {participants.length} people</span>
                    </div>

                    <ParticipantRows
                      participants={participants}
                      shares={splitResult.shares}
                      currencySymbol={currencySymbol}
                      onUpdateName={() => {}}
                      onAddParticipant={() => {}}
                      onRemoveParticipant={() => {}}
                      isReadOnly={true}
                    />
                  </div>
                )}

                {/* Percentage Mode View */}
                {mode === 'percentage' && (
                  <div className="percentage-split-view">
                    <SplitAllocationBar
                      participants={participants}
                      percentages={percentages}
                      onPercentageChange={handlePercentageChange}
                      currencySymbol={currencySymbol}
                      totalAmount={parsedAmount}
                    />

                    {splitResult && (
                      <div className="percentage-live-breakdown">
                        <ParticipantRows
                          participants={participants}
                          shares={splitResult.shares}
                          currencySymbol={currencySymbol}
                          onUpdateName={() => {}}
                          onAddParticipant={() => {}}
                          onRemoveParticipant={() => {}}
                          isReadOnly={true}
                        />
                      </div>
                    )}
                  </div>
                )}

                {modeError && <span className="form-error">{modeError}</span>}

                <div className="split-dual-actions">
                  <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={() => setStep('participants')}
                  >
                    Back
                  </button>
                  <MotionButton
                    type="button"
                    className="btn-primary-action"
                    disabled={mode === 'percentage' && !splitResult}
                    onClick={handleProceedToResult}
                  >
                    Review Final Split
                  </MotionButton>
                </div>
              </div>
            )}

            {/* STEP 4: RESULT / CONFIRMATION */}
            {step === 'result' && splitResult && (
              <div className="split-form-step split-result-step">
                {/* Bill Header Overview */}
                <div className="result-bill-header">
                  <span className="result-bill-label">{splitResult.label}</span>
                  <div className="result-bill-total">
                    <span className="result-total-label">Total Bill</span>
                    <span className="result-total-val tabular-nums">
                      {currencySymbol}{splitResult.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Prominently Highlighted User Share */}
                <div className="user-share-hero-card">
                  <div className="user-share-meta">
                    <span className="user-share-title">YOUR SHARE</span>
                    <span className="user-share-pct-badge">{splitResult.userShare.percentage}%</span>
                  </div>
                  <div className="user-share-amount tabular-nums">
                    {currencySymbol}{splitResult.userShare.amount.toFixed(2)}
                  </div>
                  <div className="user-share-subtext">
                    Only this amount will be added to your expenses.
                  </div>
                </div>

                {/* All Participants Breakdown */}
                <div className="result-breakdown-section">
                  <span className="result-section-label">All Shares Breakdown</span>
                  <div className="result-shares-list">
                    {splitResult.shares.map((s) => (
                      <div
                        key={s.participantId}
                        className={`result-share-row ${s.isCurrentUser ? 'current-user-share' : ''}`}
                      >
                        <div className="share-row-name">
                          <span>{s.name}</span>
                          {s.isCurrentUser && <span className="you-pill">You</span>}
                        </div>
                        <div className="share-row-vals">
                          <span className="share-pct">{s.percentage}%</span>
                          <span className="share-amt tabular-nums">
                            {currencySymbol}{s.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary & Secondary Actions */}
                <div className="result-actions-column">
                  <MotionButton
                    type="button"
                    className="btn-primary-action btn-add-share-action"
                    onClick={handleAddMyShareToExpenses}
                    disabled={isAdded}
                  >
                    {isAdded ? (
                      <span>Added to Expenses ✓</span>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        <span>
                          Add {currencySymbol}{splitResult.userShare.amount.toFixed(2)} to Expenses
                        </span>
                      </>
                    )}
                  </MotionButton>

                  <div className="result-nav-row">
                    <button
                      type="button"
                      className="btn-secondary-action"
                      onClick={() => setStep('mode')}
                      disabled={isAdded}
                    >
                      Adjust Split
                    </button>
                    <button
                      type="button"
                      className="btn-secondary-action"
                      onClick={onClose}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
