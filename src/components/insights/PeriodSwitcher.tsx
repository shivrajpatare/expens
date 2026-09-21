import React from 'react';
import { motion } from 'motion/react';
import type { PeriodMode } from '../../domain/money/types';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';

interface PeriodSwitcherProps {
  mode: PeriodMode;
  onModeChange: (mode: PeriodMode) => void;
}

export const PeriodSwitcher: React.FC<PeriodSwitcherProps> = ({ mode, onModeChange }) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="period-switcher" role="tablist" aria-label="Period selection">
      <motion.button
        type="button"
        role="tab"
        aria-selected={mode === 'week'}
        className={`period-switcher-btn ${mode === 'week' ? 'active' : ''}`}
        onClick={() => onModeChange('week')}
        whileTap={prefersReducedMotion ? undefined : motionTokens.tap}
        style={{ position: 'relative' }}
      >
        <span style={{ position: 'relative', zIndex: 2 }}>This Week</span>
        {mode === 'week' && (
          <motion.span
            layoutId={prefersReducedMotion ? undefined : 'period-active-pill'}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              zIndex: 1
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: motionTokens.durations.view, ease: motionTokens.easings.standard }
            }
          />
        )}
      </motion.button>

      <motion.button
        type="button"
        role="tab"
        aria-selected={mode === 'month'}
        className={`period-switcher-btn ${mode === 'month' ? 'active' : ''}`}
        onClick={() => onModeChange('month')}
        whileTap={prefersReducedMotion ? undefined : motionTokens.tap}
        style={{ position: 'relative' }}
      >
        <span style={{ position: 'relative', zIndex: 2 }}>This Month</span>
        {mode === 'month' && (
          <motion.span
            layoutId={prefersReducedMotion ? undefined : 'period-active-pill'}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              zIndex: 1
            }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: motionTokens.durations.view, ease: motionTokens.easings.standard }
            }
          />
        )}
      </motion.button>
    </div>
  );
};
