export type AuditSeverity = 'ok' | 'info' | 'attention';

export interface AuditFinding {
  id: string;
  ruleId: string;
  severity: AuditSeverity;
  title: string;
  description: string;
  affectedDates?: string[];
  affectedExpenseIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuditSummaryData {
  totalExpensesReviewed: number;
  attentionCount: number;
  infoCount: number;
  findingCount: number; // attentionCount + infoCount (issues only)
  isClear: boolean;     // attentionCount === 0 && infoCount === 0
  isReconciled: boolean;
  periodLabel: string;
}

export interface AuditReport {
  summary: AuditSummaryData;
  findings: AuditFinding[];
}
