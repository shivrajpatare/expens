/**
 * Phase 9: AI Insight Layer — Types & Contracts
 * 
 * Defines the structured intermediate representation (InsightFacts),
 * insight claims with provenance (InsightClaim), and insight types.
 */

export type InsightType =
  | 'PERIOD_SUMMARY'
  | 'PERIOD_CHANGE'
  | 'CATEGORY_PATTERN'
  | 'HIGH_SPEND_DAY'
  | 'LIMIT_PATTERN';

export type InsightTier = 'local' | 'groq';

export interface CategoryFact {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface DailySpendingFact {
  date: string;
  spent: number;
  limit: number;
  status: string; // 'safe' | 'near-limit' | 'over-limit'
}

export interface DayFact {
  date: string;
  amount: number;
  dayOfWeek: string;
}

export interface LimitAdherenceFact {
  daysWithinLimit: number;
  daysOverLimit: number;
  totalDays: number;
  rate: number; // 0 - 100 percentage
}

export interface PeriodComparisonFact {
  absoluteDifference: number;
  percentageDifference: number | null; // null if previous period was 0
  isIncrease: boolean;
  isSame: boolean;
}

export interface PreviousPeriodFact {
  totalSpent: number;
  averagePerDay: number;
  expenseCount: number;
}

export interface AuditSummaryFact {
  isClear: boolean;
  findingCount: number;
  attentionCount: number;
}

/**
 * Structured intermediate representation of verified financial facts.
 * The Money Engine and Audit Engine produce this. The AI only consumes this.
 */
export interface InsightFacts {
  period: 'week' | 'month';
  periodLabel: string;
  previousPeriodLabel?: string;
  currencySymbol: string;

  totalSpent: number;
  averagePerDay: number;
  expenseCount: number;

  highestDay?: DayFact;
  lowestDay?: DayFact;

  limitAdherence: LimitAdherenceFact;
  categories: CategoryFact[];
  dailySpending: DailySpendingFact[];

  previousPeriod?: PreviousPeriodFact;
  comparison?: PeriodComparisonFact;
  auditSummary?: AuditSummaryFact;
}

/**
 * Individual insight claim with internal provenance.
 */
export interface InsightClaim {
  id: string;
  type: InsightType;
  text: string;
  sourceFactIds: string[];
  tier: InsightTier;
}

/**
 * Complete insight report returned to the UI.
 */
export interface InsightReport {
  facts: InsightFacts;
  insights: InsightClaim[];
  tier: InsightTier;
  fallbackNotice?: string;
}

/**
 * Registered fact IDs for strict provenance tracking.
 */
export const VALID_FACT_IDS = new Set([
  'current_period_total',
  'previous_period_total',
  'period_change_absolute',
  'period_change_percentage',
  'period_change_direction',
  'top_category_name',
  'top_category_amount',
  'top_category_percentage',
  'highest_day_date',
  'highest_day_name',
  'highest_day_amount',
  'lowest_day_date',
  'lowest_day_name',
  'lowest_day_amount',
  'limit_adherence_rate',
  'days_within_limit',
  'days_over_limit',
  'total_days_tracked',
  'expense_count',
  'average_per_day',
  'audit_is_clear',
  'audit_finding_count'
]);
