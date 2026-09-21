export type ViewType = 'today' | 'history' | 'insights' | 'audit' | 'settings';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  baselineDailyLimit: number;
  currency: CurrencyCode;
  theme: ThemeMode;
  groqEnabled?: boolean;
}

export interface AppState {
  activeView: ViewType;
  activeDate: string; // ISO date string: YYYY-MM-DD
  settings: AppSettings;
}

export interface AppContextValue extends AppState {
  setActiveView: (view: ViewType) => void;
  setActiveDate: (date: string) => void;
  setBaselineDailyLimit: (limit: number) => void;
  setCurrency: (currency: CurrencyCode) => void;
  toggleTheme: () => void;
  setGroqEnabled: (enabled: boolean) => void;
  restoreSettings: (settings: AppSettings) => void;
  currencySymbol: string;
  isHydrated: boolean;
}
