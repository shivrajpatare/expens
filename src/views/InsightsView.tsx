import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useExpenses } from '../context/ExpenseContext';
import type { PeriodMode } from '../domain/money/types';
import type { InsightClaim, InsightTier } from '../domain/insights/types';
import {
  getWeekRange,
  getMonthRange,
  getDailySpendingBreakdown,
  getCategoryDistribution,
  getHighestAndLowestDays,
  calculatePeriodAdherence,
  filterExpensesByDateRange
} from '../domain/money/periodCalculations.ts';
import { roundToCurrency } from '../domain/money/calculations.ts';
import { buildInsightFacts } from '../domain/insights/periodComparison.ts';
import { generateLocalInsights } from '../domain/insights/localInsightEngine.ts';
import { fetchGroqInsights } from '../domain/ai/groqClient.ts';
import { PeriodSwitcher } from '../components/insights/PeriodSwitcher';
import { PeriodHeader } from '../components/insights/PeriodHeader';
import { PeriodSummary } from '../components/insights/PeriodSummary';
import { DailySpendingChart } from '../components/insights/DailySpendingChart';
import { HighestLowestDays } from '../components/insights/HighestLowestDays';
import { CategoryDistribution } from '../components/insights/CategoryDistribution';
import { InsightsEmptyState } from '../components/insights/InsightsEmptyState';
import { InsightSection } from '../components/insights/InsightSection';
import '../styles/insights.css';

export const InsightsView: React.FC = () => {
  const { activeDate, currencySymbol, settings } = useApp();
  const { expenses, limitOverrides } = useExpenses();

  const [mode, setMode] = useState<PeriodMode>('week');
  const [anchorDate, setAnchorDate] = useState<string>(activeDate);

  // Insights state
  const [insights, setInsights] = useState<InsightClaim[]>([]);
  const [tier, setTier] = useState<InsightTier>('local');
  const [fallbackNotice, setFallbackNotice] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Current real-world today string
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 1. Determine period range deterministically from Money Engine
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

  // 4. Category distribution
  const categoryDistribution = getCategoryDistribution(periodExpenses);

  // 5. Highest and lowest spending days
  const highLowDays = getHighestAndLowestDays(dailyBreakdown);

  // 6. Period adherence
  const adherence = calculatePeriodAdherence(dailyBreakdown);

  // 7. Aggregate totals
  const totalSpent = roundToCurrency(
    periodExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  );
  const dailyAverage = rangeInfo.dates.length > 0
    ? roundToCurrency(totalSpent / rangeInfo.dates.length)
    : 0;

  const hasExpenses = periodExpenses.length > 0;

  // 8. Construct structured InsightFacts deterministically
  const facts = useMemo(() => {
    return buildInsightFacts({
      mode,
      currentRange: rangeInfo,
      expenses,
      limitOverrides,
      baselineDailyLimit: settings.baselineDailyLimit,
      currencySymbol,
      todayStr
    });
  }, [mode, rangeInfo, expenses, limitOverrides, settings.baselineDailyLimit, currencySymbol, todayStr]);

  // 9. Generate insights (Tier 1 immediately, optional Tier 2 Groq if enabled)
  useEffect(() => {
    if (!hasExpenses) {
      setInsights([]);
      setTier('local');
      setFallbackNotice(undefined);
      setIsLoading(false);
      return;
    }

    const localClaims = generateLocalInsights(facts);

    if (!settings.groqEnabled) {
      setInsights(localClaims);
      setTier('local');
      setFallbackNotice(undefined);
      setIsLoading(false);
      return;
    }

    // Optional Tier 2 Groq enabled
    let isCancelled = false;
    setIsLoading(true);

    fetchGroqInsights(facts).then((result) => {
      if (isCancelled) return;
      setIsLoading(false);
      if (result.success) {
        setInsights(result.claims);
        setTier('groq');
        setFallbackNotice(undefined);
      } else {
        setInsights(localClaims);
        setTier('local');
        setFallbackNotice(result.fallbackNotice);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [facts, hasExpenses, settings.groqEnabled]);

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
    <div className="insights-container">
      {/* View Header */}
      <div className="insights-header-row">
        <h2 className="insights-title">Insights</h2>
        <span className="insights-subtitle">Weekly &amp; Monthly Understanding</span>
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

      {/* 3. Empty State vs Full Understanding View */}
      {!hasExpenses ? (
        <InsightsEmptyState />
      ) : (
        <>
          {/* Period Summary Metrics */}
          <PeriodSummary
            totalSpent={totalSpent}
            dailyAverage={dailyAverage}
            expenseCount={periodExpenses.length}
            daysWithinLimit={adherence.daysWithinLimit}
            totalDays={adherence.totalDays}
            adherenceRate={adherence.adherenceRate}
            currencySymbol={currencySymbol}
          />

          {/* Daily Spending Visualization */}
          <DailySpendingChart
            breakdown={dailyBreakdown}
            mode={mode}
            currencySymbol={currencySymbol}
          />

          {/* Highest & Lowest Days */}
          <HighestLowestDays
            highest={highLowDays.highest}
            lowest={highLowDays.lowest}
            currencySymbol={currencySymbol}
          />

          {/* Category Distribution */}
          <CategoryDistribution
            items={categoryDistribution}
            currencySymbol={currencySymbol}
          />

          {/* 4. Phase 9: What stands out (Insight Section) */}
          <InsightSection
            insights={insights}
            tier={tier}
            fallbackNotice={fallbackNotice}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
};
