import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusTrapOptions {
  onEscape?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusElement?: HTMLElement | null;
}

/**
 * A robust focus trap hook for dialogs, modals, and sheets.
 * - Traps Tab and Shift+Tab within the container.
 * - Handles Escape key to close.
 * - Restores focus to the invoking element when closed.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isOpen: boolean,
  options: FocusTrapOptions = {}
) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Remember previously focused element for restoration
    previousActiveElement.current = (options.returnFocusElement || document.activeElement) as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    // 2. Set initial focus
    const timer = setTimeout(() => {
      if (options.initialFocusRef?.current) {
        options.initialFocusRef.current.focus();
      } else {
        const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          container.focus();
        }
      }
    }, 10);

    // 3. Keydown listener for Tab and Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (options.onEscape) {
          e.preventDefault();
          e.stopPropagation();
          options.onEscape();
        }
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null || el.tabIndex >= 0);

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    // 4. Cleanup and focus restoration
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        // Small delay to allow dialog unmounting animation without losing focus
        setTimeout(() => {
          previousActiveElement.current?.focus();
        }, 10);
      }
    };
  }, [isOpen, containerRef, options.onEscape, options.initialFocusRef, options.returnFocusElement]);
}
