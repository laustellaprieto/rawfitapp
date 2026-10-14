import { Component, type ErrorInfo, type ReactNode } from 'react';
import logo from '../../assets/logo.png';
import { copiarReporte, guardarError } from '../lib/version';

interface Props {
  children: ReactNode;
  /** Mensaje compacto (dentro de una pantalla) en vez de pantalla completa. */
  compacto?: boolean;
}
interface Estado {
  error: Error | null;
  intentos: number;
  clave: number;
}

/**
 * Si algo falla al dibujar la app, en vez de quedarse la pantalla en negro:
 * 1) lo reintenta solo (la mayoría de fallas son momentáneas), y
 * 2) si vuelve a fallar, muestra un mensaje con botón para recargar.
 * Los datos no se pierden: están guardados en el dispositivo.
 */
export class Recuperacion extends Component<Props, Estado> {
  state: Estado = { error: null, intentos: 0, clave: 0 };
  private reinicio?: ReturnType<typeof setTimeout>;

  static getDerivedStateFromError(error: Error): Partial<Estado> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error en la interfaz', error, info.componentStack);
    guardarError(error, info.componentStack ?? undefined);
    clearTimeout(this.reinicio);
    if (this.state.intentos < 2) {
      setTimeout(() => this.setState((s) => ({ error: null, intentos: s.intentos + 1, clave: s.clave + 1 })), 150);
    }
    // Si pasa un rato sin fallas, se vuelven a permitir reintentos automáticos.
    this.reinicio = setTimeout(() => this.setState({ intentos: 0 }), 15_000);
  }

  componentWillUnmount() {
    clearTimeout(this.reinicio);
  }

  render() {
    const { error, intentos, clave } = this.state;
    if (!error) return <div key={clave} className="contents">{this.props.children}</div>;
    if (intentos < 2) return <Cargando />;
    const reintentar = () => this.setState((s) => ({ error: null, intentos: 0, clave: s.clave + 1 }));
    if (this.props.compacto)
      return (
        <div className="tarjeta my-6 text-center">
          <p className="titulo text-2xl">Algo no cargó bien</p>
          <p className="text-suave mt-1 mb-4 text-sm">Tus datos están a salvo.</p>
          <div className="flex justify-center gap-2">
            <button className="btn-sec" onClick={reintentar}>
              Reintentar
            </button>
            <button className="btn-oro" onClick={() => window.location.reload()}>
              Recargar la app
            </button>
          </div>
        </div>
      );
    return (
      <div className="bg-fondo text-texto flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <img src={logo} alt="" className="h-16 w-auto" />
        <p className="titulo text-4xl">Algo no cargó bien</p>
        <p className="text-suave max-w-xs text-sm">No te preocupes: tus datos están guardados. Toca el botón para volver a cargar la app.</p>
        <button className="btn-oro" onClick={() => window.location.reload()}>
          Recargar la app
        </button>
        <button className="text-dorado text-sm font-semibold" onClick={async (e) => {
          const ok = await copiarReporte();
          (e.target as HTMLButtonElement).textContent = ok ? '¡Reporte copiado! Envíalo a soporte' : 'Copia el texto que apareció';
        }}>
          Copiar reporte del error
        </button>
        <p className="text-suave/60 max-w-xs text-[10px]">{error.message}</p>
      </div>
    );
  }
}

/** Pantalla de carga (en vez de dejar el fondo negro vacío). */
export function Cargando() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3" role="status" aria-label="Cargando">
      <img src={logo} alt="" className="h-12 w-auto animate-pulse" />
      <span className="text-suave text-xs">Cargando…</span>
    </div>
  );
}
