import Dexie, { type EntityTable } from 'dexie';
import { HABITOS_INICIALES } from '../data/habitos';
import { hoyISO } from './fechas';

export type Sexo = 'mujer' | 'hombre';
export type NivelActividad = 'sedentaria' | 'ligera' | 'moderada' | 'alta' | 'muy-alta';
export type MetaCalorias = 'definicion' | 'mantenimiento' | 'volumen';

export interface Perfil {
  id: 'main';
  nombre: string;
  fechaInicio: string; // YYYY-MM-DD
  estatura?: number; // cm
  objetivo: string;
  // Datos para el cálculo de calorías
  sexo?: Sexo;
  edad?: number;
  peso?: number; // kg usado en el cálculo
  actividad?: NivelActividad;
  meta?: MetaCalorias;
  porcentaje?: number; // % de déficit (definición) o superávit (volumen)
  onboardingCompleto: boolean;
  ultimaCopia?: string; // ISO
}

export interface Habito {
  id?: number;
  nombre: string;
  emoji: string;
  orden: number;
  activo: boolean;
}

export interface RegistroHabito {
  habitoId: number;
  fecha: string;
}

export interface Medicion {
  id?: number;
  fecha: string;
  peso?: number; // kg
  cintura?: number; // cm
  abdomen?: number; // cm
}

export type Pose = 'frente' | 'perfil' | 'espalda';

export interface Checkin {
  id?: number;
  fecha: string;
  peso?: number;
  nota?: string;
}

export interface Foto {
  id?: number;
  checkinId: number;
  pose: Pose;
  imagen: Blob;
}

export interface Serie {
  reps?: number;
  peso?: number; // kg
  rir?: number;
}

export interface EjercicioSesion {
  ejercicioId: string;
  nombre: string;
  grupo: string;
  series: Serie[];
}

export interface Sesion {
  id?: number;
  fecha: string;
  nombre: string;
  ejercicios: EjercicioSesion[];
  notas?: string;
}

export interface EjercicioPropio {
  id?: number;
  nombre: string;
  grupo: string;
  equipo: string;
  nivel: string;
}

/** Logro de racha ya celebrado. id = `${inicioRacha}:${hito}` para no repetirlo. */
export interface Logro {
  id: string;
  hito: number;
  inicioRacha: string;
  fecha: string;
}

export const db = new Dexie('rawfit-kit') as Dexie & {
  perfil: EntityTable<Perfil, 'id'>;
  habitos: EntityTable<Habito, 'id'>;
  registros: Dexie.Table<RegistroHabito, [number, string]>;
  mediciones: EntityTable<Medicion, 'id'>;
  checkins: EntityTable<Checkin, 'id'>;
  fotos: EntityTable<Foto, 'id'>;
  sesiones: EntityTable<Sesion, 'id'>;
  ejerciciosPropios: EntityTable<EjercicioPropio, 'id'>;
  logros: EntityTable<Logro, 'id'>;
};

db.version(1).stores({
  perfil: 'id',
  habitos: '++id, orden',
  registros: '[habitoId+fecha], habitoId, fecha',
  mediciones: '++id, fecha',
  checkins: '++id, fecha',
  fotos: '++id, checkinId',
  sesiones: '++id, fecha',
  ejerciciosPropios: '++id',
  logros: 'id, fecha',
});

export const perfilInicial = (): Perfil => ({
  id: 'main',
  nombre: '',
  fechaInicio: hoyISO(),
  objetivo: '',
  onboardingCompleto: false,
});

db.on('populate', async (tx) => {
  await tx.table('perfil').add(perfilInicial());
  await tx.table('habitos').bulkAdd(HABITOS_INICIALES.map((h, orden) => ({ ...h, orden, activo: true })));
});

export async function toggleHabito(habitoId: number, fecha: string) {
  const existe = await db.registros.get([habitoId, fecha]);
  if (existe) await db.registros.delete([habitoId, fecha]);
  else await db.registros.put({ habitoId, fecha });
  return !existe;
}

export async function guardarPerfil(cambios: Partial<Omit<Perfil, 'id'>>) {
  const actual = (await db.perfil.get('main')) ?? perfilInicial();
  await db.perfil.put({ ...actual, ...cambios, id: 'main' });
}
