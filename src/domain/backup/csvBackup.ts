import type { Expense } from '../../types/expense.ts';
import type { CurrencyCode } from '../../types/index.ts';
import type { CsvValidationResult } from './types.ts';

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Escapes a single CSV field according to RFC 4180.
 * If the field contains commas, double quotes, or newlines, it must be enclosed in quotes
 * and any internal double quotes must be doubled ("").
 */
export function escapeCsvField(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Creates an RFC 4180 compliant CSV string from an array of expenses.
 */
export function createCsvExport(expenses: Expense[], currency: CurrencyCode): string {
  const headers = ['Date', 'Time', 'Description', 'Amount', 'Currency', 'Category'];
  const lines: string[] = [headers.join(',')];

  for (const exp of expenses) {
    const row = [
      escapeCsvField(exp.date),
      escapeCsvField(exp.time || ''),
      escapeCsvField(exp.description),
      escapeCsvField(exp.amount.toFixed(2)),
      escapeCsvField(currency),
      escapeCsvField(exp.category || 'Other')
    ];
    lines.push(row.join(','));
  }

  return lines.join('\r\n');
}

/**
 * Parses an RFC 4180 CSV string into records.
 * Handles multiline quoted values and escaped quotes correctly.
 */
export function parseCsvRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvContent.length) {
    const char = csvContent[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csvContent.length && csvContent[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (i + 1 < csvContent.length && csvContent[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Validates and parses a CSV import file.
 * 
 * Strict Currency Rule (Lock 3):
 * If the imported CSV contains a currency different from the current application currency:
 * -> reject the import with a clear user-facing explanation.
 * No silent conversion, no guessed conversion.
 */
export function parseCsvImport(
  csvContent: string,
  currentCurrency: CurrencyCode
): CsvValidationResult {
  const rawRows = parseCsvRows(csvContent.trim());
  if (rawRows.length === 0) {
    return { isValid: false, error: 'The CSV file is empty.' };
  }

  // Filter out empty rows
  const rows = rawRows.filter((r) => r.some((field) => field.trim().length > 0));
  if (rows.length < 2) {
    return { isValid: false, error: 'The CSV file contains no data rows (only header or empty).' };
  }

  // Parse header row
  const headerRow = rows[0].map((h) => h.trim().toLowerCase());
  const dateIdx = headerRow.findIndex((h) => h === 'date');
  const descIdx = headerRow.findIndex((h) => h === 'description' || h === 'spending on' || h === 'title');
  const amountIdx = headerRow.findIndex((h) => h === 'amount' || h === 'cost' || h === 'price');
  const currencyIdx = headerRow.findIndex((h) => h === 'currency');
  const categoryIdx = headerRow.findIndex((h) => h === 'category');
  const timeIdx = headerRow.findIndex((h) => h === 'time');

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return {
      isValid: false,
      error: 'CSV missing required headers. Must include: Date, Description, and Amount.'
    };
  }

  const validatedExpenses: Array<{
    date: string;
    description: string;
    amount: number;
    category?: string;
    time?: string;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    const dateVal = (row[dateIdx] || '').trim();
    if (!isValidCalendarDate(dateVal)) {
      return {
        isValid: false,
        error: `Row ${rowNumber}: Invalid calendar date "${dateVal}". Expected YYYY-MM-DD.`
      };
    }

    const descVal = (row[descIdx] || '').trim();
    if (!descVal) {
      return {
        isValid: false,
        error: `Row ${rowNumber}: Description cannot be empty.`
      };
    }

    const cleanAmountStr = (row[amountIdx] || '').replace(/[^\d.-]/g, '');
    const amountVal = Number(cleanAmountStr);
    if (!Number.isFinite(amountVal) || amountVal <= 0) {
      return {
        isValid: false,
        error: `Row ${rowNumber}: Invalid amount "${row[amountIdx]}". Must be a positive number.`
      };
    }

    // Currency check (Lock 3)
    if (currencyIdx !== -1 && row[currencyIdx]) {
      const rowCurrency = row[currencyIdx].trim().toUpperCase();
      if (rowCurrency && rowCurrency !== currentCurrency) {
        return {
          isValid: false,
          error: `Currency mismatch: CSV contains "${rowCurrency}", but the active application currency is "${currentCurrency}". To protect financial integrity, please switch the application currency in Settings or import matching data.`
        };
      }
    }

    const categoryVal = categoryIdx !== -1 && row[categoryIdx] ? row[categoryIdx].trim() : undefined;
    const timeVal = timeIdx !== -1 && row[timeIdx] ? row[timeIdx].trim() : undefined;

    validatedExpenses.push({
      date: dateVal,
      description: descVal,
      amount: Math.round(amountVal * 100) / 100,
      category: categoryVal,
      time: timeVal
    });
  }

  return {
    isValid: true,
    expenses: validatedExpenses,
    currency: currentCurrency,
    summary: {
      totalRows: rows.length - 1,
      validCount: validatedExpenses.length,
      currency: currentCurrency
    }
  };
}
