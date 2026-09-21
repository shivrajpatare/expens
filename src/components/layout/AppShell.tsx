import React from 'react';
import { AppHeader } from './AppHeader';
import { BottomNavigation } from './BottomNavigation';
import './layout.css';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main" id="main-content">
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
};
