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

/**
 * Selects the next residual participant deterministically when the current
 * residual participant is manually edited by the user.
 * 
 * Rules (Phase 13B Locked Decision):
 * 1. Never choose the participant the user just edited.
 * 2. Prefer an eligible participant who has NOT been manually edited yet.
 *    (Prefer non-current user among unedited so the user's own share remains predictable).
 * 3. Otherwise choose the least recently manually edited participant.
 *    (Prefer non-current user among least recently edited if possible).
 * 4. Deterministic fallback to the first eligible participant.
 */
export function selectNextResidualParticipant(
  participants: Participant[],
  editedParticipantId: string,
  editHistory: string[] = []
): string {
  const eligible = participants.filter((p) => p.id !== editedParticipantId);
  if (eligible.length === 0) {
    throw new Error('Cannot balance with fewer than 2 participants');
  }

  // 1. Prefer unedited participants
  const unedited = eligible.filter((p) => !editHistory.includes(p.id));
  if (unedited.length > 0) {
    const nonUserUnedited = unedited.find((p) => !p.isCurrentUser);
    return nonUserUnedited ? nonUserUnedited.id : unedited[0].id;
  }

  // 2. Otherwise choose least recently edited participant (earliest in editHistory)
  // First check if there is an eligible non-user in editHistory
  for (const histId of editHistory) {
    const found = eligible.find((p) => p.id === histId && !p.isCurrentUser);
    if (found) {
      return found.id;
    }
  }

  // Then check any eligible in editHistory (including current user if only user remains)
  for (const histId of editHistory) {
    const found = eligible.find((p) => p.id === histId);
    if (found) {
      return found.id;
    }
  }

  return eligible[0].id;
}

export interface AutoBalanceInput {
  billAmount: number;
  label: string;
  participants: Participant[];
  currentAmounts: Record<string, number>;
  residualParticipantId?: string;
  editedParticipantId: string;
  newAmount: number;
  editHistory?: string[];
}

export interface AutoBalanceResult extends SplitResult {
  residualParticipantId: string;
  editHistory: string[];
}

/**
 * Pure deterministic calculation for autonomous residual balancing.
 * 
 * Invariants:
 * 1. SUM(participantAmounts) === billAmount down to the smallest integer currency cent.
 * 2. Edited participant amount is bounded/clamped: 0 <= amount <= maxAllowable.
 * 3. Residual participant receives: totalCents - sum(all other participant cents).
 * 4. Residual amount is mathematically guaranteed >= 0 (no negative amounts ever).
 * 5. If the current residual participant is edited, the residual role is transferred
 *    deterministically to another eligible participant.
 * 6. editHistory is updated with the edited participant at the end (most recent).
 * 7. Never mutates input objects.
 */
export function calculateAutoBalancedSplit({
  billAmount,
  label,
  participants,
  currentAmounts,
  residualParticipantId,
  editedParticipantId,
  newAmount,
  editHistory = []
}: AutoBalanceInput): AutoBalanceResult {
  const validation = validateSplitInput(billAmount, label, participants, 'adjust');
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid split parameters');
  }

  const totalCents = roundToCents(billAmount);

  // 1. Establish the active residual participant ID
  let activeResidualId = residualParticipantId;

  const participantIds = new Set(participants.map((p) => p.id));
  if (!activeResidualId || !participantIds.has(activeResidualId)) {
    const nonUser = [...participants].reverse().find((p) => !p.isCurrentUser);
    activeResidualId = nonUser ? nonUser.id : participants[participants.length - 1].id;
  }

  // 2. If the user edited the participant who is currently the residual:
  // Transfer residual role to another participant deterministically!
  if (editedParticipantId === activeResidualId) {
    activeResidualId = selectNextResidualParticipant(
      participants,
      editedParticipantId,
      editHistory
    );
  }

  // 3. Update edit history: record editedParticipantId (deduplicating and moving to most recent)
  const nextEditHistory = [
    ...editHistory.filter((id) => id !== editedParticipantId),
    editedParticipantId
  ];

  // 4. Calculate sum of all OTHER fixed participants (excluding edited and activeResidual)
  let otherFixedCents = 0;
  for (const p of participants) {
    if (p.id !== editedParticipantId && p.id !== activeResidualId) {
      const existingAmt = currentAmounts[p.id] ?? 0;
      otherFixedCents += roundToCents(Math.max(0, existingAmt));
    }
  }

  // 5. Bound / clamp the edited participant's amount
  // Maximum allowable amount leaves residual at 0 cents
  const maxAllowableCents = Math.max(0, totalCents - otherFixedCents);
  const requestedCents = roundToCents(Math.max(0, newAmount));
  const clampedEditedCents = Math.min(maxAllowableCents, requestedCents);

  // 6. Compute residual cents
  const residualCents = Math.max(0, totalCents - otherFixedCents - clampedEditedCents);

  // 7. Build share amounts map in cents
  const centsMap: Record<string, number> = {};
  for (const p of participants) {
    if (p.id === editedParticipantId) {
      centsMap[p.id] = clampedEditedCents;
    } else if (p.id === activeResidualId) {
      centsMap[p.id] = residualCents;
    } else {
      const existingAmt = currentAmounts[p.id] ?? 0;
      centsMap[p.id] = roundToCents(Math.max(0, existingAmt));
    }
  }

  // Verify total reconciliation down to single cent
  const finalSumCents = Object.values(centsMap).reduce((acc, c) => acc + c, 0);
  if (finalSumCents !== totalCents) {
    centsMap[activeResidualId] += (totalCents - finalSumCents);
  }

  // 8. Build ParticipantShare objects
  const shares: ParticipantShare[] = participants.map((p) => {
    const pCents = centsMap[p.id];
    const amount = pCents / 100;
    const percentage = totalCents > 0 ? Number(((pCents / totalCents) * 100).toFixed(2)) : 0;

    return {
      participantId: p.id,
      name: p.name.trim(),
      isCurrentUser: p.isCurrentUser,
      percentage,
      amount,
      isResidual: p.id === activeResidualId
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
    userShare,
    residualParticipantId: activeResidualId,
    editHistory: nextEditHistory
  };
}

/**
 * Initializes autonomous split balancing from an equal split baseline.
 */
export function initializeAutoBalancedSplit(
  billAmount: number,
  label: string,
  participants: Participant[]
): AutoBalanceResult {
  const equalSplit = calculateEqualSplit(billAmount, label, participants);
  const nonUser = [...participants].reverse().find((p) => !p.isCurrentUser);
  const residualParticipantId = nonUser ? nonUser.id : participants[participants.length - 1].id;

  const shares: ParticipantShare[] = equalSplit.shares.map((s) => ({
    ...s,
    isResidual: s.participantId === residualParticipantId
  }));

  const userShare = shares.find((s) => s.isCurrentUser)!;

  return {
    totalAmount: billAmount,
    label: label.trim(),
    mode: 'adjust',
    shares,
    userShare,
    residualParticipantId,
    editHistory: []
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

