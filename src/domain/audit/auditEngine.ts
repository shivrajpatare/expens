import type { Expense } from '../../types/expense';
import type { DailyBreakdownItem } from '../money/types';
import type { AuditFinding, AuditReport, AuditSummaryData } from './types';
import { roundToCurrency } from '../money/calculations.ts';

const VALID_CATEGORIES = new Set([
  'Food & Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health & Wellness',
  'Bills & Utilities',
  'Other'
]);

/**
 * Validates a YYYY-MM-DD date string is a real calendar date (e.g. rejects 2026-02-30, 2026-99-99).
 */
function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * 1. Data Integrity Audit: validates required fields, amounts, dates, and categories.
 */
export function auditDataIntegrity(expenses: Expense[]): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const invalidDesc: Expense[] = [];
  const invalidAmount: Expense[] = [];
  const invalidDate: Expense[] = [];
  const invalidCategory: Expense[] = [];

  for (const exp of expenses) {
    // Description check
    if (!exp.description || exp.description.trim().length === 0) {
      invalidDesc.push(exp);
    }

    // Amount check (must be finite, positive number)
    if (typeof exp.amount !== 'number' || !Number.isFinite(exp.amount) || exp.amount <= 0 || isNaN(exp.amount)) {
      invalidAmount.push(exp);
    }

    // Date check
    if (!exp.date || !isValidCalendarDate(exp.date)) {
      invalidDate.push(exp);
    }

    // Category check (Other is valid)
    if (!exp.category || !VALID_CATEGORIES.has(exp.category)) {
      invalidCategory.push(exp);
    }
  }

  if (invalidDesc.length > 0) {
    findings.push({
      id: 'finding-integrity-desc',
      ruleId: 'data-integrity-description',
      severity: 'attention',
      title: 'Incomplete expense description',
      description: `${invalidDesc.length} ${invalidDesc.length === 1 ? 'record has an' : 'records have'} empty or whitespace-only description.`,
      affectedExpenseIds: invalidDesc.map((e) => e.id),
      affectedDates: [...new Set(invalidDesc.map((e) => e.date).filter(Boolean))]
    });
  }

  if (invalidAmount.length > 0) {
    findings.push({
      id: 'finding-integrity-amount',
      ruleId: 'data-integrity-amount',
      severity: 'attention',
      title: 'Invalid expense amount',
      description: `${invalidAmount.length} ${invalidAmount.length === 1 ? 'record has' : 'records have'} non-positive or non-finite amount.`,
      affectedExpenseIds: invalidAmount.map((e) => e.id),
      affectedDates: [...new Set(invalidAmount.map((e) => e.date).filter(Boolean))]
    });
  }

  if (invalidDate.length > 0) {
    findings.push({
      id: 'finding-integrity-date',
      ruleId: 'data-integrity-date',
      severity: 'attention',
      title: 'Invalid expense date',
      description: `${invalidDate.length} ${invalidDate.length === 1 ? 'record has' : 'records have'} malformed or impossible calendar date.`,
      affectedExpenseIds: invalidDate.map((e) => e.id),
      affectedDates: invalidDate.map((e) => e.date).filter(Boolean)
    });
  }

  if (invalidCategory.length > 0) {
    findings.push({
      id: 'finding-integrity-category',
      ruleId: 'data-integrity-category',
      severity: 'attention',
      title: 'Invalid expense category',
      description: `${invalidCategory.length} ${invalidCategory.length === 1 ? 'record has an' : 'records have'} unrecognized category value.`,
      affectedExpenseIds: invalidCategory.map((e) => e.id),
      affectedDates: [...new Set(invalidCategory.map((e) => e.date).filter(Boolean))]
    });
  }

  return findings;
}

/**
 * 2. Potential Duplicate Detection:
 * Groups expenses by date + normalized description + amount.
 * Flags groups with count > 1.
 */
export function auditPotentialDuplicates(expenses: Expense[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const groups: Record<string, Expense[]> = {};

  for (const exp of expenses) {
    if (!exp.date || typeof exp.amount !== 'number' || !exp.description) continue;
    const key = `${exp.date}::${exp.description.trim().toLowerCase()}::${exp.amount}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(exp);
  }

  let index = 1;
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    if (group.length > 1) {
      const first = group[0];
      findings.push({
        id: `finding-duplicate-${index++}`,
        ruleId: 'potential-duplicate',
        severity: 'attention',
        title: 'Potential duplicate',
        description: `${group.length} records share the same date (${first.date}), description ("${first.description}"), and amount.`,
        affectedDates: [first.date],
        affectedExpenseIds: group.map((e) => e.id),
        metadata: {
          date: first.date,
          description: first.description,
          amount: first.amount,
          count: group.length
        }
      });
    }
  }

  return findings;
}

/**
 * 3. Daily Limit Breach Audit:
 * Flags each day in dailyBreakdown where isOverLimit === true.
 */
export function auditDailyLimits(
  dailyBreakdown: DailyBreakdownItem[],
  currencySymbol: string
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const overLimitDays = dailyBreakdown.filter((d) => d.isOverLimit);

  let index = 1;
  for (const d of overLimitDays) {
    const overBy = roundToCurrency(d.spent - d.limit);
    findings.push({
      id: `finding-limit-breach-${index++}`,
      ruleId: 'daily-limit-breach',
      severity: 'attention',
      title: 'Daily limit exceeded',
      description: `${d.fullDate}: ${currencySymbol}${d.spent.toFixed(2)} spent against ${currencySymbol}${d.limit.toFixed(2)} daily limit (over by ${currencySymbol}${overBy.toFixed(2)}).`,
      affectedDates: [d.date],
      metadata: {
        date: d.date,
        spent: d.spent,
        limit: d.limit,
        overBy
      }
    });
  }

  return findings;
}

/**
 * 4. Calculation Consistency Audit:
 * Strictly period-scoped reconciliation between raw expense sum and daily breakdown sum.
 */
export function auditCalculationConsistency(
  periodExpenses: Expense[],
  dailyBreakdown: DailyBreakdownItem[],
  currencySymbol: string
): AuditFinding {
  const rawSum = roundToCurrency(
    periodExpenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0)
  );
  const breakdownSum = roundToCurrency(
    dailyBreakdown.reduce((sum, d) => sum + d.spent, 0)
  );

  const diff = Math.abs(roundToCurrency(rawSum - breakdownSum));

  if (diff === 0) {
    return {
      id: 'finding-reconciliation-ok',
      ruleId: 'calculation-reconciliation',
      severity: 'ok',
      title: 'Calculation reconciliation',
      description: 'All recorded expenses reconcile with the Money Engine.'
    };
  }

  return {
    id: 'finding-reconciliation-mismatch',
    ruleId: 'calculation-mismatch',
    severity: 'attention',
    title: 'Calculation mismatch',
    description: `Recorded expense total (${currencySymbol}${rawSum.toFixed(2)}) and calculated total (${currencySymbol}${breakdownSum.toFixed(2)}) differ by ${currencySymbol}${diff.toFixed(2)}.`
  };
}

/**
 * 5. Complete Audit Orchestration (runAudit):
 * Evaluates all deterministic rules and produces a structured AuditReport.
 */
export function runAudit(
  periodExpenses: Expense[],
  dailyBreakdown: DailyBreakdownItem[],
  periodLabel: string,
  currencySymbol: string
): AuditReport {
  const integrityFindings = auditDataIntegrity(periodExpenses);
  const duplicateFindings = auditPotentialDuplicates(periodExpenses);
  const limitFindings = auditDailyLimits(dailyBreakdown, currencySymbol);
  const reconciliationFinding = auditCalculationConsistency(
    periodExpenses,
    dailyBreakdown,
    currencySymbol
  );

  // Combine findings
  const allFindings: AuditFinding[] = [
    ...integrityFindings,
    ...duplicateFindings,
    ...limitFindings,
    reconciliationFinding
  ];

  // Sort: attention first, then info, then ok
  const severityOrder: Record<string, number> = {
    attention: 0,
    info: 1,
    ok: 2
  };

  allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const attentionCount = allFindings.filter((f) => f.severity === 'attention').length;
  const infoCount = allFindings.filter((f) => f.severity === 'info').length;

  // Strict Definition of Done rules:
  // findingCount = attentionCount + infoCount
  // isClear = attentionCount === 0 && infoCount === 0
  const findingCount = attentionCount + infoCount;
  const isClear = attentionCount === 0 && infoCount === 0;
  const isReconciled = reconciliationFinding.severity === 'ok';

  const summary: AuditSummaryData = {
    totalExpensesReviewed: periodExpenses.length,
    attentionCount,
    infoCount,
    findingCount,
    isClear,
    isReconciled,
    periodLabel
  };

  return {
    summary,
    findings: allFindings
  };
}
