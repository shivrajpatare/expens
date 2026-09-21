import { Expense } from '../types/expense';
import { STORES, withStore } from './db';

export const expenseRepository = {
  async getAll(): Promise<Expense[]> {
    return withStore<Expense[]>(STORES.EXPENSES, 'readonly', (store) => {
      return new Promise<Expense[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const results = request.result as Expense[];
          // Sort newest createdAt first
          results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    });
  },

  async getByDate(date: string): Promise<Expense[]> {
    return withStore<Expense[]>(STORES.EXPENSES, 'readonly', (store) => {
      return new Promise<Expense[]>((resolve, reject) => {
        const index = store.index('date');
        const request = index.getAll(IDBKeyRange.only(date));
        request.onsuccess = () => {
          const results = request.result as Expense[];
          results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    });
  },

  async save(expense: Expense): Promise<void> {
    return withStore<void>(STORES.EXPENSES, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(expense);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async delete(id: string): Promise<void> {
    return withStore<void>(STORES.EXPENSES, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async clearAll(): Promise<void> {
    return withStore<void>(STORES.EXPENSES, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async saveAll(expenses: Expense[]): Promise<void> {
    return withStore<void>(STORES.EXPENSES, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        try {
          for (const exp of expenses) {
            store.put(exp);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }
};
