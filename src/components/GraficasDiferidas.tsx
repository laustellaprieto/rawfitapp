import { lazy, Suspense, type ComponentProps } from 'react';
import type * as G from './Graficas';

/**
 * Las gráficas con Recharts (más de la mitad del código de la app) se cargan aparte, solo cuando
 * se necesitan: así la app abre más rápido. Mientras cargan se reserva su mismo alto (sin saltos).
 */
const cargar = () => import('./Graficas');
const Linea = lazy(() => cargar().then((m) => ({ default: m.GraficaLinea })));
const DosLineas = lazy(() => cargar().then((m) => ({ default: m.GraficaDosLineas })));

/** Se precargan cuando la app queda libre, para que al abrir Progreso ya estén listas. */
export function precargarGraficas() {
  const ya = () => void cargar().catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(ya, { timeout: 5000 });
  else setTimeout(ya, 3000);
}

const Espacio = ({ alto }: { alto: number }) => <div style={{ height: alto }} aria-hidden />;

export function GraficaLinea(p: ComponentProps<typeof G.GraficaLinea>) {
  return (
    <Suspense fallback={<Espacio alto={p.alto ?? 200} />}>
      <Linea {...p} />
    </Suspense>
  );
}

export function GraficaDosLineas(p: ComponentProps<typeof G.GraficaDosLineas>) {
  // 24 px = leyenda (texto de 16 px + margen de 8 px) que va encima de la gráfica.
  return (
    <Suspense fallback={<Espacio alto={(p.alto ?? 210) + 24} />}>
      <DosLineas {...p} />
    </Suspense>
  );
}
