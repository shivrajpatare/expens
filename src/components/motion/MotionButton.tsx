/**
 * Phase 10: MotionButton Primitive
 * 
 * Enforces the locked 120ms tap feedback token (scale 0.98, duration 120ms).
 * Bypasses scale animation when prefers-reduced-motion is active.
 */

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

export interface MotionButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, disabled, className = '', ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        className={className}
        whileTap={
          disabled || prefersReducedMotion
            ? undefined
            : motionTokens.tap
        }
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

MotionButton.displayName = 'MotionButton';
