import Dexie, { type EntityTable } from 'dexie';

export type UnidadPeso = 'kg' | 'lb';
export type UnidadMedida = 'cm' | 'in';

export interface Ajustes {
  id: 'main';
  nombre: string;
  objetivo: string;
  pesoObjetivo?: number;
  unidadPeso: UnidadPeso;
  unidadMedida: UnidadMedida;
  creadoEn: string;
  ultimaCopia?: string;
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
  fecha: string; // YYYY-MM-DD
}

export interface Medida {
  id?: number;
  fecha: string;
  peso?: number;
  grasa?: number;
  cintura?: number;
  cadera?: number;
  pecho?: number;
  brazo?: number;
  muslo?: number;
  notas?: string;
}

export type Pose = 'frente' | 'perfil' | 'espalda' | 'otra';

export interface Foto {
  id?: number;
  fecha: string;
  pose: Pose;
  imagen: Blob;
  nota?: string;
}

export interface Ejercicio {
  nombre: string;
  series?: number;
  reps?: number;
  peso?: number;
}

export interface Entreno {
  id?: number;
  fecha: string;
  tipo: string;
  duracion?: number; // minutos
  esfuerzo?: number; // 1–10
  ejercicios: Ejercicio[];
  notas?: string;
}

export const db = new Dexie('rawfit') as Dexie & {
  ajustes: EntityTable<Ajustes, 'id'>;
  habitos: EntityTable<Habito, 'id'>;
  registros: Dexie.Table<RegistroHabito, [number, string]>;
  medidas: EntityTable<Medida, 'id'>;
  fotos: EntityTable<Foto, 'id'>;
  entrenos: EntityTable<Entreno, 'id'>;
};

db.version(1).stores({
  ajustes: 'id',
  habitos: '++id, orden',
  registros: '[habitoId+fecha], habitoId, fecha',
  medidas: '++id, fecha',
  fotos: '++id, fecha, pose',
  entrenos: '++id, fecha',
});

export const HABITOS_INICIALES: Omit<Habito, 'id'>[] = [
  { nombre: 'Tomar 2 L de agua', emoji: '💧', orden: 0, activo: true },
  { nombre: 'Caminar 8.000 pasos', emoji: '👟', orden: 1, activo: true },
  { nombre: 'Entrenar', emoji: '🏋️', orden: 2, activo: true },
  { nombre: 'Proteína en cada comida', emoji: '🥩', orden: 3, activo: true },
  { nombre: 'Dormir 7–8 horas', emoji: '😴', orden: 4, activo: true },
  { nombre: 'Frutas y verduras', emoji: '🥗', orden: 5, activo: true },
];

export const AJUSTES_INICIALES: Ajustes = {
  id: 'main',
  nombre: '',
  objetivo: '',
  unidadPeso: 'kg',
  unidadMedida: 'cm',
  creadoEn: new Date().toISOString(),
};

db.on('populate', async (tx) => {
  await tx.table('ajustes').add({ ...AJUSTES_INICIALES, creadoEn: new Date().toISOString() });
  await tx.table('habitos').bulkAdd(HABITOS_INICIALES);
});

export async function toggleHabito(habitoId: number, fecha: string) {
  const existe = await db.registros.get([habitoId, fecha]);
  if (existe) await db.registros.delete([habitoId, fecha]);
  else await db.registros.put({ habitoId, fecha });
  return !existe;
}

export async function guardarAjustes(cambios: Partial<Omit<Ajustes, 'id'>>) {
  const actual = (await db.ajustes.get('main')) ?? AJUSTES_INICIALES;
  await db.ajustes.put({ ...actual, ...cambios, id: 'main' });
}
