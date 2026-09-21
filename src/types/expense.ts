export type CategoryType =
  | 'Food & Dining'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Health & Wellness'
  | 'Bills & Utilities'
  | 'Other';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // Formatted e.g. "1:32 PM"
  category: CategoryType | string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface NewExpensePayload {
  description: string;
  amount: number;
  date?: string; // Optional: defaults to activeDate
}

export interface UpdateExpensePayload {
  description: string;
  amount: number;
  date: string;
  category: string;
}
