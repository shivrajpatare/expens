import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { TodayView } from './views/TodayView';
import { HistoryView } from './views/HistoryView';
import { InsightsView } from './views/InsightsView';
import { AuditView } from './views/AuditView';
import { SettingsView } from './views/SettingsView';
import { motionTokens, usePrefersReducedMotion } from './lib/motion/tokens';

export const App: React.FC = () => {
  const { activeView } = useApp();
  const prefersReducedMotion = usePrefersReducedMotion();

  const renderView = () => {
    switch (activeView) {
      case 'today':
        return <TodayView />;
      case 'history':
        return <HistoryView />;
      case 'insights':
        return <InsightsView />;
      case 'audit':
        return <AuditView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TodayView />;
    }
  };

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: motionTokens.durations.view, ease: motionTokens.easings.standard }
          }
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
};
