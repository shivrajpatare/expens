import type { DailyLimitOverride } from './types';

/**
 * Resolves the effective daily limit for a given calendar date.
 * Priority: Date-specific override > Baseline daily limit.
 */
export function resolveDailyLimit(
  date: string,
  overrides: Record<string, DailyLimitOverride> | DailyLimitOverride[],
  baselineDailyLimit: number
): number {
  if (Array.isArray(overrides)) {
    const found = overrides.find((o) => o.date === date);
    if (found && typeof found.limit === 'number' && found.limit > 0) {
      return found.limit;
    }
  } else if (overrides && overrides[date]) {
    const override = overrides[date];
    if (typeof override.limit === 'number' && override.limit > 0) {
      return override.limit;
    }
  }

  return baselineDailyLimit;
}

export function hasDateOverride(
  date: string,
  overrides: Record<string, DailyLimitOverride> | DailyLimitOverride[]
): boolean {
  if (Array.isArray(overrides)) {
    return overrides.some((o) => o.date === date && typeof o.limit === 'number' && o.limit > 0);
  }
  return Boolean(overrides && overrides[date] && overrides[date].limit > 0);
}
