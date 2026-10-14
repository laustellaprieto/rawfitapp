import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Recuperacion } from './components/Recuperacion';
import { AvisoVersion } from './components/AvisoVersion';
import { AvisoMudanza } from './components/AvisoMudanza';
import './lib/sync'; // registra el marcado de cambios antes de cualquier escritura
import { iniciarNube } from './lib/nube';
import { escucharErrores, iniciarActualizaciones } from './lib/version';
import './index.css';

escucharErrores();
iniciarActualizaciones();
iniciarNube();

// Pide al navegador que no borre los datos automáticamente (fotos incluidas).
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AvisoMudanza />
    <Recuperacion>
      <App />
    </Recuperacion>
    <AvisoVersion />
  </StrictMode>,
);
