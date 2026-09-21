/**
 * Native IndexedDB Initialization and Schema Management.
 * Database: personal-money-tracker
 * Version: 1
 */

const DB_NAME = 'personal-money-tracker';
const DB_VERSION = 1;

export const STORES = {
  EXPENSES: 'expenses',
  DAILY_LIMITS: 'dailyLimits',
  SETTINGS: 'settings'
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Expenses Store
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
        expenseStore.createIndex('date', 'date', { unique: false });
        expenseStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 2. Daily Limits (Overrides) Store
      if (!db.objectStoreNames.contains(STORES.DAILY_LIMITS)) {
        db.createObjectStore(STORES.DAILY_LIMITS, { keyPath: 'date' });
      }

      // 3. Settings Store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null; // reset on error so retry is possible
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };

    request.onblocked = () => {
      console.warn('IndexedDB open request was blocked.');
    };
  });

  return dbPromise;
}

/**
 * Execute a transaction on an object store with promise lifecycle.
 */
export async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);

  return new Promise<T>((resolve, reject) => {
    let result: T;

    tx.oncomplete = () => {
      resolve(result);
    };

    tx.onerror = () => {
      reject(tx.error || new Error(`Transaction error on ${storeName}`));
    };

    tx.onabort = () => {
      reject(tx.error || new Error(`Transaction aborted on ${storeName}`));
    };

    Promise.resolve(callback(store))
      .then((res) => {
        result = res;
      })
      .catch((err) => {
        tx.abort();
        reject(err);
      });
  });
}
/**
 * Execute an atomic restore spanning expenses, daily limits, and settings in ONE transaction.
 * If any operation fails, the entire transaction is aborted and rolled back.
 */
export async function atomicRestore(backup: import('../domain/backup/types').BackupDataV1): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction([STORES.EXPENSES, STORES.DAILY_LIMITS, STORES.SETTINGS], 'readwrite');

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => {
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error || new Error('Atomic restore transaction failed.'));
    };

    tx.onabort = () => {
      reject(tx.error || new Error('Atomic restore transaction aborted. Changes rolled back.'));
    };

    try {
      const expStore = tx.objectStore(STORES.EXPENSES);
      const limitStore = tx.objectStore(STORES.DAILY_LIMITS);
      const settingsStore = tx.objectStore(STORES.SETTINGS);

      // 1. Clear all 3 stores inside this single transaction
      expStore.clear();
      limitStore.clear();
      settingsStore.clear();

      // 2. Put restored expenses
      for (const exp of backup.expenses) {
        expStore.put(exp);
      }

      // 3. Put restored daily limits
      for (const limit of backup.dailyLimits) {
        limitStore.put(limit);
      }

      // 4. Put restored settings
      settingsStore.put({
        key: 'app_settings',
        settings: backup.settings
      });
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}

/**
 * Bulk append expenses in a single transaction (used for CSV import).
 */
export async function bulkPutExpenses(expenses: import('../types/expense').Expense[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORES.EXPENSES, 'readwrite');

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to bulk insert expenses.'));
    tx.onabort = () => reject(tx.error || new Error('Bulk insert expenses transaction aborted.'));

    try {
      const store = tx.objectStore(STORES.EXPENSES);
      for (const exp of expenses) {
        store.put(exp);
      }
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}
