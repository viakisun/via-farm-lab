import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@via-farm-lab/ui/fonts.css';
import './styles.css';

import AppShell from './App';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found');
}

createRoot(root).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
