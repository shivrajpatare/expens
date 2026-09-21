/**
 * Phase 10: AnimatedNumber Primitive
 * 
 * Interpolates numeric changes over 240ms with cubic-bezier(0.16, 1, 0.3, 1).
 * Guarantees exact final deterministic value.
 * Instantly updates without animation when prefers-reduced-motion is active.
 */

import React, { useEffect, useState, useRef } from 'react';
import { animate } from 'motion/react';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

export interface AnimatedNumberProps {
  value: number;
  formatFn?: (val: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  formatFn,
  className = '',
  prefix = '',
  suffix = ''
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = value;

    if (from === to || prefersReducedMotion) {
      setDisplayValue(to);
      return;
    }

    const controls = animate(from, to, {
      duration: motionTokens.durations.number,
      ease: motionTokens.easings.number,
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest * 100) / 100);
      },
      onComplete: () => {
        // Guarantee exact final deterministic value
        setDisplayValue(to);
      }
    });

    return () => controls.stop();
  }, [value, prefersReducedMotion]);

  const formatted = formatFn ? formatFn(displayValue) : displayValue.toLocaleString();

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
