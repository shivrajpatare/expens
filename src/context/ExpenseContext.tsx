import React, { createContext, useContext, useState, useEffect } from 'react';
import { Expense, NewExpensePayload, UpdateExpensePayload } from '../types/expense';
import { DailyFinancialState, DailyLimitOverride, PeriodFinancialSummary } from '../domain/money/types';
import { calculateDailyFinancialState } from '../domain/money/calculations';
import { resolveDailyLimit } from '../domain/money/limitResolver';
import { calculatePeriodSummary, filterExpensesByDateRange } from '../domain/money/periodCalculations';
import { classifyCategory } from '../utils/categoryClassifier';
import { expenseRepository } from '../storage/expenseRepository';
import { limitRepository } from '../storage/limitRepository';
import { atomicRestore, bulkPutExpenses } from '../storage/db';
import { BackupDataV1 } from '../domain/backup/types';
import { useApp } from './AppContext';

interface ExpenseContextValue {
  expenses: Expense[];
  limitOverrides: Record<string, DailyLimitOverride>;
  isLoaded: boolean;
  addExpense: (payload: NewExpensePayload) => Promise<Expense>;
  updateExpense: (id: string, payload: UpdateExpensePayload) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  setDateOverride: (date: string, limit: number) => Promise<void>;
  removeDateOverride: (date: string) => Promise<void>;
  getDailyState: (date: string) => DailyFinancialState;
  getExpensesForDate: (date: string) => Expense[];
  getPeriodSummary: (startDate: string, endDate: string) => PeriodFinancialSummary;
  atomicRestoreBackup: (backup: BackupDataV1) => Promise<void>;
  importCsvExpenses: (
    parsedExpenses: Array<{ date: string; description: string; amount: number; category?: string; time?: string }>
  ) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextValue | undefined>(undefined);

// Helper to format current time e.g. "2:45 PM"
const formatCurrentTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeDate, settings, restoreSettings } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [limitOverrides, setLimitOverrides] = useState<Record<string, DailyLimitOverride>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Initial hydration from IndexedDB
  useEffect(() => {
    let isMounted = true;

    Promise.all([expenseRepository.getAll(), limitRepository.getAll()])
      .then(([storedExpenses, storedOverrides]) => {
        if (!isMounted) return;

        setExpenses(storedExpenses);

        const overrideMap: Record<string, DailyLimitOverride> = {};
        for (const ov of storedOverrides) {
          overrideMap[ov.date] = ov;
        }
        setLimitOverrides(overrideMap);
      })
      .catch((err) => {
        console.error('Failed to load financial data from IndexedDB:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Add Expense with IndexedDB write
  const addExpense = async (payload: NewExpensePayload): Promise<Expense> => {
    const targetDate = payload.date || activeDate;
    const autoCategory = classifyCategory(payload.description);
    const nowIso = new Date().toISOString();

    const newExpense: Expense = {
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      description: payload.description.trim(),
      amount: payload.amount,
      date: targetDate,
      time: formatCurrentTime(),
      category: autoCategory,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Persist to IndexedDB first
    await expenseRepository.save(newExpense);

    // Update runtime state (newest first)
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };

  // 3. Update Expense with IndexedDB write
  const updateExpense = async (id: string, payload: UpdateExpensePayload): Promise<void> => {
    const nowIso = new Date().toISOString();
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    const updated: Expense = {
      ...existing,
      description: payload.description.trim(),
      amount: payload.amount,
      date: payload.date,
      category: payload.category,
      updatedAt: nowIso
    };

    await expenseRepository.save(updated);

    setExpenses((prev) => prev.map((exp) => (exp.id === id ? updated : exp)));
  };

  // 4. Delete Expense with IndexedDB removal
  const deleteExpense = async (id: string): Promise<void> => {
    await expenseRepository.delete(id);
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
  };

  // 5. Set Date-Specific Limit Override
  const setDateOverride = async (date: string, limit: number): Promise<void> => {
    const nowIso = new Date().toISOString();
    const override: DailyLimitOverride = {
      date,
      limit,
      createdAt: limitOverrides[date]?.createdAt || nowIso,
      updatedAt: nowIso
    };

    await limitRepository.set(override);

    setLimitOverrides((prev) => ({
      ...prev,
      [date]: override
    }));
  };

  // 6. Remove Date-Specific Limit Override
  const removeDateOverride = async (date: string): Promise<void> => {
    await limitRepository.delete(date);
    setLimitOverrides((prev) => {
      const copy = { ...prev };
      delete copy[date];
      return copy;
    });
  };

  // 7. Get Expenses for a specific date (sorted newest first)
  const getExpensesForDate = (date: string): Expense[] => {
    return expenses
      .filter((exp) => exp.date === date)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // 8. Deterministic Daily Financial State
  const getDailyState = (date: string): DailyFinancialState => {
    const expensesForDate = getExpensesForDate(date);
    const resolvedLimit = resolveDailyLimit(date, limitOverrides, settings.baselineDailyLimit);
    return calculateDailyFinancialState(date, expensesForDate, resolvedLimit);
  };

  // 9. Deterministic Period Financial Summary
  const getPeriodSummary = (startDate: string, endDate: string): PeriodFinancialSummary => {
    const filtered = filterExpensesByDateRange(expenses, startDate, endDate);

    // Build limits map for all dates in period
    const limitsMap: Record<string, number> = {};
    for (const exp of filtered) {
      if (!limitsMap[exp.date]) {
        limitsMap[exp.date] = resolveDailyLimit(exp.date, limitOverrides, settings.baselineDailyLimit);
      }
    }

    return calculatePeriodSummary(filtered, limitsMap);
  };

  // 10. Atomic Restore Backup (Lock 1)
  const atomicRestoreBackup = async (backup: BackupDataV1): Promise<void> => {
    // 1. Execute atomic restore in IndexedDB spanning all 3 stores in ONE transaction
    await atomicRestore(backup);

    // 2. Update React runtime state on successful commit
    setExpenses(backup.expenses);
    const overrideMap: Record<string, DailyLimitOverride> = {};
    for (const ov of backup.dailyLimits) {
      overrideMap[ov.date] = ov;
    }
    setLimitOverrides(overrideMap);
    restoreSettings(backup.settings);
  };

  // 11. Import CSV Expenses (append mode)
  const importCsvExpenses = async (
    parsedExpenses: Array<{ date: string; description: string; amount: number; category?: string; time?: string }>
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    const newRecords: Expense[] = parsedExpenses.map((p, idx) => ({
      id: 'exp_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 7),
      description: p.description.trim(),
      amount: p.amount,
      date: p.date,
      time: p.time || formatCurrentTime(),
      category: p.category || classifyCategory(p.description),
      createdAt: nowIso,
      updatedAt: nowIso
    }));

    await bulkPutExpenses(newRecords);
    setExpenses((prev) => [...newRecords, ...prev]);
  };

  const value: ExpenseContextValue = {
    expenses,
    limitOverrides,
    isLoaded,
    addExpense,
    updateExpense,
    deleteExpense,
    setDateOverride,
    removeDateOverride,
    getDailyState,
    getExpensesForDate,
    getPeriodSummary,
    atomicRestoreBackup,
    importCsvExpenses
  };

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
};

export const useExpenses = (): ExpenseContextValue => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};
