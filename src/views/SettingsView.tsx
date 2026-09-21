import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useExpenses } from '../context/ExpenseContext';
import { createJsonBackup, validateJsonBackup } from '../domain/backup/jsonBackup';
import { createCsvExport, parseCsvImport } from '../domain/backup/csvBackup';
import { BackupDataV1 } from '../domain/backup/types';
import { BackupModal } from '../components/common/BackupModal';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const SettingsView: React.FC = () => {
  const {
    settings,
    currencySymbol,
    activeDate,
    setBaselineDailyLimit,
    setCurrency,
    toggleTheme,
    setGroqEnabled
  } = useApp();

  const {
    expenses,
    limitOverrides,
    atomicRestoreBackup,
    importCsvExpenses
  } = useExpenses();

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'json-restore' | 'csv-import'>('json-restore');
  const [modalSummary, setModalSummary] = useState<{
    expenseCount: number;
    limitOverrideCount?: number;
    currency?: string;
  }>({ expenseCount: 0 });

  const [pendingJsonBackup, setPendingJsonBackup] = useState<BackupDataV1 | null>(null);
  const [pendingCsvExpenses, setPendingCsvExpenses] = useState<Array<{
    date: string;
    description: string;
    amount: number;
    category?: string;
    time?: string;
  }> | null>(null);

  // 1. Export JSON
  const handleExportJson = () => {
    try {
      const overridesList = Object.values(limitOverrides);
      const backup = createJsonBackup(expenses, overridesList, settings);
      const jsonStr = JSON.stringify(backup, null, 2);
      downloadFile(jsonStr, `personal-money-tracker-backup-${activeDate}.json`, 'application/json');
      setFeedbackMessage('Backup exported.');
      setFeedbackType('success');
    } catch (err: any) {
      setFeedbackMessage('Failed to export backup.');
      setFeedbackType('error');
    }
  };

  // 2. Export CSV
  const handleExportCsv = () => {
    try {
      const csvStr = createCsvExport(expenses, settings.currency);
      downloadFile(csvStr, `personal-money-tracker-${activeDate}.csv`, 'text/csv;charset=utf-8;');
      setFeedbackMessage('CSV exported.');
      setFeedbackType('success');
    } catch (err: any) {
      setFeedbackMessage('Failed to export CSV.');
      setFeedbackType('error');
    }
  };

  // 3. Select JSON File
  const handleJsonFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        const result = validateJsonBackup(parsed);

        if (!result.isValid || !result.data) {
          setFeedbackMessage(result.error || 'Backup could not be imported. The file does not contain valid tracker data.');
          setFeedbackType('error');
          if (jsonInputRef.current) jsonInputRef.current.value = '';
          return;
        }

        setPendingJsonBackup(result.data);
        setModalType('json-restore');
        setModalSummary({
          expenseCount: result.data.expenses.length,
          limitOverrideCount: result.data.dailyLimits.length,
          currency: result.data.settings.currency
        });
        setModalOpen(true);
      } catch (err: any) {
        setFeedbackMessage('Backup could not be imported. Malformed JSON file.');
        setFeedbackType('error');
      }
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // 4. Select CSV File
  const handleCsvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const result = parseCsvImport(text, settings.currency);

        if (!result.isValid || !result.expenses) {
          setFeedbackMessage(result.error || 'CSV could not be imported.');
          setFeedbackType('error');
          if (csvInputRef.current) csvInputRef.current.value = '';
          return;
        }

        setPendingCsvExpenses(result.expenses);
        setModalType('csv-import');
        setModalSummary({
          expenseCount: result.expenses.length,
          currency: settings.currency
        });
        setModalOpen(true);
      } catch (err: any) {
        setFeedbackMessage('CSV could not be imported.');
        setFeedbackType('error');
      }
      if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // 5. Confirm Modal Action
  const handleConfirmModal = async () => {
    setModalOpen(false);
    if (modalType === 'json-restore' && pendingJsonBackup) {
      try {
        await atomicRestoreBackup(pendingJsonBackup);
        setFeedbackMessage('Backup restored successfully.');
        setFeedbackType('success');
      } catch (err: any) {
        setFeedbackMessage('Backup could not be imported. Transaction failed and was rolled back.');
        setFeedbackType('error');
      } finally {
        setPendingJsonBackup(null);
      }
    } else if (modalType === 'csv-import' && pendingCsvExpenses) {
      try {
        await importCsvExpenses(pendingCsvExpenses);
        setFeedbackMessage(`Imported ${pendingCsvExpenses.length} expenses successfully.`);
        setFeedbackType('success');
      } catch (err: any) {
        setFeedbackMessage('Failed to import CSV expenses.');
        setFeedbackType('error');
      } finally {
        setPendingCsvExpenses(null);
      }
    }
  };

  const handleCancelModal = () => {
    setModalOpen(false);
    setPendingJsonBackup(null);
    setPendingCsvExpenses(null);
  };

  return (
    <div className="view-container">
      <div className="view-placeholder-card" style={{ textAlign: 'left' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          <div className="view-badge safe">Global Settings Shell</div>
          <h2 className="view-placeholder-title" style={{ marginTop: 'var(--space-xs)' }}>
            Application Settings
          </h2>
          <p className="view-placeholder-desc">
            Structural settings controls for baseline daily limit, currency, theme, and data.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Baseline Daily Limit */}
          <div style={{
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Baseline Daily Limit</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Default limit applied to all days</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="tabular-nums" style={{ fontWeight: 600, fontSize: 16 }}>{currencySymbol}</span>
              <input
                type="number"
                value={settings.baselineDailyLimit}
                onChange={(e) => setBaselineDailyLimit(Number(e.target.value) || 0)}
                className="tabular-nums"
                aria-label="Baseline Daily Limit"
                style={{
                  width: 90,
                  height: 36,
                  padding: '0 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 15,
                  fontWeight: 600,
                  textAlign: 'right'
                }}
              />
            </div>
          </div>

          {/* Currency */}
          <div style={{
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Currency</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Display symbol and formatting</div>
            </div>
            <select
              value={settings.currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              aria-label="Select Currency"
              style={{
                height: 36,
                padding: '0 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          {/* Theme */}
          <div style={{
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Appearance</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Current: {settings.theme} mode</div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                minHeight: 'var(--target-min, 48px)',
                padding: '0 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 13,
                fontWeight: 500
              }}
            >
              Toggle to {settings.theme === 'light' ? 'Dark' : 'Light'}
            </button>
          </div>

          {/* AI Insights Configuration (Local + Optional Groq) */}
          <div style={{
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>AI Insights</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Local insights: Always available · 100% offline
                </div>
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: settings.groqEnabled ? 'var(--status-safe-bg, rgba(74,138,90,0.1))' : 'var(--color-surface)',
                color: settings.groqEnabled ? 'var(--status-safe)' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-subtle)'
              }}>
                {settings.groqEnabled ? 'Groq Enabled' : 'Local Only'}
              </span>
            </div>

            <div style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.4,
              borderTop: '1px solid var(--color-border-subtle)',
              paddingTop: 'var(--space-xs)'
            }}>
              Optional Groq inference uses open-weight models (e.g. <code>openai/gpt-oss-20b</code>) via a local server boundary.
              Your financial calculations remain 100% local; raw expenses are never transmitted.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setGroqEnabled(!settings.groqEnabled)}
                style={{
                  minHeight: 'var(--target-min, 48px)',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {settings.groqEnabled ? 'Disable Groq Insights' : 'Enable Groq Insights'}
              </button>
            </div>
          </div>

          {/* Data Section (Backup & Restore) */}
          <div style={{
            background: 'var(--color-surface-subtle)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)'
          }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Data</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Export and restore your ledger data locally
              </div>
            </div>

            {/* Status / feedback message */}
            {feedbackMessage && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  fontSize: 13,
                  padding: 'var(--space-xs) var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: feedbackType === 'error' ? 'var(--status-over-surface)' : 'var(--status-safe-surface)',
                  color: feedbackType === 'error' ? 'var(--status-over)' : 'var(--status-safe)',
                  border: `1px solid ${feedbackType === 'error' ? 'var(--status-over)' : 'var(--status-safe)'}`
                }}
              >
                {feedbackMessage}
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'var(--space-sm)',
              marginTop: 4
            }}>
              <button
                type="button"
                onClick={handleExportJson}
                style={{
                  minHeight: 'var(--target-min, 48px)',
                  padding: '0 var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Export Backup (JSON)
              </button>

              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                style={{
                  minHeight: 'var(--target-min, 48px)',
                  padding: '0 var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Import Backup (JSON)
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                style={{
                  minHeight: 'var(--target-min, 48px)',
                  padding: '0 var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                style={{
                  minHeight: 'var(--target-min, 48px)',
                  padding: '0 var(--space-sm)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Import CSV
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleJsonFileSelected}
              aria-label="Select JSON backup file to import"
            />
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleCsvFileSelected}
              aria-label="Select CSV file to import"
            />
          </div>
        </div>
      </div>

      {/* Backup / CSV Import Modal */}
      <BackupModal
        isOpen={modalOpen}
        type={modalType}
        summary={modalSummary}
        onConfirm={handleConfirmModal}
        onCancel={handleCancelModal}
      />
    </div>
  );
};
