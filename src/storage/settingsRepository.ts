import { AppSettings } from '../types';
import { STORES, withStore } from './db';

interface SettingsRecord {
  key: 'app_settings';
  settings: AppSettings;
}

export const settingsRepository = {
  async get(): Promise<AppSettings | null> {
    return withStore<AppSettings | null>(STORES.SETTINGS, 'readonly', (store) => {
      return new Promise<AppSettings | null>((resolve, reject) => {
        const request = store.get('app_settings');
        request.onsuccess = () => {
          const record = request.result as SettingsRecord | undefined;
          resolve(record ? record.settings : null);
        };
        request.onerror = () => reject(request.error);
      });
    });
  },

  async save(settings: AppSettings): Promise<void> {
    const record: SettingsRecord = {
      key: 'app_settings',
      settings
    };

    return withStore<void>(STORES.SETTINGS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }
};
