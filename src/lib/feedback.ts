/** Opiniones de testers: se envían directo a la nube (tabla `feedback`, ver supabase/feedback.sql). */
import { comprimirImagen } from './image';
import { supabase, traducirError } from './nube';

export const TIPOS_OPINION = [
  { valor: 'me_gusto', texto: 'Me gustó', emoji: '💛' },
  { valor: 'me_confundio', texto: 'Me confundió', emoji: '🤔' },
  { valor: 'error', texto: 'Encontré un error', emoji: '🐞' },
  { valor: 'sugerencia', texto: 'Le agregaría…', emoji: '✨' },
] as const;
export type TipoOpinion = (typeof TIPOS_OPINION)[number]['valor'];

export const ESTADOS_OPINION = [
  { valor: 'nueva', texto: 'Nueva' },
  { valor: 'revisada', texto: 'Revisada' },
  { valor: 'implementada', texto: 'Implementada' },
] as const;
export type EstadoOpinion = (typeof ESTADOS_OPINION)[number]['valor'];

export const MAX_TEXTO_OPINION = 1000;

export interface Opinion {
  id: string;
  user_id: string | null;
  nombre: string | null;
  tipo: TipoOpinion;
  estrellas: number;
  texto: string;
  imagen_path: string | null;
  pantalla: string | null;
  version: string | null;
  navegador: string | null;
  estado: EstadoOpinion;
  creado_en: string;
}

const sb = () => {
  if (!supabase) throw new Error('La nube no está configurada.');
  return supabase;
};

export async function enviarOpinion(o: { nombre: string; tipo: TipoOpinion; estrellas: number; texto: string; captura?: File; pantalla: string }) {
  if (!navigator.onLine) throw new Error('Necesitas internet para enviar tu opinión. Lo que escribiste sigue aquí.');
  const { data } = await sb().auth.getSession();
  const userId = data.session?.user.id ?? null;
  const id = crypto.randomUUID();
  let imagen_path: string | null = null;
  if (o.captura) {
    const img = await comprimirImagen(o.captura, 1600, 0.8);
    imagen_path = `${userId ?? 'anonimo'}/${id}.jpg`;
    const { error } = await sb().storage.from('feedback').upload(imagen_path, img, { contentType: 'image/jpeg' });
    if (error) throw new Error(`No se pudo subir la captura: ${traducirError(error)}`);
  }
  // Sin .select(): quien envía no puede leer las opiniones (solo la coach).
  const { error } = await sb()
    .from('feedback')
    .insert({
      id,
      user_id: userId,
      nombre: o.nombre.trim().slice(0, 80) || null,
      tipo: o.tipo,
      estrellas: o.estrellas,
      texto: o.texto.trim().slice(0, MAX_TEXTO_OPINION),
      imagen_path,
      pantalla: o.pantalla.slice(0, 80),
      version: __VERSION__,
      navegador: navigator.userAgent.slice(0, 300),
    });
  if (error) throw new Error(traducirError(error));
}

export async function listarOpiniones(): Promise<Opinion[]> {
  const { data, error } = await sb().from('feedback').select('*').order('creado_en', { ascending: false });
  if (error) throw new Error(traducirError(error));
  return data as Opinion[];
}

export async function cambiarEstadoOpinion(id: string, estado: EstadoOpinion) {
  const { error } = await sb().from('feedback').update({ estado }).eq('id', id);
  if (error) throw new Error(traducirError(error));
}

export async function urlCaptura(path: string) {
  const { data, error } = await sb().storage.from('feedback').createSignedUrl(path, 3600);
  if (error) throw new Error(traducirError(error));
  return data.signedUrl;
}
