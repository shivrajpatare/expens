import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppProvider } from './context/AppContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './styles/globals.css';

// Register Service Worker in production only (Lock 2)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <ExpenseProvider>
          <App />
        </ExpenseProvider>
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
