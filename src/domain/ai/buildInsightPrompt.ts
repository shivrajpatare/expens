/**
 * Phase 9: Groq Prompt Contract & Builder
 * 
 * Prepares the system and user messages containing ONLY structured InsightFacts.
 * Injects the non-negotiable anti-hallucination and no-calculation contracts.
 */

import type { InsightFacts } from '../insights/types.ts';

export const SYSTEM_PROMPT = `You are an interpretation layer for a personal money tracker.
Your job is to phrase patterns from supplied financial facts in clear, concise natural language.
CRITICAL RULES:
1. Do NOT calculate financial values. All numbers, totals, percentages, and differences are already calculated for you.
2. Do NOT invent facts, dates, categories, or amounts. Use ONLY the supplied facts.
3. Do NOT infer causes that are not explicitly provided (e.g. do not say "because you ate out more").
4. Do NOT provide financial advice (e.g. do not say "you should spend less", "cut food expenses", "save money").
5. Do NOT recommend financial products (no stocks, loans, credit cards, banking products).
6. Do NOT make behavioural or moral judgments (no "poor discipline", "spending too much").
7. Do NOT describe transactions or audit findings as fraud, scams, or suspicious activity.
8. Use a calm, concise, neutral, non-judgmental tone (Silent Ledger design language).
9. If the supplied facts do not support a statement, do NOT make that statement.
10. Return a JSON object strictly adhering to the specified schema with a maximum of 5 insights.`;

export const GROQ_STRUCTURED_OUTPUT_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'insight_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        insights: {
          type: 'array',
          description: 'List of concise natural language observations derived strictly from supplied facts.',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: [
                  'PERIOD_SUMMARY',
                  'PERIOD_CHANGE',
                  'CATEGORY_PATTERN',
                  'HIGH_SPEND_DAY',
                  'LIMIT_PATTERN'
                ]
              },
              text: {
                type: 'string',
                description: 'Concise factual observation phrasing the pattern.'
              },
              sourceFactIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'The IDs of the supplied facts that support this claim.'
              }
            },
            required: ['type', 'text', 'sourceFactIds'],
            additionalProperties: false
          }
        }
      },
      required: ['insights'],
      additionalProperties: false
    }
  }
};

export const GROQ_INSIGHTS_SCHEMA = GROQ_STRUCTURED_OUTPUT_FORMAT.json_schema.schema;

/**
 * Builds the user prompt containing structured InsightFacts and available fact IDs.
 */
export function buildUserPrompt(facts: InsightFacts): string {
  // Construct minimal, sanitized fact payload — NO raw expenses, NO IDs
  const payload = {
    period: facts.period,
    periodLabel: facts.periodLabel,
    previousPeriodLabel: facts.previousPeriodLabel,
    currencySymbol: facts.currencySymbol,
    totalSpent: facts.totalSpent,
    averagePerDay: facts.averagePerDay,
    expenseCount: facts.expenseCount,
    highestDay: facts.highestDay,
    lowestDay: facts.lowestDay,
    limitAdherence: facts.limitAdherence,
    topCategories: facts.categories.slice(0, 3), // Top 3 categories only
    comparison: facts.comparison,
    previousPeriod: facts.previousPeriod,
    auditSummary: facts.auditSummary
  };

  return `Here are the verified financial facts for the selected ${facts.period}:

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

Available sourceFactIds for citation:
- current_period_total
- previous_period_total
- period_change_absolute
- period_change_percentage
- period_change_direction
- top_category_name
- top_category_amount
- top_category_percentage
- highest_day_date
- highest_day_name
- highest_day_amount
- lowest_day_date
- lowest_day_name
- lowest_day_amount
- limit_adherence_rate
- days_within_limit
- days_over_limit
- total_days_tracked
- expense_count
- average_per_day
- audit_is_clear
- audit_finding_count

Generate up to 5 concise, calm insight observations using the required JSON schema.`;
}
