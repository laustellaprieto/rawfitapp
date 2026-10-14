/**
 * Cuenta y nube: inicio de sesión con Supabase, perfil en la nube y sincronización automática.
 * Todo lo de aquí es opcional: sin cuenta, la app funciona igual (solo en el dispositivo).
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { nubeConfigurada, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import { db } from './db';
import { cuentaVinculada, marcarFotosParaSubir, onCambioLocal, retirarFotosDeLaNube, sincronizar, vincularBajando, vincularSubiendo, type FilaRemota, type Remoto } from './sync';

export const supabase: SupabaseClient | null = nubeConfigurada
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export type EstadoCliente = 'ninguno' | 'pendiente' | 'aceptado' | 'rechazado';

export interface PerfilNube {
  id: string;
  email: string;
  nombre: string;
  rol: 'cliente' | 'coach';
  estado: EstadoCliente;
  compartir_fotos: boolean;
  solicitado_en: string | null;
  creado_en: string;
}

export type EstadoSync = 'apagada' | 'sincronizando' | 'al-dia' | 'sin-conexion' | 'error';

interface Estado {
  sesion: Session | null;
  perfil: PerfilNube | null;
  sync: EstadoSync;
  ultimaSync?: string;
  errorSync?: string;
  /** La cuenta ya tiene datos y este celular también: hay que preguntar qué hacer. */
  decidirVinculo: boolean;
  /** Llegó un enlace de "olvidé mi contraseña": hay que pedir la nueva. */
  recuperando: boolean;
  listo: boolean;
}

let estado: Estado = { sesion: null, perfil: null, sync: 'apagada', decidirVinculo: false, recuperando: false, listo: !nubeConfigurada };
const oyentes = new Set<() => void>();
const set = (p: Partial<Estado>) => {
  estado = { ...estado, ...p };
  oyentes.forEach((f) => f());
};

/** Estado de la cuenta para la interfaz. */
export function useCuenta() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => estado,
  );
}

/* ───────────── Remoto (Supabase) ───────────── */

function remoto(userId: string): Remoto {
  const sb = supabase!;
  return {
    userId,
    async traerCambios(desde) {
      const out: FilaRemota[] = [];
      for (let i = 0; ; i += 1000) {
        let q = sb.from('datos').select('tabla, uid, data, deleted, updated_at').eq('user_id', userId).order('updated_at').range(i, i + 999);
        if (desde) q = q.gt('updated_at', desde);
        const { data, error } = await q;
        if (error) throw error;
        out.push(...(data as FilaRemota[]));
        if (data.length < 1000) return out;
      }
    },
    async contarFilas() {
      const { count, error } = await sb.from('datos').select('uid', { count: 'exact', head: true }).eq('user_id', userId).eq('deleted', false);
      if (error) throw error;
      return count ?? 0;
    },
    async guardar(filas) {
      const { error } = await sb
        .from('datos')
        .upsert(filas.map((f) => ({ user_id: userId, tabla: f.tabla, uid: f.uid, data: f.data, deleted: f.deleted })), { onConflict: 'user_id,tabla,uid' });
      if (error) throw error;
    },
    async subirArchivo(bucket, ruta, archivo) {
      const { error } = await sb.storage.from(bucket).upload(ruta, archivo, { upsert: true, contentType: archivo.type || 'image/jpeg' });
      if (error) throw error;
    },
    async bajarArchivo(bucket, ruta) {
      const { data, error } = await sb.storage.from(bucket).download(ruta);
      if (error) throw error;
      return data;
    },
    async borrarArchivo(bucket, ruta) {
      await sb.storage.from(bucket).remove([ruta]);
    },
  };
}

/* ───────────── Sincronización automática ───────────── */

async function cargarPerfil(): Promise<PerfilNube | null> {
  const uid = estado.sesion?.user.id;
  if (!supabase || !uid) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  set({ perfil: data as PerfilNube | null });
  return data as PerfilNube | null;
}

export async function sincronizarAhora() {
  const s = estado.sesion;
  if (!supabase || !s) return;
  if ((await cuentaVinculada()) !== s.user.id) return;
  if (!navigator.onLine) return set({ sync: 'sin-conexion' });
  set({ sync: 'sincronizando', errorSync: undefined });
  try {
    const p = estado.perfil ?? (await cargarPerfil());
    await sincronizar(remoto(s.user.id), !!p?.compartir_fotos);
    await subirNombreSiFalta();
    set({ sync: 'al-dia', ultimaSync: new Date().toISOString() });
  } catch (e) {
    console.error('Error al sincronizar', e);
    set({ sync: navigator.onLine ? 'error' : 'sin-conexion', errorSync: (e as Error).message });
  }
}

/** Copia el nombre del perfil local al perfil de la nube (lo ve la coach). */
async function subirNombreSiFalta() {
  const local = await db.perfil.get('main');
  if (supabase && estado.perfil && local?.nombre && estado.perfil.nombre !== local.nombre) {
    await supabase.from('profiles').update({ nombre: local.nombre }).eq('id', estado.perfil.id);
    set({ perfil: { ...estado.perfil, nombre: local.nombre } });
  }
}

let programado: ReturnType<typeof setTimeout> | undefined;
function programarSync(ms = 3000) {
  clearTimeout(programado);
  programado = setTimeout(sincronizarAhora, ms);
}

/** Primera vez de esta cuenta en este celular. */
async function vincular() {
  const s = estado.sesion!;
  const r = remoto(s.user.id);
  set({ sync: 'sincronizando' });
  try {
    const p = await cargarPerfil();
    const enNube = await r.contarFilas();
    const local = await db.perfil.get('main');
    if (enNube === 0) await vincularSubiendo(r, !!p?.compartir_fotos);
    else if (!local?.onboardingCompleto) await vincularBajando(r, !!p?.compartir_fotos);
    else return set({ decidirVinculo: true, sync: 'apagada' });
    set({ sync: 'al-dia', ultimaSync: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    set({ sync: 'error', errorSync: (e as Error).message });
  }
}

/** Vuelve a intentar la primera descarga de la cuenta (si falló, por ejemplo, sin internet). */
export const reintentarVinculo = () => vincular();

/** Respuesta de la persona cuando su cuenta y su celular tienen datos. */
export async function resolverVinculo(usarNube: boolean) {
  set({ decidirVinculo: false });
  if (!usarNube) return cerrarSesion(false);
  const s = estado.sesion!;
  set({ sync: 'sincronizando' });
  try {
    await vincularBajando(remoto(s.user.id), !!estado.perfil?.compartir_fotos);
    set({ sync: 'al-dia', ultimaSync: new Date().toISOString() });
  } catch (e) {
    set({ sync: 'error', errorSync: (e as Error).message });
  }
}

let iniciando: Promise<void> | null = null;
let iniciandoPara = '';
/** Evita que dos avisos de inicio de sesión (al abrir la app) vinculen dos veces a la vez. */
function alIniciarSesion(sesion: Session): Promise<void> {
  if (iniciando && iniciandoPara === sesion.user.id) return iniciando;
  iniciandoPara = sesion.user.id;
  iniciando = alIniciarSesionAhora(sesion).finally(() => {
    iniciando = null;
  });
  return iniciando;
}

async function alIniciarSesionAhora(sesion: Session) {
  set({ sesion });
  try {
    await cargarPerfil();
  } catch {
    /* sin conexión: se reintenta al sincronizar */
  }
  if ((await cuentaVinculada()) === sesion.user.id) await sincronizarAhora();
  else await vincular();
}

let iniciado = false;
/** Se llama una vez al abrir la app. */
export function iniciarNube() {
  if (!supabase || iniciado) return;
  iniciado = true;
  supabase.auth.getSession().then(async ({ data }) => {
    if (data.session) await alIniciarSesion(data.session);
    set({ listo: true });
  });
  supabase.auth.onAuthStateChange((evento, sesion) => {
    // Supabase recomienda no hacer otras consultas dentro de este aviso (se puede trabar):
    // se hacen justo después con setTimeout.
    setTimeout(() => {
      if (evento === 'PASSWORD_RECOVERY') set({ recuperando: true, sesion });
      else if (evento === 'SIGNED_IN' && sesion && sesion.user.id !== estado.sesion?.user.id) void alIniciarSesion(sesion);
      else if (evento === 'TOKEN_REFRESHED' && sesion) set({ sesion });
      else if (evento === 'SIGNED_OUT') set({ sesion: null, perfil: null, sync: 'apagada' });
    });
  });
  onCambioLocal(() => estado.sesion && programarSync());
  window.addEventListener('online', () => programarSync(500));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && programarSync(500));
  setInterval(() => estado.sesion && document.visibilityState === 'visible' && sincronizarAhora(), 120_000);
}

/* ───────────── Acciones de cuenta ───────────── */

const MENSAJES: [RegExp, string][] = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/email not confirmed/i, 'Aún no confirmas tu correo. Revisa tu bandeja de entrada (y spam).'],
  [/user already registered/i, 'Ya existe una cuenta con ese correo. Inicia sesión.'],
  [/password should be at least/i, 'La contraseña debe tener al menos 6 caracteres.'],
  [/unable to validate email|invalid email|email address .* is invalid/i, 'Ese correo no es válido.'],
  [/rate limit|too many requests|security purposes/i, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'],
  [/failed to fetch|network/i, 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'],
];
export function traducirError(e: unknown): string {
  const m = (e as Error)?.message ?? String(e);
  return MENSAJES.find(([re]) => re.test(m))?.[1] ?? m;
}

const urlApp = () => window.location.origin + window.location.pathname;

export async function registrarse(email: string, password: string, nombre: string) {
  const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { nombre }, emailRedirectTo: urlApp() } });
  if (error) throw new Error(traducirError(error));
  // Si el proyecto pide confirmar el correo, no hay sesión todavía.
  return { necesitaConfirmar: !data.session };
}

export async function iniciarSesion(email: string, password: string) {
  const { error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) throw new Error(traducirError(error));
}

export async function recuperarContrasena(email: string) {
  const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: urlApp() });
  if (error) throw new Error(traducirError(error));
}

export async function cambiarContrasena(password: string) {
  const { error } = await supabase!.auth.updateUser({ password });
  if (error) throw new Error(traducirError(error));
  set({ recuperando: false });
}

/** Cierra sesión. Por seguridad, borra los datos de este celular (siguen guardados en la cuenta). */
export async function cerrarSesion(borrarLocal = true) {
  await sincronizarAhora().catch(() => {});
  await supabase?.auth.signOut();
  set({ sesion: null, perfil: null, sync: 'apagada' });
  if (borrarLocal) {
    await db.delete();
    await db.open();
  } else {
    await db.meta.delete('cuenta');
  }
}

export async function solicitarCoach() {
  const { error } = await supabase!.rpc('solicitar_coach');
  if (error) throw new Error(traducirError(error));
  await cargarPerfil();
}

export async function dejarCoach() {
  const { error } = await supabase!.rpc('dejar_coach');
  if (error) throw new Error(traducirError(error));
  await cargarPerfil();
}

export async function cambiarCompartirFotos(compartir: boolean) {
  const p = estado.perfil!;
  const { error } = await supabase!.from('profiles').update({ compartir_fotos: compartir }).eq('id', p.id);
  if (error) throw new Error(traducirError(error));
  set({ perfil: { ...p, compartir_fotos: compartir } });
  if (compartir) {
    await marcarFotosParaSubir();
    await sincronizarAhora();
  } else {
    await retirarFotosDeLaNube(remoto(p.id));
  }
}

/** Borra la cuenta, sus datos en la nube y sus fotos. */
export async function eliminarCuenta() {
  const p = estado.perfil;
  if (!supabase || !p) return;
  const { data: archivos } = await supabase.storage.from('fotos').list(p.id, { limit: 1000 });
  if (archivos?.length) await supabase.storage.from('fotos').remove(archivos.map((a) => `${p.id}/${a.name}`));
  const { data: pdfs } = await supabase.storage.from('nutricion').list(p.id, { limit: 1000 });
  if (pdfs?.length) await supabase.storage.from('nutricion').remove(pdfs.map((a) => `${p.id}/${a.name}`));
  const { error } = await supabase.rpc('eliminar_mi_cuenta');
  if (error) throw new Error(traducirError(error));
  await supabase.auth.signOut();
  set({ sesion: null, perfil: null, sync: 'apagada' });
  await db.delete();
  await db.open();
}
