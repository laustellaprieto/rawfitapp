/**
 * Banco de ejercicios de RawFit.
 * Puedes editar esta lista: agregar, quitar o renombrar ejercicios.
 * El `id` debe ser único y no conviene cambiarlo una vez que la app está en uso
 * (los entrenos guardados lo usan para los récords).
 */

export const GRUPOS = [
  'Pierna (cuádriceps)',
  'Glúteo e isquiotibiales',
  'Pantorrilla',
  'Pecho',
  'Espalda',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Core/abdomen',
  'Cardio/HIIT',
  'Movilidad',
] as const;

export const EQUIPOS = ['Casa', 'Mancuernas', 'Banda elástica', 'Kettlebell', 'Gimnasio'] as const;
export const NIVELES = ['Principiante', 'Intermedio', 'Avanzado'] as const;

export type Grupo = (typeof GRUPOS)[number];
export type Equipo = (typeof EQUIPOS)[number];
export type Nivel = (typeof NIVELES)[number];

export interface EjercicioBanco {
  id: string;
  nombre: string;
  /** Otros nombres con los que se busca (ej. "tumbado" para "acostado"). */
  alias?: string[];
  grupo: Grupo | string;
  equipo: Equipo | string;
  nivel: Nivel | string;
}

type Fila = [id: string, nombre: string, equipo: Equipo, nivel: Nivel, alias?: string[]];

const BANCO: Record<Grupo, Fila[]> = {
  'Pierna (cuádriceps)': [
    ['sentadilla-libre', 'Sentadilla libre', 'Casa', 'Principiante'],
    ['sentadilla-goblet', 'Sentadilla goblet', 'Mancuernas', 'Principiante'],
    ['sentadilla-barra', 'Sentadilla con barra', 'Gimnasio', 'Intermedio'],
    ['sentadilla-frontal', 'Sentadilla frontal', 'Gimnasio', 'Avanzado'],
    ['sentadilla-bulgara', 'Sentadilla búlgara', 'Mancuernas', 'Intermedio'],
    ['zancada-adelante', 'Zancada hacia adelante', 'Casa', 'Principiante'],
    ['zancada-caminando', 'Zancadas caminando', 'Mancuernas', 'Intermedio'],
    ['zancada-atras-mancuernas', 'Zancada hacia atrás con mancuernas', 'Mancuernas', 'Principiante', ['zancada inversa', 'estocada atrás']],
    ['prensa-piernas', 'Prensa de piernas', 'Gimnasio', 'Principiante'],
    ['extension-cuadriceps', 'Extensión de cuádriceps', 'Gimnasio', 'Principiante'],
    ['hack-squat', 'Sentadilla hack', 'Gimnasio', 'Intermedio'],
    ['step-up', 'Subida al cajón (step-up)', 'Mancuernas', 'Principiante'],
    ['sentadilla-pistol', 'Sentadilla a una pierna (pistol)', 'Casa', 'Avanzado'],
    ['sentadilla-pared', 'Sentadilla isométrica en pared', 'Casa', 'Principiante'],
  ],
  'Glúteo e isquiotibiales': [
    ['hip-thrust', 'Hip thrust con barra', 'Gimnasio', 'Intermedio'],
    ['puente-gluteo', 'Puente de glúteo', 'Casa', 'Principiante'],
    ['puente-gluteo-una-pierna', 'Puente de glúteo a una pierna', 'Casa', 'Intermedio'],
    ['puente-gluteo-banda', 'Puente de glúteo con banda', 'Banda elástica', 'Principiante', ['puente con liga']],
    ['peso-muerto-rumano', 'Peso muerto rumano', 'Mancuernas', 'Intermedio'],
    ['peso-muerto-convencional', 'Peso muerto convencional', 'Gimnasio', 'Avanzado'],
    ['peso-muerto-sumo', 'Peso muerto sumo', 'Gimnasio', 'Intermedio'],
    ['peso-muerto-una-pierna', 'Peso muerto a una pierna', 'Mancuernas', 'Intermedio'],
    ['curl-femoral-tumbado', 'Curl femoral acostado', 'Gimnasio', 'Principiante', ['curl femoral tumbado', 'curl femoral tendido']],
    ['curl-femoral-sentado', 'Curl femoral sentado', 'Gimnasio', 'Principiante'],
    ['patada-gluteo-polea', 'Patada de glúteo en polea', 'Gimnasio', 'Principiante'],
    ['abduccion-maquina', 'Abducción de cadera en máquina', 'Gimnasio', 'Principiante'],
    ['caminata-lateral-banda', 'Caminata lateral con banda', 'Banda elástica', 'Principiante'],
    ['swing-kettlebell', 'Swing con kettlebell', 'Kettlebell', 'Intermedio'],
    ['buenos-dias', 'Buenos días con barra', 'Gimnasio', 'Avanzado'],
    ['curl-nordico', 'Curl nórdico', 'Casa', 'Avanzado'],
  ],
  Pantorrilla: [
    ['elevacion-talones-pie', 'Elevación de talones de pie', 'Casa', 'Principiante'],
    ['elevacion-talones-una-pierna', 'Elevación de talones a una pierna', 'Mancuernas', 'Intermedio'],
    ['elevacion-talones-sentado', 'Elevación de talones sentado', 'Gimnasio', 'Principiante'],
    ['pantorrilla-prensa', 'Pantorrilla en prensa', 'Gimnasio', 'Principiante'],
  ],
  Pecho: [
    ['flexiones', 'Flexiones (lagartijas)', 'Casa', 'Principiante'],
    ['flexiones-inclinadas', 'Flexiones inclinadas (manos elevadas)', 'Casa', 'Principiante'],
    ['flexiones-declinadas', 'Flexiones declinadas (pies elevados)', 'Casa', 'Intermedio'],
    ['press-banca', 'Press de banca con barra', 'Gimnasio', 'Intermedio'],
    ['press-banca-mancuernas', 'Press de banca con mancuernas', 'Mancuernas', 'Principiante'],
    ['press-inclinado-mancuernas', 'Press inclinado con mancuernas', 'Mancuernas', 'Intermedio'],
    ['press-inclinado-barra', 'Press inclinado con barra', 'Gimnasio', 'Intermedio'],
    ['aperturas-mancuernas', 'Aperturas con mancuernas', 'Mancuernas', 'Principiante'],
    ['cruce-poleas', 'Cruce de poleas', 'Gimnasio', 'Intermedio'],
    ['pec-deck', 'Aperturas en máquina (pec deck)', 'Gimnasio', 'Principiante'],
    ['fondos-paralelas-pecho', 'Fondos en paralelas', 'Gimnasio', 'Avanzado'],
  ],
  Espalda: [
    ['dominadas', 'Dominadas', 'Gimnasio', 'Avanzado'],
    ['dominadas-asistidas', 'Dominadas asistidas', 'Gimnasio', 'Principiante'],
    ['jalon-pecho', 'Jalón al pecho', 'Gimnasio', 'Principiante'],
    ['remo-barra', 'Remo con barra', 'Gimnasio', 'Intermedio'],
    ['remo-mancuerna', 'Remo a una mano con mancuerna', 'Mancuernas', 'Principiante'],
    ['remo-sentado-polea', 'Remo sentado en polea', 'Gimnasio', 'Principiante'],
    ['remo-invertido', 'Remo invertido', 'Casa', 'Intermedio'],
    ['remo-banda', 'Remo con banda elástica', 'Banda elástica', 'Principiante'],
    ['pullover-polea', 'Pullover en polea alta', 'Gimnasio', 'Intermedio'],
    ['remo-t', 'Remo en T', 'Gimnasio', 'Intermedio'],
    ['superman', 'Superman', 'Casa', 'Principiante'],
    ['hiperextensiones', 'Hiperextensiones lumbares', 'Gimnasio', 'Principiante'],
  ],
  Hombro: [
    ['press-militar', 'Press militar con barra', 'Gimnasio', 'Intermedio'],
    ['press-hombro-mancuernas', 'Press de hombro con mancuernas', 'Mancuernas', 'Principiante'],
    ['press-militar-mancuernas-sentado', 'Press militar con mancuernas sentado', 'Mancuernas', 'Principiante', ['press de hombro sentado']],
    ['press-arnold', 'Press Arnold', 'Mancuernas', 'Intermedio'],
    ['elevaciones-laterales', 'Elevaciones laterales', 'Mancuernas', 'Principiante'],
    ['elevaciones-frontales', 'Elevaciones frontales', 'Mancuernas', 'Principiante'],
    ['pajaros', 'Pájaros (deltoide posterior)', 'Mancuernas', 'Principiante'],
    ['face-pull', 'Face pull', 'Gimnasio', 'Intermedio'],
    ['remo-al-menton', 'Remo al mentón', 'Gimnasio', 'Intermedio'],
    ['flexiones-pica', 'Flexiones en pica', 'Casa', 'Intermedio'],
    ['elevaciones-laterales-polea', 'Elevaciones laterales en polea', 'Gimnasio', 'Intermedio'],
  ],
  Bíceps: [
    ['curl-biceps-mancuernas', 'Curl de bíceps con mancuernas', 'Mancuernas', 'Principiante'],
    ['curl-martillo', 'Curl martillo', 'Mancuernas', 'Principiante'],
    ['curl-barra', 'Curl con barra', 'Gimnasio', 'Principiante'],
    ['curl-predicador', 'Curl predicador (banco Scott)', 'Gimnasio', 'Intermedio'],
    ['curl-concentrado', 'Curl concentrado', 'Mancuernas', 'Principiante'],
    ['curl-polea', 'Curl en polea', 'Gimnasio', 'Principiante'],
    ['curl-banda', 'Curl con banda elástica', 'Banda elástica', 'Principiante'],
  ],
  Tríceps: [
    ['fondos-banco', 'Fondos en banco', 'Casa', 'Principiante'],
    ['extension-triceps-polea', 'Extensión de tríceps en polea', 'Gimnasio', 'Principiante'],
    ['press-frances', 'Press francés', 'Gimnasio', 'Intermedio'],
    ['extension-triceps-nuca', 'Extensión de tríceps tras nuca', 'Mancuernas', 'Principiante'],
    ['patada-triceps', 'Patada de tríceps', 'Mancuernas', 'Principiante'],
    ['flexiones-diamante', 'Flexiones diamante', 'Casa', 'Intermedio'],
    ['press-banca-cerrado', 'Press de banca agarre cerrado', 'Gimnasio', 'Intermedio'],
  ],
  'Core/abdomen': [
    ['plancha', 'Plancha frontal', 'Casa', 'Principiante'],
    ['plancha-lateral', 'Plancha lateral', 'Casa', 'Principiante'],
    ['crunch', 'Crunch abdominal', 'Casa', 'Principiante'],
    ['dead-bug', 'Dead bug', 'Casa', 'Principiante'],
    ['bird-dog', 'Bird dog', 'Casa', 'Principiante'],
    ['elevacion-piernas', 'Elevación de piernas tumbado', 'Casa', 'Intermedio'],
    ['elevacion-piernas-colgado', 'Elevación de piernas colgado', 'Gimnasio', 'Avanzado'],
    ['giro-ruso', 'Giro ruso', 'Mancuernas', 'Intermedio'],
    ['pallof-press', 'Press Pallof', 'Banda elástica', 'Intermedio'],
    ['rueda-abdominal', 'Rueda abdominal', 'Casa', 'Avanzado'],
    ['hollow-hold', 'Hollow hold', 'Casa', 'Intermedio'],
    ['bicicleta-abdominal', 'Bicicleta abdominal', 'Casa', 'Principiante'],
  ],
  'Cardio/HIIT': [
    ['burpees', 'Burpees', 'Casa', 'Intermedio'],
    ['jumping-jacks', 'Jumping jacks', 'Casa', 'Principiante'],
    ['escaladores', 'Escaladores (mountain climbers)', 'Casa', 'Principiante'],
    ['rodillas-arriba', 'Rodillas arriba (skipping)', 'Casa', 'Principiante'],
    ['sentadilla-salto', 'Sentadilla con salto', 'Casa', 'Intermedio'],
    ['saltar-cuerda', 'Saltar la cuerda', 'Casa', 'Principiante'],
    ['caminadora', 'Caminadora (cinta)', 'Gimnasio', 'Principiante'],
    ['bicicleta-estatica', 'Bicicleta estática', 'Gimnasio', 'Principiante'],
    ['remo-ergometro', 'Remo ergómetro', 'Gimnasio', 'Intermedio'],
    ['eliptica', 'Elíptica', 'Gimnasio', 'Principiante'],
    ['thrusters', 'Thrusters', 'Mancuernas', 'Avanzado'],
    ['saltos-cajon', 'Saltos al cajón', 'Gimnasio', 'Intermedio'],
  ],
  Movilidad: [
    ['gato-camello', 'Gato-camello', 'Casa', 'Principiante'],
    ['estiramiento-90-90', 'Rotación de cadera 90/90', 'Casa', 'Principiante'],
    ['estocada-flexor-cadera', 'Estiramiento de flexor de cadera', 'Casa', 'Principiante'],
    ['rotacion-toracica', 'Rotación torácica', 'Casa', 'Principiante'],
    ['sentadilla-profunda-sostenida', 'Sentadilla profunda sostenida', 'Casa', 'Principiante'],
    ['world-greatest-stretch', 'El mejor estiramiento del mundo', 'Casa', 'Intermedio'],
    ['dislocaciones-hombro', 'Dislocaciones de hombro con banda', 'Banda elástica', 'Principiante'],
    ['movilidad-tobillo', 'Movilidad de tobillo contra la pared', 'Casa', 'Principiante'],
    ['postura-nino', 'Postura del niño', 'Casa', 'Principiante'],
  ],
};

export const EJERCICIOS: EjercicioBanco[] = (Object.entries(BANCO) as [Grupo, Fila[]][]).flatMap(([grupo, filas]) =>
  filas.map(([id, nombre, equipo, nivel, alias]) => ({ id, nombre, grupo, equipo, nivel, alias })),
);
