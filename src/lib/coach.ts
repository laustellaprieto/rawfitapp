/** Funciones del panel de coach (siempre con internet: leen y escriben directo en la nube). */
import type { Checkin, Comida, Habito, Medicion, Nutricion, Perfil, RegistroHabito, Rutina, Sesion } from './db';
import { supabase, traducirError, type PerfilNube } from './nube';

const sb = () => {
  if (!supabase) throw new Error('La nube no está configurada.');
  return supabase;
};
const ok = <T>(r: { data: T; error: unknown }) => {
  if (r.error) throw new Error(traducirError(r.error));
  return r.data;
};

export async function listarPerfiles(): Promise<PerfilNube[]> {
  return ok(await sb().from('profiles').select('*').neq('rol', 'coach').neq('estado', 'ninguno').order('solicitado_en', { ascending: false })) as PerfilNube[];
}

export async function responder(cliente: string, aceptar: boolean) {
  ok(await sb().rpc('responder_solicitud', { cliente, aceptar }));
}

/** Todo lo que el cliente tiene en la nube, agrupado por tabla. */
export interface DatosCliente {
  perfil?: Perfil;
  habitos: (Habito & { uid: string })[];
  registros: RegistroHabito[];
  mediciones: Medicion[];
  checkins: (Checkin & { uid: string })[];
  fotos: { uid: string; checkinUid: string; pose: string; path: string }[];
  sesiones: Sesion[];
  rutinas: (Rutina & { uid: string })[];
  nutricion: (Nutricion & { uid: string })[];
  comidas: (Comida & { uid: string })[];
}

export async function cargarCliente(id: string): Promise<DatosCliente> {
  const filas: { tabla: string; uid: string; data: Record<string, unknown> }[] = [];
  for (let i = 0; ; i += 1000) {
    const parte = ok(await sb().from('datos').select('tabla, uid, data').eq('user_id', id).eq('deleted', false).range(i, i + 999)) as typeof filas;
    filas.push(...parte);
    if (parte.length < 1000) break;
  }
  const de = <T>(t: string) => filas.filter((f) => f.tabla === t).map((f) => ({ ...f.data, uid: f.uid }) as T);
  // Los registros locales usan ids numéricos: se asigna uno a cada hábito para reutilizar los cálculos.
  const habitos = de<Habito & { uid: string }>('habitos')
    .sort((a, b) => a.orden - b.orden)
    .map((h, i) => ({ ...h, id: i + 1 }));
  const idHabito = new Map(habitos.map((h) => [h.uid, h.id!]));
  const registros = de<RegistroHabito>('registros')
    .filter((r) => r.habitoUid && idHabito.has(r.habitoUid))
    .map((r) => ({ ...r, habitoId: idHabito.get(r.habitoUid!)! }));
  return {
    perfil: de<Perfil>('perfil')[0],
    habitos,
    registros,
    mediciones: de<Medicion>('mediciones').sort((a, b) => a.fecha.localeCompare(b.fecha)),
    checkins: de<Checkin & { uid: string }>('checkins').sort((a, b) => b.fecha.localeCompare(a.fecha)),
    fotos: de('fotos'),
    sesiones: de<Sesion>('sesiones').sort((a, b) => b.fecha.localeCompare(a.fecha)),
    rutinas: de<Rutina & { uid: string }>('rutinas').sort((a, b) => a.orden - b.orden),
    nutricion: de<Nutricion & { uid: string }>('nutricion').sort((a, b) => b.subidoEn.localeCompare(a.subidoEn)),
    comidas: de<Comida & { uid: string }>('comidas').sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora)),
  };
}

/** Guarda (o borra) un registro en las filas del cliente. */
export async function guardarParaCliente(cliente: string, tabla: 'rutinas' | 'habitos' | 'nutricion', uid: string, data: object | null) {
  ok(
    await sb()
      .from('datos')
      .upsert({ user_id: cliente, tabla, uid, data: data ?? {}, deleted: data === null }, { onConflict: 'user_id,tabla,uid' }),
  );
}

/** Quita campos locales antes de guardar en la nube. */
export function limpiar<T extends object>(o: T): Partial<T> {
  const { id: _id, uid: _uid, _p, ...resto } = o as Record<string, unknown>;
  void _id;
  void _uid;
  void _p;
  return resto as Partial<T>;
}

export async function subirPdf(cliente: string, archivo: File, nombre: string) {
  const uid = crypto.randomUUID();
  const path = `${cliente}/${uid}.pdf`;
  ok(await sb().storage.from('nutricion').upload(path, archivo, { contentType: 'application/pdf' }));
  await guardarParaCliente(cliente, 'nutricion', uid, { nombre, path, subidoEn: new Date().toISOString() });
}

export async function borrarPdf(cliente: string, n: Nutricion & { uid: string }) {
  await sb().storage.from('nutricion').remove([n.path]);
  await guardarParaCliente(cliente, 'nutricion', n.uid, null);
}

export async function urlFirmada(bucket: 'fotos' | 'nutricion', path: string) {
  const { data, error } = await sb().storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw new Error(traducirError(error));
  return data.signedUrl;
}

/* ───────────── Plantillas y copias de rutinas ───────────── */

/** Rutina sin datos del cliente ni del bloque (lo que se guarda en una plantilla). */
export type RutinaBase = Omit<Rutina, 'id' | 'uid' | '_p' | 'bloque' | 'inicio' | 'fin' | 'orden'>;

/** Plantilla de la coach: una rutina o una semana completa. Se guarda en la nube como fila de la coach (tabla 'plantillas'). */
export interface Plantilla {
  uid: string;
  nombre: string;
  rutinas: RutinaBase[];
  creada: string; // ISO
}

const miId = async () => {
  const { data } = await sb().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Inicia sesión para usar las plantillas.');
  return id;
};

/** Quita lo que es propio del cliente (uid, orden, bloque y fechas). */
export function aBase(r: Rutina): RutinaBase {
  const { id: _i, uid: _u, _p, bloque: _b, inicio: _in, fin: _f, orden: _o, ...base } = r;
  void [_i, _u, _p, _b, _in, _f, _o];
  return JSON.parse(JSON.stringify(base));
}

export async function listarPlantillas(): Promise<Plantilla[]> {
  const filas = ok(await sb().from('datos').select('uid, data').eq('user_id', await miId()).eq('tabla', 'plantillas').eq('deleted', false)) as {
    uid: string;
    data: Omit<Plantilla, 'uid'>;
  }[];
  return filas.map((f) => ({ ...f.data, uid: f.uid })).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function guardarPlantilla(p: Plantilla) {
  const { uid, ...data } = p;
  ok(await sb().from('datos').upsert({ user_id: await miId(), tabla: 'plantillas', uid, data, deleted: false }, { onConflict: 'user_id,tabla,uid' }));
}

export async function borrarPlantilla(uid: string) {
  ok(await sb().from('datos').upsert({ user_id: await miId(), tabla: 'plantillas', uid, data: {}, deleted: true }, { onConflict: 'user_id,tabla,uid' }));
}

/** Crea copias nuevas de las rutinas en cada cliente, opcionalmente dentro de un bloque con fechas. */
export async function asignarRutinas(clientes: string[], rutinas: RutinaBase[], bloque: { bloque?: string; inicio?: string; fin?: string }) {
  const base = Date.now();
  const filas = clientes.flatMap((cliente) =>
    rutinas.map((r, i) => ({
      user_id: cliente,
      tabla: 'rutinas',
      uid: crypto.randomUUID(),
      data: limpiar({ ...JSON.parse(JSON.stringify(r)), orden: base + i, ...bloque }),
      deleted: false,
    })),
  );
  if (filas.length) ok(await sb().from('datos').insert(filas));
}
