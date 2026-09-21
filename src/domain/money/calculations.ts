import type { Expense } from '../../types/expense';
import type { DailyFinancialState } from './types';

/**
 * Rounds a financial amount to 2 decimal places to eliminate floating-point arithmetic errors.
 */
export function roundToCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates the complete deterministic financial state for a single calendar day.
 */
export function calculateDailyFinancialState(
  date: string,
  expensesForDate: Expense[],
  dailyLimit: number
): DailyFinancialState {
  // Sum expenses on date
  const rawSum = expensesForDate.reduce((sum, exp) => sum + exp.amount, 0);
  const dailySpent = roundToCurrency(rawSum);

  const remaining = roundToCurrency(dailyLimit - dailySpent);
  const isOverLimit = dailySpent > dailyLimit;
  const overLimitAmount = isOverLimit ? roundToCurrency(dailySpent - dailyLimit) : 0;

  // Percentage used calculation
  const percentageUsed = dailyLimit > 0 ? Math.round((dailySpent / dailyLimit) * 100) : 0;

  // Near-limit threshold: 80% to 99% spent (and not strictly over limit)
  const isNearLimit = percentageUsed >= 80 && percentageUsed < 100 && !isOverLimit;

  return {
    date,
    dailyLimit,
    dailySpent,
    remaining,
    overLimitAmount,
    percentageUsed,
    isNearLimit,
    isOverLimit,
    expenseCount: expensesForDate.length
  };
}
