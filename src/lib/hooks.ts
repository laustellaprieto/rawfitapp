import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db, type ArchivoGuardado } from './db';
import { aBlob } from './image';
import { indexarRegistros } from './habitos';

/** Perfil: undefined mientras carga, null si no existe (por ejemplo, mientras se descargan los datos de la cuenta). */
export function usePerfil() {
  return useLiveQuery(async () => (await db.perfil.get('main')) ?? null, []);
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

/** Crea una URL temporal para mostrar una imagen (Blob o bytes guardados en el celular). */
export function useBlobURL(archivo: ArchivoGuardado | undefined) {
  const [url, setUrl] = useState<string>();
  const blob = useMemo(() => aBlob(archivo), [archivo]);
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
