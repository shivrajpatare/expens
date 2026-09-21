import { DailyLimitOverride } from '../domain/money/types';
import { STORES, withStore } from './db';

export const limitRepository = {
  async getAll(): Promise<DailyLimitOverride[]> {
    return withStore<DailyLimitOverride[]>(STORES.DAILY_LIMITS, 'readonly', (store) => {
      return new Promise<DailyLimitOverride[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as DailyLimitOverride[]);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async get(date: string): Promise<DailyLimitOverride | null> {
    return withStore<DailyLimitOverride | null>(STORES.DAILY_LIMITS, 'readonly', (store) => {
      return new Promise<DailyLimitOverride | null>((resolve, reject) => {
        const request = store.get(date);
        request.onsuccess = () => resolve((request.result as DailyLimitOverride) || null);
        request.onerror = () => reject(request.error);
      });
    });
  },

  async set(override: DailyLimitOverride): Promise<void> {
    return withStore<void>(STORES.DAILY_LIMITS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(override);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async delete(date: string): Promise<void> {
    return withStore<void>(STORES.DAILY_LIMITS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(date);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async clearAll(): Promise<void> {
    return withStore<void>(STORES.DAILY_LIMITS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  async saveAll(overrides: DailyLimitOverride[]): Promise<void> {
    return withStore<void>(STORES.DAILY_LIMITS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        try {
          for (const ov of overrides) {
            store.put(ov);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }
};
