/**
 * Phase 10: AnimatedProgress Primitive
 * 
 * Animates limit and progress status tracks with a soft, controlled spring (320ms).
 * Not bouncy. Instantly applies width when prefers-reduced-motion is active.
 * 
 * Note: Semantically distinct from category distribution bars.
 */

import React from 'react';
import { motion } from 'motion/react';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

export interface AnimatedProgressProps {
  value: number; // 0 to 100
  className?: string;
  role?: string;
  'aria-valuenow'?: number;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-label'?: string;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  value,
  className = '',
  role = 'progressbar',
  'aria-valuenow': ariaValueNow,
  'aria-valuemin': ariaValueMin = 0,
  'aria-valuemax': ariaValueMax = 100,
  'aria-label': ariaLabel
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div
      className="hero-progress-track"
      role={role}
      aria-valuenow={ariaValueNow ?? clamped}
      aria-valuemin={ariaValueMin}
      aria-valuemax={ariaValueMax}
      aria-label={ariaLabel}
    >
      <motion.div
        className={className}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : motionTokens.springs.progress
        }
      />
    </div>
  );
};
