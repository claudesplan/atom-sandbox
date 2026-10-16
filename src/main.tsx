import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useStore } from './state/store';
import './styles.css';
import { App } from './ui/App';

if (import.meta.env.DEV) {
  // Debug handle for the browser console (development builds only).
  (window as unknown as Record<string, unknown>).__atom = { useStore };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
