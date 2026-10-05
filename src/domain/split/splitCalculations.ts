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

  // 8. Custom mode validation
  if (mode === 'custom') {
    if (!percentages || typeof percentages !== 'object') {
      return {
        isValid: false,
        error: 'Custom amount allocations are required for custom split.'
      };
    }

    const totalCents = roundToCents(billAmount);
    let sumCents = 0;

    for (const p of participants) {
      const amt = percentages[p.id];
      if (typeof amt !== 'number' || isNaN(amt) || !isFinite(amt)) {
        return {
          isValid: false,
          error: `Missing or invalid amount for ${p.name}.`
        };
      }
      if (amt < 0) {
        return {
          isValid: false,
          error: `Amount for ${p.name} cannot be negative.`
        };
      }
      sumCents += roundToCents(amt);
    }

    const diffCents = totalCents - sumCents;
    if (diffCents !== 0) {
      if (diffCents > 0) {
        return {
          isValid: false,
          error: `Remaining to allocate: ₹${(diffCents / 100).toFixed(2)}`,
          diffCents
        };
      } else {
        return {
          isValid: false,
          error: `Over allocated by: ₹${(Math.abs(diffCents) / 100).toFixed(2)}`,
          diffCents
        };
      }
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

export interface ProportionalSplitInput {
  billAmount: number;
  label: string;
  participants: Participant[];
  currentAmounts: Record<string, number>;
  editedParticipantId: string;
  newAmount: number;
}

/**
 * Pure deterministic calculation for proportional autonomous rebalancing (Phase 13C).
 * 
 * Invariants:
 * 1. SUM(participantAmounts) === billAmount down to the smallest integer currency cent.
 * 2. Edited participant amount is bounded/clamped: 0 <= amount <= totalBill.
 * 3. All other participants collectively absorb the remaining bill proportionally based on their prior shares.
 * 4. Zero fallback: If all other participants previously had 0, the remaining bill is split equally among them.
 * 5. Every participant amount is mathematically guaranteed >= 0 (no negative amounts ever).
 * 6. NO Auto participant, NO residual participant, NO residual role transfer.
 * 7. Never mutates input objects.
 */
export function calculateProportionalSplit({
  billAmount,
  label,
  participants,
  currentAmounts,
  editedParticipantId,
  newAmount
}: ProportionalSplitInput): SplitResult {
  const validation = validateSplitInput(billAmount, label, participants, 'adjust');
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid split parameters');
  }

  const totalCents = roundToCents(billAmount);

  // 1. Clamp the edited participant's requested amount between 0 and totalCents
  const requestedCents = roundToCents(Math.max(0, newAmount));
  const clampedEditedCents = Math.min(totalCents, requestedCents);

  // 2. Compute remaining cents to distribute across all other participants
  const remainingCents = totalCents - clampedEditedCents;

  const otherParticipants = participants.filter((p) => p.id !== editedParticipantId);
  if (otherParticipants.length === 0) {
    throw new Error('A split requires at least 2 participants.');
  }

  // 3. Compute sum of previous shares for all other participants
  let sumOthersOldCents = 0;
  for (const p of otherParticipants) {
    const prevAmt = currentAmounts[p.id] ?? 0;
    sumOthersOldCents += Math.max(0, roundToCents(prevAmt));
  }

  const centsMap: Record<string, number> = {};
  centsMap[editedParticipantId] = clampedEditedCents;

  if (sumOthersOldCents > 0) {
    // Proportional redistribution
    interface OtherShareItem {
      id: string;
      rawCents: number;
      allocatedCents: number;
      fraction: number;
      oldCents: number;
      index: number;
    }

    const items: OtherShareItem[] = otherParticipants.map((p, idx) => {
      const prevAmt = currentAmounts[p.id] ?? 0;
      const oldCents = Math.max(0, roundToCents(prevAmt));
      const rawCents = (oldCents / sumOthersOldCents) * remainingCents;
      const allocatedCents = Math.floor(rawCents);
      const fraction = rawCents - allocatedCents;
      return {
        id: p.id,
        rawCents,
        allocatedCents,
        fraction,
        oldCents,
        index: idx
      };
    });

    const sumAllocated = items.reduce((acc, item) => acc + item.allocatedCents, 0);
    let discrepancy = remainingCents - sumAllocated;

    // Distribute remaining cents deterministically by largest fraction, then largest oldCents, then index
    items.sort((a, b) => {
      if (Math.abs(b.fraction - a.fraction) > 1e-6) {
        return b.fraction - a.fraction;
      }
      if (b.oldCents !== a.oldCents) {
        return b.oldCents - a.oldCents;
      }
      return a.index - b.index;
    });

    for (let i = 0; i < items.length && discrepancy > 0; i++) {
      items[i].allocatedCents += 1;
      discrepancy -= 1;
    }

    for (const item of items) {
      centsMap[item.id] = item.allocatedCents;
    }
  } else {
    // Zero Fallback: If all other participants were previously ₹0, divide remaining equally
    const baseCents = Math.floor(remainingCents / otherParticipants.length);
    const remCents = remainingCents % otherParticipants.length;

    otherParticipants.forEach((p, idx) => {
      const extra = idx < remCents ? 1 : 0;
      centsMap[p.id] = baseCents + extra;
    });
  }

  // Final exact reconciliation check
  const finalSumCents = participants.reduce((acc, p) => acc + (centsMap[p.id] ?? 0), 0);
  if (finalSumCents !== totalCents && otherParticipants.length > 0) {
    centsMap[otherParticipants[0].id] += (totalCents - finalSumCents);
  }

  // 4. Build ParticipantShare objects
  const shares: ParticipantShare[] = participants.map((p) => {
    const pCents = centsMap[p.id] ?? 0;
    const amount = pCents / 100;
    const percentage = totalCents > 0 ? Number(((pCents / totalCents) * 100).toFixed(2)) : 0;

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
    mode: 'adjust',
    shares,
    userShare
  };
}

/**
 * Initializes autonomous split balancing from an equal split baseline (Phase 13C).
 */
export function initializeProportionalSplit(
  billAmount: number,
  label: string,
  participants: Participant[]
): SplitResult {
  const equalSplit = calculateEqualSplit(billAmount, label, participants);
  return {
    ...equalSplit,
    mode: 'adjust'
  };
}

/**
 * Calculates custom amount split.
 * Guarantees that sum(shares.amount) === billAmount down to the smallest currency unit.
 */
export function calculateCustomSplit(
  billAmount: number,
  label: string,
  participants: Participant[],
  customAmounts: Record<string, number>
): SplitResult {
  const validation = validateSplitInput(billAmount, label, participants, 'custom', customAmounts);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid custom split parameters');
  }

  const totalCents = roundToCents(billAmount);

  const shares: ParticipantShare[] = participants.map((p) => {
    const pCents = roundToCents(customAmounts[p.id] || 0);
    const amount = pCents / 100;
    const percentage = totalCents > 0 ? Number(((pCents / totalCents) * 100).toFixed(2)) : 0;

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
    mode: 'custom',
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

