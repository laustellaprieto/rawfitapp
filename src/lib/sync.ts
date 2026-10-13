/**
 * Sincronización entre la base local (Dexie) y la nube (Supabase).
 *
 * - La app sigue funcionando 100 % sin internet: todo se guarda primero en el celular.
 * - Cada registro tiene un `uid` global. Cuando cambia en este dispositivo se marca `_p = 1`
 *   (pendiente) y se sube en la siguiente sincronización. Los borrados se anotan en `borrados`.
 * - Al bajar cambios, si el registro local tiene cambios pendientes, gana el local.
 * - La nube guarda cada registro en la tabla `datos` como JSON (ver supabase/schema.sql).
 */
import Dexie, { type Table } from 'dexie';
import { db, type Foto, type Nutricion, type RegistroHabito, type Sincronizable } from './db';

/** Tablas que se suben y se bajan. El orden importa al aplicar: primero las que otras referencian. */
export const SINCRONIZADAS = ['perfil', 'habitos', 'checkins', 'registros', 'fotos', 'mediciones', 'sesiones', 'ejerciciosPropios', 'logros'] as const;
/** Tablas que solo escribe la coach: el cliente solo las baja. */
export const SOLO_BAJAR = ['rutinas', 'nutricion'] as const;
type NombreTabla = (typeof SINCRONIZADAS)[number] | (typeof SOLO_BAJAR)[number];
const ORDEN: NombreTabla[] = [...SINCRONIZADAS, ...SOLO_BAJAR];

export interface FilaRemota {
  tabla: string;
  uid: string;
  data: Record<string, unknown>;
  deleted: boolean;
  updated_at?: string;
}

/** Lo que necesita la sincronización de la nube (implementado con Supabase en remoto.ts). */
export interface Remoto {
  userId: string;
  traerCambios(desde: string | null): Promise<FilaRemota[]>;
  contarFilas(): Promise<number>;
  guardar(filas: FilaRemota[]): Promise<void>;
  subirArchivo(bucket: 'fotos', ruta: string, archivo: Blob): Promise<void>;
  bajarArchivo(bucket: 'fotos' | 'nutricion', ruta: string): Promise<Blob>;
  borrarArchivo(bucket: 'fotos', ruta: string): Promise<void>;
}

const tabla = (n: NombreTabla) => db.table(n) as Table<Record<string, unknown> & Sincronizable>;

/* ───────────── Marcado de cambios locales ───────────── */

type TxRemota = { __remota?: boolean; parent?: TxRemota };
function esTransaccionRemota(): boolean {
  let tx = Dexie.currentTransaction as unknown as TxRemota | null;
  while (tx) {
    if (tx.__remota) return true;
    tx = tx.parent ?? null;
  }
  return false;
}

/** Ejecuta cambios que vienen de la nube (no se marcan como pendientes ni dejan borrados). */
async function transaccionRemota<T>(tablas: string[], fn: () => Promise<T>): Promise<T> {
  return db.transaction('rw', tablas, async (tx) => {
    (tx as unknown as TxRemota).__remota = true;
    return fn();
  });
}

let alCambiar: (() => void) | undefined;
/** Avisa cuando hay cambios locales (para sincronizar poco después). */
export function onCambioLocal(fn: () => void) {
  alCambiar = fn;
}

function uidPorDefecto(nombre: NombreTabla, obj: Record<string, unknown>): string | undefined {
  if (nombre === 'perfil') return 'perfil';
  if (nombre === 'logros') return obj.id as string;
  if (nombre === 'registros') return obj.habitoUid ? `${obj.habitoUid}|${obj.fecha}` : undefined;
  return crypto.randomUUID();
}

for (const nombre of SINCRONIZADAS) {
  const t = tabla(nombre);
  t.hook('creating', (_k, obj) => {
    obj.uid ??= uidPorDefecto(nombre, obj);
    if (esTransaccionRemota()) return;
    obj._p = 1;
    setTimeout(() => alCambiar?.());
  });
  t.hook('updating', (mods, _k, obj) => {
    if (esTransaccionRemota()) return;
    setTimeout(() => alCambiar?.());
    const extra: Record<string, unknown> = { _p: 1 };
    if (!obj.uid) extra.uid = uidPorDefecto(nombre, { ...obj, ...mods });
    return extra;
  });
  t.hook('deleting', (_k, obj) => {
    if (esTransaccionRemota() || !obj?.uid) return;
    const uid = obj.uid;
    // Se anota después de la transacción (en otra) para no depender de las tablas incluidas.
    setTimeout(() => {
      db.borrados.put({ clave: `${nombre}|${uid}`, tabla: nombre, uid }).then(() => alCambiar?.());
    });
  });
}

/** Asegura que todos los registros tengan uid (por ejemplo, después de importar una copia vieja). */
export async function asegurarUids() {
  await db.transaction('rw', [...SINCRONIZADAS.map((n) => db.table(n))], async () => {
    for (const n of ['habitos', 'checkins', 'mediciones', 'sesiones', 'ejerciciosPropios'] as const) {
      await tabla(n).filter((r) => !r.uid).modify((r) => {
        r.uid = crypto.randomUUID();
      });
    }
    await tabla('logros').filter((r) => !r.uid).modify((r) => {
      r.uid = r.id as string;
    });
    await tabla('perfil').filter((r) => r.uid !== 'perfil').modify((r) => {
      r.uid = 'perfil';
    });
    const habitos = new Map((await db.habitos.toArray()).map((h) => [h.id!, h.uid!]));
    await db.registros.filter((r) => !r.uid || !r.habitoUid).modify((r) => {
      r.habitoUid ??= habitos.get(r.habitoId);
      if (r.habitoUid) r.uid = `${r.habitoUid}|${r.fecha}`;
    });
    const checkins = new Map((await db.checkins.toArray()).map((c) => [c.id!, c.uid!]));
    await db.fotos.filter((f) => !f.uid || !f.checkinUid).modify((f) => {
      f.uid ??= crypto.randomUUID();
      f.checkinUid ??= checkins.get(f.checkinId);
    });
  });
}

/* ───────────── Conversión local ↔ nube ───────────── */

const SIN_SUBIR = new Set(['id', '_p', 'uid', 'imagen', 'habitoId', 'checkinId', 'archivo']);

function aDatos(r: Record<string, unknown>): Record<string, unknown> {
  const d: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) if (!SIN_SUBIR.has(k) && v !== undefined) d[k] = v;
  return d;
}

const rutaFoto = (userId: string, uid: string) => `${userId}/${uid}.jpg`;
const mismo = (a: Record<string, unknown>, b: Record<string, unknown>) => JSON.stringify(aDatos(a)) === JSON.stringify(aDatos(b));

/* ───────────── Subir ───────────── */

async function subir(r: Remoto, compartirFotos: boolean) {
  // 1) Borrados
  const borrados = await db.borrados.toArray();
  const filasBorradas: FilaRemota[] = [];
  for (const b of borrados) {
    const sigue = await tabla(b.tabla as NombreTabla).where('uid').equals(b.uid).count();
    if (!sigue) filasBorradas.push({ tabla: b.tabla, uid: b.uid, data: {}, deleted: true });
  }
  if (filasBorradas.length) await r.guardar(filasBorradas);
  for (const f of filasBorradas.filter((x) => x.tabla === 'fotos')) await r.borrarArchivo('fotos', rutaFoto(r.userId, f.uid)).catch(() => {});
  if (borrados.length) await db.borrados.bulkDelete(borrados.map((b) => b.clave));

  // 2) Registros nuevos o cambiados
  for (const nombre of SINCRONIZADAS) {
    if (nombre === 'fotos' && !compartirFotos) continue;
    const pendientes = await tabla(nombre).filter((x) => x._p === 1 && !!x.uid).toArray();
    if (!pendientes.length) continue;
    const filas: FilaRemota[] = [];
    for (const p of pendientes) {
      const data = aDatos(p);
      if (nombre === 'fotos') {
        const f = p as unknown as Foto;
        data.path = rutaFoto(r.userId, f.uid!);
        await r.subirArchivo('fotos', data.path as string, f.imagen);
      }
      filas.push({ tabla: nombre, uid: p.uid!, data, deleted: false });
    }
    for (let i = 0; i < filas.length; i += 200) await r.guardar(filas.slice(i, i + 200));
    // Quita la marca solo si el registro no cambió mientras se subía.
    await transaccionRemota([nombre], async () => {
      for (const p of pendientes) {
        const actual = await tabla(nombre).where('uid').equals(p.uid!).first();
        if (actual && mismo(actual, p)) await tabla(nombre).where('uid').equals(p.uid!).modify((x) => void delete x._p);
      }
    });
  }
}

/* ───────────── Bajar ───────────── */

async function aplicar(r: Remoto, filas: FilaRemota[]) {
  const porTabla = (n: string) => filas.filter((f) => f.tabla === n);
  // Archivos: se bajan antes de abrir la transacción (no se puede esperar la red dentro de ella).
  const archivos = new Map<string, Blob>();
  for (const f of [...porTabla('fotos'), ...porTabla('nutricion')]) {
    if (f.deleted) continue;
    const ya = await tabla(f.tabla as NombreTabla).where('uid').equals(f.uid).first();
    const path = f.data.path as string;
    if (ya && (ya as { path?: string }).path === path && (ya.imagen || ya.archivo)) continue;
    archivos.set(`${f.tabla}|${f.uid}`, await r.bajarArchivo(f.tabla as 'fotos' | 'nutricion', path));
  }

  await transaccionRemota(ORDEN as unknown as string[], async () => {
    for (const nombre of ORDEN) {
      const t = tabla(nombre);
      for (const f of porTabla(nombre)) {
        const local = await t.where('uid').equals(f.uid).first();
        if (local?._p === 1) continue; // el cambio local gana; se subirá después
        if (f.deleted) {
          if (local) await t.where('uid').equals(f.uid).delete();
          continue;
        }
        const nuevo: Record<string, unknown> = { ...f.data, uid: f.uid };
        if (nombre === 'perfil') nuevo.id = 'main';
        else if (nombre === 'logros') nuevo.id = f.uid;
        else if (nombre !== 'registros' && local) nuevo.id = local.id;
        if (nombre === 'registros') {
          const h = await db.habitos.where('uid').equals(String(f.data.habitoUid)).first();
          if (!h) continue;
          (nuevo as unknown as RegistroHabito).habitoId = h.id!;
          // Si existía con otra clave, se reemplaza.
          if (local) await t.where('uid').equals(f.uid).delete();
        }
        if (nombre === 'fotos') {
          const c = await db.checkins.where('uid').equals(String(f.data.checkinUid)).first();
          if (!c) continue;
          (nuevo as unknown as Foto).checkinId = c.id!;
          nuevo.imagen = archivos.get(`fotos|${f.uid}`) ?? (local as unknown as Foto | undefined)?.imagen;
          if (!nuevo.imagen) continue;
        }
        if (nombre === 'nutricion') {
          (nuevo as unknown as Nutricion).archivo = archivos.get(`nutricion|${f.uid}`) ?? (local as unknown as Nutricion | undefined)?.archivo;
        }
        await t.put(nuevo as never);
      }
    }
  });
}

async function bajar(r: Remoto) {
  const ultimo = (await db.meta.get('ultimoPull'))?.valor as string | undefined;
  // Pequeño margen hacia atrás: aplicar dos veces el mismo cambio no hace daño.
  const desde = ultimo ? new Date(new Date(ultimo).getTime() - 10_000).toISOString() : null;
  const filas = await r.traerCambios(desde);
  if (!filas.length) return;
  await aplicar(r, filas);
  const max = filas.reduce((m, f) => (f.updated_at && f.updated_at > m ? f.updated_at : m), ultimo ?? '');
  await db.meta.put({ clave: 'ultimoPull', valor: max });
}

/* ───────────── API ───────────── */

let enCurso: Promise<void> | null = null;

/** Sube los cambios pendientes y baja los nuevos. Si ya hay una sincronización en curso, espera esa. */
export function sincronizar(r: Remoto, compartirFotos: boolean): Promise<void> {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    try {
      await asegurarUids();
      await subir(r, compartirFotos);
      await bajar(r);
      await db.meta.put({ clave: 'ultimaSync', valor: new Date().toISOString() });
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

/** ¿Este dispositivo ya está vinculado a esta cuenta? */
export async function cuentaVinculada(): Promise<string | undefined> {
  return (await db.meta.get('cuenta'))?.valor as string | undefined;
}

/** Primera vez en este dispositivo con la cuenta y la nube vacía: sube todo lo local. */
export async function vincularSubiendo(r: Remoto, compartirFotos: boolean) {
  await asegurarUids();
  await db.transaction('rw', SINCRONIZADAS.map((n) => db.table(n)), async () => {
    for (const n of SINCRONIZADAS) await tabla(n).toCollection().modify((x) => void (x._p = 1));
  });
  await db.meta.bulkPut([
    { clave: 'cuenta', valor: r.userId },
    { clave: 'ultimoPull', valor: undefined },
  ]);
  await sincronizar(r, compartirFotos);
}

/** Primera vez en este dispositivo y la cuenta ya tiene datos: reemplaza lo local por lo de la nube. */
export async function vincularBajando(r: Remoto, compartirFotos: boolean) {
  await transaccionRemota([...ORDEN, 'borrados'], async () => {
    for (const n of ORDEN) await tabla(n).clear();
    await db.borrados.clear();
  });
  await db.meta.bulkPut([
    { clave: 'cuenta', valor: r.userId },
    { clave: 'ultimoPull', valor: undefined },
  ]);
  await sincronizar(r, compartirFotos);
}

/** Al activar "compartir fotos": marca todas las fotos para subirlas. */
export async function marcarFotosParaSubir() {
  await db.fotos.toCollection().modify((f) => void (f._p = 1));
}

/** Al desactivar "compartir fotos": las borra de la nube (se quedan en el celular). */
export async function retirarFotosDeLaNube(r: Remoto) {
  const fotos = await db.fotos.toArray();
  const filas = fotos.filter((f) => f.uid).map((f) => ({ tabla: 'fotos', uid: f.uid!, data: {}, deleted: true }));
  if (filas.length) await r.guardar(filas);
  for (const f of filas) await r.borrarArchivo('fotos', rutaFoto(r.userId, f.uid)).catch(() => {});
  await transaccionRemota(['fotos'], async () => {
    await db.fotos.toCollection().modify((f) => void delete f._p);
  });
}

