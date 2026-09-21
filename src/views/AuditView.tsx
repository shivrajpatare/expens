import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useExpenses } from '../context/ExpenseContext';
import type { PeriodMode } from '../domain/money/types';
import {
  getWeekRange,
  getMonthRange,
  getDailySpendingBreakdown,
  filterExpensesByDateRange
} from '../domain/money/periodCalculations';
import { runAudit } from '../domain/audit/auditEngine';
import { PeriodSwitcher } from '../components/insights/PeriodSwitcher';
import { PeriodHeader } from '../components/insights/PeriodHeader';
import { AuditSummaryCard } from '../components/audit/AuditSummaryCard';
import { AuditCleanCard } from '../components/audit/AuditCleanCard';
import { AuditFindingsList } from '../components/audit/AuditFindingsList';
import '../styles/audit.css';
import '../styles/insights.css';

export const AuditView: React.FC = () => {
  const { activeDate, currencySymbol, settings } = useApp();
  const { expenses, limitOverrides } = useExpenses();

  const [mode, setMode] = useState<PeriodMode>('week');
  const [anchorDate, setAnchorDate] = useState<string>(activeDate);

  // Current real-world today string
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 1. Determine period range deterministically using Phase 7 period logic
  const rangeInfo = mode === 'week'
    ? getWeekRange(anchorDate, todayStr)
    : getMonthRange(anchorDate, todayStr);

  // 2. Filter expenses for period
  const periodExpenses = filterExpensesByDateRange(
    expenses,
    rangeInfo.startDate,
    rangeInfo.endDate
  );

  // 3. Daily breakdown using authoritative limit resolver
  const dailyBreakdown = getDailySpendingBreakdown(
    rangeInfo.dates,
    periodExpenses,
    limitOverrides,
    settings.baselineDailyLimit
  );

  // 4. Run deterministic Audit Engine
  const auditReport = runAudit(
    periodExpenses,
    dailyBreakdown,
    rangeInfo.label,
    currencySymbol
  );

  // Period navigation
  const handlePrev = () => {
    const d = new Date(anchorDate + 'T00:00:00');
    if (mode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setAnchorDate(`${y}-${m}-${day}`);
  };

  const handleNext = () => {
    const d = new Date(anchorDate + 'T00:00:00');
    if (mode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setAnchorDate(`${y}-${m}-${day}`);
  };

  const handleJumpCurrent = () => {
    setAnchorDate(todayStr);
  };

  return (
    <div className="audit-container">
      {/* View Header */}
      <div className="audit-header-row">
        <h2 className="audit-title">Audit</h2>
        <span className="audit-subtitle">Data Trust &amp; Internal Consistency</span>
      </div>

      {/* 1. Period Switcher (Week / Month) */}
      <PeriodSwitcher
        mode={mode}
        onModeChange={(newMode) => setMode(newMode)}
      />

      {/* 2. Period Navigation Header */}
      <PeriodHeader
        label={rangeInfo.label}
        isCurrent={rangeInfo.isCurrent}
        mode={mode}
        onPrev={handlePrev}
        onNext={handleNext}
        onJumpCurrent={handleJumpCurrent}
      />

      {/* 3. Audit Summary */}
      <AuditSummaryCard summary={auditReport.summary} />

      {/* 4. Clean State (Shown only when attentionCount === 0 && infoCount === 0) */}
      {auditReport.summary.isClear && (
        <AuditCleanCard />
      )}

      {/* 5. Findings List */}
      <AuditFindingsList findings={auditReport.findings} />
    </div>
  );
};
