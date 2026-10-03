/**
 * Phase 13: Split Bill Domain Types
 * 
 * Pure domain interfaces for shared bill calculation and allocation.
 * Completely decoupled from React and storage layers.
 */

export interface Participant {
  id: string;
  name: string;
  isCurrentUser: boolean;
}

export type SplitMode = 'equal' | 'adjust' | 'custom' | 'percentage';

export interface ParticipantShare {
  participantId: string;
  name: string;
  isCurrentUser: boolean;
  percentage: number;
  amount: number;
  isResidual?: boolean;
}

export interface SplitResult {
  totalAmount: number;
  label: string;
  mode: SplitMode;
  shares: ParticipantShare[];
  userShare: ParticipantShare;
  residualParticipantId?: string;
  editHistory?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  diffCents?: number;
}
