import React, { createContext, useContext, useState, useEffect } from 'react';
import { ViewType, CurrencyCode, AppContextValue, AppSettings } from '../types';
import { settingsRepository } from '../storage/settingsRepository';

const AppContext = createContext<AppContextValue | undefined>(undefined);

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£'
};

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ViewType>('today');
  const [activeDate, setActiveDate] = useState<string>(getTodayDateString());
  const [settings, setSettings] = useState<AppSettings>({
    baselineDailyLimit: 1000,
    currency: 'INR',
    theme: 'light',
    groqEnabled: false
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Hydrate settings from IndexedDB on initial load
  useEffect(() => {
    let isMounted = true;

    settingsRepository
      .get()
      .then((persisted) => {
        if (isMounted && persisted) {
          setSettings((prev) => ({
            ...prev,
            ...persisted
          }));
        }
      })
      .catch((err) => {
        console.warn('Could not load settings from IndexedDB, using defaults:', err);
      })
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // 3. Persist settings whenever they change (after initial hydration)
  const persistSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    settingsRepository.save(newSettings).catch((err) => {
      console.error('Failed to persist settings to IndexedDB:', err);
    });
  };

  const setBaselineDailyLimit = (baselineDailyLimit: number) => {
    persistSettings({ ...settings, baselineDailyLimit });
  };

  const setCurrency = (currency: CurrencyCode) => {
    persistSettings({ ...settings, currency });
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
    persistSettings({ ...settings, theme: nextTheme });
  };

  const setGroqEnabled = (groqEnabled: boolean) => {
    persistSettings({ ...settings, groqEnabled });
  };

  const restoreSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const currencySymbol = CURRENCY_SYMBOLS[settings.currency] || '₹';

  const value: AppContextValue = {
    activeView,
    activeDate,
    settings,
    setActiveView,
    setActiveDate,
    setBaselineDailyLimit,
    setCurrency,
    toggleTheme,
    setGroqEnabled,
    restoreSettings,
    currencySymbol,
    isHydrated
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
