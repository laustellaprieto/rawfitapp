/**
 * Prueba de la sincronización con una "nube" falsa en memoria.
 * Ejecutar: npm run test:sync
 */
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db, guardarPerfil, toggleHabito } from '../src/lib/db';
import { hoyISO } from '../src/lib/fechas';
import { marcarFotosParaSubir, retirarFotosDeLaNube, sincronizar, vincularBajando, vincularSubiendo, type FilaRemota, type Remoto } from '../src/lib/sync';

// ── Nube falsa ──
let reloj = 0;
const filas = new Map<string, FilaRemota & { user_id: string }>();
const archivos = new Map<string, Blob>();
let subidas = 0;
const ahora = () => new Date(Date.UTC(2026, 0, 1) + ++reloj * 1000).toISOString();
const clave = (u: string, t: string, id: string) => `${u}|${t}|${id}`;

function nube(userId: string): Remoto {
  return {
    userId,
    async traerCambios(desde) {
      return [...filas.values()]
        .filter((f) => f.user_id === userId && (!desde || f.updated_at! > desde))
        .sort((a, b) => a.updated_at!.localeCompare(b.updated_at!))
        .map((f) => structuredClone(f));
    },
    async contarFilas() {
      return [...filas.values()].filter((f) => f.user_id === userId).length;
    },
    async guardar(fs) {
      for (const f of fs) filas.set(clave(userId, f.tabla, f.uid), { ...structuredClone(f), user_id: userId, updated_at: ahora() });
    },
    async subirArchivo(b, ruta, a) {
      subidas++;
      archivos.set(`${b}/${ruta}`, a);
    },
    async bajarArchivo(b, ruta) {
      const a = archivos.get(`${b}/${ruta}`);
      if (!a) throw new Error('no existe ' + ruta);
      return a;
    },
    async borrarArchivo(b, ruta) {
      archivos.delete(`${b}/${ruta}`);
    },
  };
}
const esperar = () => new Promise((r) => setTimeout(r, 20));
const enNube = (u: string, t: string) => [...filas.values()].filter((f) => f.user_id === u && f.tabla === t && !f.deleted);

const ANA = 'ana';
const r = nube(ANA);

async function main() {
  // ── Dispositivo 1: usa la app sin cuenta ──
  await db.open();
  await guardarPerfil({ nombre: 'Ana', onboardingCompleto: true, peso: 64 });
  const habitos = await db.habitos.orderBy('orden').toArray();
  assert.equal(habitos.length, 10);
  assert.ok(habitos.every((h) => h.uid), 'los hábitos iniciales tienen uid');
  await toggleHabito(habitos[0].id!, hoyISO());
  await toggleHabito(habitos[1].id!, hoyISO());
  await db.mediciones.add({ fecha: hoyISO(), peso: 64 });
  const checkinId = (await db.checkins.add({ fecha: hoyISO(), nota: 'inicio' })) as number;
  await db.fotos.add({ checkinId, pose: 'frente', imagen: new Blob(['foto-frente'], { type: 'image/jpeg' }), checkinUid: (await db.checkins.get(checkinId))!.uid });
  await db.sesiones.add({ fecha: hoyISO(), nombre: 'Pierna A', ejercicios: [] });
  await esperar();

  // ── Crea su cuenta: la nube está vacía, se sube todo (sin fotos) ──
  assert.equal(await r.contarFilas(), 0);
  await vincularSubiendo(r, false);
  assert.equal(enNube(ANA, 'perfil').length, 1);
  assert.equal(enNube(ANA, 'perfil')[0].data.nombre, 'Ana');
  assert.equal(enNube(ANA, 'habitos').length, 10);
  assert.equal(enNube(ANA, 'registros').length, 2);
  assert.equal(enNube(ANA, 'mediciones').length, 1);
  assert.equal(enNube(ANA, 'checkins').length, 1);
  assert.equal(enNube(ANA, 'sesiones').length, 1);
  assert.equal(enNube(ANA, 'fotos').length, 0, 'sin compartir, las fotos no suben');
  assert.equal(await db.habitos.filter((h) => h._p === 1).count(), 0, 'ya no quedan pendientes');
  assert.equal(await db.fotos.filter((f) => f._p === 1).count(), 1, 'la foto sigue pendiente');
  console.log('✓ primer inicio de sesión sube los datos locales');

  // ── Cambios locales: editar y borrar ──
  const m = (await db.mediciones.toArray())[0];
  await db.mediciones.update(m.id!, { peso: 63.5 });
  await toggleHabito(habitos[1].id!, hoyISO()); // desmarcar
  await esperar();
  await sincronizar(r, false);
  assert.equal(enNube(ANA, 'mediciones')[0].data.peso, 63.5);
  assert.equal(enNube(ANA, 'registros').length, 1, 'el registro desmarcado se borra en la nube');
  console.log('✓ ediciones y borrados se suben');

  // ── La coach agrega una rutina, un hábito y un PDF ──
  const coach = nube(ANA); // escribe en las filas de Ana (en la nube real lo permite la regla de seguridad)
  await coach.guardar([
    { tabla: 'rutinas', uid: 'r1', data: { nombre: 'Pierna A', orden: 0, ejercicios: [{ ejercicioId: 'sentadilla-barra', nombre: 'Sentadilla con barra', grupo: 'Pierna (cuádriceps)', series: 4, reps: '8–10', peso: 50 }] }, deleted: false },
    { tabla: 'habitos', uid: 'hc', data: { nombre: 'Creatina 5 g', emoji: '💊', orden: 100, activo: true, origen: 'coach' }, deleted: false },
    { tabla: 'nutricion', uid: 'n1', data: { nombre: 'Plan octubre', path: 'ana/plan.pdf', subidoEn: '2026-10-01' }, deleted: false },
  ]);
  archivos.set('nutricion/ana/plan.pdf', new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  await sincronizar(r, false);
  assert.equal(await db.rutinas.count(), 1);
  assert.equal((await db.habitos.where('uid').equals('hc').first())?.origen, 'coach');
  const pdf = await db.nutricion.toArray();
  assert.equal(pdf.length, 1);
  assert.equal(await pdf[0].archivo!.text(), '%PDF-1.4', 'el PDF queda guardado para verlo sin internet');
  // El cliente marca el hábito de la coach
  const hc = (await db.habitos.where('uid').equals('hc').first())!;
  await toggleHabito(hc.id!, hoyISO());
  await esperar();
  await sincronizar(r, false);
  assert.ok(enNube(ANA, 'registros').some((f) => f.data.habitoUid === 'hc'));
  console.log('✓ el plan de la coach baja al cliente');

  // ── Activa compartir fotos ──
  await marcarFotosParaSubir();
  await sincronizar(r, true);
  assert.equal(enNube(ANA, 'fotos').length, 1);
  assert.equal(archivos.size, 2);
  console.log('✓ con "compartir fotos" se suben');

  // ── Conflicto: cambio local pendiente gana sobre la nube ──
  const ses = (await db.sesiones.toArray())[0];
  await db.sesiones.update(ses.id!, { nombre: 'Pierna A (local)' });
  filas.set(clave(ANA, 'sesiones', ses.uid!), { user_id: ANA, tabla: 'sesiones', uid: ses.uid!, data: { fecha: ses.fecha, nombre: 'Pierna A (otro celular)', ejercicios: [] }, deleted: false, updated_at: ahora() });
  await esperar();
  await sincronizar(r, true);
  assert.equal(enNube(ANA, 'sesiones')[0].data.nombre, 'Pierna A (local)');
  console.log('✓ el cambio local pendiente gana');

  // ── Dispositivo 2: celular nuevo, inicia sesión y baja todo ──
  const resumen = async () => ({
    habitos: await db.habitos.count(),
    registros: await db.registros.count(),
    mediciones: await db.mediciones.count(),
    checkins: await db.checkins.count(),
    fotos: await db.fotos.count(),
    sesiones: await db.sesiones.count(),
    rutinas: await db.rutinas.count(),
    nutricion: await db.nutricion.count(),
  });
  const antes = await resumen();
  await db.delete();
  await db.open();
  assert.equal((await db.perfil.get('main'))?.onboardingCompleto, false, 'celular nuevo');
  assert.ok((await r.contarFilas()) > 0);
  await vincularBajando(r, true);
  assert.deepEqual(await resumen(), antes);
  assert.equal((await db.perfil.get('main'))?.nombre, 'Ana');
  assert.equal((await db.perfil.get('main'))?.onboardingCompleto, true);
  const reg = await db.registros.toArray();
  for (const x of reg) assert.ok(await db.habitos.get(x.habitoId), 'cada registro apunta a un hábito local');
  const foto = (await db.fotos.toArray())[0];
  assert.equal(await foto.imagen.text(), 'foto-frente');
  assert.equal(foto.checkinId, (await db.checkins.toArray())[0].id);
  assert.equal(await db.habitos.filter((h) => h._p === 1).count(), 0, 'lo bajado no queda pendiente');
  console.log('✓ un celular nuevo recupera todo');

  // ── La coach borra la rutina ──
  await coach.guardar([{ tabla: 'rutinas', uid: 'r1', data: {}, deleted: true }]);
  await sincronizar(r, true);
  assert.equal(await db.rutinas.count(), 0);
  console.log('✓ lo que borra la coach se borra en el cliente');

  // ── Deja de compartir fotos ──
  await retirarFotosDeLaNube(r);
  assert.equal(enNube(ANA, 'fotos').length, 0);
  assert.ok(![...archivos.keys()].some((k) => k.startsWith('fotos/')));
  assert.equal(await db.fotos.count(), 1, 'la foto sigue en el celular');
  console.log('✓ al dejar de compartir, las fotos salen de la nube');

  // ── Diario de comidas ──
  const foto1 = new Blob(['plato-1'], { type: 'image/jpeg' });
  const idComida = await db.comidas.add({ fecha: hoyISO(), hora: '13:30', tipo: 'Almuerzo', nota: 'Pollo con arroz', imagen: foto1, fotoV: 1 });
  await esperar();
  await sincronizar(r, false);
  const filaComida = enNube(ANA, 'comidas')[0];
  assert.equal(filaComida.data.nota, 'Pollo con arroz');
  assert.ok(!('imagen' in filaComida.data), 'la imagen no va dentro del JSON');
  const rutaPlato = `fotos/${filaComida.data.path}`;
  assert.equal(await archivos.get(rutaPlato)!.text(), 'plato-1', 'la foto de la comida sube aunque no se compartan fotos (queda privada)');
  const uidComida = (await db.comidas.get(idComida))!.uid!;
  assert.equal(filaComida.data.path, `${ANA}/comidas/${uidComida}.jpg`);
  console.log('✓ una comida con foto se sube');

  const antesSubidas = subidas;
  await db.comidas.update(idComida, { nota: 'Pollo con arroz y ensalada' });
  await esperar();
  await sincronizar(r, false);
  assert.equal(enNube(ANA, 'comidas')[0].data.nota, 'Pollo con arroz y ensalada');
  assert.equal(subidas, antesSubidas, 'cambiar solo el texto no vuelve a subir la foto');
  await db.comidas.update(idComida, { imagen: new Blob(['plato-2'], { type: 'image/jpeg' }), fotoV: 2 });
  await esperar();
  await sincronizar(r, false);
  assert.equal(subidas, antesSubidas + 1);
  assert.equal(await archivos.get(rutaPlato)!.text(), 'plato-2');
  console.log('✓ editar el texto no re-sube la foto; cambiar la foto sí');

  // Otro celular cambia la foto: este la baja.
  archivos.set(rutaPlato, new Blob(['plato-3'], { type: 'image/jpeg' }));
  filas.set(clave(ANA, 'comidas', uidComida), { ...filas.get(clave(ANA, 'comidas', uidComida))!, data: { ...enNube(ANA, 'comidas')[0].data, fotoV: 3 }, updated_at: ahora() });
  // Y una comida cuya foto no se pudo bajar: el texto llega igual.
  filas.set(clave(ANA, 'comidas', 'c-sin-archivo'), { user_id: ANA, tabla: 'comidas', uid: 'c-sin-archivo', data: { fecha: hoyISO(), hora: '20:00', tipo: 'Cena', nota: 'Sopa', path: `${ANA}/comidas/no-existe.jpg`, fotoV: 1 }, deleted: false, updated_at: ahora() });
  await sincronizar(r, false);
  assert.equal(await (await db.comidas.get(idComida))!.imagen!.text(), 'plato-3');
  assert.equal((await db.comidas.where('uid').equals('c-sin-archivo').first())?.nota, 'Sopa');
  console.log('✓ los cambios de otro celular llegan (y una foto que falla no frena la sincronización)');

  await db.delete();
  await db.open();
  await vincularBajando(r, false);
  const bajada = await db.comidas.where('uid').equals(uidComida).first();
  assert.equal(await bajada!.imagen!.text(), 'plato-3');
  assert.equal(bajada!.nota, 'Pollo con arroz y ensalada');
  console.log('✓ un celular nuevo recupera el diario con sus fotos');

  await db.comidas.delete(bajada!.id!);
  await esperar();
  await sincronizar(r, false);
  assert.equal(enNube(ANA, 'comidas').filter((c) => c.uid === uidComida).length, 0);
  assert.ok(!archivos.has(rutaPlato), 'al borrar la comida se borra su foto');
  console.log('✓ borrar una comida la borra de la nube con su foto');

  console.log('\nTodas las pruebas de sincronización pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
