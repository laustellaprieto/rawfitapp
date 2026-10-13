import { useEffect, useState } from 'react';
import { db } from './db';
import { hoyISO } from './fechas';
import { esHito, rachaActual } from './habitos';
import { useHabitos, useRegistros } from './hooks';

/** Detecta cuando la racha llega a un hito (1, 7, 15, 30, 60…) y lo celebra una sola vez. */
export function useCelebracion(activo: boolean) {
  const { activos, cargando } = useHabitos();
  const idx = useRegistros();
  const [hito, setHito] = useState<number>();
  const racha = rachaActual(activos, idx);

  useEffect(() => {
    if (!activo || cargando || !racha.inicio || !esHito(racha.dias)) return;
    const id = `${racha.inicio}:${racha.dias}`;
    let cancelado = false;
    db.transaction('rw', db.logros, async () => {
      if (await db.logros.get(id)) return false;
      await db.logros.add({ id, hito: racha.dias, inicioRacha: racha.inicio!, fecha: hoyISO() });
      return true;
    }).then((nuevo) => {
      if (nuevo && !cancelado) setHito(racha.dias);
    });
    return () => {
      cancelado = true;
    };
  }, [activo, cargando, racha.dias, racha.inicio]);

  return { hito, cerrar: () => setHito(undefined) };
}
