/**
 * Phase 10: Centralized Motion Tokens
 * 
 * Strict hierarchy:
 * 120ms - Interaction feedback (tap scale 0.98)
 * 180-220ms - Content changes (insertion, deletion, view transitions)
 * 240ms - Numbers (cubic-bezier(0.16, 1, 0.3, 1))
 * 260ms - Semantic state (over-limit easeInOut)
 * 280/200ms - Bottom sheet (spring stiffness 320, damping 28)
 * 320ms - Progress / limit tracks (soft spring)
 */

import { useState, useEffect } from 'react';

export const motionTokens = {
  durations: {
    tap: 0.12,         // 120ms
    insert: 0.22,      // 220ms
    delete: 0.18,      // 180ms
    number: 0.24,      // 240ms
    overLimit: 0.26,   // 260ms
    sheetEnter: 0.28,  // 280ms
    sheetExit: 0.20,   // 200ms
    dialogEnter: 0.20, // 200ms
    dialogExit: 0.15,  // 150ms
    progress: 0.32,    // 320ms
    view: 0.18         // 180ms
  },
  easings: {
    number: [0.16, 1, 0.3, 1] as const,
    standard: [0.16, 1, 0.3, 1] as const,
    overLimit: 'easeInOut' as const
  },
  springs: {
    sheet: {
      type: 'spring' as const,
      stiffness: 320,
      damping: 28
    },
    progress: {
      type: 'spring' as const,
      stiffness: 280,
      damping: 30
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.12,
      ease: [0.16, 1, 0.3, 1] as const
    }
  }
};

/**
 * Custom React hook detecting whether the user prefers reduced motion.
 * When true, all Motion primitives must bypass transforms, springs, and durations.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      // Legacy Safari support
      mediaQuery.addListener(listener);
      return () => mediaQuery.removeListener(listener);
    }
  }, []);

  return prefersReducedMotion;
}
