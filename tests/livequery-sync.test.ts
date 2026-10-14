/** Consultas en vivo (como en Entreno/Ejercicios/Hoy) mientras corre la sincronización completa. */
import 'fake-indexeddb/auto';
import { liveQuery } from 'dexie';
import { db, guardarPerfil, toggleHabito } from '../src/lib/db';
import { sincronizar, vincularBajando, vincularSubiendo, type FilaRemota, type Remoto } from '../src/lib/sync';

let reloj = 0;
const filas = new Map<string, FilaRemota & { user_id: string }>();
const archivos = new Map<string, Blob>();
const ahora = () => new Date(Date.UTC(2026, 0, 1) + ++reloj * 1000).toISOString();
const r: Remoto = {
  userId: 'u',
  async traerCambios(desde) {
    return [...filas.values()].filter((f) => !desde || f.updated_at! > desde).sort((a, b) => a.updated_at!.localeCompare(b.updated_at!)).map((f) => structuredClone(f));
  },
  async contarFilas() {
    return filas.size;
  },
  async guardar(fs) {
    for (const f of fs) filas.set(`${f.tabla}|${f.uid}`, { ...structuredClone(f), user_id: 'u', updated_at: ahora() });
  },
  async subirArchivo(b, ruta, a) {
    archivos.set(ruta, a);
  },
  async bajarArchivo(b, ruta) {
    return archivos.get(ruta) ?? new Blob(['x']);
  },
  async borrarArchivo() {},
};

async function main() {
  await db.open();
  const errores: string[] = [];
  const consultas = [
    () => db.sesiones.orderBy('fecha').reverse().toArray(),
    () => db.sesiones.toArray(),
    () => db.ejerciciosPropios.toArray(),
    () => db.rutinas.orderBy('orden').toArray(),
    () => db.rutinas.filter((x) => x.dia === 'Lunes').first(),
    () => db.habitos.orderBy('orden').toArray(),
    () => db.registros.toArray(),
    () => db.perfil.get('main'),
    () => db.mediciones.orderBy('fecha').filter((m) => m.peso !== undefined).last(),
    () => db.nutricion.toArray(),
  ];
  let subs = consultas.map((q) => liveQuery(q).subscribe({ error: (e) => errores.push((e as Error).stack?.split('\n').slice(0, 5).join(' | ') ?? String(e)) }));

  await guardarPerfil({ nombre: 'Stella', onboardingCompleto: true });
  for (let i = 0; i < 10; i++) await db.sesiones.add({ fecha: `2026-10-0${(i % 9) + 1}`, nombre: 'S' + i, ejercicios: [] });
  await vincularSubiendo(r, false);
  for (let ronda = 0; ronda < 15; ronda++) {
    // Cambios de la coach en la nube + cambios locales + sincronización a la vez
    await r.guardar([{ tabla: 'rutinas', uid: 'r' + (ronda % 3), data: { nombre: 'R' + ronda, orden: ronda % 3, dia: 'Lunes', ejercicios: [] }, deleted: ronda % 4 === 3 }]);
    const h = await db.habitos.orderBy('orden').first();
    await Promise.all([
      sincronizar(r, false),
      toggleHabito(h!.id!, '2026-10-1' + (ronda % 9)),
      db.sesiones.add({ fecha: '2026-10-2' + (ronda % 9), nombre: 'n' + ronda, ejercicios: [] }),
      db.ejerciciosPropios.add({ nombre: 'E' + ronda, grupo: 'Pecho', equipo: 'Casa', nivel: 'Principiante' }),
    ]);
    await sincronizar(r, false);
    if (ronda === 7) {
      // Cerrar sesión e iniciar en "otro celular" (borra y vuelve a abrir la base)
      subs.forEach((s) => s.unsubscribe());
      await db.delete();
      await db.open();
      subs = consultas.map((q) => liveQuery(q).subscribe({ error: (e) => errores.push((e as Error).stack?.split('\n').slice(0, 5).join(' | ') ?? String(e)) }));
      await vincularBajando(r, false);
    }
    await new Promise((res) => setTimeout(res, 10));
  }
  await new Promise((res) => setTimeout(res, 300));
  subs.forEach((s) => s.unsubscribe());
  console.log(errores.length ? 'ERRORES (' + errores.length + '):\n' + [...new Set(errores)].slice(0, 5).join('\n') : 'sin errores');
}
main().catch((e) => {
  console.error('FALLO', e);
  process.exit(1);
});
