import type { Expense } from '../../types/expense';
import type {
  PeriodFinancialSummary,
  DailyLimitOverride,
  DateRangeInfo,
  DailyBreakdownItem,
  CategoryDistributionItem,
  PeriodAdherence,
  HighLowDay
} from './types';
import { roundToCurrency } from './calculations.ts';
import { resolveDailyLimit } from './limitResolver.ts';

/**
 * Calculates period-level financial facts deterministically.
 * Applies the locked Product Constitution formulas:
 * - Total Spent = SUM(expenses in period)
 * - Highest / Lowest = MAX(amount) / MIN(amount)
 * - Daily Average = Total Spent / Active Tracked Days
 * - Adherence Rate = (Days within limit / Total tracked days) * 100
 */
export function calculatePeriodSummary(
  expenses: Expense[],
  dateLimits: Record<string, number>
): PeriodFinancialSummary {
  if (expenses.length === 0) {
    return {
      totalSpent: 0,
      expenseCount: 0,
      highestExpense: 0,
      lowestExpense: 0,
      dailyAverage: 0,
      activeTrackedDays: 0,
      daysWithinLimit: 0,
      daysOverLimit: 0,
      adherenceRate: 100
    };
  }

  let totalSpent = 0;
  let highestExpense = -Infinity;
  let lowestExpense = Infinity;

  // Group daily spending to compute active days and adherence
  const dailySpendingMap: Record<string, number> = {};

  for (const exp of expenses) {
    totalSpent += exp.amount;
    if (exp.amount > highestExpense) highestExpense = exp.amount;
    if (exp.amount < lowestExpense) lowestExpense = exp.amount;

    dailySpendingMap[exp.date] = (dailySpendingMap[exp.date] || 0) + exp.amount;
  }

  totalSpent = roundToCurrency(totalSpent);
  highestExpense = highestExpense === -Infinity ? 0 : roundToCurrency(highestExpense);
  lowestExpense = lowestExpense === Infinity ? 0 : roundToCurrency(lowestExpense);

  const activeDates = Object.keys(dailySpendingMap);
  const activeTrackedDays = activeDates.length;

  let daysWithinLimit = 0;
  let daysOverLimit = 0;

  for (const d of activeDates) {
    const daySpent = dailySpendingMap[d];
    const limitForDay = dateLimits[d] ?? 1000;
    if (daySpent <= limitForDay) {
      daysWithinLimit += 1;
    } else {
      daysOverLimit += 1;
    }
  }

  const dailyAverage = activeTrackedDays > 0 ? roundToCurrency(totalSpent / activeTrackedDays) : 0;
  const adherenceRate = activeTrackedDays > 0 ? Math.round((daysWithinLimit / activeTrackedDays) * 100) : 100;

  return {
    totalSpent,
    expenseCount: expenses.length,
    highestExpense,
    lowestExpense,
    dailyAverage,
    activeTrackedDays,
    daysWithinLimit,
    daysOverLimit,
    adherenceRate
  };
}

/**
 * Filter expenses falling strictly within an inclusive [startDate, endDate] range (YYYY-MM-DD).
 */
export function filterExpensesByDateRange(
  expenses: Expense[],
  startDate: string,
  endDate: string
): Expense[] {
  return expenses.filter((e) => e.date >= startDate && e.date <= endDate);
}

/**
 * Helper to format a Date object into YYYY-MM-DD
 */
function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to format short date string for display (e.g. "14 Sep")
 */
function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Computes Monday → Sunday week range containing anchor date.
 */
export function getWeekRange(dateStr: string, todayStr: string): DateRangeInfo {
  const d = new Date(dateStr + 'T00:00:00');
  // Day of week: 0=Mon, ..., 6=Sun
  const dayOfWeek = (d.getDay() + 6) % 7;

  // Monday of the week
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayOfWeek);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    dates.push(toIsoDate(cur));
  }

  const startDate = dates[0];
  const endDate = dates[6];

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Label: e.g. "14 Sep – 20 Sep 2026" or spanning months: "28 Sep – 4 Oct 2026"
  const startLabel = formatShortDate(monday);
  const endLabel = formatShortDate(sunday);
  const year = monday.getFullYear();
  const label = `${startLabel} – ${endLabel} ${year}`;

  const isCurrent = dates.includes(todayStr);

  return {
    startDate,
    endDate,
    dates,
    label,
    isCurrent,
    year
  };
}

/**
 * Computes 1st to last day of calendar month containing anchor date.
 */
export function getMonthRange(dateStr: string, todayStr: string): DateRangeInfo {
  const d = new Date(dateStr + 'T00:00:00');
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed

  // Last day of month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    dates.push(`${year}-${monthStr}-${dayStr}`);
  }

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const monthName = d.toLocaleDateString(undefined, { month: 'long' });
  const label = `${monthName} ${year}`;

  const isCurrent = dates.includes(todayStr);

  return {
    startDate,
    endDate,
    dates,
    label,
    isCurrent,
    year,
    month
  };
}

/**
 * Aggregates spending and limits for each day in a period.
 * Reuses the existing Phase 5 resolveDailyLimit logic and near-limit thresholds.
 */
export function getDailySpendingBreakdown(
  dates: string[],
  expenses: Expense[],
  limitOverrides: Record<string, DailyLimitOverride> | DailyLimitOverride[],
  baselineLimit: number
): DailyBreakdownItem[] {
  // Group expenses by date
  const expensesByDate: Record<string, Expense[]> = {};
  for (const exp of expenses) {
    if (!expensesByDate[exp.date]) {
      expensesByDate[exp.date] = [];
    }
    expensesByDate[exp.date].push(exp);
  }

  const isWeek = dates.length <= 7;

  return dates.map((dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayExpenses = expensesByDate[dateStr] || [];
    const rawSum = dayExpenses.reduce((s, e) => s + e.amount, 0);
    const spent = roundToCurrency(rawSum);

    // Reuse existing authoritative resolver
    const limit = resolveDailyLimit(dateStr, limitOverrides, baselineLimit);
    const isOverLimit = spent > limit;
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    // Exactly matches Phase 3 & Money Engine Near Limit definition
    const isNearLimit = percentage >= 80 && percentage < 100 && !isOverLimit;

    // Day labels: "Mon", "Tue" for week; "1", "2", ... for month
    const dayLabel = isWeek
      ? d.toLocaleDateString(undefined, { weekday: 'short' })
      : String(d.getDate());

    const fullDate = d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return {
      date: dateStr,
      dayLabel,
      fullDate,
      spent,
      limit,
      isOverLimit,
      isNearLimit,
      percentage
    };
  });
}

/**
 * Calculates category distribution sorted descending by spending amount.
 */
export function getCategoryDistribution(expenses: Expense[]): CategoryDistributionItem[] {
  if (expenses.length === 0) return [];

  const categoryMap: Record<string, { amount: number; count: number }> = {};
  let totalSpent = 0;

  for (const exp of expenses) {
    totalSpent += exp.amount;
    if (!categoryMap[exp.category]) {
      categoryMap[exp.category] = { amount: 0, count: 0 };
    }
    categoryMap[exp.category].amount += exp.amount;
    categoryMap[exp.category].count += 1;
  }

  totalSpent = roundToCurrency(totalSpent);

  const items: CategoryDistributionItem[] = Object.keys(categoryMap).map((cat) => {
    const catData = categoryMap[cat];
    const amount = roundToCurrency(catData.amount);
    const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
    return {
      category: cat,
      amount,
      percentage,
      count: catData.count
    };
  });

  // Sort descending by amount
  return items.sort((a, b) => b.amount - a.amount);
}

/**
 * Finds highest and lowest spending days in the period.
 * Considers all days in the period (including ₹0 days) unless total period spent is 0.
 */
export function getHighestAndLowestDays(
  dailyBreakdown: DailyBreakdownItem[]
): {
  highest: HighLowDay | null;
  lowest: HighLowDay | null;
} {
  if (dailyBreakdown.length === 0) {
    return { highest: null, lowest: null };
  }

  const totalSpent = dailyBreakdown.reduce((sum, d) => sum + d.spent, 0);
  if (totalSpent === 0) {
    return { highest: null, lowest: null };
  }

  const isWeek = dailyBreakdown.length <= 7;

  let highestItem = dailyBreakdown[0];
  let lowestItem = dailyBreakdown[0];

  for (const item of dailyBreakdown) {
    if (item.spent > highestItem.spent) {
      highestItem = item;
    }
    if (item.spent < lowestItem.spent) {
      lowestItem = item;
    }
  }

  const formatDayName = (item: DailyBreakdownItem): string => {
    const d = new Date(item.date + 'T00:00:00');
    if (isWeek) {
      return d.toLocaleDateString(undefined, { weekday: 'long' }); // e.g. "Saturday"
    }
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); // e.g. "14 Sep"
  };

  return {
    highest: {
      date: highestItem.date,
      dayName: formatDayName(highestItem),
      amount: highestItem.spent
    },
    lowest: {
      date: lowestItem.date,
      dayName: formatDayName(lowestItem),
      amount: lowestItem.spent
    }
  };
}

/**
 * Computes period limit adherence where denominator is the full period (7 days or days in month).
 */
export function calculatePeriodAdherence(
  dailyBreakdown: DailyBreakdownItem[]
): PeriodAdherence {
  const totalDays = dailyBreakdown.length;
  if (totalDays === 0) {
    return {
      daysWithinLimit: 0,
      daysOverLimit: 0,
      totalDays: 0,
      adherenceRate: 100
    };
  }

  const daysWithinLimit = dailyBreakdown.filter((d) => !d.isOverLimit).length;
  const daysOverLimit = dailyBreakdown.filter((d) => d.isOverLimit).length;
  const adherenceRate = Math.round((daysWithinLimit / totalDays) * 100);

  return {
    daysWithinLimit,
    daysOverLimit,
    totalDays,
    adherenceRate
  };
}
