import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { applyUiFontPreference, getUiFontPreference } from './lib/uiFontPreference';

applyUiFontPreference(getUiFontPreference());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
