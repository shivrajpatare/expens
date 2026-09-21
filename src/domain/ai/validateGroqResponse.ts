/**
 * Phase 9: Groq Response Validation & Anti-Hallucination Layer
 * 
 * Enforces strict schema validation, provenance verification,
 * and numerical contradiction detection before any claim is rendered.
 */

import type { InsightClaim, InsightFacts, InsightType } from '../insights/types.ts';
import { VALID_FACT_IDS } from '../insights/types.ts';
import { INSIGHT_PRIORITY_ORDER } from '../insights/localInsightEngine.ts';

const ALLOWED_INSIGHT_TYPES = new Set<InsightType>([
  'PERIOD_SUMMARY',
  'PERIOD_CHANGE',
  'CATEGORY_PATTERN',
  'HIGH_SPEND_DAY',
  'LIMIT_PATTERN'
]);

export interface ValidationResult {
  isValid: boolean;
  claims: InsightClaim[];
  reason?: string;
}

/**
 * Extracts all known numeric values from InsightFacts to verify claims against hallucinations.
 */
function collectFactualNumbers(facts: InsightFacts): Set<number> {
  const numbers = new Set<number>();

  const add = (n: number | null | undefined) => {
    if (typeof n === 'number' && Number.isFinite(n)) {
      numbers.add(Math.round(n * 100) / 100);
      // Also add rounded integer
      numbers.add(Math.round(n));
    }
  };

  add(facts.totalSpent);
  add(facts.averagePerDay);
  add(facts.expenseCount);

  if (facts.highestDay) add(facts.highestDay.amount);
  if (facts.lowestDay) add(facts.lowestDay.amount);

  add(facts.limitAdherence.daysWithinLimit);
  add(facts.limitAdherence.daysOverLimit);
  add(facts.limitAdherence.totalDays);
  add(facts.limitAdherence.rate);

  for (const cat of facts.categories) {
    add(cat.amount);
    add(cat.percentage);
    add(cat.count);
  }

  if (facts.previousPeriod) {
    add(facts.previousPeriod.totalSpent);
    add(facts.previousPeriod.averagePerDay);
    add(facts.previousPeriod.expenseCount);
  }

  if (facts.comparison) {
    add(facts.comparison.absoluteDifference);
    add(facts.comparison.percentageDifference);
  }

  return numbers;
}

/**
 * Validates a raw response from Groq.
 */
export function validateGroqResponse(
  rawResponse: unknown,
  facts: InsightFacts
): ValidationResult {
  if (!rawResponse || typeof rawResponse !== 'object') {
    return { isValid: false, claims: [], reason: 'Response is not an object' };
  }

  const res = rawResponse as { insights?: unknown };
  if (!Array.isArray(res.insights)) {
    return { isValid: false, claims: [], reason: 'Missing or invalid insights array' };
  }

  if (res.insights.length === 0) {
    return { isValid: false, claims: [], reason: 'Insights array is empty' };
  }

  if (res.insights.length > 5) {
    return { isValid: false, claims: [], reason: 'Exceeded maximum 5 insights' };
  }

  const factualNumbers = collectFactualNumbers(facts);
  const validatedClaims: InsightClaim[] = [];

  for (let i = 0; i < res.insights.length; i++) {
    const item = res.insights[i];
    if (!item || typeof item !== 'object') {
      return { isValid: false, claims: [], reason: `Insight #${i + 1} is not an object` };
    }

    const { type, text, sourceFactIds } = item as {
      type?: unknown;
      text?: unknown;
      sourceFactIds?: unknown;
    };

    // 1. Type validation
    if (typeof type !== 'string' || !ALLOWED_INSIGHT_TYPES.has(type as InsightType)) {
      return { isValid: false, claims: [], reason: `Invalid insight type: ${String(type)}` };
    }

    // 2. Text validation
    if (typeof text !== 'string' || text.trim().length === 0) {
      return { isValid: false, claims: [], reason: `Empty text for insight #${i + 1}` };
    }

    if (text.length > 300) {
      return { isValid: false, claims: [], reason: `Text too long for insight #${i + 1}` };
    }

    // 3. Provenance validation
    if (!Array.isArray(sourceFactIds) || sourceFactIds.length === 0) {
      return { isValid: false, claims: [], reason: `Missing sourceFactIds for insight #${i + 1}` };
    }

    for (const factId of sourceFactIds) {
      if (typeof factId !== 'string' || !VALID_FACT_IDS.has(factId)) {
        return {
          isValid: false,
          claims: [],
          reason: `Unknown sourceFactId "${String(factId)}" in insight #${i + 1}`
        };
      }
    }

    // 4. Numerical contradiction validation
    // Extract numbers mentioned in the text (e.g. ₹4,280.00, 38%, 18)
    const matches = text.match(/[\d,]+(?:\.\d+)?/g);
    if (matches) {
      for (const m of matches) {
        const cleaned = parseFloat(m.replace(/,/g, ''));
        if (!isNaN(cleaned)) {
          const rounded = Math.round(cleaned * 100) / 100;
          const roundedInt = Math.round(cleaned);
          // Check if this number is in our factual numbers list
          // (Allow minor date/calendar numbers 1-31 and years 2020-2030 to pass through)
          const isDateNumber = (roundedInt >= 1 && roundedInt <= 31) || (roundedInt >= 2020 && roundedInt <= 2030);
          if (!factualNumbers.has(rounded) && !factualNumbers.has(roundedInt) && !isDateNumber) {
            return {
              isValid: false,
              claims: [],
              reason: `Numerical contradiction: number ${cleaned} in claim "${text}" does not match any supplied fact`
            };
          }
        }
      }
    }

    validatedClaims.push({
      id: `groq-insight-${i + 1}`,
      type: type as InsightType,
      text: text.trim(),
      sourceFactIds,
      tier: 'groq'
    });
  }

  // Sort strictly by deterministic priority order
  validatedClaims.sort(
    (a, b) => INSIGHT_PRIORITY_ORDER[a.type] - INSIGHT_PRIORITY_ORDER[b.type]
  );

  return {
    isValid: true,
    claims: validatedClaims
  };
}
