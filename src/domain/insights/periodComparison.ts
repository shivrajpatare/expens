/**
 * Phase 9: Deterministic Period Comparison & Insight Facts Builder
 * 
 * Computes like-for-like period comparisons and constructs the structured
 * InsightFacts intermediate representation consumed by Tier 1 and Tier 2.
 */

import type { Expense } from '../../types/expense';
import type { DailyLimitOverride, DateRangeInfo, PeriodMode } from '../money/types';
import type { AuditReport } from '../audit/types';
import type {
  InsightFacts,
  PeriodComparisonFact,
  PreviousPeriodFact,
  DayFact
} from './types.ts';
import { roundToCurrency } from '../money/calculations.ts';
import {
  getWeekRange,
  getMonthRange,
  getDailySpendingBreakdown,
  getCategoryDistribution,
  getHighestAndLowestDays,
  calculatePeriodAdherence,
  filterExpensesByDateRange
} from '../money/periodCalculations.ts';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Gets the day name (e.g. "Saturday") for a YYYY-MM-DD date string.
 */
export function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  return DAY_NAMES[date.getDay()] || '';
}

/**
 * Computes the exact previous like-for-like period range.
 * - Week: shifts back exactly 7 days (Monday -> Sunday).
 * - Month: shifts back exactly 1 calendar month (1st to last day).
 */
export function getPreviousPeriodRange(
  mode: PeriodMode,
  currentStartDate: string,
  todayStr: string
): DateRangeInfo {
  const [y, m, d] = currentStartDate.split('-').map((n) => parseInt(n, 10));

  if (mode === 'week') {
    const prevDate = new Date(y, m - 1, d);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevY = prevDate.getFullYear();
    const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
    const prevD = String(prevDate.getDate()).padStart(2, '0');
    const prevAnchor = `${prevY}-${prevM}-${prevD}`;
    return getWeekRange(prevAnchor, todayStr);
  }

  // Month mode: 1 month prior
  const prevDate = new Date(y, m - 1, 1);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevY = prevDate.getFullYear();
  const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
  const prevAnchor = `${prevY}-${prevM}-01`;
  return getMonthRange(prevAnchor, todayStr);
}

/**
 * Deterministically compares two financial period totals.
 */
export function calculatePeriodComparison(
  currentTotal: number,
  prevTotal: number
): PeriodComparisonFact {
  const roundedCurrent = roundToCurrency(currentTotal);
  const roundedPrev = roundToCurrency(prevTotal);

  const absoluteDifference = roundToCurrency(Math.abs(roundedCurrent - roundedPrev));
  const isSame = roundedCurrent === roundedPrev;
  const isIncrease = roundedCurrent > roundedPrev;

  let percentageDifference: number | null = null;
  if (roundedPrev > 0) {
    percentageDifference = roundToCurrency(
      ((roundedCurrent - roundedPrev) / roundedPrev) * 100
    );
  }

  return {
    absoluteDifference,
    percentageDifference,
    isIncrease,
    isSame
  };
}

/**
 * Builds the complete structured InsightFacts intermediate representation.
 * All numbers originate from deterministic Money Engine calculations.
 */
export function buildInsightFacts(params: {
  mode: PeriodMode;
  currentRange: DateRangeInfo;
  expenses: Expense[];
  limitOverrides: Record<string, DailyLimitOverride> | DailyLimitOverride[];
  baselineDailyLimit: number;
  currencySymbol: string;
  todayStr: string;
  auditReport?: AuditReport;
}): InsightFacts {
  const {
    mode,
    currentRange,
    expenses,
    limitOverrides,
    baselineDailyLimit,
    currencySymbol,
    todayStr,
    auditReport
  } = params;

  // 1. Current period calculations
  const periodExpenses = filterExpensesByDateRange(
    expenses,
    currentRange.startDate,
    currentRange.endDate
  );

  const dailyBreakdown = getDailySpendingBreakdown(
    currentRange.dates,
    periodExpenses,
    limitOverrides,
    baselineDailyLimit
  );

  const totalSpent = roundToCurrency(
    periodExpenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0)
  );

  const totalDays = currentRange.dates.length;
  const averagePerDay = totalDays > 0 ? roundToCurrency(totalSpent / totalDays) : 0;
  const expenseCount = periodExpenses.length;

  const highLow = getHighestAndLowestDays(dailyBreakdown);
  const adherence = calculatePeriodAdherence(dailyBreakdown);
  const categories = getCategoryDistribution(periodExpenses);

  const highestDay: DayFact | undefined = highLow.highest
    ? {
        date: highLow.highest.date,
        amount: highLow.highest.amount,
        dayOfWeek: getDayName(highLow.highest.date)
      }
    : undefined;

  const lowestDay: DayFact | undefined = highLow.lowest
    ? {
        date: highLow.lowest.date,
        amount: highLow.lowest.amount,
        dayOfWeek: getDayName(highLow.lowest.date)
      }
    : undefined;

  // 2. Previous period calculations (like-for-like)
  const prevRange = getPreviousPeriodRange(mode, currentRange.startDate, todayStr);
  const prevExpenses = filterExpensesByDateRange(
    expenses,
    prevRange.startDate,
    prevRange.endDate
  );
  const prevTotal = roundToCurrency(
    prevExpenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0)
  );
  const prevDays = prevRange.dates.length;
  const prevAvg = prevDays > 0 ? roundToCurrency(prevTotal / prevDays) : 0;

  const previousPeriod: PreviousPeriodFact = {
    totalSpent: prevTotal,
    averagePerDay: prevAvg,
    expenseCount: prevExpenses.length
  };

  const comparison = calculatePeriodComparison(totalSpent, prevTotal);

  // 3. Daily spending facts
  const dailySpending = dailyBreakdown.map((d) => {
    let status = 'safe';
    if (d.isOverLimit) status = 'over-limit';
    else if (d.isNearLimit) status = 'near-limit';
    return {
      date: d.date,
      spent: d.spent,
      limit: d.limit,
      status
    };
  });

  // 4. Audit summary facts (if provided)
  const auditSummary = auditReport
    ? {
        isClear: auditReport.summary.isClear,
        findingCount: auditReport.summary.findingCount,
        attentionCount: auditReport.summary.attentionCount
      }
    : undefined;

  return {
    period: mode,
    periodLabel: currentRange.label,
    previousPeriodLabel: prevRange.label,
    currencySymbol,
    totalSpent,
    averagePerDay,
    expenseCount,
    highestDay,
    lowestDay,
    limitAdherence: {
      daysWithinLimit: adherence.daysWithinLimit,
      daysOverLimit: adherence.daysOverLimit,
      totalDays: adherence.totalDays,
      rate: adherence.adherenceRate
    },
    categories: categories.map((c) => ({
      category: c.category,
      amount: c.amount,
      percentage: c.percentage,
      count: c.count
    })),
    dailySpending,
    previousPeriod,
    comparison,
    auditSummary
  };
}
