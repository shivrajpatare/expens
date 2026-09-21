import type { Expense } from '../../types/expense.ts';
import type { DailyLimitOverride } from '../money/types.ts';
import type { AppSettings, CurrencyCode, ThemeMode } from '../../types/index.ts';
import type { BackupDataV1, ValidationResult } from './types.ts';

const VALID_CURRENCIES: Set<CurrencyCode> = new Set(['INR', 'USD', 'EUR', 'GBP']);
const VALID_THEMES: Set<ThemeMode> = new Set(['light', 'dark']);
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validates whether a string is a real calendar date (e.g. rejects Feb 31).
 */
function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Creates a deterministic, sanitized JSON backup of the current application dataset.
 * Guarantees zero secrets or server-side credentials are included.
 */
export function createJsonBackup(
  expenses: Expense[],
  dailyLimits: DailyLimitOverride[],
  settings: AppSettings
): BackupDataV1 {
  // 1. Sanitize and clone expenses
  const sanitizedExpenses: Expense[] = expenses.map((e) => ({
    id: String(e.id),
    description: String(e.description || '').trim(),
    amount: Math.round(Number(e.amount) * 100) / 100,
    date: String(e.date),
    time: String(e.time || ''),
    category: String(e.category || 'Other'),
    createdAt: String(e.createdAt),
    updatedAt: String(e.updatedAt)
  }));

  // 2. Sanitize and clone daily limit overrides
  const sanitizedLimits: DailyLimitOverride[] = dailyLimits.map((l) => ({
    date: String(l.date),
    limit: Math.round(Number(l.limit) * 100) / 100,
    createdAt: String(l.createdAt || new Date().toISOString()),
    updatedAt: String(l.updatedAt || new Date().toISOString())
  }));

  // 3. Sanitize settings — strictly exclude any API keys or credentials
  const sanitizedSettings = {
    baselineDailyLimit: Math.round(Number(settings.baselineDailyLimit) * 100) / 100,
    currency: settings.currency,
    theme: settings.theme,
    groqEnabled: Boolean(settings.groqEnabled)
  };

  return {
    version: 1,
    app: 'personal-money-tracker',
    exportedAt: new Date().toISOString(),
    expenses: sanitizedExpenses,
    dailyLimits: sanitizedLimits,
    settings: sanitizedSettings
  };
}

/**
 * Defensively validates an untrusted JSON object before restoring.
 * Rejects malformed structures, unsupported versions, wrong apps, or corrupted records.
 */
export function validateJsonBackup(raw: unknown): ValidationResult<BackupDataV1> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { isValid: false, error: 'Backup data must be a valid JSON object.' };
  }

  const obj = raw as Record<string, any>;

  // Check app identifier
  if (obj.app !== 'personal-money-tracker') {
    return {
      isValid: false,
      error: 'Invalid application identifier. This file is not a Personal Money Tracker backup.'
    };
  }

  // Check version
  if (obj.version !== 1) {
    return {
      isValid: false,
      error: `Unsupported backup version: ${obj.version}. Only version 1 is supported.`
    };
  }

  // Validate expenses array
  if (!Array.isArray(obj.expenses)) {
    return { isValid: false, error: 'Backup is missing a valid expenses list.' };
  }

  const validatedExpenses: Expense[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < obj.expenses.length; i++) {
    const item = obj.expenses[i];
    if (!item || typeof item !== 'object') {
      return { isValid: false, error: `Expense at index ${i} is not a valid object.` };
    }

    const id = String(item.id || '').trim();
    if (!id) {
      return { isValid: false, error: `Expense at index ${i} is missing an ID.` };
    }
    if (seenIds.has(id)) {
      return { isValid: false, error: `Duplicate expense ID detected: "${id}".` };
    }
    seenIds.add(id);

    const description = String(item.description || '').trim();
    if (!description) {
      return { isValid: false, error: `Expense "${id}" is missing a description.` };
    }

    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { isValid: false, error: `Expense "${id}" has an invalid amount: ${item.amount}. Must be a positive number.` };
    }

    const date = String(item.date || '').trim();
    if (!isValidCalendarDate(date)) {
      return { isValid: false, error: `Expense "${id}" has an invalid calendar date: "${item.date}". Expected YYYY-MM-DD.` };
    }

    validatedExpenses.push({
      id,
      description,
      amount: Math.round(amount * 100) / 100,
      date,
      time: String(item.time || '12:00 PM'),
      category: String(item.category || 'Other'),
      createdAt: String(item.createdAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || new Date().toISOString())
    });
  }

  // Validate daily limits array
  if (!Array.isArray(obj.dailyLimits)) {
    return { isValid: false, error: 'Backup is missing a valid dailyLimits list.' };
  }

  const validatedLimits: DailyLimitOverride[] = [];
  const seenDates = new Set<string>();

  for (let i = 0; i < obj.dailyLimits.length; i++) {
    const item = obj.dailyLimits[i];
    if (!item || typeof item !== 'object') {
      return { isValid: false, error: `Daily limit override at index ${i} is not a valid object.` };
    }

    const date = String(item.date || '').trim();
    if (!isValidCalendarDate(date)) {
      return { isValid: false, error: `Daily limit override at index ${i} has an invalid date: "${item.date}".` };
    }
    if (seenDates.has(date)) {
      return { isValid: false, error: `Duplicate daily limit override for date: "${date}".` };
    }
    seenDates.add(date);

    const limit = Number(item.limit);
    if (!Number.isFinite(limit) || limit < 0) {
      return { isValid: false, error: `Daily limit override for "${date}" has an invalid limit: ${item.limit}.` };
    }

    validatedLimits.push({
      date,
      limit: Math.round(limit * 100) / 100,
      createdAt: String(item.createdAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || new Date().toISOString())
    });
  }

  // Validate settings object
  if (!obj.settings || typeof obj.settings !== 'object') {
    return { isValid: false, error: 'Backup is missing application settings.' };
  }

  const baselineLimit = Number(obj.settings.baselineDailyLimit);
  if (!Number.isFinite(baselineLimit) || baselineLimit <= 0) {
    return { isValid: false, error: `Invalid baselineDailyLimit in settings: ${obj.settings.baselineDailyLimit}.` };
  }

  const currency = obj.settings.currency as CurrencyCode;
  if (!VALID_CURRENCIES.has(currency)) {
    return { isValid: false, error: `Unsupported currency in settings: "${obj.settings.currency}".` };
  }

  const theme = obj.settings.theme as ThemeMode;
  if (!VALID_THEMES.has(theme)) {
    return { isValid: false, error: `Unsupported theme in settings: "${obj.settings.theme}".` };
  }

  const validatedSettings = {
    baselineDailyLimit: Math.round(baselineLimit * 100) / 100,
    currency,
    theme,
    groqEnabled: Boolean(obj.settings.groqEnabled)
  };

  const backupData: BackupDataV1 = {
    version: 1,
    app: 'personal-money-tracker',
    exportedAt: String(obj.exportedAt || new Date().toISOString()),
    expenses: validatedExpenses,
    dailyLimits: validatedLimits,
    settings: validatedSettings
  };

  return {
    isValid: true,
    data: backupData,
    summary: {
      expenseCount: validatedExpenses.length,
      limitOverrideCount: validatedLimits.length,
      hasSettings: true,
      currency: validatedSettings.currency
    }
  };
}
