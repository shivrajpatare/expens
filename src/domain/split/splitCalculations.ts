/**
 * Phase 13: Deterministic Split Bill Calculations
 * 
 * Strict invariants:
 * 1. Sum of all participant share amounts must ALWAYS reconcile exactly to billAmount.
 * 2. Remainders are distributed deterministically to prevent penny rounding drift.
 * 3. Percentage splits require exactly 100% total allocation.
 * 4. User share is explicitly identified and extracted.
 */

import type {
  Participant,
  ParticipantShare,
  SplitMode,
  SplitResult,
  ValidationResult
} from './types.ts';

/**
 * Normalizes float to 2 decimal currency places.
 */
function roundToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Validates all inputs for a Split Bill operation.
 */
export function validateSplitInput(
  billAmount: number,
  label: string,
  participants: Participant[],
  mode: SplitMode,
  percentages?: Record<string, number>
): ValidationResult {
  // 1. Amount validation
  if (
    typeof billAmount !== 'number' ||
    isNaN(billAmount) ||
    !isFinite(billAmount) ||
    billAmount <= 0
  ) {
    return {
      isValid: false,
      error: 'Bill amount must be a positive number greater than 0.'
    };
  }

  // 2. Label validation
  if (!label || !label.trim()) {
    return {
      isValid: false,
      error: 'Please enter a description for the bill.'
    };
  }

  // 3. Participants count validation
  if (!Array.isArray(participants) || participants.length < 2) {
    return {
      isValid: false,
      error: 'A split requires at least 2 participants.'
    };
  }

  // 4. Current user presence validation
  const currentUserCount = participants.filter((p) => p.isCurrentUser).length;
  if (currentUserCount !== 1) {
    return {
      isValid: false,
      error: 'Exactly one participant must be designated as the current user.'
    };
  }

  // 5. Participant names validation
  const trimmedNames: string[] = [];
  for (const p of participants) {
    if (!p.name || !p.name.trim()) {
      return {
        isValid: false,
        error: 'All participants must have a non-empty name.'
      };
    }
    trimmedNames.push(p.name.trim().toLowerCase());
  }

  // 6. Duplicate names validation
  const uniqueNames = new Set(trimmedNames);
  if (uniqueNames.size !== trimmedNames.length) {
    return {
      isValid: false,
      error: 'Participant names must be unique.'
    };
  }

  // 7. Percentage mode validation
  if (mode === 'percentage') {
    if (!percentages || typeof percentages !== 'object') {
      return {
        isValid: false,
        error: 'Percentage allocations are required for percentage split.'
      };
    }

    let totalPercentage = 0;
    for (const p of participants) {
      const pct = percentages[p.id];
      if (typeof pct !== 'number' || isNaN(pct) || !isFinite(pct)) {
        return {
          isValid: false,
          error: `Missing or invalid percentage for ${p.name}.`
        };
      }
      if (pct < 0 || pct > 100) {
        return {
          isValid: false,
          error: `Percentage for ${p.name} must be between 0% and 100%.`
        };
      }
      totalPercentage += pct;
    }

    // Normalize floating-point sum to 2 decimals
    const normalizedTotal = Math.round(totalPercentage * 100) / 100;
    if (Math.abs(normalizedTotal - 100) > 0.001) {
      return {
        isValid: false,
        error: `Total percentage must equal exactly 100%. Currently: ${normalizedTotal}%.`
      };
    }
  }

  return { isValid: true };
}

/**
 * Calculates equal split with deterministic remainder distribution.
 * Guarantees that sum(shares.amount) === billAmount down to the smallest currency unit.
 */
export function calculateEqualSplit(
  billAmount: number,
  label: string,
  participants: Participant[]
): SplitResult {
  const validation = validateSplitInput(billAmount, label, participants, 'equal');
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid split parameters');
  }

  const n = participants.length;
  const totalCents = roundToCents(billAmount);
  const baseCents = Math.floor(totalCents / n);
  const remainderCents = totalCents - baseCents * n;

  // Remainder is distributed deterministically to the first remainderCents participants
  const shares: ParticipantShare[] = participants.map((p, idx) => {
    const participantCents = idx < remainderCents ? baseCents + 1 : baseCents;
    const amount = participantCents / 100;
    const percentage = Number(((amount / billAmount) * 100).toFixed(2));

    return {
      participantId: p.id,
      name: p.name.trim(),
      isCurrentUser: p.isCurrentUser,
      percentage,
      amount
    };
  });

  const userShare = shares.find((s) => s.isCurrentUser);
  if (!userShare) {
    throw new Error('Current user share not found');
  }

  return {
    totalAmount: billAmount,
    label: label.trim(),
    mode: 'equal',
    shares,
    userShare
  };
}

/**
 * Calculates percentage split with penny reconciliation against the largest share.
 * Guarantees sum(shares.amount) === billAmount.
 */
export function calculatePercentageSplit(
  billAmount: number,
  label: string,
  participants: Participant[],
  percentages: Record<string, number>
): SplitResult {
  const validation = validateSplitInput(billAmount, label, participants, 'percentage', percentages);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid split parameters');
  }

  const totalCents = roundToCents(billAmount);

  // Compute unrounded cents per participant
  const centsList = participants.map((p) => {
    const pct = percentages[p.id];
    return Math.round((totalCents * pct) / 100);
  });

  // Reconcile any rounding discrepancy against the largest percentage allocation
  const computedSumCents = centsList.reduce((acc, c) => acc + c, 0);
  const diffCents = totalCents - computedSumCents;

  if (diffCents !== 0) {
    // Find index of highest percentage participant
    let maxIdx = 0;
    let maxPct = -1;
    participants.forEach((p, idx) => {
      const pct = percentages[p.id];
      if (pct > maxPct) {
        maxPct = pct;
        maxIdx = idx;
      }
    });
    centsList[maxIdx] += diffCents;
  }

  const shares: ParticipantShare[] = participants.map((p, idx) => ({
    participantId: p.id,
    name: p.name.trim(),
    isCurrentUser: p.isCurrentUser,
    percentage: percentages[p.id],
    amount: centsList[idx] / 100
  }));

  const userShare = shares.find((s) => s.isCurrentUser);
  if (!userShare) {
    throw new Error('Current user share not found');
  }

  return {
    totalAmount: billAmount,
    label: label.trim(),
    mode: 'percentage',
    shares,
    userShare
  };
}
