import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Recuperacion } from './components/Recuperacion';
import { AvisoVersion } from './components/AvisoVersion';
import { convertirArchivos } from './lib/sync'; // (importarlo registra el marcado de cambios antes de cualquier escritura)
import { iniciarNube } from './lib/nube';
import { escucharErrores, iniciarActualizaciones } from './lib/version';
import './index.css';

escucharErrores();
iniciarActualizaciones();
iniciarNube();
// Pasa a bytes las fotos guardadas por versiones anteriores (en iPhone los Blob guardados pueden dejar de leerse).
convertirArchivos();

// Pide al navegador que no borre los datos automáticamente (fotos incluidas).
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Recuperacion>
      <App />
    </Recuperacion>
    <AvisoVersion />
  </StrictMode>,
);
