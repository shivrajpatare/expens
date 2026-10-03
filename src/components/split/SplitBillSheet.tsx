import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { useExpenses } from '../../context/ExpenseContext';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';
import { useFocusTrap } from '../../lib/a11y/useFocusTrap';
import { MotionButton } from '../motion/MotionButton';
import { Participant, SplitResult } from '../../domain/split/types';
import {
  calculateEqualSplit,
  calculateAutoBalancedSplit,
  initializeAutoBalancedSplit,
  AutoBalanceResult
} from '../../domain/split/splitCalculations';
import { ParticipantRows } from './ParticipantRows';
import './split.css';

interface SplitBillSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type SplitStep = 'details' | 'participants' | 'mode' | 'result';
type AmountSplitMode = 'equal' | 'adjust';

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
  const [mode, setMode] = useState<AmountSplitMode>('equal');

  // Participants State (Current user is always index 0)
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'user_self', name: 'You', isCurrentUser: true },
    { id: 'user_p2', name: 'Friend A', isCurrentUser: false }
  ]);

  // Autonomous Balancing State (Phase 13B)
  const [autoBalancedSplitResult, setAutoBalancedSplitResult] = useState<AutoBalanceResult | null>(null);
  const [residualParticipantId, setResidualParticipantId] = useState<string>('');
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [currentAmounts, setCurrentAmounts] = useState<Record<string, number>>({});
  const [customAmountStrings, setCustomAmountStrings] = useState<Record<string, string>>({});

  // Validation Errors
  const [labelError, setLabelError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

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
      setAutoBalancedSplitResult(null);
      setResidualParticipantId('');
      setEditHistory([]);
      setCurrentAmounts({});
      setCustomAmountStrings({});
      setLabelError(null);
      setAmountError(null);
      setParticipantsError(null);
      setIsAdded(false);
    }
  }, [isOpen]);

  const parsedAmount = parseFloat(amountStr) || 0;

  // Helper to initialize autonomous balanced split from baseline
  const initAdjustSplit = (
    currentParticipants: Participant[],
    total: number,
    billLabel: string
  ): AutoBalanceResult | null => {
    if (total <= 0 || currentParticipants.length < 2) return null;
    try {
      const init = initializeAutoBalancedSplit(total, billLabel.trim() || 'Split Bill', currentParticipants);
      setAutoBalancedSplitResult(init);
      setResidualParticipantId(init.residualParticipantId || '');
      setEditHistory([]);
      const amounts: Record<string, number> = {};
      const strings: Record<string, string> = {};
      init.shares.forEach((s) => {
        amounts[s.participantId] = s.amount;
        strings[s.participantId] = s.amount.toFixed(2);
      });
      setCurrentAmounts(amounts);
      setCustomAmountStrings(strings);
      return init;
    } catch {
      return null;
    }
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
    setAutoBalancedSplitResult(null);
    setResidualParticipantId('');
    setEditHistory([]);
    setCurrentAmounts({});
    setCustomAmountStrings({});
    setParticipantsError(null);
  };

  const handleRemoveParticipant = (id: string) => {
    if (participants.length <= 2) return;
    const nextList = participants.filter((p) => p.id !== id);
    setParticipants(nextList);
    setAutoBalancedSplitResult(null);
    setResidualParticipantId('');
    setEditHistory([]);
    setCurrentAmounts({});
    setCustomAmountStrings({});
  };

  const handleUpdateName = (id: string, newName: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
    if (participantsError) setParticipantsError(null);
  };

  // Autonomous Adjustment Handler (Phase 13B)
  const handleAdjustAmountChange = (participantId: string, valStr: string) => {
    // Preserve exact typed string for the focused input
    setCustomAmountStrings((prev) => ({
      ...prev,
      [participantId]: valStr
    }));

    const numVal = parseFloat(valStr);
    const validNum = !isNaN(numVal) && isFinite(numVal) ? Math.max(0, numVal) : 0;

    const fallbackResidual =
      participants.slice().reverse().find((p) => !p.isCurrentUser)?.id ||
      participants[participants.length - 1].id;
    const activeResidual = residualParticipantId || fallbackResidual;

    try {
      const nextSplit = calculateAutoBalancedSplit({
        billAmount: parsedAmount,
        label: label.trim() || 'Split Bill',
        participants,
        currentAmounts,
        residualParticipantId: activeResidual,
        editedParticipantId: participantId,
        newAmount: validNum,
        editHistory
      });

      setAutoBalancedSplitResult(nextSplit);
      setResidualParticipantId(nextSplit.residualParticipantId!);
      setEditHistory(nextSplit.editHistory || []);

      const nextAmounts: Record<string, number> = {};
      const nextStrings: Record<string, string> = {};
      nextSplit.shares.forEach((s) => {
        nextAmounts[s.participantId] = s.amount;
        if (s.participantId === participantId) {
          nextStrings[s.participantId] = valStr;
        } else {
          nextStrings[s.participantId] = s.amount.toFixed(2);
        }
      });
      setCurrentAmounts(nextAmounts);
      setCustomAmountStrings(nextStrings);
    } catch {
      // Graceful fallback
    }
  };

  const handleAdjustAmountBlur = (participantId: string) => {
    const currentAmt = currentAmounts[participantId] ?? 0;
    setCustomAmountStrings((prev) => ({
      ...prev,
      [participantId]: currentAmt.toFixed(2)
    }));
  };

  // Live Computed Split Result (Guaranteed 100% Reconciled)
  const splitResult = useMemo<SplitResult | null>(() => {
    if (parsedAmount <= 0 || !label.trim() || participants.length < 2) return null;

    try {
      if (mode === 'equal') {
        return calculateEqualSplit(parsedAmount, label, participants);
      } else {
        if (autoBalancedSplitResult && autoBalancedSplitResult.totalAmount === parsedAmount) {
          return autoBalancedSplitResult;
        }
        return initializeAutoBalancedSplit(parsedAmount, label, participants);
      }
    } catch {
      return null;
    }
  }, [parsedAmount, label, participants, mode, autoBalancedSplitResult]);

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
      initAdjustSplit(participants, parsedAmount, label);
      setStep('mode');
    }
  };

  const handleSelectAdjustMode = () => {
    setMode('adjust');
    if (!autoBalancedSplitResult || autoBalancedSplitResult.totalAmount !== parsedAmount) {
      initAdjustSplit(participants, parsedAmount, label);
    }
  };

  const handleProceedToResult = () => {
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
        return 'Split Bill — Divide the Bill';
      case 'result':
        return 'Split Bill — Review Split';
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
                        setCustomAmountStrings({});
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

            {/* STEP 3: DIVIDE THE BILL (AMOUNT-FIRST: EQUAL / CUSTOM) */}
            {step === 'mode' && (
              <div className="split-form-step">
                {/* Header Overview of Total Bill */}
                <div className="split-mode-header-overview">
                  <div className="overview-amount-group">
                    <span className="split-overview-label">Total Bill</span>
                    <span className="split-overview-amount tabular-nums">
                      {currencySymbol}{parsedAmount.toFixed(2)}
                    </span>
                  </div>
                  <p className="split-overview-hint">Choose how much each person pays.</p>
                </div>

                {/* Amount-First Segmented Mode Selector: Equal (Default) / Adjust */}
                <div className="split-mode-selector" role="radiogroup" aria-label="Split mode">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === 'equal'}
                    className={`split-mode-tab ${mode === 'equal' ? 'active' : ''}`}
                    onClick={() => setMode('equal')}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mode === 'adjust'}
                    className={`split-mode-tab ${mode === 'adjust' ? 'active' : ''}`}
                    onClick={handleSelectAdjustMode}
                  >
                    Adjust
                  </button>
                </div>

                {/* EQUAL MODE VIEW — ZERO COGNITIVE WORK */}
                {mode === 'equal' && splitResult && (
                  <div className="equal-split-view">
                    {/* Compact Reconciliation Line */}
                    <div className="equal-reconciled-banner">
                      <span className="equal-reconciled-badge">✓ Bill fully split</span>
                      <span className="equal-reconciled-total tabular-nums">
                        {currencySymbol}{parsedAmount.toFixed(2)} allocated
                      </span>
                    </div>

                    {/* Participant Shares List */}
                    <div className="equal-participants-list">
                      {splitResult.shares.map((s) => (
                        <div
                          key={s.participantId}
                          className={`equal-participant-row ${s.isCurrentUser ? 'current-user-row' : ''}`}
                        >
                          <div className="equal-participant-info">
                            <span className="equal-participant-name">{s.isCurrentUser ? 'You' : s.name}</span>
                            {s.isCurrentUser && <span className="participant-self-badge">Your Share</span>}
                          </div>
                          <div className="equal-participant-amount tabular-nums">
                            {currencySymbol}{s.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Visually Prominent User Share */}
                    <div className="user-share-hero-card">
                      <div className="user-share-meta">
                        <span className="user-share-title">YOUR SHARE</span>
                        <span className="user-share-pct-badge">{splitResult.userShare.percentage}% of bill</span>
                      </div>
                      <div className="user-share-amount tabular-nums">
                        {currencySymbol}{splitResult.userShare.amount.toFixed(2)}
                      </div>
                      <div className="user-share-subtext">
                        Only this amount will be added to your expenses.
                      </div>
                    </div>
                  </div>
                )}

                {/* ADJUST MODE VIEW — AUTONOMOUS RESIDUAL BALANCING (PHASE 13B) */}
                {mode === 'adjust' && splitResult && (
                  <div className="adjust-split-view">
                    {/* Direct Amount Inputs Per Participant */}
                    <div className="adjust-participants-list">
                      {splitResult.shares.map((share) => {
                        const isResidual =
                          share.participantId === (residualParticipantId || splitResult.residualParticipantId);

                        return (
                          <div
                            key={share.participantId}
                            className={`adjust-participant-row ${share.isCurrentUser ? 'current-user-row' : ''}`}
                          >
                            <div className="adjust-participant-info">
                              <span className="adjust-participant-name">
                                {share.isCurrentUser ? 'You' : share.name}
                              </span>
                              {share.isCurrentUser && (
                                <span className="participant-self-badge">Your Share</span>
                              )}
                              {isResidual && (
                                <span
                                  className="participant-auto-badge"
                                  title="This share adjusts automatically to keep the bill balanced"
                                >
                                  Auto
                                </span>
                              )}
                              <span className="adjust-participant-pct tabular-nums">
                                {share.percentage}%
                              </span>
                            </div>

                            <div className="adjust-amount-input-wrapper">
                              <span className="adjust-currency-prefix">{currencySymbol}</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className={`adjust-amount-input tabular-nums ${isResidual ? 'is-auto-rebalanced' : ''}`}
                                placeholder="0.00"
                                value={customAmountStrings[share.participantId] ?? share.amount.toFixed(2)}
                                aria-label={`Amount for ${share.name}`}
                                onChange={(e) => handleAdjustAmountChange(share.participantId, e.target.value)}
                                onBlur={() => handleAdjustAmountBlur(share.participantId)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reassurance Notice — Autonomous Balancing */}
                    <div className="adjust-reassurance-row">
                      <span className="adjust-auto-hint">Other shares adjust automatically.</span>
                      <span className="adjust-status-reconciled">✓ Bill fully split</span>
                    </div>

                    {/* Visually Prominent User Share in Adjust Mode */}
                    <div className="user-share-hero-card">
                      <div className="user-share-meta">
                        <span className="user-share-title">YOUR SHARE</span>
                        <span className="user-share-pct-badge">{splitResult.userShare.percentage}% of bill</span>
                      </div>
                      <div className="user-share-amount tabular-nums">
                        {currencySymbol}{splitResult.userShare.amount.toFixed(2)}
                      </div>
                      <div className="user-share-subtext">
                        Only this amount will be added to your expenses.
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode Action Buttons */}
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
                    onClick={handleProceedToResult}
                  >
                    Review Split
                  </MotionButton>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW SPLIT */}
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
                    You will add only this amount to your personal expenses.
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
                          <span>{s.isCurrentUser ? 'You' : s.name}</span>
                          {s.isCurrentUser && <span className="participant-self-badge">Your Share</span>}
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
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn-secondary-action"
                      onClick={onClose}
                    >
                      Cancel
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
