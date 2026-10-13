import Dexie, { type EntityTable } from 'dexie';
import { HABITOS_INICIALES } from '../data/habitos';
import { hoyISO } from './fechas';

export type Sexo = 'mujer' | 'hombre';
export type NivelActividad = 'sedentaria' | 'ligera' | 'moderada' | 'alta' | 'muy-alta';
export type MetaCalorias = 'definicion' | 'mantenimiento' | 'volumen';

/** Campos que agrega la sincronización a cada registro. */
export interface Sincronizable {
  uid?: string; // identificador global (igual en todos los dispositivos y en la nube)
  _p?: 1; // 1 = cambio local pendiente de subir
}

export interface Perfil extends Sincronizable {
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
  proteinaGkg?: number; // g de proteína por kg de peso
  grasaPct?: number; // % de las calorías que vienen de grasa
  onboardingCompleto: boolean;
  ultimaCopia?: string; // ISO
}

export interface Habito extends Sincronizable {
  id?: number;
  nombre: string;
  emoji: string;
  orden: number;
  activo: boolean;
  origen?: 'coach'; // hábito asignado por la coach (el cliente no lo edita)
}

export interface RegistroHabito extends Sincronizable {
  habitoId: number;
  habitoUid?: string;
  fecha: string;
}

export interface Medicion extends Sincronizable {
  id?: number;
  fecha: string;
  peso?: number; // kg
  cintura?: number; // cm
  abdomen?: number; // cm
}

export type Pose = 'frente' | 'perfil' | 'espalda';

export interface Checkin extends Sincronizable {
  id?: number;
  fecha: string;
  peso?: number;
  nota?: string;
}

export interface Foto extends Sincronizable {
  id?: number;
  checkinId: number;
  checkinUid?: string;
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
  objetivo?: string; // lo que pidió la coach, ej. "4 × 8–10 · 50 kg · RIR 2"
}

export interface Sesion extends Sincronizable {
  id?: number;
  fecha: string;
  nombre: string;
  ejercicios: EjercicioSesion[];
  notas?: string;
  rutinaUid?: string; // si se hizo a partir de una rutina de la coach
}

export interface EjercicioPropio extends Sincronizable {
  id?: number;
  nombre: string;
  grupo: string;
  equipo: string;
  nivel: string;
}

/** Logro de racha ya celebrado. id = `${inicioRacha}:${hito}` para no repetirlo. */
export interface Logro extends Sincronizable {
  id: string;
  hito: number;
  inicioRacha: string;
  fecha: string;
}

/** Ejercicio de una rutina asignada por la coach (con valores objetivo). */
export interface EjercicioRutina {
  ejercicioId: string;
  nombre: string;
  grupo: string;
  series?: number;
  reps?: string; // texto libre: "8", "8–10", "AMRAP"…
  peso?: number; // kg objetivo
  rir?: number;
  nota?: string;
}

/** Rutina de entrenamiento que la coach le asigna al cliente (solo lectura para el cliente). */
export interface Rutina extends Sincronizable {
  id?: number;
  nombre: string; // ej. "Pierna A"
  dia?: string; // ej. "Lunes"
  orden: number;
  ejercicios: EjercicioRutina[];
  notas?: string;
}

/** Plan de nutrición en PDF que sube la coach. */
export interface Nutricion extends Sincronizable {
  id?: number;
  nombre: string;
  path: string; // ruta del archivo en la nube
  subidoEn: string; // ISO
  archivo?: Blob; // copia local para verlo sin internet
}

/** Registro borrado en este dispositivo, pendiente de borrar en la nube. */
export interface Borrado {
  clave: string; // `${tabla}|${uid}`
  tabla: string;
  uid: string;
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
  rutinas: EntityTable<Rutina, 'id'>;
  nutricion: EntityTable<Nutricion, 'id'>;
  borrados: EntityTable<Borrado, 'clave'>;
  meta: Dexie.Table<{ clave: string; valor: unknown }, string>;
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

// v2: sincronización con la nube (cuenta opcional).
db.version(2)
  .stores({
    perfil: 'id, &uid',
    habitos: '++id, orden, &uid',
    registros: '[habitoId+fecha], habitoId, fecha, &uid',
    mediciones: '++id, fecha, &uid',
    checkins: '++id, fecha, &uid',
    fotos: '++id, checkinId, &uid',
    sesiones: '++id, fecha, &uid',
    ejerciciosPropios: '++id, &uid',
    logros: 'id, fecha, &uid',
    rutinas: '++id, orden, &uid',
    nutricion: '++id, &uid',
    borrados: 'clave',
    meta: 'clave',
  })
  .upgrade(async (tx) => {
    const nuevo = () => crypto.randomUUID();
    for (const t of ['habitos', 'mediciones', 'checkins', 'sesiones', 'ejerciciosPropios']) {
      await tx.table(t).toCollection().modify((r: Sincronizable) => {
        r.uid ??= nuevo();
      });
    }
    await tx.table('logros').toCollection().modify((r: Logro) => {
      r.uid ??= r.id;
    });
    await tx.table('perfil').toCollection().modify((r: Perfil) => {
      r.uid = 'perfil';
    });
    const habitos = new Map((await tx.table('habitos').toArray()).map((h: Habito) => [h.id!, h.uid!]));
    await tx.table('registros').toCollection().modify((r: RegistroHabito) => {
      r.habitoUid ??= habitos.get(r.habitoId);
      r.uid ??= `${r.habitoUid ?? r.habitoId}|${r.fecha}`;
    });
    const checkins = new Map((await tx.table('checkins').toArray()).map((c: Checkin) => [c.id!, c.uid!]));
    await tx.table('fotos').toCollection().modify((f: Foto) => {
      f.checkinUid ??= checkins.get(f.checkinId);
      f.uid ??= nuevo();
    });
  });

export const perfilInicial = (): Perfil => ({
  id: 'main',
  nombre: '',
  fechaInicio: hoyISO(),
  objetivo: '',
  onboardingCompleto: false,
  uid: 'perfil',
});

db.on('populate', async (tx) => {
  await tx.table('perfil').add(perfilInicial());
  await tx.table('habitos').bulkAdd(HABITOS_INICIALES.map((h, orden) => ({ ...h, orden, activo: true, uid: crypto.randomUUID() })));
});

export async function toggleHabito(habitoId: number, fecha: string) {
  const existe = await db.registros.get([habitoId, fecha]);
  if (existe) await db.registros.delete([habitoId, fecha]);
  else {
    const habitoUid = (await db.habitos.get(habitoId))?.uid;
    await db.registros.put({ habitoId, fecha, habitoUid, uid: habitoUid ? `${habitoUid}|${fecha}` : undefined });
  }
  return !existe;
}

export async function guardarPerfil(cambios: Partial<Omit<Perfil, 'id'>>) {
  const actual = (await db.perfil.get('main')) ?? perfilInicial();
  await db.perfil.put({ ...actual, ...cambios, id: 'main' });
}
