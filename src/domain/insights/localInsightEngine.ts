/**
 * Phase 9: Tier 1 Local Insight Engine
 * 
 * 100% offline, deterministic rule-based template generator.
 * Produces structured InsightClaims strictly derived from InsightFacts.
 */

import type { InsightClaim, InsightFacts, InsightType } from './types.ts';

/**
 * Deterministic UI priority order for insights:
 * 1. PERIOD_CHANGE
 * 2. CATEGORY_PATTERN
 * 3. HIGH_SPEND_DAY
 * 4. LIMIT_PATTERN
 * 5. PERIOD_SUMMARY
 */
export const INSIGHT_PRIORITY_ORDER: Record<InsightType, number> = {
  PERIOD_CHANGE: 1,
  CATEGORY_PATTERN: 2,
  HIGH_SPEND_DAY: 3,
  LIMIT_PATTERN: 4,
  PERIOD_SUMMARY: 5
};

/**
 * Generates deterministic Tier 1 insights from structured facts.
 */
export function generateLocalInsights(facts: InsightFacts): InsightClaim[] {
  // If no expenses exist in the period, do not produce fake insights
  if (facts.expenseCount === 0 || facts.totalSpent === 0) {
    return [];
  }

  const claims: InsightClaim[] = [];
  const sym = facts.currencySymbol;
  const periodWord = facts.period === 'week' ? 'week' : 'month';

  // 1. PERIOD_CHANGE (if previous period exists and comparison is meaningful)
  if (facts.previousPeriod && facts.comparison) {
    const { absoluteDifference, percentageDifference, isIncrease, isSame } = facts.comparison;
    const prevTotal = facts.previousPeriod.totalSpent;

    if (isSame) {
      claims.push({
        id: 'local-period-change',
        type: 'PERIOD_CHANGE',
        text: `Spending was the same as the previous ${periodWord} (${sym}${facts.totalSpent.toFixed(2)}).`,
        sourceFactIds: ['current_period_total', 'previous_period_total', 'period_change_absolute'],
        tier: 'local'
      });
    } else if (prevTotal === 0) {
      claims.push({
        id: 'local-period-change',
        type: 'PERIOD_CHANGE',
        text: `Spending was ${sym}${absoluteDifference.toFixed(2)} higher than the previous ${periodWord} (which had no expenses).`,
        sourceFactIds: ['current_period_total', 'previous_period_total', 'period_change_absolute'],
        tier: 'local'
      });
    } else if (isIncrease) {
      const pctStr = percentageDifference !== null ? ` (+${percentageDifference.toFixed(1)}%)` : '';
      claims.push({
        id: 'local-period-change',
        type: 'PERIOD_CHANGE',
        text: `Spending was ${sym}${absoluteDifference.toFixed(2)} higher than the previous ${periodWord}${pctStr}.`,
        sourceFactIds: [
          'current_period_total',
          'previous_period_total',
          'period_change_absolute',
          'period_change_percentage'
        ],
        tier: 'local'
      });
    } else {
      const pctStr = percentageDifference !== null ? ` (-${Math.abs(percentageDifference).toFixed(1)}%)` : '';
      claims.push({
        id: 'local-period-change',
        type: 'PERIOD_CHANGE',
        text: `Spending was ${sym}${absoluteDifference.toFixed(2)} lower than the previous ${periodWord}${pctStr}.`,
        sourceFactIds: [
          'current_period_total',
          'previous_period_total',
          'period_change_absolute',
          'period_change_percentage'
        ],
        tier: 'local'
      });
    }
  }

  // 2. CATEGORY_PATTERN (Top category)
  if (facts.categories.length > 0) {
    const topCat = facts.categories[0];
    claims.push({
      id: 'local-top-category',
      type: 'CATEGORY_PATTERN',
      text: `${topCat.category} accounted for ${topCat.percentage}% of spending this ${periodWord} (${sym}${topCat.amount.toFixed(2)}).`,
      sourceFactIds: ['top_category_name', 'top_category_percentage', 'top_category_amount'],
      tier: 'local'
    });
  }

  // 3. HIGH_SPEND_DAY
  if (facts.highestDay && facts.highestDay.amount > 0) {
    const dayName = facts.highestDay.dayOfWeek || 'One day';
    claims.push({
      id: 'local-highest-day',
      type: 'HIGH_SPEND_DAY',
      text: `${dayName} was the highest-spending day at ${sym}${facts.highestDay.amount.toFixed(2)}.`,
      sourceFactIds: ['highest_day_name', 'highest_day_amount', 'highest_day_date'],
      tier: 'local'
    });
  }

  // 4. LIMIT_PATTERN
  const { daysOverLimit, totalDays, rate } = facts.limitAdherence;
  if (daysOverLimit > 0) {
    claims.push({
      id: 'local-limit-pattern',
      type: 'LIMIT_PATTERN',
      text: `${daysOverLimit} of ${totalDays} days exceeded the configured daily limit (${rate}% adherence).`,
      sourceFactIds: ['days_over_limit', 'total_days_tracked', 'limit_adherence_rate'],
      tier: 'local'
    });
  } else if (totalDays > 0) {
    claims.push({
      id: 'local-limit-pattern',
      type: 'LIMIT_PATTERN',
      text: `All ${totalDays} days were within the configured daily limit.`,
      sourceFactIds: ['days_within_limit', 'total_days_tracked', 'limit_adherence_rate'],
      tier: 'local'
    });
  }

  // 5. PERIOD_SUMMARY
  claims.push({
    id: 'local-period-summary',
    type: 'PERIOD_SUMMARY',
    text: `You spent ${sym}${facts.totalSpent.toFixed(2)} across ${facts.expenseCount} expense${facts.expenseCount === 1 ? '' : 's'} this ${periodWord}.`,
    sourceFactIds: ['current_period_total', 'expense_count'],
    tier: 'local'
  });

  // Sort strictly by deterministic priority
  claims.sort((a, b) => INSIGHT_PRIORITY_ORDER[a.type] - INSIGHT_PRIORITY_ORDER[b.type]);

  return claims;
}
