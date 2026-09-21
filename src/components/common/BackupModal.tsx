import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { motionTokens, usePrefersReducedMotion } from '../../lib/motion/tokens';
import { useFocusTrap } from '../../lib/a11y/useFocusTrap';

interface BackupModalProps {
  isOpen: boolean;
  type: 'json-restore' | 'csv-import';
  summary: {
    expenseCount: number;
    limitOverrideCount?: number;
    currency?: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  type,
  summary,
  onConfirm,
  onCancel
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useFocusTrap(modalRef, isOpen, {
    onEscape: onCancel,
    initialFocusRef: confirmBtnRef
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-md)'
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
            onClick={onCancel}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(18, 21, 26, 0.45)',
              backdropFilter: 'blur(2px)'
            }}
          />

          {/* Modal Card */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-modal-title"
            tabIndex={-1}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98, y: 4 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: motionTokens.durations.dialogEnter, ease: motionTokens.easings.standard }
            }
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 420,
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              boxShadow: 'var(--shadow-level-2)',
              color: 'var(--color-text-primary)'
            }}
          >
            <h3
              id="backup-modal-title"
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 'var(--space-sm)',
                letterSpacing: '-0.01em'
              }}
            >
              {type === 'json-restore' ? 'Restore Backup' : 'Import CSV Expenses'}
            </h3>

            <div
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-md)'
              }}
            >
              {type === 'json-restore' ? (
                <>
                  <p style={{ marginBottom: 'var(--space-xs)' }}>
                    Ready to restore the following from backup:
                  </p>
                  <ul style={{ paddingLeft: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                    <li>
                      <strong>{summary.expenseCount}</strong> expense records
                    </li>
                    <li>
                      <strong>{summary.limitOverrideCount ?? 0}</strong> daily limit overrides
                    </li>
                    {summary.currency && (
                      <li>
                        Application currency: <strong>{summary.currency}</strong>
                      </li>
                    )}
                  </ul>
                  <p
                    style={{
                      fontSize: 13,
                      padding: 'var(--space-xs) var(--space-sm)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface-subtle)',
                      border: '1px solid var(--color-border-subtle)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    <strong>Notice:</strong> This will replace your current local dataset in this browser with the backup.
                  </p>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: 'var(--space-xs)' }}>
                    Ready to import <strong>{summary.expenseCount}</strong> expenses from CSV.
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      padding: 'var(--space-xs) var(--space-sm)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-surface-subtle)',
                      border: '1px solid var(--color-border-subtle)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    These expenses will be added to your current ledger. Existing data will remain untouched.
                  </p>
                </>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                justifyContent: 'flex-end',
                marginTop: 'var(--space-lg)'
              }}
            >
              <button
                type="button"
                onClick={onCancel}
                style={{
                  minHeight: 'var(--target-min, 48px)',
                  padding: '0 var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                ref={confirmBtnRef}
                type="button"
                onClick={onConfirm}
                style={{
                  minHeight: 'var(--target-min, 48px)',
                  padding: '0 var(--space-lg)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-accent-text)',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {type === 'json-restore' ? 'Confirm Restore' : 'Confirm Import'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
