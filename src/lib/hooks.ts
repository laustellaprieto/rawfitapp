import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { AJUSTES_INICIALES, db } from './db';
import { indexarRegistros } from './stats';

export function useAjustes() {
  return useLiveQuery(() => db.ajustes.get('main'), []) ?? AJUSTES_INICIALES;
}

export function useHabitos() {
  const todos = useLiveQuery(() => db.habitos.orderBy('orden').toArray(), []);
  const activos = useMemo(() => (todos ?? []).filter((h) => h.activo), [todos]);
  return { todos: todos ?? [], activos, cargando: todos === undefined };
}

export function useRegistros() {
  const registros = useLiveQuery(() => db.registros.toArray(), []);
  return useMemo(() => indexarRegistros(registros ?? []), [registros]);
}

export function useMedidas() {
  return useLiveQuery(() => db.medidas.orderBy('fecha').toArray(), []);
}

export function useEntrenos() {
  return useLiveQuery(() => db.entrenos.orderBy('fecha').reverse().toArray(), []);
}

/** Crea una URL temporal para mostrar un Blob como imagen. */
export function useBlobURL(blob: Blob | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
