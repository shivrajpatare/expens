import type { Expense } from '../../types/expense.ts';
import type { DailyLimitOverride } from '../money/types.ts';
import type { CurrencyCode, ThemeMode } from '../../types/index.ts';

export interface BackupDataV1 {
  version: 1;
  app: 'personal-money-tracker';
  exportedAt: string; // ISO string
  expenses: Expense[];
  dailyLimits: DailyLimitOverride[];
  settings: {
    baselineDailyLimit: number;
    currency: CurrencyCode;
    theme: ThemeMode;
    groqEnabled?: boolean;
  };
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
  summary?: {
    expenseCount: number;
    limitOverrideCount: number;
    hasSettings: boolean;
    currency?: CurrencyCode;
  };
}

export interface CsvExpenseRow {
  date: string;
  time: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
}

export interface CsvValidationResult {
  isValid: boolean;
  expenses?: Array<{
    date: string;
    description: string;
    amount: number;
    category?: string;
    time?: string;
  }>;
  currency?: string;
  error?: string;
  summary?: {
    totalRows: number;
    validCount: number;
    currency: string;
  };
}
