export interface DailyFinancialState {
  date: string;
  dailyLimit: number;
  dailySpent: number;
  remaining: number;
  overLimitAmount: number;
  percentageUsed: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
  expenseCount: number;
}

export interface PeriodFinancialSummary {
  totalSpent: number;
  expenseCount: number;
  highestExpense: number;
  lowestExpense: number;
  dailyAverage: number;
  activeTrackedDays: number;
  daysWithinLimit: number;
  daysOverLimit: number;
  adherenceRate: number;
}

export interface DailyLimitOverride {
  date: string; // YYYY-MM-DD
  limit: number;
  createdAt: string;
  updatedAt: string;
}

export type PeriodMode = 'week' | 'month';

export interface DateRangeInfo {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dates: string[];   // All YYYY-MM-DD strings in the range
  label: string;     // e.g. "14 Sep – 20 Sep 2026" or "September 2026"
  isCurrent: boolean; // Whether current date falls in this range
  year: number;
  month?: number;    // 0-indexed (for month mode)
}

export interface DailyBreakdownItem {
  date: string;
  dayLabel: string;  // e.g. "Mon" or "14"
  fullDate: string;  // e.g. "Monday, 14 September 2026"
  spent: number;
  limit: number;
  isOverLimit: boolean;
  isNearLimit: boolean;
  percentage: number;
}

export interface CategoryDistributionItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface PeriodAdherence {
  daysWithinLimit: number;
  daysOverLimit: number;
  totalDays: number;
  adherenceRate: number; // 0 - 100
}

export interface HighLowDay {
  date: string;
  dayName: string; // e.g. "Saturday" or "14 Sep"
  amount: number;
}
