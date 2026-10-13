import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './lib/sync'; // registra el marcado de cambios antes de cualquier escritura
import { iniciarNube } from './lib/nube';
import './index.css';

registerSW({ immediate: true });
iniciarNube();

// Pide al navegador que no borre los datos automáticamente (fotos incluidas).
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
